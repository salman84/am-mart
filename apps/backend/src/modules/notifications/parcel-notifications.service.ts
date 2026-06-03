import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

/**
 * Parcel-specific notification triggers.
 * This service is called by other modules (packages, routes, returns, settlement)
 * to send contextual push notifications for parcel delivery events.
 */
@Injectable()
export class ParcelNotificationsService {
  private readonly logger = new Logger(ParcelNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Package Status Notifications (→ Customer)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyPackageStatusChange(packageId: string, newStatus: string) {
    try {
      const pkg = await this.prisma.package.findUnique({
        where: { id: packageId },
        include: {
          shipment: {
            include: {
              order: {
                select: {
                  customer: { select: { userId: true } },
                  orderNumber: true,
                },
              },
            },
          },
        },
      });
      if (!pkg?.shipment?.order?.customer?.userId) return;

      const userId = pkg.shipment.order.customer.userId;
      const orderNum = pkg.shipment.order.orderNumber;
      const tracking = pkg.trackingNumber;

      const messages: Record<string, { title: string; body: string }> = {
        PICKING: {
          title: 'Order Being Prepared',
          body: `Your order #${orderNum} is being prepared at the warehouse.`,
        },
        PACKED: {
          title: 'Order Packed',
          body: `Your order #${orderNum} has been packed and is ready for shipping.`,
        },
        LABELED: {
          title: 'Shipping Label Created',
          body: `Tracking: ${tracking} — Your package is about to ship.`,
        },
        SCANNED_OUT: {
          title: 'Package Shipped',
          body: `Your package ${tracking} has left the warehouse.`,
        },
        IN_TRANSIT: {
          title: 'Package In Transit',
          body: `Your package ${tracking} is on its way to you.`,
        },
        OUT_FOR_DELIVERY: {
          title: 'Out for Delivery',
          body: `Your package ${tracking} is out for delivery today!`,
        },
        DELIVERED: {
          title: 'Package Delivered',
          body: `Your package ${tracking} has been delivered. Enjoy!`,
        },
        DELIVERY_FAILED: {
          title: 'Delivery Failed',
          body: `We couldn't deliver ${tracking}. We'll retry soon.`,
        },
        RETURNED: {
          title: 'Package Returned',
          body: `Your package ${tracking} is being returned to the warehouse.`,
        },
      };

      const msg = messages[newStatus];
      if (!msg) return;

      await this.notifications.sendPushToUser(userId, {
        title: msg.title,
        body: msg.body,
        data: {
          type: 'PARCEL_STATUS',
          packageId,
          trackingNumber: tracking,
          status: newStatus,
          orderId: pkg.shipment.order?.orderNumber,
        },
      });
    } catch (e) {
      this.logger.error(`Package notification failed: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Route Assignment Notifications (→ Driver)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyRouteAssigned(routeId: string) {
    try {
      const route = await this.prisma.deliveryRoute.findUnique({
        where: { id: routeId },
        include: {
          rider: { select: { userId: true } },
          fulfillmentCenter: { select: { name: true } },
        },
      });
      if (!route?.rider?.userId) return;

      await this.notifications.sendPushToUser(route.rider.userId, {
        title: 'New Route Assigned',
        body: `Route ${route.routeNumber} with ${route.totalStops} stops assigned to you for ${new Date(route.plannedDate).toLocaleDateString()}.`,
        data: {
          type: 'ROUTE_ASSIGNED',
          routeId: route.id,
          routeNumber: route.routeNumber,
        },
      });
    } catch (e) {
      this.logger.error(`Route assignment notification failed: ${e.message}`);
    }
  }

  async notifyRouteStatusChange(routeId: string, status: string) {
    try {
      const route = await this.prisma.deliveryRoute.findUnique({
        where: { id: routeId },
        include: { rider: { select: { userId: true } } },
      });
      if (!route?.rider?.userId) return;

      const messages: Record<string, string> = {
        IN_PROGRESS: `Route ${route.routeNumber} is now active. ${route.totalStops} stops to complete.`,
        COMPLETED: `Route ${route.routeNumber} completed! ${route.completedStops}/${route.totalStops} delivered.`,
        PARTIALLY_COMPLETED: `Route ${route.routeNumber} partially completed. ${route.failedStops} stops failed.`,
      };

      const body = messages[status];
      if (!body) return;

      await this.notifications.sendPushToUser(route.rider.userId, {
        title: `Route ${status.replace(/_/g, ' ').toLowerCase()}`,
        body,
        data: { type: 'ROUTE_ASSIGNED', routeId, status },
      });
    } catch (e) {
      this.logger.error(`Route status notification failed: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Shift Reminder Notifications (→ Driver)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyShiftAssigned(assignmentId: string) {
    try {
      const assignment = await this.prisma.driverShiftAssignment.findUnique({
        where: { id: assignmentId },
        include: {
          rider: { select: { userId: true } },
          shift: { select: { name: true, startTime: true, endTime: true } },
        },
      });
      if (!assignment?.rider?.userId) return;

      await this.notifications.sendPushToUser(assignment.rider.userId, {
        title: 'Shift Assigned',
        body: `You have been assigned to "${assignment.shift.name}" (${assignment.shift.startTime}–${assignment.shift.endTime}) on ${new Date(assignment.date).toLocaleDateString()}.`,
        data: { type: 'SHIFT_REMINDER', assignmentId },
      });
    } catch (e) {
      this.logger.error(`Shift notification failed: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Transfer Notifications (→ Seller / Warehouse)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyTransferStatusChange(transferId: string, newStatus: string) {
    try {
      const transfer = await this.prisma.warehouseTransfer.findUnique({
        where: { id: transferId },
        select: {
          transferNumber: true,
          sellerId: true,
          requestedBy: true,
          totalItems: true,
        },
      });
      if (!transfer) return;

      // Notify the seller/requester
      const userId = transfer.requestedBy || transfer.sellerId;
      if (!userId) return;

      const messages: Record<string, { title: string; body: string }> = {
        APPROVED: {
          title: 'Transfer Approved',
          body: `Your transfer ${transfer.transferNumber} (${transfer.totalItems} items) has been approved.`,
        },
        REJECTED: {
          title: 'Transfer Rejected',
          body: `Your transfer ${transfer.transferNumber} was rejected. Check details.`,
        },
        RECEIVED: {
          title: 'Transfer Received',
          body: `All items from transfer ${transfer.transferNumber} have been received at the warehouse.`,
        },
        PARTIALLY_RECEIVED: {
          title: 'Transfer Partially Received',
          body: `Some items from transfer ${transfer.transferNumber} have been received. Check for discrepancies.`,
        },
      };

      const msg = messages[newStatus];
      if (!msg) return;

      await this.notifications.sendPushToUser(userId, {
        title: msg.title,
        body: msg.body,
        data: { type: 'WAREHOUSE', transferId, status: newStatus },
      });
    } catch (e) {
      this.logger.error(`Transfer notification failed: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Return Notifications (→ Customer)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyReturnStatusChange(returnRequestId: string, newStatus: string) {
    try {
      const request = await this.prisma.returnRequest.findUnique({
        where: { id: returnRequestId },
        select: { customerId: true, orderId: true },
      });
      if (!request?.customerId) return;

      // Find user from customer
      const customer = await this.prisma.customer.findUnique({
        where: { id: request.customerId },
        select: { userId: true },
      });
      if (!customer?.userId) return;

      const messages: Record<string, { title: string; body: string }> = {
        APPROVED: {
          title: 'Return Approved',
          body: 'Your return request has been approved. A pickup will be scheduled.',
        },
        REJECTED: {
          title: 'Return Rejected',
          body: 'Your return request has been reviewed and could not be approved.',
        },
        PICKUP_ASSIGNED: {
          title: 'Return Pickup Scheduled',
          body: 'A driver has been assigned to pick up your return.',
        },
        RECEIVED_AT_WAREHOUSE: {
          title: 'Return Received',
          body: 'Your returned item has been received at our warehouse for inspection.',
        },
        REFUNDED: {
          title: 'Refund Processed',
          body: 'Your refund has been processed. Check your wallet/payment method.',
        },
      };

      const msg = messages[newStatus];
      if (!msg) return;

      await this.notifications.sendPushToUser(customer.userId, {
        title: msg.title,
        body: msg.body,
        data: { type: 'RETURN_UPDATE', returnRequestId, status: newStatus },
      });
    } catch (e) {
      this.logger.error(`Return notification failed: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Settlement Notifications (→ Driver)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifySettlementStatusChange(settlementId: string, newStatus: string) {
    try {
      const settlement = await this.prisma.driverEarningsSettlement.findUnique({
        where: { id: settlementId },
        include: { rider: { select: { userId: true } } },
      });
      if (!settlement?.rider?.userId) return;

      const messages: Record<string, { title: string; body: string }> = {
        APPROVED: {
          title: 'Settlement Approved',
          body: `Your earnings settlement of ${settlement.netAmount.toLocaleString()} has been approved for payout.`,
        },
        PAID: {
          title: 'Payment Received',
          body: `${settlement.netAmount.toLocaleString()} has been paid for ${settlement.totalDeliveries} deliveries.`,
        },
        DISPUTED: {
          title: 'Settlement Under Review',
          body: `Your settlement is being reviewed. We'll update you soon.`,
        },
      };

      const msg = messages[newStatus];
      if (!msg) return;

      await this.notifications.sendPushToUser(settlement.rider.userId, {
        title: msg.title,
        body: msg.body,
        data: { type: 'SETTLEMENT', settlementId, status: newStatus },
      });
    } catch (e) {
      this.logger.error(`Settlement notification failed: ${e.message}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Delivery Proof Notification (→ Customer)
  // ═══════════════════════════════════════════════════════════════════════════

  async notifyDeliveryProofAvailable(packageId: string) {
    try {
      const pkg = await this.prisma.package.findUnique({
        where: { id: packageId },
        include: {
          shipment: {
            include: {
              order: { select: { customer: { select: { userId: true } } } },
            },
          },
        },
      });
      if (!pkg?.shipment?.order?.customer?.userId) return;

      await this.notifications.sendPushToUser(pkg.shipment.order.customer.userId, {
        title: 'Delivery Proof Available',
        body: `A delivery photo is available for package ${pkg.trackingNumber}. Tap to view.`,
        data: {
          type: 'PARCEL_DELIVERY',
          packageId,
          trackingNumber: pkg.trackingNumber,
        },
      });
    } catch (e) {
      this.logger.error(`Delivery proof notification failed: ${e.message}`);
    }
  }
}
