import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  // ─── Admin: Create ────────────────────────────────────────────────────────
  async create(dto: any) {
    const data: any = {
      code: dto.code.toUpperCase(),
      title: dto.title || dto.code.toUpperCase(),
      description: dto.description || null,
      type: dto.type || dto.discountType || 'PERCENTAGE',
      category: dto.category || 'MANUAL',
      value: Number(dto.value ?? dto.discountValue ?? 0),
      minOrderAmount: Number(dto.minOrderAmount ?? 0),
      maxDiscount: dto.maxDiscount ?? dto.maxDiscountAmount ?? null,
      usageLimit: dto.usageLimit ?? null,
      perUserLimit: dto.perUserLimit ?? 1,
      isActive: dto.isActive !== false,
      autoAssign: dto.autoAssign === true,
      startDate: dto.startDate ? new Date(dto.startDate) : new Date(),
      endDate: dto.endDate
        ? new Date(dto.endDate)
        : dto.expiresAt
          ? new Date(dto.expiresAt)
          : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };
    return this.prisma.coupon.create({ data });
  }

  // ─── Admin: List all ──────────────────────────────────────────────────────
  async findAll() {
    const coupons = await (this.prisma as any).coupon.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { userCoupons: true } } },
    });
    return {
      coupons: coupons.map((c: any) => ({
        ...c,
        usageCount: c._count?.userCoupons ?? c.usedCount ?? 0,
        discountType: c.type,
        discountValue: c.value,
        maxDiscountAmount: c.maxDiscount,
        expiresAt: c.endDate,
      })),
    };
  }

  // ─── Admin: Update ────────────────────────────────────────────────────────
  async update(id: string, dto: any) {
    const data: any = { ...dto };
    if (dto.discountType) { data.type = dto.discountType; delete data.discountType; }
    if (dto.discountValue !== undefined) { data.value = Number(dto.discountValue); delete data.discountValue; }
    if (dto.maxDiscountAmount !== undefined) { data.maxDiscount = dto.maxDiscountAmount; delete data.maxDiscountAmount; }
    if (dto.expiresAt) { data.endDate = new Date(dto.expiresAt); delete data.expiresAt; }
    if (dto.code) data.code = dto.code.toUpperCase();
    delete data.id;
    return (this.prisma as any).coupon.update({ where: { id }, data });
  }

  // ─── Admin: Soft delete ───────────────────────────────────────────────────
  async delete(id: string) {
    return (this.prisma as any).coupon.update({ where: { id }, data: { isActive: false } });
  }

  // ─── Admin: Toggle active (start / stop) ─────────────────────────────────
  async toggleActive(id: string) {
    const coupon = await (this.prisma as any).coupon.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    const updated = await (this.prisma as any).coupon.update({
      where: { id },
      data: { isActive: !coupon.isActive },
    });
    return { message: updated.isActive ? 'Coupon activated' : 'Coupon deactivated', coupon: updated };
  }

  // ─── Validate coupon code (public) ────────────────────────────────────────
  async validateCoupon(code: string, orderAmount: number, userId?: string) {
    const now = new Date();
    const coupon = await (this.prisma as any).coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (!coupon) throw new NotFoundException('Invalid or expired coupon');
    if (orderAmount < coupon.minOrderAmount) {
      throw new BadRequestException(`Minimum order amount is ${coupon.minOrderAmount.toLocaleString()}`);
    }

    // If user provided, check per-user limit
    if (userId) {
      const usedByUser = await (this.prisma as any).userCoupon.count({
        where: { userId, couponId: coupon.id, isUsed: true },
      });
      if (usedByUser >= coupon.perUserLimit) {
        throw new BadRequestException('You have already used this coupon');
      }

      // FIRST_PURCHASE: only valid if user has zero completed orders
      if (coupon.category === 'FIRST_PURCHASE') {
        const customer = await this.prisma.customer.findFirst({ where: { userId } });
        if (customer) {
          const orderCount = await this.prisma.order.count({
            where: { customerId: customer.id, status: { notIn: ['CANCELLED'] } },
          });
          if (orderCount > 0) throw new BadRequestException('This coupon is only valid on your first order');
        }
      }
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.min(orderAmount * (coupon.value / 100), coupon.maxDiscount ?? Infinity);
    } else if (coupon.type === 'FIXED') {
      discount = Math.min(coupon.value, orderAmount);
    }

    return {
      valid: true,
      coupon,
      discount,
      discountType: coupon.type,
      discountValue: coupon.value,
      maxDiscountAmount: coupon.maxDiscount,
      description: coupon.description,
      message: `Coupon applied! You save ${discount.toLocaleString()}`,
    };
  }

  // ─── User: Get coupon wallet ───────────────────────────────────────────────
  async getUserCoupons(userId: string) {
    const now = new Date();
    const userCoupons = await (this.prisma as any).userCoupon.findMany({
      where: { userId },
      include: {
        coupon: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      coupons: userCoupons.map((uc: any) => ({
        userCouponId: uc.id,
        couponId: uc.couponId,
        code: uc.coupon.code,
        title: uc.coupon.title,
        description: uc.coupon.description,
        type: uc.coupon.type,
        category: uc.coupon.category,
        value: uc.coupon.value,
        minOrderAmount: uc.coupon.minOrderAmount,
        maxDiscount: uc.coupon.maxDiscount,
        isUsed: uc.isUsed,
        usedAt: uc.usedAt,
        source: uc.source,
        isActive: uc.coupon.isActive,
        isValid: !uc.isUsed && uc.coupon.isActive && uc.coupon.endDate >= now,
        expiresAt: uc.coupon.endDate,
        createdAt: uc.createdAt,
      })),
    };
  }

  // ─── Auto-assign Welcome + First Purchase coupons on registration ─────────
  async assignWelcomeCoupons(userId: string) {
    const now = new Date();
    const categories = ['WELCOME', 'FIRST_PURCHASE'];
    const assigned: string[] = [];

    for (const category of categories) {
      const coupon = await (this.prisma as any).coupon.findFirst({
        where: {
          category,
          isActive: true,
          autoAssign: true,
          startDate: { lte: now },
          endDate: { gte: now },
        },
      });
      if (!coupon) continue;

      // Avoid duplicate assignment
      const exists = await (this.prisma as any).userCoupon.findUnique({
        where: { userId_couponId: { userId, couponId: coupon.id } },
      });
      if (exists) continue;

      await (this.prisma as any).userCoupon.create({
        data: { userId, couponId: coupon.id, source: category },
      });
      assigned.push(category);
    }

    return { assigned };
  }

  // ─── Auto-assign Referral coupons ─────────────────────────────────────────
  async processReferralSignup(newUserId: string, referralCode: string) {
    // Find the referrer
    const referrer = await (this.prisma as any).user.findFirst({
      where: { referralCode },
    });
    if (!referrer) return;

    const now = new Date();

    // Give REFERRAL_RECEIVER coupon to the new user
    const receiverCoupon = await (this.prisma as any).coupon.findFirst({
      where: {
        category: 'REFERRAL_RECEIVER',
        isActive: true,
        autoAssign: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (receiverCoupon) {
      const existsR = await (this.prisma as any).userCoupon.findUnique({
        where: { userId_couponId: { userId: newUserId, couponId: receiverCoupon.id } },
      });
      if (!existsR) {
        await (this.prisma as any).userCoupon.create({
          data: { userId: newUserId, couponId: receiverCoupon.id, source: 'REFERRAL_RECEIVER' },
        });
      }
    }

    // Give REFERRAL_SENDER coupon to the referrer
    const senderCoupon = await (this.prisma as any).coupon.findFirst({
      where: {
        category: 'REFERRAL_SENDER',
        isActive: true,
        autoAssign: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (senderCoupon) {
      // Referrer can earn multiple referral coupons (one per successful referral)
      await (this.prisma as any).userCoupon.create({
        data: { userId: referrer.id, couponId: senderCoupon.id, source: 'REFERRAL_SENDER' },
      }).catch(() => {
        // Unique constraint violation — already assigned (shouldn't happen as referrals stack, but safe)
      });
    }
  }

  // ─── Mark a UserCoupon as used (called from orders service) ───────────────
  async markCouponUsed(userId: string, couponCode: string, orderId: string) {
    const coupon = await (this.prisma as any).coupon.findFirst({
      where: { code: couponCode.toUpperCase() },
    });
    if (!coupon) return;

    // Find user-owned coupon first, else fall back to global
    const userCoupon = await (this.prisma as any).userCoupon.findFirst({
      where: { userId, couponId: coupon.id, isUsed: false },
    });
    if (userCoupon) {
      await (this.prisma as any).userCoupon.update({
        where: { id: userCoupon.id },
        data: { isUsed: true, usedAt: new Date(), usedOrderId: orderId },
      });
    }

    // Always bump global usedCount
    await (this.prisma as any).coupon.update({
      where: { id: coupon.id },
      data: { usedCount: { increment: 1 } },
    });
  }

  // ─── Get referral stats for a user ────────────────────────────────────────
  async getReferralStats(userId: string) {
    const user = await (this.prisma as any).user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const referredCount = await (this.prisma as any).user.count({
      where: { referredBy: user.referralCode },
    });

    const earnedCoupons = await (this.prisma as any).userCoupon.count({
      where: { userId, source: 'REFERRAL_SENDER' },
    });

    return {
      referralCode: user.referralCode,
      referredCount,
      earnedCoupons,
    };
  }
}
