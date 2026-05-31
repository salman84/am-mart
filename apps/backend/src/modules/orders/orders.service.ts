import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CouponsService } from '../coupons/coupons.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
    private coupons: CouponsService,
  ) {}

  async getCart(userId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const items = await this.prisma.cartItem.findMany({
      where: { customerId: customer.id },
      include: {
        product: {
          include: {
            images: { take: 1 },
            seller: { select: { storeName: true } },
          },
        },
      },
    });

    const subtotal = items.reduce((sum, item) => {
      const price = item.product.discountPrice || item.product.price;
      return sum + price * item.quantity;
    }, 0);

    return { items, subtotal, itemCount: items.length };
  }

  async addToCart(userId: string, productId: string, quantity: number) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product || product.status !== 'ACTIVE') throw new NotFoundException('Product not found');
    if (product.stock < quantity) throw new BadRequestException('Insufficient stock');

    const existing = await this.prisma.cartItem.findUnique({
      where: { customerId_productId: { customerId: customer.id, productId } },
    });

    if (existing) {
      const newQty = existing.quantity + quantity;
      if (product.stock < newQty) throw new BadRequestException('Insufficient stock');
      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
        include: { product: { include: { images: { take: 1 } } } },
      });
    }

    return this.prisma.cartItem.create({
      data: { customerId: customer.id, productId, quantity },
      include: { product: { include: { images: { take: 1 } } } },
    });
  }

  async updateCartItem(userId: string, itemId: string, quantity: number) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, customerId: customer?.id },
      include: { product: true },
    });
    if (!item) throw new NotFoundException('Cart item not found');

    if (quantity === 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
      return { message: 'Item removed from cart' };
    }

    if (item.product.stock < quantity) throw new BadRequestException('Insufficient stock');
    return this.prisma.cartItem.update({ where: { id: itemId }, data: { quantity } });
  }

  async clearCart(userId: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    await this.prisma.cartItem.deleteMany({ where: { customerId: customer?.id } });
    return { message: 'Cart cleared' };
  }

  async createOrder(userId: string, dto: CreateOrderDto) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const cartItems = await this.prisma.cartItem.findMany({
      where: { customerId: customer.id },
      include: { product: { include: { seller: true } } },
    });

    if (!cartItems.length) throw new BadRequestException('Cart is empty');

    // Validate stock and calculate totals
    for (const item of cartItems) {
      if (item.product.status !== 'ACTIVE') {
        throw new BadRequestException(`Product "${item.product.name}" is no longer available`);
      }
      if (item.product.stock < item.quantity) {
        throw new BadRequestException(`Insufficient stock for "${item.product.name}"`);
      }
    }

    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of cartItems) {
      const unitPrice = item.product.discountPrice || item.product.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;
      orderItems.push({
        productId: item.productId,
        sellerId: item.product.sellerId,
        productName: item.product.name,
        productImage: null,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      });
    }

    // Apply coupon
    let discount = 0;
    if (dto.couponCode) {
      const coupon = await this.prisma.coupon.findFirst({
        where: {
          code: dto.couponCode,
          isActive: true,
          startDate: { lte: new Date() },
          endDate: { gte: new Date() },
          OR: [{ usageLimit: null }, { usageLimit: { gt: 0 } }],
        },
      });
      if (coupon) {
        if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
          throw new BadRequestException('Coupon usage limit reached');
        }
        if (subtotal >= coupon.minOrderAmount) {
          if (coupon.type === 'PERCENTAGE') {
            discount = Math.min(subtotal * (coupon.value / 100), coupon.maxDiscount || Infinity);
          } else if (coupon.type === 'FIXED') {
            discount = Math.min(coupon.value, subtotal);
          }
          // usedCount + UserCoupon marking handled after order creation
        }
      }
    }

    const deliveryFee = dto.deliveryFee || 3000;
    const total = subtotal - discount + deliveryFee;

    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          addressId: dto.addressId,
          status: 'PENDING',
          subtotal,
          deliveryFee,
          discount,
          total,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          isAdminTest: dto.isAdminTest === true,
          items: { create: orderItems },
        },
        include: { items: true },
      });

      // Reduce stock
      for (const item of cartItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      // Clear cart
      await tx.cartItem.deleteMany({ where: { customerId: customer.id } });

      // Create commissions for each seller
      const sellerGroups = new Map<string, number>();
      for (const item of orderItems) {
        sellerGroups.set(item.sellerId, (sellerGroups.get(item.sellerId) || 0) + item.totalPrice);
      }

      for (const [sellerId, amount] of sellerGroups) {
        const seller = await tx.seller.findUnique({ where: { id: sellerId } });
        await tx.commission.create({
          data: {
            orderId: newOrder.id,
            sellerId,
            orderAmount: amount,
            rate: seller?.commissionRate || 10,
            amount: amount * ((seller?.commissionRate || 10) / 100),
          },
        });
      }

      await tx.orderStatusHistory.create({
        data: { orderId: newOrder.id, status: 'PENDING', notes: 'Order placed by customer' },
      });

      return newOrder;
    });

    // Mark coupon as used in wallet + increment global usedCount
    if (dto.couponCode) {
      this.coupons.markCouponUsed(userId, dto.couponCode, order.id).catch(() => {});
    }

    // Send notification
    await this.notifications.sendPushToUser(userId, {
      title: 'Order Confirmed!',
      body: `Your order ${orderNumber} has been placed successfully.`,
      data: { type: 'ORDER', orderId: order.id, status: 'PENDING' },
    });

    return order;
  }

  async getCustomerOrders(userId: string, page = 1, limit = 10, status?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const skip = (page - 1) * limit;
    const where: any = { customerId: customer.id };
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where, skip, take: limit,
        include: {
          items: { include: { product: { include: { images: { take: 1 } } } } },
          address: true,
          delivery: { select: { status: true, riderId: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, orders };
  }

  async getOrderById(orderId: string, userId?: string) {
    const where: any = { id: orderId };
    if (userId) {
      const customer = await this.prisma.customer.findFirst({ where: { userId } });
      where.customerId = customer?.id;
    }

    const order = await this.prisma.order.findFirst({
      where,
      include: {
        items: { include: { product: { include: { images: { take: 1 } } } } },
        address: true,
        delivery: {
          include: {
            rider: { include: { user: { select: { fullName: true, phone: true } } } },
            trackingPoints: { orderBy: { recordedAt: 'desc' }, take: 1 },
          },
        },
        statusHistory: { orderBy: { createdAt: 'asc' } },
        payments: true,
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(orderId: string, userId: string, reason?: string) {
    const customer = await this.prisma.customer.findFirst({ where: { userId } });
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customerId: customer?.id, status: { in: ['PENDING', 'CONFIRMED'] } },
    });
    if (!order) throw new NotFoundException('Order not found or cannot be cancelled');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: reason },
      });

      await tx.orderStatusHistory.create({
        data: { orderId, status: 'CANCELLED', notes: reason || 'Cancelled by customer' },
      });

      // Restore stock
      const items = await tx.orderItem.findMany({ where: { orderId } });
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    });

    return { message: 'Order cancelled' };
  }

  // Admin methods
  async updateOrderStatus(orderId: string, status: string, adminId: string, notes?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: { include: { user: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id: orderId }, data: { status: status as OrderStatus } });
      await tx.orderStatusHistory.create({
        data: { orderId, status: status as OrderStatus, notes, createdBy: adminId },
      });
    });

    await this.notifications.sendPushToUser(order.customer.userId, {
      title: 'Order Update',
      body: `Your order is now: ${status.replace(/_/g, ' ')}`,
      data: { type: 'ORDER', orderId, status },
    });

    return { message: 'Order status updated' };
  }

  async getAllOrders(page = 1, limit = 20, status?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customer: { user: { fullName: { contains: search, mode: 'insensitive' } } } },
        { customer: { user: { phone: { contains: search } } } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where, skip, take: limit,
        include: {
          customer: { include: { user: { select: { fullName: true, phone: true } } } },
          items: { include: { product: { include: { images: { take: 1 } } } } },
          delivery: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, orders };
  }
}

interface CreateOrderDto {
  addressId: string;
  paymentMethod: any;
  couponCode?: string;
  deliveryFee?: number;
  notes?: string;
  isAdminTest?: boolean;
}
