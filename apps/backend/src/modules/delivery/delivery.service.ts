import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DeliveryGateway } from './delivery.gateway';
import * as crypto from 'crypto';

@Injectable()
export class DeliveryService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private gateway: DeliveryGateway,
  ) {}

  async assignRider(orderId: string, riderId: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { address: true, customer: { include: { user: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      include: { user: true },
    });
    if (!rider) throw new NotFoundException('Rider not found');

    const existing = await this.prisma.deliveryAssignment.findUnique({ where: { orderId } });
    if (existing) throw new BadRequestException('Rider already assigned to this order');

    const deliveryOtp = Math.floor(1000 + Math.random() * 9000).toString();

    const assignment = await this.prisma.deliveryAssignment.create({
      data: {
        orderId,
        riderId,
        status: 'ASSIGNED',
        dropoffLat: order.address?.lat,
        dropoffLng: order.address?.lng,
        dropoffAddress: order.address?.addressLine1,
        deliveryOtp,
        estimatedDelivery: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    await this.notifications.sendPushToUser(rider.userId, {
      title: 'New Delivery Assignment',
      body: `You have a new order to deliver. Order #${order.orderNumber}`,
      data: { type: 'DELIVERY', orderId, assignmentId: assignment.id },
    });

    await this.notifications.sendPushToUser(order.customer.userId, {
      title: 'Rider Assigned',
      body: `${rider.user.fullName} is your delivery rider`,
      data: { type: 'DELIVERY', orderId, status: 'ASSIGNED' },
    });

    return assignment;
  }

  async riderUpdateDeliveryStatus(assignmentId: string, riderUserId: string, status: string, data?: any) {
    const assignment = await this.prisma.deliveryAssignment.findFirst({
      where: { id: assignmentId, rider: { userId: riderUserId } },
      include: { order: { include: { customer: { include: { user: true } } } } },
    });
    if (!assignment) throw new NotFoundException('Delivery assignment not found');

    const validTransitions: Record<string, string[]> = {
      ASSIGNED: ['ACCEPTED'],
      ACCEPTED: ['HEADING_TO_PICKUP'],
      HEADING_TO_PICKUP: ['PICKED_UP'],
      PICKED_UP: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
    };

    if (!validTransitions[assignment.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${assignment.status} to ${status}`);
    }

    if (status === 'DELIVERED') {
      if (data?.otp !== assignment.deliveryOtp) {
        throw new BadRequestException('Invalid delivery OTP');
      }
    }

    const updateData: any = { status };
    if (status === 'DELIVERED') {
      updateData.actualDelivery = new Date();
      updateData.deliveryProofUrl = data?.proofUrl;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.deliveryAssignment.update({ where: { id: assignmentId }, data: updateData });

      if (status === 'PICKED_UP') {
        await tx.order.update({ where: { id: assignment.orderId }, data: { status: 'PICKED_UP' } });
      } else if (status === 'OUT_FOR_DELIVERY') {
        await tx.order.update({ where: { id: assignment.orderId }, data: { status: 'OUT_FOR_DELIVERY' } });
      } else if (status === 'DELIVERED') {
        await tx.order.update({ where: { id: assignment.orderId }, data: { status: 'DELIVERED', deliveredAt: new Date() } });
        await tx.rider.update({
          where: { userId: riderUserId },
          data: { totalDeliveries: { increment: 1 }, riderStatus: 'AVAILABLE' },
        });
      }
    });

    this.gateway.emitOrderStatusUpdate(assignment.orderId, status);

    await this.notifications.sendPushToUser(assignment.order.customer.userId, {
      title: 'Delivery Update',
      body: this.getStatusMessage(status),
      data: { type: 'DELIVERY', orderId: assignment.orderId, status },
    });

    return { message: 'Status updated', status };
  }

  async getRiderAssignments(riderUserId: string, status?: string) {
    const rider = await this.prisma.rider.findFirst({ where: { userId: riderUserId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const where: any = { riderId: rider.id };
    if (status) where.status = status;
    else where.status = { notIn: ['DELIVERED', 'FAILED'] };

    return this.prisma.deliveryAssignment.findMany({
      where,
      include: {
        order: {
          include: {
            customer: { include: { user: { select: { fullName: true, phone: true, avatar: true } } } },
            items: { include: { product: { include: { images: { take: 1 } } } } },
            address: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRiderEarnings(riderUserId: string) {
    const rider = await this.prisma.rider.findFirst({ where: { userId: riderUserId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [total, todayDeliveries] = await Promise.all([
      this.prisma.deliveryAssignment.count({ where: { riderId: rider.id, status: 'DELIVERED' } }),
      this.prisma.deliveryAssignment.findMany({
        where: { riderId: rider.id, status: 'DELIVERED', actualDelivery: { gte: today } },
      }),
    ]);

    return {
      totalDeliveries: rider.totalDeliveries,
      totalEarnings: rider.totalEarnings,
      todayDeliveries: todayDeliveries.length,
      todayEarnings: todayDeliveries.reduce((s, d) => s + d.deliveryFee, 0),
      rating: rider.rating,
    };
  }

  async getAvailableRiders() {
    return this.prisma.rider.findMany({
      where: { riderStatus: 'AVAILABLE', isOnline: true },
      include: { user: { select: { fullName: true, phone: true, avatar: true } } },
    });
  }

  private getStatusMessage(status: string): string {
    const messages: Record<string, string> = {
      ACCEPTED: 'Your rider has accepted the order',
      HEADING_TO_PICKUP: 'Rider is heading to pickup location',
      PICKED_UP: 'Your order has been picked up',
      OUT_FOR_DELIVERY: 'Your order is on the way!',
      DELIVERED: 'Your order has been delivered. Enjoy!',
      FAILED: 'Delivery failed. We will contact you shortly.',
    };
    return messages[status] || `Delivery status: ${status}`;
  }
}
