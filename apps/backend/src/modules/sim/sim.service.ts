import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SimStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as XLSX from 'xlsx';

@Injectable()
export class SimService {
  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async searchByLastFour(lastFour: string, carrier?: string, simType?: string) {
    if (lastFour.length !== 4 || !/^\d{4}$/.test(lastFour)) {
      throw new BadRequestException('Last four digits must be exactly 4 numbers');
    }

    const select = {
      id: true,
      maskedNumber: true,
      lastFourDigits: true,
      carrier: true,
      simType: true,
      price: true,
      activationRequired: true,
      requiresIdVerification: true,
      customerChoosesLastFour: true,
      numberPrefix: true,
    };

    // 1. Full numbers with exact last 4 match
    const exactWhere: any = { lastFourDigits: lastFour, status: 'AVAILABLE', customerChoosesLastFour: false };
    if (carrier) exactWhere.carrier = carrier;
    if (simType) exactWhere.simType = simType;

    // 2. Prefix-mode numbers (admin left last 4 for customer choice)
    const prefixWhere: any = { status: 'AVAILABLE', customerChoosesLastFour: true };
    if (carrier) prefixWhere.carrier = carrier;
    if (simType) prefixWhere.simType = simType;

    const [exactNumbers, prefixNumbers] = await Promise.all([
      this.prisma.simNumber.findMany({ where: exactWhere, select }),
      this.prisma.simNumber.findMany({ where: prefixWhere, select }),
    ]);

    // For prefix-mode numbers, show them with the customer's chosen last 4 as preview
    const prefixFormatted = prefixNumbers.map((n) => ({
      ...n,
      maskedNumber: `${n.numberPrefix}-${lastFour}`,
      lastFourDigits: lastFour,
      chosenLastFour: lastFour,
    }));

    const numbers = [...exactNumbers, ...prefixFormatted];
    return { count: numbers.length, numbers };
  }

  async getAvailableNumbers(page = 1, limit = 20, carrier?: string, simType?: string) {
    const skip = (page - 1) * limit;
    const where: any = { status: 'AVAILABLE' };
    if (carrier) where.carrier = carrier;
    if (simType) where.simType = simType;

    const [total, numbers] = await Promise.all([
      this.prisma.simNumber.count({ where }),
      this.prisma.simNumber.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          maskedNumber: true,
          lastFourDigits: true,
          carrier: true,
          simType: true,
          price: true,
          activationRequired: true,
          requiresIdVerification: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, numbers };
  }

  /** Finds the customer row for a user, auto-creating it if it doesn't exist yet. */
  private async getOrCreateCustomer(userId: string) {
    let customer = await this.prisma.customer.findFirst({ where: { userId } });
    if (!customer) {
      customer = await this.prisma.customer.create({ data: { userId } });
    }
    return customer;
  }

  async reserveSimNumber(simNumberId: string, userId: string, isAdminTest = false, chosenLastFour?: string) {
    // Resolve the Customer record from the User ID — SimOrder.customerId is a FK to Customer, not User
    const customer = await this.getOrCreateCustomer(userId);
    const customerId = customer.id;

    return this.prisma.$transaction(async (tx) => {
      const sim = await tx.simNumber.findUnique({ where: { id: simNumberId } });
      if (!sim) throw new NotFoundException('SIM number not found');
      if (sim.status !== 'AVAILABLE') throw new ConflictException('SIM number is no longer available');

      // Validate chosen last four for prefix-mode numbers
      if (sim.customerChoosesLastFour) {
        if (!chosenLastFour || !/^\d{4}$/.test(chosenLastFour)) {
          throw new BadRequestException('Please provide your preferred last 4 digits');
        }
      }

      const existingReservation = await tx.simOrder.findFirst({
        where: { customerId, status: { in: ['PENDING', 'RESERVED', 'CONFIRMED', 'PROCESSING'] } },
      });
      if (existingReservation) {
        throw new ConflictException('You already have a pending SIM order');
      }

      const reservedUntil = new Date(Date.now() + 15 * 60 * 1000);

      // For prefix-mode: lock the number (only one customer can reserve a given prefix at a time)
      await tx.simNumber.update({
        where: { id: simNumberId },
        data: { status: 'RESERVED', reservedUntil },
      });

      const orderNumber = `SIM-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const simOrder = await tx.simOrder.create({
        data: {
          orderNumber,
          customerId,
          simNumberId,
          status: 'RESERVED',
          reservedAt: new Date(),
          price: sim.price,
          isAdminTest,
          ...(chosenLastFour ? { chosenLastFour } : {}),
        },
        include: { simNumber: true },
      });

      return { simOrder, reservedUntil, message: 'SIM reserved for 15 minutes. Please complete your order.' };
    });
  }

  async submitSimOrder(simOrderId: string, userId: string, data: SubmitSimOrderDto) {
    // Resolve Customer record — SimOrder.customerId is a FK to Customer, not User
    const customer = await this.getOrCreateCustomer(userId);

    const simOrder = await this.prisma.simOrder.findFirst({
      where: { id: simOrderId, customerId: customer.id, status: 'RESERVED' },
      include: { simNumber: true },
    });

    if (!simOrder) throw new NotFoundException('Reservation not found or expired');
    if (simOrder.simNumber.reservedUntil && simOrder.simNumber.reservedUntil < new Date()) {
      await this.cancelExpiredReservation(simOrder);
      throw new BadRequestException('Reservation expired. Please try again.');
    }

    const updated = await this.prisma.simOrder.update({
      where: { id: simOrderId },
      data: {
        status: 'PENDING',
        // Accept both field name variants: idDocFrontUrl (mobile) or idDocumentUrl (legacy)
        idDocumentUrl: data.idDocFrontUrl ?? data.idDocumentUrl,
        idDocumentType: data.idDocumentType,
        deliveryAddressId: data.deliveryAddressId,
      },
    });

    await this.prisma.simOrderStatusHistory.create({
      data: { simOrderId, status: 'PENDING', notes: 'Order submitted by customer' },
    });

    return updated;
  }

  async getCustomerSimOrders(userId: string, page = 1, limit = 10) {
    const customer = await this.getOrCreateCustomer(userId);
    const skip = (page - 1) * limit;
    const [total, orders] = await Promise.all([
      this.prisma.simOrder.count({ where: { customerId: customer.id } }),
      this.prisma.simOrder.findMany({
        where: { customerId: customer.id },
        skip,
        take: limit,
        include: { simNumber: true, statusHistory: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, orders };
  }

  async getSimOrderById(id: string, userId?: string) {
    const where: any = { id };
    if (userId) {
      // Resolve User ID → Customer ID for the where clause
      const customer = await this.prisma.customer.findFirst({ where: { userId } });
      if (customer) where.customerId = customer.id;
    }

    const order = await this.prisma.simOrder.findFirst({
      where,
      include: { simNumber: true, statusHistory: { orderBy: { createdAt: 'asc' } } },
    });
    if (!order) throw new NotFoundException('SIM order not found');
    return order;
  }

  // Admin methods
  async addSimNumber(data: AddSimNumberDto) {
    // Validate price
    if (data.price === null || data.price === undefined || isNaN(Number(data.price))) {
      throw new BadRequestException('Price is required and must be a valid number');
    }
    data.price = Number(data.price);

    // ── Prefix mode: admin enters prefix, customer picks last 4 ──
    if (data.customerChoosesLastFour && data.numberPrefix) {
      const prefix = data.numberPrefix.replace(/\D/g, '');
      if (prefix.length < 7) throw new BadRequestException('Number prefix must be at least 7 digits');

      // Store with placeholder last 4 (will be finalized when customer orders)
      const placeholderFull = prefix + '0000';
      const maskedNumber = this.maskPrefixNumber(prefix);

      const existing = await this.prisma.simNumber.findFirst({ where: { numberPrefix: prefix, customerChoosesLastFour: true } });
      if (existing) throw new ConflictException('A prefix SIM with this prefix already exists');

      return this.prisma.simNumber.create({
        data: {
          fullNumber:              placeholderFull,
          maskedNumber,
          lastFourDigits:          '0000',
          numberPrefix:            prefix,
          customerChoosesLastFour: true,
          carrier:                 data.carrier,
          simType:                 data.simType,
          price:                   data.price,
          activationRequired:      data.activationRequired ?? true,
          requiresIdVerification:  data.requiresIdVerification ?? true,
          notes:                   data.notes,
          addedBy:                 data.addedBy,
        },
      });
    }

    // ── Full number mode ──
    if (!data.fullNumber) throw new BadRequestException('Full number is required');
    const fullNumber = data.fullNumber.replace(/\D/g, '');
    if (fullNumber.length < 10) throw new BadRequestException('Invalid phone number');

    const lastFour = fullNumber.slice(-4);
    const maskedNumber = this.maskNumber(fullNumber);

    const existing = await this.prisma.simNumber.findUnique({ where: { fullNumber } });
    if (existing) throw new ConflictException('SIM number already exists');

    return this.prisma.simNumber.create({
      data: {
        fullNumber,
        maskedNumber,
        lastFourDigits: lastFour,
        carrier: data.carrier,
        simType: data.simType,
        price: data.price,
        activationRequired: data.activationRequired ?? true,
        requiresIdVerification: data.requiresIdVerification ?? true,
        notes: data.notes,
        addedBy: data.addedBy,
      },
    });
  }

  // ── Admin: list all SIM numbers with optional type filter ──
  async getAllSimNumbers(page = 1, limit = 50, type?: 'full' | 'prefix', carrier?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (type === 'full')   where.customerChoosesLastFour = false;
    if (type === 'prefix') where.customerChoosesLastFour = true;
    if (carrier) where.carrier = carrier;

    const [total, numbers] = await Promise.all([
      this.prisma.simNumber.count({ where }),
      this.prisma.simNumber.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, numbers };
  }

  // ── Admin: edit a SIM number ──
  async editSimNumber(id: string, data: Partial<AddSimNumberDto>) {
    const sim = await this.prisma.simNumber.findUnique({ where: { id } });
    if (!sim) throw new NotFoundException('SIM number not found');

    const update: any = {};
    if (data.carrier)   update.carrier = data.carrier;
    if (data.simType)   update.simType = data.simType;
    if (data.price !== undefined && !isNaN(Number(data.price))) update.price = Number(data.price);
    if (data.activationRequired !== undefined)    update.activationRequired    = data.activationRequired;
    if (data.requiresIdVerification !== undefined) update.requiresIdVerification = data.requiresIdVerification;
    if (data.notes !== undefined) update.notes = data.notes;

    return this.prisma.simNumber.update({ where: { id }, data: update });
  }

  // ── Admin: delete a SIM number ──
  async deleteSimNumber(id: string) {
    const sim = await this.prisma.simNumber.findUnique({ where: { id } });
    if (!sim) throw new NotFoundException('SIM number not found');
    if (['RESERVED', 'CONFIRMED', 'PROCESSING', 'OUT_FOR_DELIVERY'].includes(sim.status)) {
      throw new BadRequestException('Cannot delete a SIM number with an active order');
    }
    await this.prisma.simNumber.delete({ where: { id } });
    return { message: 'SIM number deleted' };
  }

  // ── Admin: toggle hide/unhide ──
  async toggleSimNumberVisibility(id: string) {
    const sim = await this.prisma.simNumber.findUnique({ where: { id } });
    if (!sim) throw new NotFoundException('SIM number not found');
    if (!['AVAILABLE', 'HIDDEN'].includes(sim.status)) {
      throw new BadRequestException('Can only hide/unhide AVAILABLE numbers');
    }
    const newStatus = sim.status === 'AVAILABLE' ? 'HIDDEN' : 'AVAILABLE';
    return this.prisma.simNumber.update({ where: { id }, data: { status: newStatus as any } });
  }

  async bulkUploadSimNumbers(buffer: Buffer, addedBy: string) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet) as any[];

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const row of rows) {
      try {
        await this.addSimNumber({
          fullNumber: String(row.phone_number || row.number || row.fullNumber),
          carrier: row.carrier || 'SKT',
          simType: row.sim_type || row.simType || 'PREPAID',
          price: Number(row.price || 0),
          activationRequired: row.activation_required !== 'false',
          requiresIdVerification: row.requires_id !== 'false',
          notes: row.notes,
          addedBy,
        });
        results.success++;
      } catch (e) {
        results.failed++;
        results.errors.push(`Row ${rows.indexOf(row) + 2}: ${e.message}`);
      }
    }

    return results;
  }

  async adminUpdateSimOrderStatus(simOrderId: string, status: string, adminId: string, notes?: string) {
    const simOrder = await this.prisma.simOrder.findUnique({
      where: { id: simOrderId },
      include: { simNumber: true, customer: { include: { user: true } } },
    });
    if (!simOrder) throw new NotFoundException('SIM order not found');

    const validTransitions: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['PROCESSING', 'CANCELLED'],
      PROCESSING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
    };

    if (validTransitions[simOrder.status] && !validTransitions[simOrder.status].includes(status)) {
      throw new BadRequestException(`Cannot transition from ${simOrder.status} to ${status}`);
    }

    const updateData: any = { status };
    if (status === 'CONFIRMED') updateData.confirmedAt = new Date();
    if (status === 'PROCESSING') updateData.processingAt = new Date();
    if (status === 'DELIVERED') updateData.deliveredAt = new Date();
    if (status === 'CANCELLED') updateData.cancelledAt = new Date();
    if (notes) updateData.adminNotes = notes;

    if (status === 'CONFIRMED') {
      await this.prisma.simNumber.update({
        where: { id: simOrder.simNumberId },
        data: { status: 'CONFIRMED' },
      });
    }

    const updated = await this.prisma.simOrder.update({ where: { id: simOrderId }, data: updateData });

    await this.prisma.simOrderStatusHistory.create({
      data: { simOrderId, status: status as SimStatus, notes, createdBy: adminId },
    });

    // Send push notification
    if (simOrder.customer?.user?.fcmToken) {
      await this.notifications.sendPushToUser(simOrder.customer.userId, {
        title: 'SIM Order Update',
        body: `Your SIM order is now ${status.replace(/_/g, ' ')}`,
        data: { type: 'SIM_ORDER', orderId: simOrderId, status },
      });
    }

    return updated;
  }

  async getAllSimOrders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [total, orders] = await Promise.all([
      this.prisma.simOrder.count({ where }),
      this.prisma.simOrder.findMany({
        where,
        skip,
        take: limit,
        include: {
          simNumber: true,
          customer: { include: { user: { select: { fullName: true, phone: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return { total, page, limit, orders };
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredReservations() {
    const expired = await this.prisma.simOrder.findMany({
      where: {
        status: 'RESERVED',
        simNumber: { reservedUntil: { lt: new Date() } },
      },
      include: { simNumber: true },
    });

    for (const order of expired) {
      await this.cancelExpiredReservation(order);
    }
  }

  private async cancelExpiredReservation(simOrder: any) {
    await this.prisma.$transaction([
      this.prisma.simOrder.update({
        where: { id: simOrder.id },
        data: { status: 'CANCELLED', cancelReason: 'Reservation expired' },
      }),
      this.prisma.simNumber.update({
        where: { id: simOrder.simNumberId },
        data: { status: 'AVAILABLE', reservedUntil: null },
      }),
    ]);
  }

  private maskNumber(fullNumber: string): string {
    if (fullNumber.length === 11) {
      return `${fullNumber.slice(0, 3)}-${fullNumber.slice(3, 7)}-****`;
    }
    return `${fullNumber.slice(0, -4)}****`;
  }

  private maskPrefixNumber(prefix: string): string {
    if (prefix.length >= 7) {
      return `${prefix.slice(0, 3)}-${prefix.slice(3, 7)}-????`;
    }
    return `${prefix}-????`;
  }
}

interface AddSimNumberDto {
  fullNumber?: string;
  numberPrefix?: string;
  customerChoosesLastFour?: boolean;
  carrier: any;
  simType: any;
  price: number;
  activationRequired?: boolean;
  requiresIdVerification?: boolean;
  notes?: string;
  addedBy?: string;
}

interface SubmitSimOrderDto {
  idDocumentUrl?: string;   // legacy field name
  idDocFrontUrl?: string;   // field name sent by mobile app
  idDocBackUrl?: string;    // optional back of ID doc
  idDocumentType?: string;
  deliveryAddressId?: string;
}
