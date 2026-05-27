import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);

    const [
      totalUsers, totalSellers, totalRiders, totalProducts,
      totalOrders, todayOrders, monthOrders, pendingSimOrders,
      totalRevenue, todayRevenue, monthRevenue,
      activeSims, pendingSellerApprovals, openTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
      this.prisma.seller.count({ where: { sellerStatus: 'APPROVED' } }),
      this.prisma.rider.count(),
      this.prisma.product.count({ where: { status: 'ACTIVE' } }),
      this.prisma.order.count(),
      this.prisma.order.count({ where: { createdAt: { gte: today } } }),
      this.prisma.order.count({ where: { createdAt: { gte: thisMonth } } }),
      this.prisma.simOrder.count({ where: { status: 'PENDING' } }),
      this.prisma.order.aggregate({ where: { paymentStatus: 'PAID' }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: today } }, _sum: { total: true } }),
      this.prisma.order.aggregate({ where: { paymentStatus: 'PAID', createdAt: { gte: thisMonth } }, _sum: { total: true } }),
      this.prisma.simNumber.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.seller.count({ where: { sellerStatus: 'PENDING' } }),
      this.prisma.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);

    return {
      users: { total: totalUsers },
      sellers: { approved: totalSellers, pending: pendingSellerApprovals },
      riders: { total: totalRiders },
      products: { active: totalProducts },
      orders: { total: totalOrders, today: todayOrders, thisMonth: monthOrders },
      revenue: {
        total: totalRevenue._sum.total || 0,
        today: todayRevenue._sum.total || 0,
        thisMonth: monthRevenue._sum.total || 0,
      },
      sim: { available: activeSims, pending: pendingSimOrders },
      support: { open: openTickets },
    };
  }

  async getSettings() {
    const settings = await this.prisma.appSettings.findMany({ orderBy: { key: 'asc' } });
    return { settings };
  }

  async getPublicSettings() {
    const PUBLIC_KEYS = [
      'APP_NAME', 'APP_LOGO', 'CURRENCY', 'CURRENCY_SYMBOL',
      'DELIVERY_FEE', 'FREE_DELIVERY_THRESHOLD',
      'FEATURE_TOPUP', 'FEATURE_SIM', 'FEATURE_WALLET', 'FEATURE_REVIEWS',
      'FEATURE_DELIVERY_TRACKING', 'PRIMARY_COLOR', 'APP_MIN_VERSION',
      'APP_TAGLINE', 'APP_POPULAR_SEARCHES',
      'SUPPORT_EMAIL', 'SUPPORT_PHONE',
      // Landing page CMS
      'LP_HERO_TITLE', 'LP_HERO_SUBTITLE', 'LP_HERO_CTA_PRIMARY', 'LP_HERO_CTA_SECONDARY',
      'LP_STATS_SELLERS', 'LP_STATS_PRODUCTS', 'LP_STATS_CUSTOMERS', 'LP_STATS_DELIVERIES',
      'LP_WHY_TITLE', 'LP_WHY_SUBTITLE',
      'LP_FEATURE_1_TITLE', 'LP_FEATURE_1_DESC',
      'LP_FEATURE_2_TITLE', 'LP_FEATURE_2_DESC',
      'LP_FEATURE_3_TITLE', 'LP_FEATURE_3_DESC',
      'LP_MARKET_TITLE', 'LP_MARKET_SUBTITLE',
      'LP_MARKET_1_TITLE', 'LP_MARKET_1_DESC',
      'LP_MARKET_2_TITLE', 'LP_MARKET_2_DESC',
      'LP_MARKET_3_TITLE', 'LP_MARKET_3_DESC',
      'LP_TESTIMONIAL_1_QUOTE', 'LP_TESTIMONIAL_1_NAME', 'LP_TESTIMONIAL_1_COMPANY',
      'LP_TESTIMONIAL_2_QUOTE', 'LP_TESTIMONIAL_2_NAME', 'LP_TESTIMONIAL_2_COMPANY',
      'LP_TESTIMONIAL_3_QUOTE', 'LP_TESTIMONIAL_3_NAME', 'LP_TESTIMONIAL_3_COMPANY',
      'LP_STEPS_TITLE',
      'LP_STEP_1_TITLE', 'LP_STEP_1_DESC',
      'LP_STEP_2_TITLE', 'LP_STEP_2_DESC',
      'LP_STEP_3_TITLE', 'LP_STEP_3_DESC',
      'LP_SUPPORT_TITLE', 'LP_SUPPORT_DESC',
      'LP_NAV_FEATURES', 'LP_NAV_HOW_IT_WORKS', 'LP_NAV_TESTIMONIALS', 'LP_NAV_CONTACT',
    ];
    const settings = await this.prisma.appSettings.findMany({ where: { key: { in: PUBLIC_KEYS } } });
    const result = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    // If CURRENCY_SYMBOL is not set, use CURRENCY as fallback
    if (!result['CURRENCY_SYMBOL'] && result['CURRENCY']) {
      result['CURRENCY_SYMBOL'] = result['CURRENCY'];
    }
    // Defaults for missing keys
    const featureDefaults = ['FEATURE_TOPUP', 'FEATURE_SIM', 'FEATURE_WALLET', 'FEATURE_REVIEWS', 'FEATURE_DELIVERY_TRACKING'];
    for (const key of featureDefaults) {
      if (result[key] === undefined) result[key] = 'true';
    }
    if (result['PRIMARY_COLOR'] === undefined) result['PRIMARY_COLOR'] = '#10B981';
    if (result['APP_MIN_VERSION'] === undefined) result['APP_MIN_VERSION'] = '1.0.0';
    return result;
  }

  async updateSetting(key: string, value: string, userId: string) {
    return this.prisma.appSettings.upsert({
      where: { key },
      update: { value, updatedBy: userId },
      create: { key, value, updatedBy: userId },
    });
  }

  async getActivityLogs(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const [total, logs] = await Promise.all([
      this.prisma.adminLog.count(),
      this.prisma.adminLog.findMany({
        skip, take: limit,
        include: { user: { select: { fullName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, logs };
  }

  async logAction(userId: string, action: string, module: string, details?: any) {
    return this.prisma.adminLog.create({
      data: { userId, action, module, details },
    });
  }

  async getReports(period: 'daily' | 'weekly' | 'monthly' = 'weekly') {
    const now = new Date();
    const days = period === 'daily' ? 7 : period === 'monthly' ? 90 : 30;
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const [orders, topProducts, newUsers] = await Promise.all([
      this.prisma.order.findMany({
        where: { createdAt: { gte: from }, paymentStatus: 'PAID' },
        select: { total: true, createdAt: true },
      }),
      this.prisma.orderItem.groupBy({
        by: ['productId'],
        where: { order: { createdAt: { gte: from } } },
        _count: { productId: true },
        _sum: { totalPrice: true },
        orderBy: { _count: { productId: 'desc' } },
        take: 5,
      }),
      this.prisma.user.count({ where: { createdAt: { gte: from } } }),
    ]);

    // Group revenue by day
    const revenueByDay: Record<string, number> = {};
    orders.forEach((o) => {
      const day = o.createdAt.toISOString().split('T')[0];
      revenueByDay[day] = (revenueByDay[day] || 0) + Number(o.total);
    });

    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);

    // Get product names for top products
    const productIds = topProducts.map((p) => p.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    return {
      period,
      from: from.toISOString(),
      to: now.toISOString(),
      totalRevenue,
      totalOrders: orders.length,
      newUsers,
      avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
      revenueByDay: Object.entries(revenueByDay).map(([date, revenue]) => ({ date, revenue })),
      topProducts: topProducts.map((p) => ({
        name: productMap[p.productId] || p.productId,
        orders: p._count.productId,
        revenue: p._sum.totalPrice || 0,
      })),
      topSellers: [],
    };
  }

  async getDeliveryZones() {
    return this.prisma.deliveryZone.findMany({ orderBy: { name: 'asc' } });
  }

  async createDeliveryZone(data: {
    name: string;
    description?: string;
    polygon: any;
    deliveryFee?: number;
    isActive?: boolean;
  }) {
    return this.prisma.deliveryZone.create({ data });
  }

  async updateDeliveryZone(
    id: string,
    data: {
      name?: string;
      description?: string;
      polygon?: any;
      deliveryFee?: number;
      isActive?: boolean;
    },
  ) {
    return this.prisma.deliveryZone.update({ where: { id }, data });
  }

  async deleteDeliveryZone(id: string) {
    await this.prisma.deliveryZone.delete({ where: { id } });
    return { message: 'Delivery zone deleted' };
  }

  async exportBackup() {
    const [settings, banners, categories, coupons] = await Promise.all([
      this.prisma.appSettings.findMany(),
      this.prisma.banner.findMany(),
      this.prisma.category.findMany({ where: { parentId: null } }),
      this.prisma.coupon.findMany({ where: { isActive: true } }),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      version: '1.0',
      settings,
      banners,
      categories,
      coupons,
    };
  }
}
