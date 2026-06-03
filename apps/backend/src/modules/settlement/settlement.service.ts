import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SettlementService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Driver Earnings Settlements
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllSettlements(params: {
    page?: number; limit?: number; status?: string; riderId?: string;
  }) {
    const { page = 1, limit = 20, status, riderId } = params;
    const where: any = {};
    if (status) where.status = status;
    if (riderId) where.riderId = riderId;

    const [settlements, total] = await Promise.all([
      this.prisma.driverEarningsSettlement.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rider: { select: { user: { select: { fullName: true, phone: true } } } },
        },
      }),
      this.prisma.driverEarningsSettlement.count({ where }),
    ]);

    return { settlements, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getSettlement(id: string) {
    const settlement = await this.prisma.driverEarningsSettlement.findUnique({
      where: { id },
      include: {
        rider: { select: { id: true, user: { select: { fullName: true, phone: true } }, totalDeliveries: true, totalEarnings: true } },
        partner: { select: { companyName: true } },
      },
    });
    if (!settlement) throw new NotFoundException('Settlement not found');
    return { settlement };
  }

  async createSettlement(data: {
    riderId: string; periodStart: string; periodEnd: string;
    totalDeliveries?: number; totalEarnings?: number; bonuses?: number;
    deductions?: number; codCollected?: number; notes?: string;
  }) {
    const rider = await this.prisma.rider.findUnique({ where: { id: data.riderId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const totalEarnings = data.totalEarnings || 0;
    const bonuses = data.bonuses || 0;
    const deductions = data.deductions || 0;
    const netAmount = totalEarnings + bonuses - deductions;

    const settlement = await this.prisma.driverEarningsSettlement.create({
      data: {
        riderId: data.riderId,
        periodStart: new Date(data.periodStart),
        periodEnd: new Date(data.periodEnd),
        totalDeliveries: data.totalDeliveries || 0,
        totalEarnings,
        bonuses,
        deductions,
        netAmount,
        codCollected: data.codCollected || 0,
        notes: data.notes,
        status: 'CALCULATED',
      },
    });

    return { settlement, message: 'Settlement created' };
  }

  async calculateSettlement(riderId: string, periodStart: string, periodEnd: string) {
    const rider = await this.prisma.rider.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');

    const start = new Date(periodStart);
    const end = new Date(periodEnd);

    // Count completed deliveries in period
    const deliveries = await this.prisma.deliveryAssignment.findMany({
      where: {
        riderId,
        status: 'DELIVERED',
        actualDelivery: { gte: start, lte: end },
      },
    });

    const totalDeliveries = deliveries.length;
    const totalEarnings = deliveries.reduce((sum, d) => sum + d.deliveryFee, 0);

    // Count route completions
    const routeCompletions = await this.prisma.deliveryRoute.count({
      where: {
        riderId,
        status: { in: ['COMPLETED', 'PARTIALLY_COMPLETED'] },
        completedAt: { gte: start, lte: end },
      },
    });

    return {
      calculation: {
        riderId,
        riderName: undefined,
        periodStart: start,
        periodEnd: end,
        totalDeliveries,
        totalEarnings,
        routeCompletions,
        bonuses: 0,
        deductions: 0,
        netAmount: totalEarnings,
      },
    };
  }

  async updateSettlementStatus(id: string, status: string, userId: string) {
    const settlement = await this.prisma.driverEarningsSettlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CALCULATED'],
      CALCULATED: ['APPROVED', 'DISPUTED'],
      APPROVED: ['PAID', 'HELD'],
      DISPUTED: ['APPROVED', 'HELD'],
      HELD: ['APPROVED', 'PAID'],
    };

    if (!validTransitions[settlement.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${settlement.status} to ${status}`);
    }

    const updateData: any = { status };
    if (status === 'PAID') updateData.paidAt = new Date();

    const updated = await this.prisma.driverEarningsSettlement.update({
      where: { id }, data: updateData,
    });

    return { settlement: updated, message: `Settlement ${status.toLowerCase()}` };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Settlement Dashboard / Stats
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettlementStats() {
    const [pending, calculated, approved, paid, totalPaid] = await Promise.all([
      this.prisma.driverEarningsSettlement.count({ where: { status: 'PENDING' } }),
      this.prisma.driverEarningsSettlement.count({ where: { status: 'CALCULATED' } }),
      this.prisma.driverEarningsSettlement.count({ where: { status: 'APPROVED' } }),
      this.prisma.driverEarningsSettlement.count({ where: { status: 'PAID' } }),
      this.prisma.driverEarningsSettlement.aggregate({
        where: { status: 'PAID' },
        _sum: { netAmount: true },
      }),
    ]);

    return {
      stats: {
        pending, calculated, approved, paid,
        totalPaidAmount: totalPaid._sum.netAmount || 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Delivery Rating
  // ═══════════════════════════════════════════════════════════════════════════

  async submitDeliveryRating(data: {
    orderId: string; customerId: string; riderId: string;
    rating: number; comment?: string; tags?: string[];
  }) {
    const result = await this.prisma.deliveryRating.upsert({
      where: { orderId: data.orderId },
      create: {
        orderId: data.orderId,
        riderId: data.riderId,
        customerId: data.customerId,
        rating: data.rating,
        comment: data.comment,
        tags: data.tags || [],
      },
      update: {
        rating: data.rating,
        comment: data.comment,
        tags: data.tags || [],
      },
    });

    // Update rider's average rating
    const avg = await this.prisma.deliveryRating.aggregate({
      where: { riderId: data.riderId },
      _avg: { rating: true },
    });
    if (avg._avg?.rating) {
      await this.prisma.rider.update({
        where: { id: data.riderId },
        data: { rating: avg._avg.rating },
      });
    }

    return { rating: result, message: 'Rating submitted' };
  }
}
