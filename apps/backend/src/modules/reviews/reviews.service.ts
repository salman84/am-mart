import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async createReview(
    userId: string,
    data: {
      productId: string;
      orderId?: string;
      rating: number;
      comment?: string;
      images?: string[];
    },
  ) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    if (data.rating < 1 || data.rating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    if (data.orderId) {
      const order = await this.prisma.order.findUnique({ where: { id: data.orderId } });
      if (!order) throw new NotFoundException('Order not found');
      if (order.customerId !== customer.id) throw new ForbiddenException('Order does not belong to this customer');
      if (order.status !== 'DELIVERED') throw new BadRequestException('Order must be delivered before reviewing');
    }

    const review = await this.prisma.review.create({
      data: {
        customerId: customer.id,
        productId: data.productId,
        orderId: data.orderId ?? null,
        rating: data.rating,
        comment: data.comment ?? null,
        images: data.images ?? [],
        isApproved: true,
      },
      include: {
        customer: { include: { user: { select: { fullName: true, avatar: true } } } },
      },
    });

    await this._recalculateProductRating(data.productId);

    return review;
  }

  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where: { productId, isApproved: true } }),
      this.prisma.review.findMany({
        where: { productId, isApproved: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { include: { user: { select: { fullName: true, avatar: true } } } },
        },
      }),
    ]);

    return { total, page, limit, reviews };
  }

  async getMyReviews(userId: string) {
    const customer = await this.prisma.customer.findUnique({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.review.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          select: { id: true, name: true, images: { take: 1, orderBy: { sortOrder: 'asc' } } },
        },
      },
    });
  }

  async adminGetAll(page = 1, limit = 20, approved?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (approved !== undefined) where.isApproved = approved;

    const [total, reviews] = await Promise.all([
      this.prisma.review.count({ where }),
      this.prisma.review.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: { include: { user: { select: { fullName: true, avatar: true } } } },
          product: { select: { id: true, name: true } },
        },
      }),
    ]);

    return { total, page, limit, reviews };
  }

  async adminToggleApproval(reviewId: string, approved: boolean) {
    const review = await this.prisma.review.findUnique({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: { isApproved: approved },
    });

    await this._recalculateProductRating(review.productId);

    return updated;
  }

  private async _recalculateProductRating(productId: string) {
    const result = await this.prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.product.update({
      where: { id: productId },
      data: {
        rating: result._avg.rating ?? 0,
        reviewCount: result._count.rating,
      },
    });
  }
}
