import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Parcel Delivery Overview Dashboard
  // ═══════════════════════════════════════════════════════════════════════════

  async getParcelOverview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today); monthAgo.setDate(monthAgo.getDate() - 30);

    const [
      totalPackages, packagesToday, packagesThisWeek,
      deliveredTotal, deliveredToday,
      failedTotal, failedToday,
      inTransit, outForDelivery,
      totalRoutes, activeRoutes,
      totalDrivers, onlineDrivers,
      totalCenters,
    ] = await Promise.all([
      this.prisma.package.count(),
      this.prisma.package.count({ where: { createdAt: { gte: today } } }),
      this.prisma.package.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.package.count({ where: { status: 'DELIVERED' } }),
      this.prisma.package.count({ where: { status: 'DELIVERED', updatedAt: { gte: today } } }),
      this.prisma.package.count({ where: { status: 'DELIVERY_FAILED' } }),
      this.prisma.package.count({ where: { status: 'DELIVERY_FAILED', updatedAt: { gte: today } } }),
      this.prisma.package.count({ where: { status: 'IN_TRANSIT' } }),
      this.prisma.package.count({ where: { status: 'OUT_FOR_DELIVERY' } }),
      this.prisma.deliveryRoute.count(),
      this.prisma.deliveryRoute.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.rider.count(),
      this.prisma.rider.count({ where: { isOnline: true } }),
      this.prisma.fulfillmentCenter.count({ where: { isActive: true } }),
    ]);

    const deliveryRate = totalPackages > 0 ? Math.round((deliveredTotal / totalPackages) * 100) : 0;

    return {
      overview: {
        totalPackages, packagesToday, packagesThisWeek,
        deliveredTotal, deliveredToday,
        failedTotal, failedToday,
        inTransit, outForDelivery,
        deliveryRate,
        totalRoutes, activeRoutes,
        totalDrivers, onlineDrivers,
        totalCenters,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Package Status Breakdown
  // ═══════════════════════════════════════════════════════════════════════════

  async getPackageStatusBreakdown() {
    const statuses = await this.prisma.package.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    return {
      breakdown: statuses.map(s => ({
        status: s.status,
        count: s._count.id,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Driver Performance
  // ═══════════════════════════════════════════════════════════════════════════

  async getDriverPerformance(params: { period?: string; limit?: number }) {
    const { period = '30d', limit = 20 } = params;
    const days = parseInt(period) || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const drivers = await this.prisma.rider.findMany({
      take: limit,
      orderBy: { totalDeliveries: 'desc' },
      select: {
        id: true,
        user: { select: { fullName: true, phone: true } },
        totalDeliveries: true,
        totalEarnings: true,
        rating: true,
        isOnline: true,
        riderStatus: true,
        _count: {
          select: {
            assignedRoutes: { where: { status: 'COMPLETED', completedAt: { gte: since } } },
            deliveryProofs: { where: { deliveredAt: { gte: since } } },
            failedDeliveries: { where: { createdAt: { gte: since } } },
          },
        },
      },
    });

    return {
      drivers: drivers.map(d => ({
        id: d.id,
        name: d.user?.fullName,
        phone: d.user?.phone,
        totalDeliveries: d.totalDeliveries,
        totalEarnings: d.totalEarnings,
        rating: d.rating,
        isOnline: d.isOnline,
        status: d.riderStatus,
        periodRoutes: d._count.assignedRoutes,
        periodDeliveries: d._count.deliveryProofs,
        periodFailed: d._count.failedDeliveries,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Warehouse Performance
  // ═══════════════════════════════════════════════════════════════════════════

  async getWarehousePerformance() {
    const centers = await this.prisma.fulfillmentCenter.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, code: true,
        capacity: true, currentOccupancy: true,
        _count: {
          select: {
            bins: true,
            inventory: true,
            packages: true,
            routes: true,
          },
        },
      },
    });

    return {
      centers: centers.map(c => ({
        id: c.id, name: c.name, code: c.code,
        capacity: c.capacity,
        occupancy: c.currentOccupancy,
        occupancyPercent: c.capacity > 0 ? Math.round((c.currentOccupancy / c.capacity) * 100) : 0,
        totalBins: c._count.bins,
        inventoryItems: c._count.inventory,
        totalPackages: c._count.packages,
        totalRoutes: c._count.routes,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Failed Delivery Analysis
  // ═══════════════════════════════════════════════════════════════════════════

  async getFailedDeliveryAnalysis(params: { period?: string }) {
    const days = parseInt(params.period || '30') || 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const byReason = await this.prisma.failedDelivery.groupBy({
      by: ['reason'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const total = byReason.reduce((sum, r) => sum + r._count.id, 0);

    return {
      analysis: {
        total,
        period: `${days}d`,
        byReason: byReason.map(r => ({
          reason: r.reason,
          count: r._count.id,
          percentage: total > 0 ? Math.round((r._count.id / total) * 100) : 0,
        })),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Return Analytics
  // ═══════════════════════════════════════════════════════════════════════════

  async getReturnAnalytics() {
    const byStatus = await this.prisma.returnRequest.groupBy({
      by: ['status'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totalRefunded = await this.prisma.returnRequest.aggregate({
      where: { status: 'REFUNDED' },
      _sum: { refundAmount: true },
      _count: { id: true },
    });

    return {
      returns: {
        byStatus: byStatus.map(s => ({ status: s.status, count: s._count.id })),
        totalRefunded: totalRefunded._sum.refundAmount || 0,
        totalRefundedCount: totalRefunded._count.id,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Settlement Summary
  // ═══════════════════════════════════════════════════════════════════════════

  async getSettlementSummary() {
    const byStatus = await this.prisma.driverEarningsSettlement.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { netAmount: true },
      orderBy: { _count: { id: 'desc' } },
    });

    const totals = await this.prisma.driverEarningsSettlement.aggregate({
      _sum: { totalEarnings: true, bonuses: true, deductions: true, netAmount: true, codCollected: true },
      _count: { id: true },
    });

    return {
      settlements: {
        byStatus: byStatus.map(s => ({
          status: s.status, count: s._count.id, amount: s._sum.netAmount || 0,
        })),
        totals: {
          totalSettlements: totals._count.id,
          totalEarnings: totals._sum.totalEarnings || 0,
          totalBonuses: totals._sum.bonuses || 0,
          totalDeductions: totals._sum.deductions || 0,
          totalNetAmount: totals._sum.netAmount || 0,
          totalCodCollected: totals._sum.codCollected || 0,
        },
      },
    };
  }
}
