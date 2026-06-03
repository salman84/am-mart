import {
  Controller, Get, Post, Body, Param, Query, Req,
  UseGuards, ParseIntPipe, DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Returns & Reverse Logistics')
@Controller({ path: 'returns', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'SUPPORT_AGENT')
  @ApiOperation({ summary: 'List return requests' })
  getAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('status') status?: string,
    @Query('sellerId') sellerId?: string,
    @Query('customerId') customerId?: string,
  ) {
    return this.returnsService.getAllReturns({ page, limit, status, sellerId, customerId });
  }

  @Get(':id')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'SUPPORT_AGENT', 'SELLER', 'CUSTOMER')
  @ApiOperation({ summary: 'Get return request details' })
  getOne(@Param('id') id: string) {
    return this.returnsService.getReturn(id);
  }

  @Post(':id/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'SUPPORT_AGENT')
  @ApiOperation({ summary: 'Update return status' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body('adminNotes') adminNotes: string,
    @Req() req: any,
  ) {
    return this.returnsService.updateReturnStatus(id, status, req.user.id, { adminNotes });
  }

  @Post(':id/pickup')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'WAREHOUSE_MANAGER')
  @ApiOperation({ summary: 'Schedule return pickup' })
  schedulePickup(@Param('id') id: string, @Body() body: any) {
    return this.returnsService.schedulePickup(id, body);
  }

  @Post('pickups/:pickupId/status')
  @Roles('ADMIN', 'SUPER_ADMIN', 'DELIVERY_MANAGER', 'RIDER')
  @ApiOperation({ summary: 'Update pickup status' })
  updatePickupStatus(@Param('pickupId') pickupId: string, @Body('status') status: string) {
    return this.returnsService.updatePickupStatus(pickupId, status);
  }

  @Post(':id/inspection')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'WAREHOUSE_STAFF')
  @ApiOperation({ summary: 'Submit inspection results' })
  createInspection(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.returnsService.createInspection(id, { ...body, inspectedBy: req.user.id });
  }

  @Get(':id/inspection')
  @Roles('ADMIN', 'SUPER_ADMIN', 'WAREHOUSE_MANAGER', 'SUPPORT_AGENT')
  @ApiOperation({ summary: 'Get inspection results' })
  getInspection(@Param('id') id: string) {
    return this.returnsService.getInspection(id);
  }
}
