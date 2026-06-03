import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReturnsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Return Requests
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllReturns(params: {
    page?: number; limit?: number; status?: string;
    sellerId?: string; customerId?: string;
  }) {
    const { page = 1, limit = 20, status, sellerId, customerId } = params;
    const where: any = {};
    if (status) where.status = status;
    if (sellerId) where.sellerId = sellerId;
    if (customerId) where.customerId = customerId;

    const [requests, total] = await Promise.all([
      this.prisma.returnRequest.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          returnPickup: { select: { status: true, scheduledDate: true } },
          returnInspection: { select: { condition: true, refundApproved: true } },
        },
      }),
      this.prisma.returnRequest.count({ where }),
    ]);

    return { requests, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getReturn(id: string) {
    const request = await this.prisma.returnRequest.findUnique({
      where: { id },
      include: {
        returnPickup: { include: { rider: { select: { user: { select: { fullName: true, phone: true } } } } } },
        returnInspection: true,
      },
    });
    if (!request) throw new NotFoundException('Return request not found');
    return { request };
  }

  async updateReturnStatus(id: string, status: string, userId: string, data?: { adminNotes?: string }) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Return request not found');

    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['UNDER_REVIEW', 'REJECTED'],
      UNDER_REVIEW: ['APPROVED', 'REJECTED'],
      APPROVED: ['PICKUP_ASSIGNED', 'RECEIVED'],
      PICKUP_ASSIGNED: ['PICKUP_PICKED_UP'],
      PICKUP_PICKED_UP: ['IN_TRANSIT_RETURN'],
      IN_TRANSIT_RETURN: ['RECEIVED_AT_WAREHOUSE'],
      RECEIVED_AT_WAREHOUSE: ['INSPECTED'],
      RECEIVED: ['INSPECTED'],
      INSPECTED: ['REFUNDED', 'CLOSED'],
    };

    if (!validTransitions[request.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${request.status} to ${status}`);
    }

    const updateData: any = { status, reviewedBy: userId, reviewedAt: new Date() };
    if (data?.adminNotes) updateData.adminNotes = data.adminNotes;
    if (status === 'REFUNDED') updateData.refundProcessedAt = new Date();

    const updated = await this.prisma.returnRequest.update({ where: { id }, data: updateData });
    return { request: updated, message: `Return ${status.toLowerCase().replace(/_/g, ' ')}` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Return Pickup
  // ═══════════════════════════════════════════════════════════════════════════

  async schedulePickup(returnRequestId: string, data: {
    riderId?: string; scheduledDate?: string; pickupAddress?: string;
    pickupLat?: number; pickupLng?: number;
  }) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
    if (!request) throw new NotFoundException('Return request not found');

    const pickup = await this.prisma.returnPickup.upsert({
      where: { returnRequestId },
      create: {
        returnRequestId,
        riderId: data.riderId,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        pickupAddress: data.pickupAddress,
        pickupLat: data.pickupLat,
        pickupLng: data.pickupLng,
        status: data.riderId ? 'ASSIGNED' : 'PENDING',
      },
      update: {
        riderId: data.riderId,
        scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : undefined,
        status: data.riderId ? 'ASSIGNED' : 'PENDING',
      },
    });

    if (!['PICKUP_ASSIGNED', 'APPROVED'].includes(request.status)) {
      await this.prisma.returnRequest.update({
        where: { id: returnRequestId },
        data: { status: 'PICKUP_ASSIGNED' as any },
      });
    }

    return { pickup, message: 'Pickup scheduled' };
  }

  async updatePickupStatus(pickupId: string, status: string) {
    const pickup = await this.prisma.returnPickup.findUnique({ where: { id: pickupId } });
    if (!pickup) throw new NotFoundException('Pickup not found');

    const updateData: any = { status };
    if (status === 'PICKED_UP') updateData.pickedUpAt = new Date();
    if (status === 'RECEIVED_AT_WAREHOUSE') updateData.returnedToWarehouseAt = new Date();

    const updated = await this.prisma.returnPickup.update({ where: { id: pickupId }, data: updateData });

    // Also update return request status
    if (status === 'RECEIVED_AT_WAREHOUSE') {
      await this.prisma.returnRequest.update({
        where: { id: pickup.returnRequestId },
        data: { status: 'RECEIVED_AT_WAREHOUSE' as any },
      });
    }

    return { pickup: updated, message: `Pickup ${status.toLowerCase().replace(/_/g, ' ')}` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Return Inspection
  // ═══════════════════════════════════════════════════════════════════════════

  async createInspection(returnRequestId: string, data: {
    inspectedBy: string; condition: string; notes?: string;
    images?: string[]; refundApproved: boolean;
    refundAmount?: number; restockApproved?: boolean;
  }) {
    const request = await this.prisma.returnRequest.findUnique({ where: { id: returnRequestId } });
    if (!request) throw new NotFoundException('Return request not found');

    const inspection = await this.prisma.returnInspection.upsert({
      where: { returnRequestId },
      create: {
        returnRequestId,
        inspectedBy: data.inspectedBy,
        condition: data.condition as any,
        notes: data.notes,
        images: data.images || [],
        refundApproved: data.refundApproved,
        refundAmount: data.refundAmount,
        restockApproved: data.restockApproved ?? false,
        inspectedAt: new Date(),
      },
      update: {
        condition: data.condition as any,
        notes: data.notes,
        images: data.images || [],
        refundApproved: data.refundApproved,
        refundAmount: data.refundAmount,
        restockApproved: data.restockApproved,
        inspectedAt: new Date(),
      },
    });

    // Update return request status
    await this.prisma.returnRequest.update({
      where: { id: returnRequestId },
      data: {
        status: 'INSPECTED' as any,
        refundAmount: data.refundAmount,
      },
    });

    return { inspection, message: 'Inspection recorded' };
  }

  async getInspection(returnRequestId: string) {
    const inspection = await this.prisma.returnInspection.findUnique({
      where: { returnRequestId },
    });
    if (!inspection) throw new NotFoundException('No inspection found');
    return { inspection };
  }
}
