import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HubsService } from './hubs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Delivery Hubs & Warehouse Zones')
@Controller({ path: 'hubs', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HubsController {
  constructor(private hubsService: HubsService) {}

  // ─── Delivery Hubs ──────────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'List delivery hubs' })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
    @Query('centerId') centerId?: string,
  ) {
    return this.hubsService.getAll({
      page, limit, search, centerId,
      isActive: isActive === undefined ? undefined : isActive === 'true',
    });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  getOne(@Param('id') id: string) {
    return this.hubsService.getOne(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Create delivery hub' })
  create(@Body() body: any) {
    return this.hubsService.create(body);
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update delivery hub' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.hubsService.update(id, body);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete delivery hub' })
  remove(@Param('id') id: string) {
    return this.hubsService.remove(id);
  }

  // ─── Warehouse Zones ────────────────────────────────────────────────────────

  @Get('zones/:centerId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'List zones in a center' })
  getZones(@Param('centerId') centerId: string) {
    return this.hubsService.getZones(centerId);
  }

  @Post('zones/:centerId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Create zone' })
  createZone(@Param('centerId') centerId: string, @Body() body: any) {
    return this.hubsService.createZone(centerId, body);
  }

  @Put('zones/item/:zoneId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Update zone' })
  updateZone(@Param('zoneId') zoneId: string, @Body() body: any) {
    return this.hubsService.updateZone(zoneId, body);
  }

  @Delete('zones/item/:zoneId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Delete zone' })
  deleteZone(@Param('zoneId') zoneId: string) {
    return this.hubsService.deleteZone(zoneId);
  }

  // ─── Racks ──────────────────────────────────────────────────────────────────

  @Get('racks/:zoneId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'List racks in a zone' })
  getRacks(@Param('zoneId') zoneId: string) {
    return this.hubsService.getRacks(zoneId);
  }

  @Post('racks/:zoneId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Create rack' })
  createRack(@Param('zoneId') zoneId: string, @Body() body: any) {
    return this.hubsService.createRack(zoneId, body);
  }

  @Put('racks/item/:rackId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Update rack' })
  updateRack(@Param('rackId') rackId: string, @Body() body: any) {
    return this.hubsService.updateRack(rackId, body);
  }

  @Delete('racks/item/:rackId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Delete rack' })
  deleteRack(@Param('rackId') rackId: string) {
    return this.hubsService.deleteRack(rackId);
  }
}
