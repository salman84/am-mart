import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Warehouse & Fulfillment')
@Controller({ path: 'warehouse', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WarehouseController {
  constructor(private warehouseService: WarehouseService) {}

  // ─── Fulfillment Centers ────────────────────────────────────────────────────

  @Get('centers')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'List fulfillment centers' })
  getCenters(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.warehouseService.getAllFulfillmentCenters({
      page, limit, search,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get('centers/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Get fulfillment center details' })
  getCenter(@Param('id') id: string) {
    return this.warehouseService.getFulfillmentCenter(id);
  }

  @Post('centers')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create fulfillment center' })
  createCenter(@Body() body: any) {
    return this.warehouseService.createFulfillmentCenter(body);
  }

  @Put('centers/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update fulfillment center' })
  updateCenter(@Param('id') id: string, @Body() body: any) {
    return this.warehouseService.updateFulfillmentCenter(id, body);
  }

  @Delete('centers/:id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete fulfillment center' })
  deleteCenter(@Param('id') id: string) {
    return this.warehouseService.deleteFulfillmentCenter(id);
  }

  @Get('centers/:id/dashboard')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Get warehouse dashboard stats' })
  getDashboard(@Param('id') id: string) {
    return this.warehouseService.getDashboardStats(id);
  }

  // ─── Bins ───────────────────────────────────────────────────────────────────

  @Get('centers/:centerId/bins')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'List bins in a fulfillment center' })
  getBins(
    @Param('centerId') centerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('section') section?: string,
    @Query('binType') binType?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.warehouseService.getBins(centerId, {
      page, limit, section, binType,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Post('centers/:centerId/bins')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Create a bin' })
  createBin(@Param('centerId') centerId: string, @Body() body: any) {
    return this.warehouseService.createBin(centerId, body);
  }

  @Put('bins/:binId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Update a bin' })
  updateBin(@Param('binId') binId: string, @Body() body: any) {
    return this.warehouseService.updateBin(binId, body);
  }

  @Delete('bins/:binId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Delete a bin' })
  deleteBin(@Param('binId') binId: string) {
    return this.warehouseService.deleteBin(binId);
  }

  // ─── Inventory ──────────────────────────────────────────────────────────────

  @Get('centers/:centerId/inventory')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'List inventory in a center' })
  getInventory(
    @Param('centerId') centerId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(30), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('binId') binId?: string,
  ) {
    return this.warehouseService.getInventory(centerId, { page, limit, search, binId });
  }

  @Post('centers/:centerId/inventory/adjust')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Adjust inventory count' })
  adjustInventory(@Param('centerId') centerId: string, @Body() body: any) {
    return this.warehouseService.adjustInventory(centerId, body);
  }

  // ─── Transfers ──────────────────────────────────────────────────────────────

  @Get('transfers')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SELLER')
  @ApiOperation({ summary: 'List warehouse transfers' })
  getTransfers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('centerId') centerId?: string,
    @Query('sellerId') sellerId?: string,
  ) {
    return this.warehouseService.getTransfers({ page, limit, status, centerId, sellerId });
  }

  @Get('transfers/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'SELLER')
  @ApiOperation({ summary: 'Get transfer details' })
  getTransfer(@Param('id') id: string) {
    return this.warehouseService.getTransfer(id);
  }

  @Post('transfers')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'SELLER')
  @ApiOperation({ summary: 'Create a transfer request' })
  createTransfer(@Body() body: any, @Req() req: any) {
    return this.warehouseService.createTransfer({ ...body, requestedBy: req.user.id });
  }

  @Post('transfers/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Update transfer status' })
  updateTransferStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('notes') notes: string,
    @Req() req: any,
  ) {
    return this.warehouseService.updateTransferStatus(id, status, req.user.id, { notes });
  }

  @Post('transfers/:id/receive')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Receive transfer items' })
  receiveTransferItems(
    @Param('id') id: string,
    @Body('items') items: any[],
    @Req() req: any,
  ) {
    return this.warehouseService.receiveTransferItems(id, items, req.user.id);
  }
}
