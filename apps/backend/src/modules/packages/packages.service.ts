import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Package CRUD & Queries
  // ═══════════════════════════════════════════════════════════════════════════

  async getAllPackages(params: {
    page?: number; limit?: number; status?: string;
    centerId?: string; search?: string;
  }) {
    const { page = 1, limit = 20, status, centerId, search } = params;
    const where: any = {};
    if (status) where.status = status;
    if (centerId) where.fulfillmentCenterId = centerId;
    if (search) {
      where.OR = [
        { trackingNumber: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [packages, total] = await Promise.all([
      this.prisma.package.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          shipment: {
            select: { id: true, trackingNumber: true, orderId: true },
          },
          fulfillmentCenter: { select: { name: true, code: true } },
          _count: { select: { scans: true, failedDeliveries: true } },
        },
      }),
      this.prisma.package.count({ where }),
    ]);

    return { packages, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getPackage(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        shipment: {
          include: {
            order: {
              select: {
                id: true, orderNumber: true, status: true,
                customer: { select: { user: { select: { fullName: true, phone: true } } } },
                address: true,
              },
            },
          },
        },
        fulfillmentCenter: { select: { name: true, code: true } },
        scans: { orderBy: { scannedAt: 'desc' }, take: 50 },
        routeStop: { include: { route: { select: { routeNumber: true, status: true } } } },
        deliveryProof: true,
        failedDeliveries: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return { package: pkg };
  }

  async getPackageByTracking(trackingNumber: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { trackingNumber },
      include: {
        shipment: {
          include: {
            order: {
              select: {
                id: true, orderNumber: true, status: true,
                address: { select: { city: true, district: true } },
              },
            },
          },
        },
        scans: { orderBy: { scannedAt: 'desc' }, take: 20 },
        deliveryProof: true,
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return { package: pkg };
  }

  async createPackage(data: {
    shipmentId: string; weight?: number; length?: number;
    width?: number; height?: number; description?: string;
    fulfillmentCenterId?: string; specialInstructions?: string;
  }) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: data.shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const trackingNumber = `PKG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const barcode = `BC${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const pkg = await this.prisma.package.create({
      data: {
        ...data,
        trackingNumber,
        barcode,
        status: 'CREATED',
      },
    });

    return { package: pkg, message: 'Package created' };
  }

  async updatePackage(id: string, data: any) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    const updated = await this.prisma.package.update({ where: { id }, data });
    return { package: updated, message: 'Package updated' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Pick & Pack Flow
  // ═══════════════════════════════════════════════════════════════════════════

  async getPickQueue(centerId: string) {
    const packages = await this.prisma.package.findMany({
      where: { fulfillmentCenterId: centerId, status: 'CREATED' },
      orderBy: { createdAt: 'asc' },
      include: {
        shipment: {
          include: {
            order: {
              select: {
                orderNumber: true,
                items: { include: { product: { select: { name: true, sku: true } } } },
                address: { select: { city: true, district: true } },
              },
            },
          },
        },
      },
    });
    return { packages, total: packages.length };
  }

  async pickPackage(id: string, userId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.status !== 'CREATED') throw new BadRequestException('Package is not in CREATED status');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.package.update({
        where: { id },
        data: { status: 'PICKING', pickedBy: userId, pickedAt: new Date() },
      });
      await tx.packageScan.create({
        data: { packageId: id, scanType: 'PICK', scannedBy: userId },
      });
      return result;
    });

    return { package: updated, message: 'Package picked' };
  }

  async packPackage(id: string, userId: string, data?: { weight?: number; length?: number; width?: number; height?: number }) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.status !== 'PICKING') throw new BadRequestException('Package must be picked first');

    const updateData: any = {
      status: 'PACKED',
      packedBy: userId,
      packedAt: new Date(),
    };
    if (data?.weight) updateData.weight = data.weight;
    if (data?.length) updateData.length = data.length;
    if (data?.width) updateData.width = data.width;
    if (data?.height) updateData.height = data.height;

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.package.update({ where: { id }, data: updateData });
      await tx.packageScan.create({
        data: { packageId: id, scanType: 'PACK', scannedBy: userId },
      });
      return result;
    });

    return { package: updated, message: 'Package packed' };
  }

  async generateLabel(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: {
        shipment: {
          include: {
            order: {
              select: {
                orderNumber: true,
                customer: { select: { user: { select: { fullName: true, phone: true } } } },
                address: true,
              },
            },
          },
        },
        fulfillmentCenter: { select: { name: true, code: true, address: true } },
      },
    });
    if (!pkg) throw new NotFoundException('Package not found');

    await this.prisma.package.update({
      where: { id },
      data: { status: 'LABELED', labelGeneratedAt: new Date() },
    });

    return {
      label: {
        trackingNumber: pkg.trackingNumber,
        barcode: pkg.barcode,
        qrCode: pkg.qrCode || pkg.trackingNumber,
        from: {
          name: pkg.fulfillmentCenter?.name,
          code: pkg.fulfillmentCenter?.code,
          address: pkg.fulfillmentCenter?.address,
        },
        to: {
          name: pkg.shipment?.order?.customer?.user?.fullName,
          phone: pkg.shipment?.order?.customer?.user?.phone,
          address: pkg.shipment?.order?.address,
        },
        orderNumber: pkg.shipment?.order?.orderNumber,
        weight: pkg.weight,
        dimensions: pkg.length && pkg.width && pkg.height
          ? `${pkg.length}×${pkg.width}×${pkg.height}cm`
          : null,
        specialInstructions: pkg.specialInstructions,
        generatedAt: new Date(),
      },
      message: 'Label generated',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Scan Events
  // ═══════════════════════════════════════════════════════════════════════════

  async addScan(packageId: string, data: {
    scanType: string; scannedBy: string;
    deviceId?: string; lat?: number; lng?: number;
    locationName?: string; notes?: string;
  }) {
    const pkg = await this.prisma.package.findUnique({ where: { id: packageId } });
    if (!pkg) throw new NotFoundException('Package not found');

    const scan = await this.prisma.packageScan.create({
      data: { packageId, ...data } as any,
    });

    // Auto-update package status based on scan type
    const statusMap: Record<string, string> = {
      WAREHOUSE_RECEIVE: 'CREATED',
      PICK: 'PICKING',
      PACK: 'PACKED',
      LABEL: 'LABELED',
      SORT: 'SORTED',
      DRIVER_SCAN_OUT: 'SCANNED_OUT',
      IN_TRANSIT: 'IN_TRANSIT',
      DELIVERY_ATTEMPT: 'OUT_FOR_DELIVERY',
      DELIVERED: 'DELIVERED',
      FAILED_DELIVERY: 'DELIVERY_FAILED',
      RETURN_WAREHOUSE_IN: 'RETURNED',
    };
    const newStatus = statusMap[data.scanType];
    if (newStatus) {
      await this.prisma.package.update({
        where: { id: packageId },
        data: { status: newStatus as any },
      });
    }

    return { scan, message: 'Scan recorded' };
  }

  async getScans(packageId: string) {
    const scans = await this.prisma.packageScan.findMany({
      where: { packageId },
      orderBy: { scannedAt: 'desc' },
    });
    return { scans };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Sort & Load
  // ═══════════════════════════════════════════════════════════════════════════

  async sortPackage(id: string, sortZone: string, userId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (!['PACKED', 'LABELED'].includes(pkg.status)) {
      throw new BadRequestException('Package must be packed or labeled before sorting');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.package.update({
        where: { id },
        data: { status: 'SORTED', sortedAt: new Date(), sortZone },
      });
      await tx.packageScan.create({
        data: { packageId: id, scanType: 'SORT', scannedBy: userId, notes: `Zone: ${sortZone}` },
      });
      return result;
    });

    return { package: updated, message: 'Package sorted' };
  }

  async loadPackage(id: string, userId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');
    if (pkg.status !== 'SORTED') throw new BadRequestException('Package must be sorted before loading');

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.package.update({
        where: { id },
        data: { status: 'SCANNED_OUT' },
      });
      await tx.packageScan.create({
        data: { packageId: id, scanType: 'DRIVER_SCAN_OUT', scannedBy: userId },
      });
      return result;
    });

    return { package: updated, message: 'Package loaded for delivery' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Package Status Updates (for delivery flow)
  // ═══════════════════════════════════════════════════════════════════════════

  async updatePackageStatus(id: string, status: string, userId: string) {
    const pkg = await this.prisma.package.findUnique({ where: { id } });
    if (!pkg) throw new NotFoundException('Package not found');

    const validTransitions: Record<string, string[]> = {
      CREATED: ['PICKING', 'DAMAGED', 'LOST'],
      PICKING: ['PACKED', 'DAMAGED', 'LOST'],
      PACKED: ['LABELED', 'SORTED', 'DAMAGED', 'LOST'],
      LABELED: ['SORTED', 'DAMAGED', 'LOST'],
      SORTED: ['SCANNED_OUT', 'DAMAGED', 'LOST'],
      SCANNED_OUT: ['IN_TRANSIT'],
      IN_TRANSIT: ['OUT_FOR_DELIVERY'],
      OUT_FOR_DELIVERY: ['DELIVERED', 'DELIVERY_FAILED'],
      DELIVERY_FAILED: ['OUT_FOR_DELIVERY', 'RETURNED'],
      RETURNED: ['CREATED'],
    };

    if (!validTransitions[pkg.status]?.includes(status)) {
      throw new BadRequestException(`Cannot transition from ${pkg.status} to ${status}`);
    }

    const updateData: any = { status };
    if (status === 'DELIVERY_FAILED') {
      updateData.deliveryAttempts = { increment: 1 };
      updateData.currentAttempt = pkg.currentAttempt + 1;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.package.update({ where: { id }, data: updateData });
      // Map status to scan type for automatic scan creation
      const scanTypeMap: Record<string, string> = {
        PICKING: 'PICK',
        PACKED: 'PACK',
        LABELED: 'LABEL',
        SORTED: 'SORT',
        SCANNED_OUT: 'DRIVER_SCAN_OUT',
        IN_TRANSIT: 'IN_TRANSIT',
        OUT_FOR_DELIVERY: 'DELIVERY_ATTEMPT',
        DELIVERED: 'DELIVERED',
        DELIVERY_FAILED: 'FAILED_DELIVERY',
        RETURNED: 'RETURN_WAREHOUSE_IN',
      };
      const scanType = scanTypeMap[status];
      if (scanType) {
        await tx.packageScan.create({
          data: { packageId: id, scanType: scanType as any, scannedBy: userId },
        });
      }
      return result;
    });

    return { package: updated, message: `Package status updated to ${status}` };
  }
}
