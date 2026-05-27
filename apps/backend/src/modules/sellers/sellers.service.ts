import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { SellerStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SellersService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async checkStoreName(name: string) {
    const existing = await this.prisma.seller.findFirst({
      where: { storeName: { equals: name, mode: 'insensitive' } },
    });

    if (!existing) return { available: true, suggestions: [] };

    const base = name.trim();
    const candidates = [
      `${base} Plus`,
      `${base} Store`,
      `${base} KR`,
      `${base} Shop`,
      `${base} Mart`,
      `${base} 2`,
      `${base} Pro`,
    ];

    const taken = await this.prisma.seller.findMany({
      where: { storeName: { in: candidates, mode: 'insensitive' } },
      select: { storeName: true },
    });
    const takenNames = new Set(taken.map(s => s.storeName.toLowerCase()));
    const suggestions = candidates.filter(c => !takenNames.has(c.toLowerCase())).slice(0, 3);

    let i = 2;
    while (suggestions.length < 3) {
      const candidate = `${base} ${i}`;
      if (!takenNames.has(candidate.toLowerCase())) suggestions.push(candidate);
      i++;
    }

    return { available: false, suggestions: suggestions.slice(0, 3) };
  }

  async applyAsSeller(userId: string, dto: SellerApplicationDto) {
    const existing = await this.prisma.seller.findFirst({ where: { userId } });
    if (existing) throw new ConflictException('Seller application already exists');

    const slug = dto.storeName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();

    const seller = await this.prisma.seller.create({
      data: { userId, ...dto, storeSlug: slug, sellerStatus: 'PENDING' },
    });

    await this.prisma.user.update({ where: { id: userId }, data: { role: 'SELLER' } });

    await this.notifications.sendPushToRole('ADMIN', {
      title: 'New Seller Application',
      body: `${dto.storeName} has applied to become a seller`,
      data: { type: 'SYSTEM', sellerId: seller.id },
    });

    return { message: 'Application submitted. Under review.', seller };
  }

  async getSellerProfile(userId: string) {
    const seller = await this.prisma.seller.findFirst({
      where: { userId },
      include: { user: { select: { fullName: true, phone: true, email: true, avatar: true } } },
    });
    if (!seller) throw new NotFoundException('Seller profile not found');
    return seller;
  }

  async updateSellerProfile(userId: string, dto: Partial<SellerApplicationDto>) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller not found');
    return this.prisma.seller.update({ where: { id: seller.id }, data: dto });
  }

  async getSellerDashboard(userId: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller not found');

    const today = new Date(); today.setHours(0, 0, 0, 0);

    const [totalProducts, totalOrders, todayRevenue, pendingPayouts] = await Promise.all([
      this.prisma.product.count({ where: { sellerId: seller.id, status: 'ACTIVE' } }),
      this.prisma.orderItem.count({ where: { sellerId: seller.id } }),
      this.prisma.orderItem.aggregate({
        where: { sellerId: seller.id, order: { createdAt: { gte: today }, status: { notIn: ['CANCELLED', 'REFUNDED'] } } },
        _sum: { totalPrice: true },
      }),
      this.prisma.sellerPayout.count({ where: { sellerId: seller.id, status: 'PENDING' } }),
    ]);

    return {
      totalProducts,
      totalOrders,
      totalEarnings: seller.totalEarnings,
      pendingPayout: seller.pendingPayout,
      todayRevenue: todayRevenue._sum.totalPrice || 0,
      pendingPayouts,
      rating: seller.rating,
    };
  }

  async getSellerOrders(userId: string, page = 1, limit = 20, status?: string) {
    const seller = await this.prisma.seller.findFirst({ where: { userId } });
    if (!seller) throw new NotFoundException('Seller not found');

    const skip = (page - 1) * limit;
    const where: any = { sellerId: seller.id };
    if (status) where.order = { status };

    const [total, items] = await Promise.all([
      this.prisma.orderItem.count({ where }),
      this.prisma.orderItem.findMany({
        where, skip, take: limit,
        include: {
          order: { include: { customer: { include: { user: { select: { fullName: true, phone: true } } } } } },
          product: { include: { images: { take: 1 } } },
        },
        orderBy: { order: { createdAt: 'desc' } },
      }),
    ]);

    return { total, page, limit, items };
  }

  // Admin methods
  async getAllSellers(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.sellerStatus = status;

    const [total, sellers] = await Promise.all([
      this.prisma.seller.count({ where }),
      this.prisma.seller.findMany({
        where, skip, take: limit,
        include: { user: { select: { fullName: true, phone: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, sellers };
  }

  async adminUpdateSellerStatus(sellerId: string, status: string, adminId: string, reason?: string) {
    const seller = await this.prisma.seller.findUnique({
      where: { id: sellerId },
      include: { user: true },
    });
    if (!seller) throw new NotFoundException('Seller not found');

    await this.prisma.seller.update({
      where: { id: sellerId },
      data: {
        sellerStatus: status as SellerStatus,
        rejectionReason: reason,
        approvedAt: status === 'APPROVED' ? new Date() : undefined,
      },
    });

    await this.notifications.sendPushToUser(seller.userId, {
      title: status === 'APPROVED' ? '🎉 Seller Account Approved!' : 'Seller Application Update',
      body: status === 'APPROVED'
        ? 'Congratulations! Your seller account has been approved. Start adding products!'
        : `Your application status: ${status}. ${reason || ''}`,
      data: { type: 'SYSTEM', sellerId, status },
    });

    return { message: `Seller ${status.toLowerCase()}` };
  }
}

interface SellerApplicationDto {
  storeName: string;
  storeDescription?: string;
  businessRegNumber?: string;
  businessDocUrl?: string;
  idDocUrl?: string;
  bankName?: string;
  accountNumber?: string;
  accountHolderName?: string;
}
