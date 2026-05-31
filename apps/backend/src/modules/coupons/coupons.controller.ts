import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, UseGuards, Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  // ─── Public: validate coupon code ─────────────────────────────────────────
  @Post('validate')
  validateCoupon(@Body('code') code: string, @Body('amount') amount: number) {
    return this.couponsService.validateCoupon(code, amount);
  }

  // ─── Customer: Get my coupon wallet ───────────────────────────────────────
  @Get('my-coupons')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getUserCoupons(@Request() req: any) {
    return this.couponsService.getUserCoupons(req.user.userId);
  }

  // ─── Customer: Validate coupon (auth — checks per-user limits) ────────────
  @Post('validate-auth')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  validateCouponAuth(@Request() req: any, @Body('code') code: string, @Body('amount') amount: number) {
    return this.couponsService.validateCoupon(code, amount, req.user.userId);
  }

  // ─── Customer: Referral stats ─────────────────────────────────────────────
  @Get('referral-stats')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  getReferralStats(@Request() req: any) {
    return this.couponsService.getReferralStats(req.user.userId);
  }

  // ─── Admin: List all ──────────────────────────────────────────────────────
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  findAll() {
    return this.couponsService.findAll();
  }

  // ─── Admin: Create ────────────────────────────────────────────────────────
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  create(@Body() dto: any) {
    return this.couponsService.create(dto);
  }

  // ─── Admin: Update ────────────────────────────────────────────────────────
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  update(@Param('id') id: string, @Body() dto: any) {
    return this.couponsService.update(id, dto);
  }

  // ─── Admin: Toggle active (Start / Stop instantly) ────────────────────────
  @Patch(':id/toggle')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  toggleActive(@Param('id') id: string) {
    return this.couponsService.toggleActive(id);
  }

  // ─── Admin: Delete (soft) ─────────────────────────────────────────────────
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  delete(@Param('id') id: string) {
    return this.couponsService.delete(id);
  }
}
