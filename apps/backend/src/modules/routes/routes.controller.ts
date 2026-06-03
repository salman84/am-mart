import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RoutesService } from './routes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Routes & Driver Management')
@Controller({ path: 'routes', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RoutesController {
  constructor(private routesService: RoutesService) {}

  // ─── Routes ─────────────────────────────────────────────────────────────────

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'List delivery routes' })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('centerId') centerId?: string,
    @Query('riderId') riderId?: string,
    @Query('date') date?: string,
  ) {
    return this.routesService.getAllRoutes({ page, limit, status, centerId, riderId, date });
  }

  @Get('my')
  @Roles('RIDER')
  @ApiOperation({ summary: '[Rider] Get my assigned routes' })
  getMyRoutes(
    @Req() req: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
  ) {
    return this.routesService.getMyRoutes(req.user.id, { page, limit, status });
  }

  @Get('my/packages')
  @Roles('RIDER')
  @ApiOperation({ summary: '[Rider] Get packages assigned to my active routes' })
  getMyPackages(@Req() req: any) {
    return this.routesService.getMyPackages(req.user.id);
  }

  @Get('available-drivers')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Get available drivers for assignment' })
  getAvailableDrivers() {
    return this.routesService.getAvailableDrivers();
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Get route details' })
  getOne(@Param('id') id: string) {
    return this.routesService.getRoute(id);
  }

  @Post()
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Create delivery route' })
  create(@Body() body: any, @Req() req: any) {
    return this.routesService.createRoute({ ...body, createdBy: req.user.id });
  }

  @Put(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Update route' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.routesService.updateRoute(id, body);
  }

  @Post(':id/assign-driver')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Assign driver to route' })
  assignDriver(@Param('id') id: string, @Body('riderId') riderId: string) {
    return this.routesService.assignDriver(id, riderId);
  }

  @Post(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Update route status' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.routesService.updateRouteStatus(id, status);
  }

  // ─── Stops ──────────────────────────────────────────────────────────────────

  @Post(':id/stops')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Add stop to route' })
  addStop(@Param('id') id: string, @Body() body: any) {
    return this.routesService.addStop(id, body);
  }

  @Post('stops/:stopId/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Update stop status' })
  updateStopStatus(@Param('stopId') stopId: string, @Body('status') status: string) {
    return this.routesService.updateStopStatus(stopId, status);
  }

  @Delete('stops/:stopId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Remove stop from route' })
  removeStop(@Param('stopId') stopId: string) {
    return this.routesService.removeStop(stopId);
  }

  // ─── Delivery Proofs ────────────────────────────────────────────────────────

  @Post('delivery-proof')
  @Roles('RIDER')
  @ApiOperation({ summary: 'Submit delivery proof' })
  createProof(@Body() body: any) {
    return this.routesService.createDeliveryProof(body);
  }

  @Get('delivery-proof/:packageId')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'RIDER', 'CUSTOMER')
  @ApiOperation({ summary: 'Get delivery proof for package' })
  getProof(@Param('packageId') packageId: string) {
    return this.routesService.getDeliveryProof(packageId);
  }

  // ─── Failed Deliveries ─────────────────────────────────────────────────────

  @Post('failed-delivery')
  @Roles('RIDER')
  @ApiOperation({ summary: 'Record failed delivery' })
  recordFailed(@Body() body: any) {
    return this.routesService.recordFailedDelivery(body);
  }

  @Get('failed-deliveries')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'List failed deliveries' })
  getFailedDeliveries(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('reason') reason?: string,
    @Query('riderId') riderId?: string,
  ) {
    return this.routesService.getFailedDeliveries({ page, limit, reason, riderId });
  }

  // ─── Shifts ─────────────────────────────────────────────────────────────────

  @Get('shifts')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'List driver shifts' })
  getShifts(@Query('centerId') centerId?: string) {
    return this.routesService.getShifts(centerId);
  }

  @Post('shifts')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Create driver shift' })
  createShift(@Body() body: any) {
    return this.routesService.createShift(body);
  }

  @Put('shifts/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Update shift' })
  updateShift(@Param('id') id: string, @Body() body: any) {
    return this.routesService.updateShift(id, body);
  }

  @Delete('shifts/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Delete shift' })
  deleteShift(@Param('id') id: string) {
    return this.routesService.deleteShift(id);
  }

  // ─── Shift Assignments ─────────────────────────────────────────────────────

  @Get('shift-assignments')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'List shift assignments' })
  getShiftAssignments(
    @Query('shiftId') shiftId?: string,
    @Query('riderId') riderId?: string,
    @Query('date') date?: string,
  ) {
    return this.routesService.getShiftAssignments({ shiftId, riderId, date });
  }

  @Post('shift-assignments')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Assign driver to shift' })
  assignShift(@Body() body: any) {
    return this.routesService.assignShift(body);
  }

  @Post('shift-assignments/:id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Update shift assignment (clock in/out)' })
  updateShiftAssignment(@Param('id') id: string, @Body('status') status: string) {
    return this.routesService.updateShiftAssignment(id, status);
  }

  // ─── Time Slots ─────────────────────────────────────────────────────────────

  @Get('time-slots')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'List delivery time slots' })
  getTimeSlots(@Query('zoneId') zoneId?: string) {
    return this.routesService.getTimeSlots(zoneId);
  }

  @Post('time-slots')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Create time slot' })
  createTimeSlot(@Body() body: any) {
    return this.routesService.createTimeSlot(body);
  }

  @Put('time-slots/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Update time slot' })
  updateTimeSlot(@Param('id') id: string, @Body() body: any) {
    return this.routesService.updateTimeSlot(id, body);
  }

  @Delete('time-slots/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Delete time slot' })
  deleteTimeSlot(@Param('id') id: string) {
    return this.routesService.deleteTimeSlot(id);
  }

  // ─── Fee Rules ──────────────────────────────────────────────────────────────

  @Get('fee-rules')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'List delivery fee rules' })
  getFeeRules(@Query('zoneId') zoneId?: string) {
    return this.routesService.getFeeRules(zoneId);
  }

  @Post('fee-rules')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Create fee rule' })
  createFeeRule(@Body() body: any) {
    return this.routesService.createFeeRule(body);
  }

  @Put('fee-rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Update fee rule' })
  updateFeeRule(@Param('id') id: string, @Body() body: any) {
    return this.routesService.updateFeeRule(id, body);
  }

  @Delete('fee-rules/:id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER')
  @ApiOperation({ summary: 'Delete fee rule' })
  deleteFeeRule(@Param('id') id: string) {
    return this.routesService.deleteFeeRule(id);
  }
}
