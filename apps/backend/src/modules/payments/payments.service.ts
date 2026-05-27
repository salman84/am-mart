import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    const stripeKey = this.config.get('STRIPE_SECRET_KEY');
    if (stripeKey) this.stripe = new Stripe(stripeKey, { apiVersion: '2024-04-10' });
  }

  async createPaymentIntent(orderId: string, customerId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customer: { userId: customerId } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.paymentStatus === 'PAID') throw new BadRequestException('Already paid');

    const intent = await this.stripe.paymentIntents.create({
      amount: Math.round(order.total * 100),
      currency: 'krw',
      metadata: { orderId, customerId },
    });

    return { clientSecret: intent.client_secret, paymentIntentId: intent.id };
  }

  async confirmPayment(paymentIntentId: string, orderId: string) {
    const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
    if (intent.status === 'succeeded') {
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: orderId }, data: { paymentStatus: 'PAID' } });
        await tx.payment.create({
          data: {
            orderId,
            amount: intent.amount / 100,
            method: 'CARD',
            status: 'PAID',
            transactionId: paymentIntentId,
            paidAt: new Date(),
          },
        });
      });
      return { success: true };
    }
    return { success: false, status: intent.status };
  }

  async requestRefund(orderId: string, customerId: string, reason: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, customer: { userId: customerId } },
      include: { payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const refund = await this.prisma.refund.create({
      data: { orderId, customerId, amount: order.total, reason, status: 'PENDING' },
    });

    return { message: 'Refund request submitted', refund };
  }

  async getAllPayments(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, payments] = await Promise.all([
      this.prisma.payment.count(),
      this.prisma.payment.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return { total, page, limit, payments };
  }

  async getAllRefunds(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    const [total, refunds] = await Promise.all([
      this.prisma.refund.count({ where }),
      this.prisma.refund.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    ]);
    return { total, page, limit, refunds };
  }

  async processRefund(refundId: string, approved: boolean, adminNotes?: string) {
    const refund = await this.prisma.refund.findUnique({ where: { id: refundId } });
    if (!refund) throw new NotFoundException('Refund not found');

    return this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: approved ? 'APPROVED' : 'REJECTED',
        adminNotes,
        processedAt: new Date(),
      },
    });
  }

  async getSellerPayouts(page = 1, limit = 20, sellerId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (sellerId) where.sellerId = sellerId;
    const [total, payouts] = await Promise.all([
      this.prisma.sellerPayout.count({ where }),
      this.prisma.sellerPayout.findMany({
        where, skip, take: limit,
        include: { seller: { select: { storeName: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, payouts };
  }
}
