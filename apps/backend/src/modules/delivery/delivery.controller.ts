import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DeliveryService } from './delivery.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Delivery')
@Controller({ path: 'delivery', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DeliveryController {
  constructor(private deliveryService: DeliveryService) {}

  @Get('riders/available')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getAvailableRiders() {
    return this.deliveryService.getAvailableRiders();
  }

  @Post('assign')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: '[Admin] Assign rider to order' })
  assignRider(
    @Body('orderId') orderId: string,
    @Body('riderId') riderId: string,
    @Req() req: any,
  ) {
    return this.deliveryService.assignRider(orderId, riderId, req.user.id);
  }

  // Rider endpoints
  @Get('rider/assignments')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  getRiderAssignments(@Req() req: any, @Query('status') status?: string) {
    return this.deliveryService.getRiderAssignments(req.user.id, status);
  }

  @Get('rider/earnings')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  getRiderEarnings(@Req() req: any) {
    return this.deliveryService.getRiderEarnings(req.user.id);
  }

  @Post('assignments/:id/status')
  @UseGuards(RolesGuard)
  @Roles('RIDER')
  updateDeliveryStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @Body() data: any,
    @Req() req: any,
  ) {
    return this.deliveryService.riderUpdateDeliveryStatus(id, req.user.id, status, data);
  }
}
