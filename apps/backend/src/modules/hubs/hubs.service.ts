import {
  Injectable, NotFoundException, ConflictException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HubsService {
  constructor(private prisma: PrismaService) {}

  async getAll(params: { page?: number; limit?: number; search?: string; isActive?: boolean; centerId?: string }) {
    const { page = 1, limit = 20, search, isActive, centerId } = params;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;
    if (centerId) where.fulfillmentCenterId = centerId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [hubs, total] = await Promise.all([
      this.prisma.deliveryHub.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: { fulfillmentCenter: { select: { name: true, code: true } } },
      }),
      this.prisma.deliveryHub.count({ where }),
    ]);

    return { hubs, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getOne(id: string) {
    const hub = await this.prisma.deliveryHub.findUnique({
      where: { id },
      include: { fulfillmentCenter: { select: { name: true, code: true } } },
    });
    if (!hub) throw new NotFoundException('Delivery hub not found');
    return { hub };
  }

  async create(data: any) {
    const existing = await this.prisma.deliveryHub.findUnique({ where: { code: data.code } });
    if (existing) throw new ConflictException(`Hub code "${data.code}" already exists`);
    const hub = await this.prisma.deliveryHub.create({ data });
    return { hub, message: 'Delivery hub created' };
  }

  async update(id: string, data: any) {
    const hub = await this.prisma.deliveryHub.findUnique({ where: { id } });
    if (!hub) throw new NotFoundException('Delivery hub not found');
    if (data.code && data.code !== hub.code) {
      const dup = await this.prisma.deliveryHub.findUnique({ where: { code: data.code } });
      if (dup) throw new ConflictException(`Hub code "${data.code}" already in use`);
    }
    const updated = await this.prisma.deliveryHub.update({ where: { id }, data });
    return { hub: updated, message: 'Delivery hub updated' };
  }

  async remove(id: string) {
    const hub = await this.prisma.deliveryHub.findUnique({ where: { id } });
    if (!hub) throw new NotFoundException('Delivery hub not found');
    await this.prisma.deliveryHub.delete({ where: { id } });
    return { message: 'Delivery hub deleted' };
  }

  // ── Warehouse Zones ─────────────────────────────────────────────────────────

  async getZones(centerId: string) {
    const zones = await this.prisma.warehouseZone.findMany({
      where: { fulfillmentCenterId: centerId },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { racks: true } } },
    });
    return { zones };
  }

  async createZone(centerId: string, data: any) {
    const zone = await this.prisma.warehouseZone.create({
      data: { ...data, fulfillmentCenterId: centerId },
    });
    return { zone, message: 'Zone created' };
  }

  async updateZone(zoneId: string, data: any) {
    const updated = await this.prisma.warehouseZone.update({ where: { id: zoneId }, data });
    return { zone: updated, message: 'Zone updated' };
  }

  async deleteZone(zoneId: string) {
    await this.prisma.warehouseZone.delete({ where: { id: zoneId } });
    return { message: 'Zone deleted' };
  }

  // ── Racks ───────────────────────────────────────────────────────────────────

  async getRacks(zoneId: string) {
    const racks = await this.prisma.warehouseRack.findMany({
      where: { zoneId },
      orderBy: { rackCode: 'asc' },
    });
    return { racks };
  }

  async createRack(zoneId: string, data: any) {
    const rack = await this.prisma.warehouseRack.create({
      data: { ...data, zoneId },
    });
    return { rack, message: 'Rack created' };
  }

  async updateRack(rackId: string, data: any) {
    const updated = await this.prisma.warehouseRack.update({ where: { id: rackId }, data });
    return { rack: updated, message: 'Rack updated' };
  }

  async deleteRack(rackId: string) {
    await this.prisma.warehouseRack.delete({ where: { id: rackId } });
    return { message: 'Rack deleted' };
  }
}
