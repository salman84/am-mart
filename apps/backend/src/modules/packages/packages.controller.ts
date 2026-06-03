import {
  Controller, Get, Post, Put, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Packages & Tracking')
@Controller({ path: 'packages', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PackagesController {
  constructor(private packagesService: PackagesService) {}

  // ─── Package Queries ────────────────────────────────────────────────────────

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'List all packages' })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('centerId') centerId?: string,
    @Query('search') search?: string,
  ) {
    return this.packagesService.getAllPackages({ page, limit, status, centerId, search });
  }

  @Get('track/:trackingNumber')
  @ApiOperation({ summary: 'Track package by tracking number (public)' })
  trackPackage(@Param('trackingNumber') trackingNumber: string) {
    return this.packagesService.getPackageByTracking(trackingNumber);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'RIDER')
  @ApiOperation({ summary: 'Get package details' })
  getOne(@Param('id') id: string) {
    return this.packagesService.getPackage(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Create a package' })
  create(@Body() body: any) {
    return this.packagesService.createPackage(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Update package details' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.packagesService.updatePackage(id, body);
  }

  // ─── Pick & Pack Flow ──────────────────────────────────────────────────────

  @Get('queue/pick/:centerId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Get pick queue for a center' })
  getPickQueue(@Param('centerId') centerId: string) {
    return this.packagesService.getPickQueue(centerId);
  }

  @Post(':id/pick')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Mark package as picked' })
  pick(@Param('id') id: string, @Req() req: any) {
    return this.packagesService.pickPackage(id, req.user.id);
  }

  @Post(':id/pack')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Mark package as packed' })
  pack(@Param('id') id: string, @Req() req: any, @Body() body: any) {
    return this.packagesService.packPackage(id, req.user.id, body);
  }

  @Post(':id/label')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Generate shipping label' })
  generateLabel(@Param('id') id: string) {
    return this.packagesService.generateLabel(id);
  }

  // ─── Sort & Load ───────────────────────────────────────────────────────────

  @Post(':id/sort')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Sort package to a zone' })
  sort(@Param('id') id: string, @Body('sortZone') sortZone: string, @Req() req: any) {
    return this.packagesService.sortPackage(id, sortZone, req.user.id);
  }

  @Post(':id/load')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Load package onto delivery vehicle' })
  load(@Param('id') id: string, @Req() req: any) {
    return this.packagesService.loadPackage(id, req.user.id);
  }

  // ─── Scans ─────────────────────────────────────────────────────────────────

  @Post(':id/scan')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'RIDER')
  @ApiOperation({ summary: 'Add a scan event' })
  addScan(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.packagesService.addScan(id, { ...body, scannedBy: req.user.id });
  }

  @Get(':id/scans')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF', 'RIDER')
  @ApiOperation({ summary: 'Get scan history' })
  getScans(@Param('id') id: string) {
    return this.packagesService.getScans(id);
  }

  // ─── Status Updates ────────────────────────────────────────────────────────

  @Post(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'DELIVERY_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Update package status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Req() req: any,
  ) {
    return this.packagesService.updatePackageStatus(id, status, req.user.id);
  }
}
