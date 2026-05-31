import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ProductQueryDto) {
    const {
      page = 1, limit = 20, categoryId, sellerId, search,
      minPrice, maxPrice, sortBy = 'createdAt', sortOrder = 'desc',
      featured, status = 'ACTIVE',
    } = query;

    const skip = (page - 1) * limit;
    const where: any = { status };

    if (categoryId) where.categoryId = categoryId;
    if (sellerId) where.sellerId = sellerId;
    if (featured !== undefined) where.isFeatured = featured;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = minPrice;
      if (maxPrice) where.price.lte = maxPrice;
    }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { nameKr: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, skip, take: limit,
        include: {
          images: { orderBy: { sortOrder: 'asc' }, take: 1 },
          category: { select: { id: true, name: true, slug: true } },
          seller: { select: { id: true, storeName: true, rating: true } },
        },
        orderBy: { [sortBy]: sortOrder },
      }),
    ]);

    return { total, page, limit, products };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        seller: { select: { id: true, storeName: true, storeLogo: true, rating: true, totalSales: true } },
        reviews: {
          where: { isApproved: true },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: { customer: { include: { user: { select: { fullName: true, avatar: true } } } } },
        },
      },
    });

    if (!product || product.status === 'DELETED') throw new NotFoundException('Product not found');

    await this.prisma.product.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    return product;
  }

  async createProduct(userId: string, dto: CreateProductDto, userRole?: string) {
    let seller;
    if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') {
      seller = await this.prisma.seller.findFirst({ where: { sellerStatus: 'APPROVED' }, orderBy: { createdAt: 'asc' } });
    } else {
      seller = await this.prisma.seller.findFirst({ where: { userId, sellerStatus: 'APPROVED' } });
    }
    if (!seller) throw new ForbiddenException('No approved seller account found');

    const { images, ...productData } = dto;
    return this.prisma.product.create({
      data: {
        ...productData,
        sellerId: seller.id,
        images: images?.length
          ? { create: images.map((url, i) => ({ url, sortOrder: i })) }
          : undefined,
      },
      include: { images: true },
    });
  }

  async updateProduct(id: string, userId: string, dto: Partial<CreateProductDto>, userRole?: string) {
    const where = (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
      ? { id }
      : { id, seller: { userId } };
    const product = await this.prisma.product.findFirst({ where, include: { seller: true } });
    if (!product) throw new NotFoundException('Product not found');

    const { images, ...productData } = dto;
    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...productData,
        ...(images !== undefined && {
          images: {
            deleteMany: {},
            create: images.map((url, i) => ({ url, sortOrder: i })),
          },
        }),
      },
      include: { images: true },
    });

    // Low-stock alert: notify seller + admins when stock drops below 5
    if (typeof dto.stock === 'number' && dto.stock < 5) {
      const newStock = updated.stock;
      const productName = updated.name;

      const notificationTargets: string[] = [];

      // Seller's userId
      if (product.seller?.userId) {
        notificationTargets.push(product.seller.userId);
      }

      // Admin and Super Admin userIds
      const adminUsers = await this.prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true },
      });
      for (const admin of adminUsers) {
        if (!notificationTargets.includes(admin.id)) {
          notificationTargets.push(admin.id);
        }
      }

      if (notificationTargets.length > 0) {
        await this.prisma.notification.createMany({
          data: notificationTargets.map((targetUserId) => ({
            userId: targetUserId,
            type: 'SYSTEM' as const,
            title: 'Low Stock Alert',
            body: `"${productName}" is running low on stock (${newStock} remaining)`,
          })),
        });
      }
    }

    return updated;
  }

  /** Seller toggles their own product visible (ACTIVE) / hidden (INACTIVE) */
  async setSellerVisibility(productId: string, userId: string, visible: boolean) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, seller: { userId } },
    });
    if (!product) throw new NotFoundException('Product not found or not owned by you');
    if (product.status === 'DELETED') throw new NotFoundException('Product not found');

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: visible ? 'ACTIVE' : 'INACTIVE' },
    });
    return { visible, message: visible ? 'Product is now visible' : 'Product is now hidden' };
  }

  async deleteProduct(id: string, userId: string, userRole?: string) {
    const where = (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN')
      ? { id }
      : { id, seller: { userId } };
    const product = await this.prisma.product.findFirst({ where });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.update({ where: { id }, data: { status: 'DELETED' } });
    return { message: 'Product deleted' };
  }

  /** Same-category products, excluding the current one — used for "You may also like" */
  async getRelatedProducts(productId: string, limit = 8) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { categoryId: true },
    });
    if (!product) return [];

    return this.prisma.product.findMany({
      where: {
        categoryId: product.categoryId,
        id:         { not: productId },
        status:     'ACTIVE',
      },
      take: limit,
      include: {
        images: { take: 1, orderBy: { sortOrder: 'asc' } },
        seller: { select: { storeName: true } },
      },
      orderBy: { viewCount: 'desc' },
    });
  }

  async getFeaturedProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { isFeatured: true, status: 'ACTIVE' },
      take: limit,
      include: { images: { take: 1 }, seller: { select: { storeName: true } } },
      orderBy: { viewCount: 'desc' },
    });
  }

  async getPopularProducts(limit = 10) {
    return this.prisma.product.findMany({
      where: { status: 'ACTIVE' },
      take: limit,
      include: { images: { take: 1 }, seller: { select: { storeName: true } } },
      orderBy: { reviewCount: 'desc' },
    });
  }

  async toggleWishlist(customerId: string, productId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId: customerId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId } },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      return { wishlisted: false };
    }

    await this.prisma.wishlistItem.create({ data: { customerId: customer.id, productId } });
    return { wishlisted: true };
  }

  async getWishlist(userId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    return this.prisma.wishlistItem.findMany({
      where: { customerId: customer.id },
      include: { product: { include: { images: { take: 1 } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async setAdminVisibility(productId: string, visible: boolean, reason: string, adminId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { seller: true },
    });
    if (!product) throw new NotFoundException('Product not found');

    await this.prisma.product.update({
      where: { id: productId },
      data: { status: visible ? 'ACTIVE' : 'INACTIVE' },
    });

    // Send notification to seller
    const sellerUserId = product.seller?.userId;
    if (sellerUserId) {
      await this.prisma.notification.create({
        data: {
          userId: sellerUserId,
          title: visible ? 'Product Visible Again' : 'Product Hidden',
          body: visible
            ? `Your product "${product.name}" is now visible to customers.`
            : `Your product "${product.name}" has been hidden. Reason: ${reason || 'No reason provided'}`,
          type: 'SYSTEM',
          isRead: false,
        },
      });
    }

    return { success: true, productId, visible };
  }
}

interface ProductQueryDto {
  page?: number;
  limit?: number;
  categoryId?: string;
  sellerId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  featured?: boolean;
  status?: string;
}

interface CreateProductDto {
  categoryId: string;
  name: string;
  nameKr?: string;
  description: string;
  price: number;
  discountPrice?: number;
  stock: number;
  unit?: string;
  weight?: string;
  brand?: string;
  countryOfOrigin?: string;
  isDeliveryAvailable?: boolean;
  deliveryFee?: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  tags?: string[];
  isFeatured?: boolean;
  images?: string[];
}
