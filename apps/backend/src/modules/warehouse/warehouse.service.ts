import {
  Injectable, NotFoundException, BadRequestException, ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WarehouseService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Fulfillment Centers
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllFulfillmentCenters(params: {
    page?: number; limit?: number; search?: string; isActive?: boolean;
  }) {
    const { page = 1, limit = 20, search, isActive } = params;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [centers, total] = await Promise.all([
      this.prisma.fulfillmentCenter.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { bins: true, inventory: true, packages: true, routes: true } },
        },
      }),
      this.prisma.fulfillmentCenter.count({ where }),
    ]);

    return { centers, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getFulfillmentCenter(id: string) {
    const center = await this.prisma.fulfillmentCenter.findUnique({
      where: { id },
      include: {
        _count: { select: { bins: true, inventory: true, packages: true, routes: true, zones: true } },
      },
    });
    if (!center) throw new NotFoundException('Fulfillment center not found');
    return { center };
  }

  async createFulfillmentCenter(data: {
    name: string; code: string; address: string; city: string;
    district?: string; postalCode?: string; lat?: number; lng?: number;
    phone?: string; email?: string; managerUserId?: string;
    capacity?: number; operatingHoursStart?: string; operatingHoursEnd?: string;
  }) {
    const existing = await this.prisma.fulfillmentCenter.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Center with code "${data.code}" already exists`);

    const center = await this.prisma.fulfillmentCenter.create({ data });
    return { center, message: 'Fulfillment center created' };
  }

  async updateFulfillmentCenter(id: string, data: any) {
    const center = await this.prisma.fulfillmentCenter.findUnique({ where: { id } });
    if (!center) throw new NotFoundException('Fulfillment center not found');

    if (data.code && data.code !== center.code) {
      const dup = await this.prisma.fulfillmentCenter.findUnique({ where: { code: data.code } });
      if (dup) throw new ConflictException(`Code "${data.code}" already in use`);
    }

    const updated = await this.prisma.fulfillmentCenter.update({ where: { id }, data });
    return { center: updated, message: 'Fulfillment center updated' };
  }

  async deleteFulfillmentCenter(id: string) {
    const center = await this.prisma.fulfillmentCenter.findUnique({
      where: { id },
      include: { _count: { select: { packages: true, inventory: true } } },
    });
    if (!center) throw new NotFoundException('Fulfillment center not found');
    if (center._count.packages > 0 || center._count.inventory > 0) {
      throw new BadRequestException('Cannot delete center with active packages or inventory');
    }
    await this.prisma.fulfillmentCenter.delete({ where: { id } });
    return { message: 'Fulfillment center deleted' };
  }

  async getDashboardStats(centerId: string) {
    const center = await this.prisma.fulfillmentCenter.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Fulfillment center not found');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalBins, activeBins,
      totalInventoryItems, totalInventoryQty,
      pendingTransfers, packagesCreatedToday,
      packagesReadyToShip, packagesInTransit,
    ] = await Promise.all([
      this.prisma.warehouseBin.count({ where: { fulfillmentCenterId: centerId } }),
      this.prisma.warehouseBin.count({ where: { fulfillmentCenterId: centerId, isActive: true } }),
      this.prisma.warehouseInventory.count({ where: { fulfillmentCenterId: centerId } }),
      this.prisma.warehouseInventory.aggregate({
        where: { fulfillmentCenterId: centerId },
        _sum: { quantity: true },
      }),
      this.prisma.warehouseTransfer.count({
        where: { destinationFulfillmentId: centerId, status: { in: ['REQUESTED', 'APPROVED'] } },
      }),
      this.prisma.package.count({
        where: { fulfillmentCenterId: centerId, createdAt: { gte: today } },
      }),
      this.prisma.package.count({
        where: { fulfillmentCenterId: centerId, status: 'PACKED' },
      }),
      this.prisma.package.count({
        where: { fulfillmentCenterId: centerId, status: { in: ['IN_TRANSIT', 'OUT_FOR_DELIVERY'] } },
      }),
    ]);

    return {
      center: { id: center.id, name: center.name, code: center.code, capacity: center.capacity, currentOccupancy: center.currentOccupancy },
      stats: {
        totalBins, activeBins,
        totalInventoryItems, totalInventoryQty: totalInventoryQty._sum.quantity || 0,
        pendingTransfers,
        packagesCreatedToday, packagesReadyToShip, packagesInTransit,
        occupancyPercent: center.capacity > 0 ? Math.round((center.currentOccupancy / center.capacity) * 100) : 0,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Warehouse Bins
  // ═══════════════════════════════════════════════════════════════════════════

  async getBins(centerId: string, params: { page?: number; limit?: number; section?: string; binType?: string; isActive?: boolean }) {
    const { page = 1, limit = 50, section, binType, isActive } = params;
    const where: any = { fulfillmentCenterId: centerId };
    if (section) where.section = section;
    if (binType) where.binType = binType;
    if (isActive !== undefined) where.isActive = isActive;

    const [bins, total] = await Promise.all([
      this.prisma.warehouseBin.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { binCode: 'asc' },
        include: { _count: { select: { inventory: true } } },
      }),
      this.prisma.warehouseBin.count({ where }),
    ]);

    return { bins, total, page, totalPages: Math.ceil(total / limit) };
  }

  async createBin(centerId: string, data: {
    binCode: string; section?: string; aisle?: string; shelf?: string;
    position?: string; capacity?: number; binType?: string;
  }) {
    const center = await this.prisma.fulfillmentCenter.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Fulfillment center not found');

    const bin = await this.prisma.warehouseBin.create({
      data: { ...data, fulfillmentCenterId: centerId } as any,
    });
    return { bin, message: 'Bin created' };
  }

  async updateBin(binId: string, data: any) {
    const bin = await this.prisma.warehouseBin.findUnique({ where: { id: binId } });
    if (!bin) throw new NotFoundException('Bin not found');
    const updated = await this.prisma.warehouseBin.update({ where: { id: binId }, data });
    return { bin: updated, message: 'Bin updated' };
  }

  async deleteBin(binId: string) {
    const bin = await this.prisma.warehouseBin.findUnique({
      where: { id: binId },
      include: { _count: { select: { inventory: true } } },
    });
    if (!bin) throw new NotFoundException('Bin not found');
    if (bin._count.inventory > 0) throw new BadRequestException('Cannot delete bin with inventory');
    await this.prisma.warehouseBin.delete({ where: { id: binId } });
    return { message: 'Bin deleted' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Warehouse Inventory
  // ═══════════════════════════════════════════════════════════════════════════

  async getInventory(centerId: string, params: { page?: number; limit?: number; search?: string; binId?: string }) {
    const { page = 1, limit = 30, search, binId } = params;
    const where: any = { fulfillmentCenterId: centerId };
    if (binId) where.binId = binId;

    const [items, total] = await Promise.all([
      this.prisma.warehouseInventory.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { updatedAt: 'desc' },
        include: { bin: { select: { binCode: true, section: true } } },
      }),
      this.prisma.warehouseInventory.count({ where }),
    ]);

    return { inventory: items, total, page, totalPages: Math.ceil(total / limit) };
  }

  async adjustInventory(centerId: string, data: {
    productId: string; sellerId: string; binId?: string;
    quantityChange: number; reason?: string;
  }) {
    const center = await this.prisma.fulfillmentCenter.findUnique({ where: { id: centerId } });
    if (!center) throw new NotFoundException('Fulfillment center not found');

    const existing = await this.prisma.warehouseInventory.findFirst({
      where: { fulfillmentCenterId: centerId, productId: data.productId, sellerId: data.sellerId },
    });

    if (existing) {
      const newQty = existing.quantity + data.quantityChange;
      if (newQty < 0) throw new BadRequestException('Insufficient inventory');
      const updated = await this.prisma.warehouseInventory.update({
        where: { id: existing.id },
        data: { quantity: newQty, binId: data.binId || existing.binId },
      });
      return { inventory: updated, message: 'Inventory adjusted' };
    } else {
      if (data.quantityChange < 0) throw new BadRequestException('Cannot create negative inventory');
      const created = await this.prisma.warehouseInventory.create({
        data: {
          fulfillmentCenterId: centerId,
          productId: data.productId,
          sellerId: data.sellerId,
          binId: data.binId,
          quantity: data.quantityChange,
        },
      });
      return { inventory: created, message: 'Inventory created' };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Warehouse Transfers (Seller → Warehouse)
  // ═══════════════════════════════════════════════════════════════════════════

  async getTransfers(params: {
    page?: number; limit?: number; status?: string;
    centerId?: string; sellerId?: string;
  }) {
    const { page = 1, limit = 20, status, centerId, sellerId } = params;
    const where: any = {};
    if (status) where.status = status;
    if (centerId) where.destinationFulfillmentId = centerId;
    if (sellerId) where.sellerId = sellerId;

    const [transfers, total] = await Promise.all([
      this.prisma.warehouseTransfer.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          destinationFulfillment: { select: { name: true, code: true } },
          originFulfillment: { select: { name: true, code: true } },
          items: true,
        },
      }),
      this.prisma.warehouseTransfer.count({ where }),
    ]);

    return { transfers, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getTransfer(id: string) {
    const transfer = await this.prisma.warehouseTransfer.findUnique({
      where: { id },
      include: {
        destinationFulfillment: { select: { name: true, code: true } },
        originFulfillment: { select: { name: true, code: true } },
        items: true,
      },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    return { transfer };
  }

  async createTransfer(data: {
    destinationFulfillmentId: string;
    sellerId?: string;
    originType?: string;
    originFulfillmentId?: string;
    notes?: string;
    items: Array<{ productId: string; expectedQuantity: number }>;
    requestedBy?: string;
  }) {
    const center = await this.prisma.fulfillmentCenter.findUnique({
      where: { id: data.destinationFulfillmentId },
    });
    if (!center) throw new NotFoundException('Destination fulfillment center not found');

    const transferNumber = `TRF-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const totalItems = data.items.reduce((sum, i) => sum + i.expectedQuantity, 0);

    const transfer = await this.prisma.warehouseTransfer.create({
      data: {
        transferNumber,
        destinationFulfillmentId: data.destinationFulfillmentId,
        sellerId: data.sellerId,
        originType: (data.originType as any) || 'SELLER',
        originFulfillmentId: data.originFulfillmentId,
        notes: data.notes,
        totalItems,
        requestedBy: data.requestedBy,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            expectedQuantity: item.expectedQuantity,
          })),
        },
      },
      include: { items: true },
    });

    return { transfer, message: 'Transfer request created' };
  }

  async updateTransferStatus(id: string, status: string, userId: string, data?: { notes?: string }) {
    const transfer = await this.prisma.warehouseTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Transfer not found');

    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['APPROVED', 'CANCELLED'],
      APPROVED: ['SHIPPED', 'CANCELLED'],
      SHIPPED: ['IN_TRANSIT'],
      IN_TRANSIT: ['RECEIVED', 'PARTIALLY_RECEIVED'],
      PARTIALLY_RECEIVED: ['RECEIVED'],
    };

    if (!validTransitions[transfer.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${transfer.status} to ${status}`);
    }

    const updateData: any = { status };
    if (status === 'APPROVED') { updateData.approvedBy = userId; updateData.approvedAt = new Date(); }
    if (status === 'SHIPPED') { updateData.shippedAt = new Date(); }
    if (status === 'RECEIVED' || status === 'PARTIALLY_RECEIVED') {
      updateData.receivedBy = userId;
      updateData.receivedAt = new Date();
    }
    if (data?.notes) updateData.notes = data.notes;

    const updated = await this.prisma.warehouseTransfer.update({ where: { id }, data: updateData });
    return { transfer: updated, message: `Transfer ${status.toLowerCase()}` };
  }

  async receiveTransferItems(transferId: string, items: Array<{ itemId: string; receivedQuantity: number; damagedQuantity?: number; notes?: string }>, userId: string) {
    const transfer = await this.prisma.warehouseTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw new NotFoundException('Transfer not found');
    if (!['SHIPPED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(transfer.status)) {
      throw new BadRequestException('Transfer is not in a receivable state');
    }

    await this.prisma.$transaction(async (tx) => {
      let totalReceived = transfer.totalReceived;
      for (const item of items) {
        const transferItem = transfer.items.find((ti) => ti.id === item.itemId);
        if (!transferItem) continue;

        await tx.warehouseTransferItem.update({
          where: { id: item.itemId },
          data: {
            receivedQuantity: item.receivedQuantity,
            damagedQuantity: item.damagedQuantity || 0,
            notes: item.notes,
          },
        });
        totalReceived += item.receivedQuantity;

        // Add to warehouse inventory
        if (item.receivedQuantity > 0) {
          const existing = await tx.warehouseInventory.findFirst({
            where: {
              fulfillmentCenterId: transfer.destinationFulfillmentId,
              productId: transferItem.productId,
              sellerId: transfer.sellerId || '',
            },
          });
          if (existing) {
            await tx.warehouseInventory.update({
              where: { id: existing.id },
              data: { quantity: { increment: item.receivedQuantity } },
            });
          } else {
            await tx.warehouseInventory.create({
              data: {
                fulfillmentCenterId: transfer.destinationFulfillmentId,
                productId: transferItem.productId,
                sellerId: transfer.sellerId || '',
                quantity: item.receivedQuantity,
              },
            });
          }
        }
      }

      const allReceived = totalReceived >= transfer.totalItems;
      await tx.warehouseTransfer.update({
        where: { id: transferId },
        data: {
          totalReceived,
          status: allReceived ? 'RECEIVED' : 'PARTIALLY_RECEIVED',
          receivedBy: userId,
          receivedAt: new Date(),
        },
      });
    });

    return { message: 'Items received and inventory updated' };
  }
}
