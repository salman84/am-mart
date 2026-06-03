import {
  Injectable, Logger, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Fulfillment Automation Engine
 *
 * This is the CORE engine that connects orders to the warehouse system.
 * Flow: Order Placed → Inventory Reserved → Shipment Created → Package Created
 *       → Pick Request Generated → Warehouse picks/packs → Label → Dispatch
 *
 * It also handles:
 * - Automatic nearest warehouse selection
 * - Inventory reservation and release
 * - Auto-assigning drivers to routes
 * - Return routing automation
 */
@Injectable()
export class FulfillmentService {
  private readonly logger = new Logger(FulfillmentService.name);

  constructor(private prisma: PrismaService) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // ORDER → FULFILLMENT PIPELINE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Called after an order is placed and payment confirmed.
   * 1. Find nearest warehouse with inventory
   * 2. Reserve inventory
   * 3. Create shipment
   * 4. Create package(s)
   * 5. Package enters pick queue automatically
   */
  async processOrderForFulfillment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true, weight: true, sellerId: true } } } },
        address: true,
        customer: { select: { userId: true } },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.items?.length) throw new BadRequestException('Order has no items');

    // Step 1: Find best fulfillment center
    const centerId = await this.findNearestCenter(
      order.address?.lat, order.address?.lng,
      order.items.map(i => ({ productId: i.productId, sellerId: i.product?.sellerId || '', quantity: i.quantity })),
    );

    // Step 2: Reserve inventory
    await this.reserveInventory(centerId, order.items);

    // Step 3: Create shipment
    const shipment = await this.prisma.shipment.create({
      data: {
        orderId: order.id,
        sellerId: order.items[0]?.product?.sellerId,
        fulfillmentCenterId: centerId,
        status: 'PREPARING',
        totalWeight: order.items.reduce((sum, i) => sum + ((parseFloat(i.product?.weight || '0') || 0) * i.quantity), 0),
      },
    });

    // Step 4: Create package
    const trackingNumber = `PKG-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const barcode = `BC${Date.now().toString().slice(-10)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    const pkg = await this.prisma.package.create({
      data: {
        shipmentId: shipment.id,
        trackingNumber,
        barcode,
        status: 'CREATED',
        fulfillmentCenterId: centerId,
        weight: shipment.totalWeight,
        specialInstructions: order.deliveryInstructions,
      },
    });

    // Step 5: Create initial scan
    await this.prisma.packageScan.create({
      data: {
        packageId: pkg.id,
        scanType: 'WAREHOUSE_RECEIVE',
        scannedBy: 'SYSTEM',
        notes: `Auto-created from order #${order.orderNumber}`,
      },
    });

    // Update order with fulfillment center
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentCenterId: centerId,
        status: 'CONFIRMED',
      },
    });

    this.logger.log(`Order ${order.orderNumber} → Shipment ${shipment.id} → Package ${trackingNumber} at center ${centerId}`);

    return {
      message: 'Order processed for fulfillment',
      shipmentId: shipment.id,
      packageId: pkg.id,
      trackingNumber,
      fulfillmentCenterId: centerId,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEAREST WAREHOUSE SELECTION
  // ═══════════════════════════════════════════════════════════════════════════

  private async findNearestCenter(
    customerLat?: number | null, customerLng?: number | null,
    items?: Array<{ productId: string; sellerId: string; quantity: number }>,
  ): Promise<string> {
    // Get active centers
    const centers = await this.prisma.fulfillmentCenter.findMany({
      where: { isActive: true },
      select: { id: true, lat: true, lng: true, capacity: true, currentOccupancy: true },
    });

    if (centers.length === 0) {
      throw new BadRequestException('No active fulfillment centers available');
    }

    // If only one center, use it
    if (centers.length === 1) return centers[0].id;

    // If we have items, filter to centers that have inventory
    if (items?.length) {
      const centersWithInventory: string[] = [];
      for (const center of centers) {
        const hasAll = await this.checkCenterInventory(center.id, items);
        if (hasAll) centersWithInventory.push(center.id);
      }
      // If some centers have inventory, prefer those
      if (centersWithInventory.length > 0) {
        if (centersWithInventory.length === 1) return centersWithInventory[0];
        // Find nearest among those with inventory
        if (customerLat && customerLng) {
          return this.findClosest(
            centers.filter(c => centersWithInventory.includes(c.id)),
            customerLat, customerLng,
          );
        }
        return centersWithInventory[0];
      }
    }

    // Fall back to nearest by distance
    if (customerLat && customerLng) {
      return this.findClosest(centers, customerLat, customerLng);
    }

    // Default: center with most capacity
    const sorted = centers.sort((a, b) => (b.capacity - b.currentOccupancy) - (a.capacity - a.currentOccupancy));
    return sorted[0].id;
  }

  private findClosest(
    centers: Array<{ id: string; lat: number | null; lng: number | null }>,
    lat: number, lng: number,
  ): string {
    let minDist = Infinity;
    let nearest = centers[0].id;
    for (const c of centers) {
      if (c.lat && c.lng) {
        const dist = Math.sqrt(Math.pow(c.lat - lat, 2) + Math.pow(c.lng - lng, 2));
        if (dist < minDist) { minDist = dist; nearest = c.id; }
      }
    }
    return nearest;
  }

  private async checkCenterInventory(
    centerId: string,
    items: Array<{ productId: string; sellerId: string; quantity: number }>,
  ): Promise<boolean> {
    for (const item of items) {
      const inv = await this.prisma.warehouseInventory.findFirst({
        where: {
          fulfillmentCenterId: centerId,
          productId: item.productId,
          quantity: { gte: item.quantity },
        },
      });
      if (!inv) return false;
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY RESERVATION
  // ═══════════════════════════════════════════════════════════════════════════

  private async reserveInventory(centerId: string, items: any[]) {
    for (const item of items) {
      const inv = await this.prisma.warehouseInventory.findFirst({
        where: {
          fulfillmentCenterId: centerId,
          productId: item.productId,
        },
      });

      if (inv) {
        const available = inv.quantity - inv.reservedQuantity;
        if (available < item.quantity) {
          this.logger.warn(`Insufficient inventory for product ${item.productId} at center ${centerId}`);
          continue;
        }
        await this.prisma.warehouseInventory.update({
          where: { id: inv.id },
          data: { reservedQuantity: { increment: item.quantity } },
        });
      }
    }
  }

  async releaseInventory(centerId: string, items: Array<{ productId: string; quantity: number }>) {
    for (const item of items) {
      const inv = await this.prisma.warehouseInventory.findFirst({
        where: { fulfillmentCenterId: centerId, productId: item.productId },
      });
      if (inv && inv.reservedQuantity >= item.quantity) {
        await this.prisma.warehouseInventory.update({
          where: { id: inv.id },
          data: { reservedQuantity: { decrement: item.quantity } },
        });
      }
    }
  }

  async deductInventoryOnDelivery(centerId: string, items: Array<{ productId: string; quantity: number }>) {
    for (const item of items) {
      const inv = await this.prisma.warehouseInventory.findFirst({
        where: { fulfillmentCenterId: centerId, productId: item.productId },
      });
      if (inv) {
        await this.prisma.warehouseInventory.update({
          where: { id: inv.id },
          data: {
            quantity: { decrement: item.quantity },
            reservedQuantity: { decrement: Math.min(inv.reservedQuantity, item.quantity) },
          },
        });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO DRIVER ASSIGNMENT
  // ═══════════════════════════════════════════════════════════════════════════

  async autoAssignDriver(routeId: string) {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: { fulfillmentCenter: true },
    });
    if (!route) throw new NotFoundException('Route not found');
    if (route.riderId) return { message: 'Route already has a driver', riderId: route.riderId };

    // Find available drivers sorted by rating
    const drivers = await this.prisma.rider.findMany({
      where: {
        isOnline: true,
        riderStatus: 'AVAILABLE',
      },
      orderBy: [{ rating: 'desc' }, { totalDeliveries: 'desc' }],
      take: 1,
      select: { id: true, user: { select: { fullName: true } } },
    });

    if (drivers.length === 0) {
      return { message: 'No available drivers found' };
    }

    const driver = drivers[0];
    await this.prisma.deliveryRoute.update({
      where: { id: routeId },
      data: { riderId: driver.id, status: 'ASSIGNED' },
    });

    return { message: 'Driver auto-assigned', riderId: driver.id, driverName: driver.user?.fullName };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO ROUTE CREATION FROM PACKAGES
  // ═══════════════════════════════════════════════════════════════════════════

  async autoCreateRouteFromPackages(centerId: string, plannedDate: string) {
    // Find packages ready for dispatch (sorted/loaded)
    const packages = await this.prisma.package.findMany({
      where: {
        fulfillmentCenterId: centerId,
        status: { in: ['SORTED', 'SCANNED_OUT'] },
        routeStop: null, // not already assigned to a route
      },
      include: {
        shipment: {
          include: {
            order: {
              select: {
                address: true,
                customer: { select: { user: { select: { fullName: true, phone: true } } } },
              },
            },
          },
        },
      },
      take: 50,
    });

    if (packages.length === 0) {
      return { message: 'No packages ready for route creation' };
    }

    const routeNumber = `RT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    const route = await this.prisma.deliveryRoute.create({
      data: {
        routeNumber,
        fulfillmentCenterId: centerId,
        plannedDate: new Date(plannedDate),
        totalStops: packages.length,
        status: 'PLANNED',
      },
    });

    // Create stops
    for (let i = 0; i < packages.length; i++) {
      const pkg = packages[i];
      const addr = pkg.shipment?.order?.address;
      const cust = pkg.shipment?.order?.customer?.user;

      await this.prisma.routeStop.create({
        data: {
          routeId: route.id,
          packageId: pkg.id,
          stopOrder: i + 1,
          customerName: cust?.fullName || '',
          customerPhone: cust?.phone || '',
          addressLine1: addr?.addressLine1 || '',
          addressLine2: addr?.addressLine2,
          city: addr?.city,
          district: addr?.district,
          postalCode: addr?.postalCode,
          lat: addr?.lat,
          lng: addr?.lng,
        },
      });
    }

    return {
      message: `Route ${routeNumber} created with ${packages.length} stops`,
      routeId: route.id,
      routeNumber,
      totalStops: packages.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // INVENTORY AUTO-UPDATE TRIGGERS
  // ═══════════════════════════════════════════════════════════════════════════

  async handleOrderCancellation(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order?.fulfillmentCenterId) return;

    // Release reserved inventory
    await this.releaseInventory(
      order.fulfillmentCenterId,
      order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    );

    this.logger.log(`Inventory released for cancelled order ${orderId}`);
  }

  async handleDeliveryCompletion(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order?.fulfillmentCenterId) return;

    // Deduct actual inventory (reserved → sold)
    await this.deductInventoryOnDelivery(
      order.fulfillmentCenterId,
      order.items.map(i => ({ productId: i.productId, quantity: i.quantity })),
    );

    // Also update product stock
    for (const item of order.items) {
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      }).catch(() => {}); // ignore if product not found
    }

    this.logger.log(`Inventory deducted for delivered order ${orderId}`);
  }

  async handleReturnToWarehouse(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order?.fulfillmentCenterId) return;

    // Add returned items back to inventory
    for (const item of order.items) {
      const inv = await this.prisma.warehouseInventory.findFirst({
        where: { fulfillmentCenterId: order.fulfillmentCenterId, productId: item.productId },
      });
      if (inv) {
        await this.prisma.warehouseInventory.update({
          where: { id: inv.id },
          data: { quantity: { increment: item.quantity } },
        });
      }

      // Update product stock
      await this.prisma.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      }).catch(() => {});
    }

    this.logger.log(`Inventory restored for returned order ${orderId}`);
  }

  async handleDamagedInventory(centerId: string, productId: string, quantity: number) {
    const inv = await this.prisma.warehouseInventory.findFirst({
      where: { fulfillmentCenterId: centerId, productId },
    });
    if (!inv) return;

    await this.prisma.warehouseInventory.update({
      where: { id: inv.id },
      data: {
        quantity: { decrement: quantity },
        damagedQuantity: { increment: quantity },
      },
    });

    this.logger.log(`${quantity} units marked damaged for product ${productId} at center ${centerId}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FULFILLMENT STATUS OVERVIEW
  // ═══════════════════════════════════════════════════════════════════════════

  async getFulfillmentPipeline(centerId?: string) {
    const where: any = {};
    if (centerId) where.fulfillmentCenterId = centerId;

    const [created, picking, packed, labeled, sorted, scannedOut, inTransit, outForDelivery, delivered, failed] = await Promise.all([
      this.prisma.package.count({ where: { ...where, status: 'CREATED' } }),
      this.prisma.package.count({ where: { ...where, status: 'PICKING' } }),
      this.prisma.package.count({ where: { ...where, status: 'PACKED' } }),
      this.prisma.package.count({ where: { ...where, status: 'LABELED' } }),
      this.prisma.package.count({ where: { ...where, status: 'SORTED' } }),
      this.prisma.package.count({ where: { ...where, status: 'SCANNED_OUT' } }),
      this.prisma.package.count({ where: { ...where, status: 'IN_TRANSIT' } }),
      this.prisma.package.count({ where: { ...where, status: 'OUT_FOR_DELIVERY' } }),
      this.prisma.package.count({ where: { ...where, status: 'DELIVERED' } }),
      this.prisma.package.count({ where: { ...where, status: 'DELIVERY_FAILED' } }),
    ]);

    return {
      pipeline: {
        created, picking, packed, labeled, sorted,
        scannedOut, inTransit, outForDelivery, delivered, failed,
        total: created + picking + packed + labeled + sorted + scannedOut + inTransit + outForDelivery + delivered + failed,
      },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DRIVER RANK CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  async recalculateDriverRank(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: { totalDeliveries: true, rating: true },
    });
    if (!rider) return;

    // Calculate success rate
    const total = await this.prisma.deliveryProof.count({ where: { riderId } });
    const failed = await this.prisma.failedDelivery.count({ where: { riderId } });
    const successRate = total + failed > 0 ? (total / (total + failed)) * 100 : 0;

    // Determine rank
    let rank: string = 'BRONZE';
    if (rider.totalDeliveries >= 1000 && rider.rating >= 4.5 && successRate >= 98) rank = 'PLATINUM';
    else if (rider.totalDeliveries >= 500 && rider.rating >= 4.0 && successRate >= 95) rank = 'GOLD';
    else if (rider.totalDeliveries >= 100 && rider.rating >= 3.5 && successRate >= 90) rank = 'SILVER';

    await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        driverRank: rank as any,
        deliverySuccessRate: Math.round(successRate * 100) / 100,
      },
    });

    return { rank, successRate };
  }
}
