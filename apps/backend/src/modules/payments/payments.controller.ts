import { Controller, Get, Post, Body, Param, Query, UseGuards, Req, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Payments')
@Controller({ path: 'payments', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('intent') createIntent(@Body('orderId') orderId: string, @Req() req: any) { return this.paymentsService.createPaymentIntent(orderId, req.user.id); }
  @Post('confirm') confirm(@Body('paymentIntentId') pid: string, @Body('orderId') oid: string) { return this.paymentsService.confirmPayment(pid, oid); }
  @Post('refund') requestRefund(@Body('orderId') oid: string, @Body('reason') reason: string, @Req() req: any) { return this.paymentsService.requestRefund(oid, req.user.id, reason); }

  @Get()
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getAll(@Query('page', new DefaultValuePipe(1), ParseIntPipe) p: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l: number) { return this.paymentsService.getAllPayments(p, l); }

  @Get('refunds')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getRefunds(@Query('page', new DefaultValuePipe(1), ParseIntPipe) p: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l: number, @Query('status') status?: string) { return this.paymentsService.getAllRefunds(p, l, status); }

  @Post('refunds/:id/process')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  processRefund(@Param('id') id: string, @Body('approved') approved: boolean, @Body('notes') notes: string) { return this.paymentsService.processRefund(id, approved, notes); }

  @Get('payouts')
  @UseGuards(RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN')
  getPayouts(@Query('page', new DefaultValuePipe(1), ParseIntPipe) p: number, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) l: number, @Query('sellerId') sellerId?: string) { return this.paymentsService.getSellerPayouts(p, l, sellerId); }
}
