import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TopupService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getProviders(countryCode?: string) {
    const where: any = { isActive: true };
    if (countryCode) where.countries = { has: countryCode };
    return this.prisma.topupProvider.findMany({ where });
  }

  async getCountries() {
    return [
      { code: 'KR', name: 'South Korea', flag: '🇰🇷', currency: 'KRW', operators: ['SKT', 'KT', 'LG U+', 'MVNO'] },
      { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', operators: ['AT&T', 'T-Mobile', 'Verizon'] },
      { code: 'PH', name: 'Philippines', flag: '🇵🇭', currency: 'PHP', operators: ['Globe', 'Smart', 'DITO'] },
      { code: 'VN', name: 'Vietnam', flag: '🇻🇳', currency: 'VND', operators: ['Viettel', 'Mobifone', 'Vinaphone'] },
      { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', currency: 'BDT', operators: ['Grameenphone', 'Robi', 'Banglalink', 'Teletalk'] },
      { code: 'PK', name: 'Pakistan', flag: '🇵🇰', currency: 'PKR', operators: ['Jazz', 'Telenor', 'Zong', 'Ufone'] },
      { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', operators: ['Airtel', 'Jio', 'Vi', 'BSNL'] },
      { code: 'CN', name: 'China', flag: '🇨🇳', currency: 'CNY', operators: ['China Mobile', 'China Unicom', 'China Telecom'] },
      { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', operators: ['MTN', 'Airtel', 'Glo', '9Mobile'] },
      { code: 'MX', name: 'Mexico', flag: '🇲🇽', currency: 'MXN', operators: ['Telcel', 'Movistar', 'AT&T'] },
    ];
  }

  async getAmounts(countryCode: string, operator: string) {
    // Predefined top-up amounts per country
    const amounts: Record<string, number[]> = {
      KR: [5000, 10000, 20000, 30000, 50000, 100000],
      US: [5, 10, 15, 20, 25, 30, 50],
      PH: [50, 100, 150, 300, 500, 1000],
      VN: [10000, 20000, 50000, 100000, 200000],
      BD: [10, 20, 50, 100, 200, 500],
      PK: [100, 200, 300, 500, 1000],
      IN: [10, 20, 50, 100, 200, 500],
      CN: [10, 20, 30, 50, 100],
      NG: [100, 200, 500, 1000, 2000],
      MX: [50, 100, 150, 200, 300, 500],
    };

    const exchangeRates: Record<string, number> = {
      KR: 1, US: 1350, PH: 24, VN: 0.053, BD: 12,
      PK: 4.8, IN: 16.2, CN: 186, NG: 0.88, MX: 70,
    };

    const available = amounts[countryCode] || [5, 10, 20, 30, 50];
    const rate = exchangeRates[countryCode] || 1;
    const serviceFee = countryCode === 'KR' ? 0 : 500;

    return {
      amounts: available,
      currency: countryCode === 'KR' ? 'KRW' : 'KRW',
      exchangeRate: rate,
      serviceFee,
      note: countryCode !== 'KR' ? 'International transfer rates apply' : null,
    };
  }

  async createTopupOrder(userId: string, dto: CreateTopupDto) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const orderNumber = `TOP-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const serviceFee = dto.countryCode !== 'KR' ? 500 : 0;
    const totalAmount = dto.amount + serviceFee;

    const order = await this.prisma.topupOrder.create({
      data: {
        orderNumber,
        customerId: customer.id,
        topupType: dto.countryCode === 'KR' ? 'LOCAL' : 'INTERNATIONAL',
        countryCode: dto.countryCode,
        countryName: dto.countryName,
        phoneNumber: dto.phoneNumber,
        operator: dto.operator,
        amount: dto.amount,
        serviceFee,
        totalAmount,
        paymentMethod: dto.paymentMethod,
        status: 'PENDING',
      },
    });

    return order;
  }

  async processTopup(orderId: string) {
    const order = await this.prisma.topupOrder.findUnique({
      where: { id: orderId },
      include: { customer: { include: { user: true } } },
    });
    if (!order) throw new NotFoundException('Top-up order not found');

    await this.prisma.topupOrder.update({ where: { id: orderId }, data: { status: 'PROCESSING' } });

    try {
      // Simulate API call to top-up provider
      const result = await this.callTopupProvider(order);

      await this.prisma.topupOrder.update({
        where: { id: orderId },
        data: {
          status: result.success ? 'SUCCESSFUL' : 'FAILED',
          providerReference: result.reference,
          failureReason: result.error,
          completedAt: result.success ? new Date() : undefined,
        },
      });

      await this.notifications.sendPushToUser(order.customer.userId, {
        title: result.success ? 'Top-Up Successful!' : 'Top-Up Failed',
        body: result.success
          ? `₩${order.amount.toLocaleString()} top-up to ${order.phoneNumber} was successful!`
          : `Top-up to ${order.phoneNumber} failed. A refund will be processed.`,
        data: { type: 'TOPUP', orderId, status: result.success ? 'SUCCESSFUL' : 'FAILED' },
      });

      return { success: result.success, order };
    } catch (e) {
      await this.prisma.topupOrder.update({ where: { id: orderId }, data: { status: 'FAILED', failureReason: e.message } });
      throw e;
    }
  }

  private async callTopupProvider(order: any): Promise<{ success: boolean; reference?: string; error?: string }> {
    // In production, integrate with DTone, Reloadly, or local Korean top-up APIs
    await new Promise((r) => setTimeout(r, 1000));
    return { success: true, reference: `REF-${Date.now()}` };
  }

  async getCustomerTopupOrders(userId: string, page = 1, limit = 10) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    const skip = (page - 1) * limit;
    const [total, orders] = await Promise.all([
      this.prisma.topupOrder.count({ where: { customerId: customer?.id } }),
      this.prisma.topupOrder.findMany({
        where: { customerId: customer?.id },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, orders };
  }

  async getAllTopupOrders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      this.prisma.topupOrder.count({ where }),
      this.prisma.topupOrder.findMany({
        where, skip, take: limit,
        include: {
          customer: { include: { user: { select: { fullName: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, orders };
  }
}

interface CreateTopupDto {
  countryCode: string;
  countryName: string;
  phoneNumber: string;
  operator: string;
  amount: number;
  paymentMethod: any;
}
