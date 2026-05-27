import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CouponsService {
  constructor(private prisma: PrismaService) {}

  async validateCoupon(code: string, orderAmount: number) {
    const coupon = await this.prisma.coupon.findFirst({
      where: { code: code.toUpperCase(), isActive: true, startDate: { lte: new Date() }, endDate: { gte: new Date() } },
    });
    if (!coupon) throw new NotFoundException('Invalid or expired coupon');
    if (orderAmount < coupon.minOrderAmount) throw new BadRequestException(`Minimum order amount is ₩${coupon.minOrderAmount.toLocaleString()}`);

    let discount = 0;
    if (coupon.type === 'PERCENTAGE') discount = Math.min(orderAmount * (coupon.value / 100), coupon.maxDiscount || Infinity);
    else if (coupon.type === 'FIXED') discount = Math.min(coupon.value, orderAmount);
    else if (coupon.type === 'FREE_DELIVERY') discount = 0;

    return { valid: true, coupon, discount, message: `Coupon applied! Save ₩${discount.toLocaleString()}` };
  }

  async create(dto: any) { return this.prisma.coupon.create({ data: { ...dto, code: dto.code.toUpperCase() } }); }
  async findAll() { return this.prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } }); }
  async update(id: string, dto: any) { return this.prisma.coupon.update({ where: { id }, data: dto }); }
  async delete(id: string) { return this.prisma.coupon.update({ where: { id }, data: { isActive: false } }); }
}
