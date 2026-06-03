import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Delivery Routes
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllRoutes(params: {
    page?: number; limit?: number; status?: string;
    centerId?: string; riderId?: string; date?: string;
  }) {
    const { page = 1, limit = 20, status, centerId, riderId, date } = params;
    const where: any = {};
    if (status) where.status = status;
    if (centerId) where.fulfillmentCenterId = centerId;
    if (riderId) where.riderId = riderId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d); next.setDate(next.getDate() + 1);
      where.plannedDate = { gte: d, lt: next };
    }

    const [routes, total] = await Promise.all([
      this.prisma.deliveryRoute.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { plannedDate: 'desc' },
        include: {
          rider: { select: { id: true, user: { select: { fullName: true, phone: true } } } },
          fulfillmentCenter: { select: { name: true, code: true } },
          zone: { select: { name: true } },
          _count: { select: { stops: true } },
        },
      }),
      this.prisma.deliveryRoute.count({ where }),
    ]);

    return { routes, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Rider's own routes (auto-filtered by rider userId) ────────────────────
  async getMyRoutes(riderUserId: string, params: { page?: number; limit?: number; status?: string }) {
    const { page = 1, limit = 20, status } = params;

    const rider = await this.prisma.rider.findFirst({ where: { userId: riderUserId } });
    if (!rider) return { routes: [], total: 0, page: 1, totalPages: 0 };

    const where: any = { riderId: rider.id };
    if (status) where.status = status;

    const [routes, total] = await Promise.all([
      this.prisma.deliveryRoute.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { plannedDate: 'desc' },
        include: {
          fulfillmentCenter: { select: { name: true, code: true } },
          zone: { select: { name: true } },
          _count: { select: { stops: true } },
        },
      }),
      this.prisma.deliveryRoute.count({ where }),
    ]);

    return { routes, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ── Rider's assigned packages (from their active routes) ────────────────
  async getMyPackages(riderUserId: string) {
    const rider = await this.prisma.rider.findFirst({ where: { userId: riderUserId } });
    if (!rider) return { packages: [] };

    const activeRoutes = await this.prisma.deliveryRoute.findMany({
      where: {
        riderId: rider.id,
        status: { in: ['ASSIGNED', 'IN_PROGRESS'] },
      },
      select: { id: true, routeNumber: true },
    });

    if (activeRoutes.length === 0) return { packages: [] };

    const stops = await this.prisma.routeStop.findMany({
      where: {
        routeId: { in: activeRoutes.map(r => r.id) },
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      orderBy: { stopOrder: 'asc' },
      include: {
        route: { select: { routeNumber: true } },
        package: {
          select: {
            id: true, trackingNumber: true, barcode: true, status: true,
            weight: true, specialInstructions: true,
            shipment: {
              select: {
                order: {
                  select: {
                    orderNumber: true,
                    customer: { select: { user: { select: { fullName: true, phone: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return {
      packages: stops.map(stop => ({
        stopId: stop.id,
        stopOrder: stop.stopOrder,
        stopStatus: stop.status,
        routeNumber: stop.route?.routeNumber,
        customerName: stop.customerName,
        customerPhone: stop.customerPhone,
        addressLine1: stop.addressLine1,
        addressLine2: stop.addressLine2,
        city: stop.city,
        district: stop.district,
        lat: stop.lat,
        lng: stop.lng,
        deliveryNotes: stop.deliveryNotes,
        package: stop.package,
        orderNumber: stop.package?.shipment?.order?.orderNumber,
      })),
    };
  }

  async getRoute(id: string) {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id },
      include: {
        rider: { select: { id: true, user: { select: { fullName: true, phone: true, avatar: true } } } },
        fulfillmentCenter: { select: { name: true, code: true } },
        zone: { select: { name: true } },
        stops: {
          orderBy: { stopOrder: 'asc' },
          include: { package: { select: { trackingNumber: true, status: true, barcode: true } } },
        },
      },
    });
    if (!route) throw new NotFoundException('Route not found');
    return { route };
  }

  async createRoute(data: {
    fulfillmentCenterId?: string; riderId?: string; zoneId?: string;
    plannedDate: string; notes?: string; createdBy?: string;
  }) {
    const routeNumber = `RT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const route = await this.prisma.deliveryRoute.create({
      data: {
        routeNumber,
        fulfillmentCenterId: data.fulfillmentCenterId,
        riderId: data.riderId,
        zoneId: data.zoneId,
        plannedDate: new Date(data.plannedDate),
        notes: data.notes,
        createdBy: data.createdBy,
        status: data.riderId ? 'ASSIGNED' : 'PLANNED',
      },
    });

    return { route, message: 'Route created' };
  }

  async updateRoute(id: string, data: any) {
    const route = await this.prisma.deliveryRoute.findUnique({ where: { id } });
    if (!route) throw new NotFoundException('Route not found');
    if (data.plannedDate) data.plannedDate = new Date(data.plannedDate);
    const updated = await this.prisma.deliveryRoute.update({ where: { id }, data });
    return { route: updated, message: 'Route updated' };
  }

  async assignDriver(routeId: string, riderId: string) {
    const route = await this.prisma.deliveryRoute.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');

    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Driver not found');

    const updated = await this.prisma.deliveryRoute.update({
      where: { id: routeId },
      data: { riderId, status: 'ASSIGNED' },
    });

    return { route: updated, message: 'Driver assigned to route' };
  }

  async updateRouteStatus(routeId: string, status: string) {
    const route = await this.prisma.deliveryRoute.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');

    const validTransitions: Record<string, string[]> = {
      PLANNED: ['ASSIGNED', 'CANCELLED'],
      ASSIGNED: ['IN_PROGRESS', 'CANCELLED'],
      IN_PROGRESS: ['COMPLETED', 'PARTIALLY_COMPLETED', 'CANCELLED'],
      PARTIALLY_COMPLETED: ['COMPLETED'],
    };

    if (!validTransitions[route.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${route.status} to ${status}`);
    }

    const updateData: any = { status };
    if (status === 'IN_PROGRESS') updateData.startedAt = new Date();
    if (['COMPLETED', 'PARTIALLY_COMPLETED'].includes(status)) {
      updateData.completedAt = new Date();
      if (route.startedAt) {
        updateData.actualDuration = Math.round((Date.now() - route.startedAt.getTime()) / 60000);
      }
    }

    const updated = await this.prisma.deliveryRoute.update({ where: { id: routeId }, data: updateData });
    return { route: updated, message: `Route ${status.toLowerCase().replace('_', ' ')}` };
  }

  // ─── Route Stops ────────────────────────────────────────────────────────────

  async addStop(routeId: string, data: {
    packageId: string; stopOrder: number; customerName?: string;
    customerPhone?: string; addressLine1: string; addressLine2?: string;
    city?: string; district?: string; postalCode?: string;
    lat?: number; lng?: number; deliveryNotes?: string; zoneId?: string;
  }) {
    const route = await this.prisma.deliveryRoute.findUnique({ where: { id: routeId } });
    if (!route) throw new NotFoundException('Route not found');

    const stop = await this.prisma.routeStop.create({
      data: { routeId, ...data },
    });

    await this.prisma.deliveryRoute.update({
      where: { id: routeId },
      data: { totalStops: { increment: 1 } },
    });

    return { stop, message: 'Stop added' };
  }

  async updateStopStatus(stopId: string, status: string, data?: any) {
    const stop = await this.prisma.routeStop.findUnique({ where: { id: stopId } });
    if (!stop) throw new NotFoundException('Stop not found');

    const updateData: any = { status };
    if (status === 'IN_PROGRESS') updateData.actualArrival = new Date();
    if (status === 'COMPLETED') updateData.completedAt = new Date();
    if (status === 'FAILED') updateData.failedAt = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.routeStop.update({ where: { id: stopId }, data: updateData });

      if (status === 'COMPLETED') {
        await tx.deliveryRoute.update({
          where: { id: stop.routeId },
          data: { completedStops: { increment: 1 } },
        });
      } else if (status === 'FAILED') {
        await tx.deliveryRoute.update({
          where: { id: stop.routeId },
          data: { failedStops: { increment: 1 } },
        });
      }

      return result;
    });

    return { stop: updated, message: `Stop ${status.toLowerCase()}` };
  }

  async removeStop(stopId: string) {
    const stop = await this.prisma.routeStop.findUnique({ where: { id: stopId } });
    if (!stop) throw new NotFoundException('Stop not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.routeStop.delete({ where: { id: stopId } });
      await tx.deliveryRoute.update({
        where: { id: stop.routeId },
        data: { totalStops: { decrement: 1 } },
      });
    });

    return { message: 'Stop removed' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Delivery Proofs
  // ═══════════════════════════════════════════════════════════════════════════

  async createDeliveryProof(data: {
    packageId: string; riderId: string; proofType: string;
    photoUrl?: string; signatureUrl?: string; otp?: string;
    gpsLat?: number; gpsLng?: number; gpsAccuracy?: number;
    deviceId?: string; recipientName?: string; safePlaceDesc?: string;
    driverNotes?: string;
  }) {
    const pkg = await this.prisma.package.findUnique({ where: { id: data.packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const proof = await this.prisma.deliveryProof.create({
      data: data as any,
    });

    // Mark package as delivered
    await this.prisma.package.update({
      where: { id: data.packageId },
      data: { status: 'DELIVERED' },
    });

    return { proof, message: 'Delivery proof recorded' };
  }

  async getDeliveryProof(packageId: string) {
    const proof = await this.prisma.deliveryProof.findUnique({
      where: { packageId },
      include: { rider: { select: { user: { select: { fullName: true } } } } },
    });
    if (!proof) throw new NotFoundException('No delivery proof found');
    return { proof };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Failed Deliveries
  // ═══════════════════════════════════════════════════════════════════════════

  async recordFailedDelivery(data: {
    packageId: string; riderId: string; attemptNumber: number;
    reason: string; reasonNotes?: string; photoUrl?: string;
    gpsLat?: number; gpsLng?: number; deviceId?: string;
    rescheduledDate?: string; returnToWarehouse?: boolean;
  }) {
    const pkg = await this.prisma.package.findUnique({ where: { id: data.packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const record = await this.prisma.failedDelivery.create({
      data: {
        ...data,
        rescheduledDate: data.rescheduledDate ? new Date(data.rescheduledDate) : undefined,
      } as any,
    });

    // Update package
    await this.prisma.package.update({
      where: { id: data.packageId },
      data: {
        status: 'DELIVERY_FAILED',
        deliveryAttempts: { increment: 1 },
        currentAttempt: data.attemptNumber,
      },
    });

    return { record, message: 'Failed delivery recorded' };
  }

  async getFailedDeliveries(params: {
    page?: number; limit?: number; reason?: string; riderId?: string;
  }) {
    const { page = 1, limit = 20, reason, riderId } = params;
    const where: any = {};
    if (reason) where.reason = reason;
    if (riderId) where.riderId = riderId;

    const [records, total] = await Promise.all([
      this.prisma.failedDelivery.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          package: { select: { trackingNumber: true, status: true } },
          rider: { select: { user: { select: { fullName: true } } } },
        },
      }),
      this.prisma.failedDelivery.count({ where }),
    ]);

    return { records, total, page, totalPages: Math.ceil(total / limit) };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Driver Shifts
  // ═══════════════════════════════════════════════════════════════════════════

  async getShifts(centerId?: string) {
    const where: any = {};
    if (centerId) where.fulfillmentCenterId = centerId;

    const shifts = await this.prisma.driverShift.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: {
        fulfillmentCenter: { select: { name: true, code: true } },
        _count: { select: { assignments: true } },
      },
    });
    return { shifts };
  }

  async createShift(data: {
    name: string; startTime: string; endTime: string;
    fulfillmentCenterId?: string; maxDrivers?: number;
    daysOfWeek?: number[];
  }) {
    const shift = await this.prisma.driverShift.create({ data: data as any });
    return { shift, message: 'Shift created' };
  }

  async updateShift(id: string, data: any) {
    const shift = await this.prisma.driverShift.findUnique({ where: { id } });
    if (!shift) throw new NotFoundException('Shift not found');
    const updated = await this.prisma.driverShift.update({ where: { id }, data });
    return { shift: updated, message: 'Shift updated' };
  }

  async deleteShift(id: string) {
    await this.prisma.driverShift.delete({ where: { id } });
    return { message: 'Shift deleted' };
  }

  // ─── Shift Assignments ─────────────────────────────────────────────────────

  async getShiftAssignments(params: { shiftId?: string; riderId?: string; date?: string }) {
    const where: any = {};
    if (params.shiftId) where.shiftId = params.shiftId;
    if (params.riderId) where.riderId = params.riderId;
    if (params.date) where.date = new Date(params.date);

    const assignments = await this.prisma.driverShiftAssignment.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        shift: { select: { name: true, startTime: true, endTime: true } },
        rider: { select: { id: true, user: { select: { fullName: true, phone: true } } } },
      },
    });
    return { assignments };
  }

  async assignShift(data: { shiftId: string; riderId: string; date: string }) {
    const assignment = await this.prisma.driverShiftAssignment.create({
      data: {
        shiftId: data.shiftId,
        riderId: data.riderId,
        date: new Date(data.date),
      },
    });
    return { assignment, message: 'Driver assigned to shift' };
  }

  async updateShiftAssignment(id: string, status: string) {
    const updateData: any = { status };
    if (status === 'CLOCKED_IN') updateData.clockInAt = new Date();
    if (status === 'CLOCKED_OUT') updateData.clockOutAt = new Date();

    const updated = await this.prisma.driverShiftAssignment.update({
      where: { id }, data: updateData,
    });
    return { assignment: updated, message: 'Shift assignment updated' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Delivery Time Slots
  // ═══════════════════════════════════════════════════════════════════════════

  async getTimeSlots(zoneId?: string) {
    const where: any = {};
    if (zoneId) where.zoneId = zoneId;

    const slots = await this.prisma.deliveryTimeSlot.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { zone: { select: { name: true } }, _count: { select: { orders: true } } },
    });
    return { slots };
  }

  async createTimeSlot(data: any) {
    const slot = await this.prisma.deliveryTimeSlot.create({ data });
    return { slot, message: 'Time slot created' };
  }

  async updateTimeSlot(id: string, data: any) {
    const updated = await this.prisma.deliveryTimeSlot.update({ where: { id }, data });
    return { slot: updated, message: 'Time slot updated' };
  }

  async deleteTimeSlot(id: string) {
    await this.prisma.deliveryTimeSlot.delete({ where: { id } });
    return { message: 'Time slot deleted' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Delivery Fee Rules
  // ═══════════════════════════════════════════════════════════════════════════

  async getFeeRules(zoneId?: string) {
    const where: any = {};
    if (zoneId) where.zoneId = zoneId;

    const rules = await this.prisma.deliveryFeeRule.findMany({
      where,
      orderBy: { priority: 'asc' },
      include: { zone: { select: { name: true } } },
    });
    return { rules };
  }

  async createFeeRule(data: any) {
    const rule = await this.prisma.deliveryFeeRule.create({ data });
    return { rule, message: 'Fee rule created' };
  }

  async updateFeeRule(id: string, data: any) {
    const updated = await this.prisma.deliveryFeeRule.update({ where: { id }, data });
    return { rule: updated, message: 'Fee rule updated' };
  }

  async deleteFeeRule(id: string) {
    await this.prisma.deliveryFeeRule.delete({ where: { id } });
    return { message: 'Fee rule deleted' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Available Drivers for Assignment
  // ═══════════════════════════════════════════════════════════════════════════

  async getAvailableDrivers() {
    const drivers = await this.prisma.rider.findMany({
      where: { isOnline: true, riderStatus: 'AVAILABLE' },
      include: {
        user: { select: { fullName: true, phone: true, avatar: true } },
        _count: {
          select: {
            assignedRoutes: { where: { status: 'IN_PROGRESS' } },
          },
        },
      },
    });
    return { drivers };
  }
}
