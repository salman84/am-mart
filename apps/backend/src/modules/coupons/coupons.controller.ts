import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Coupons')
@Controller({ path: 'coupons', version: '1' })
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate') validateCoupon(@Body('code') code: string, @Body('amount') amount: number) { return this.couponsService.validateCoupon(code, amount); }

  @Get() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() findAll() { return this.couponsService.findAll(); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() create(@Body() dto: any) { return this.couponsService.create(dto); }
  @Put(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() update(@Param('id') id: string, @Body() dto: any) { return this.couponsService.update(id, dto); }
  @Delete(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN', 'SUPER_ADMIN') @ApiBearerAuth() delete(@Param('id') id: string) { return this.couponsService.delete(id); }
}
