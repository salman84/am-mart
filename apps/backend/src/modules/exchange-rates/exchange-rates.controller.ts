import {
  Controller, Get, Post, Put, Delete, Patch, Body, Param, Query,
  UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateProviderDto, UpdateProviderDto, ManualRateDto } from './dto/provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// ── Public Endpoints (no auth) ────────────────────────────────────────────────
@Controller({ path: 'exchange-rates', version: '1' })
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  // GET /exchange-rates/public/compare?send=KRW&recv=PHP&amount=100000
  @Get('public/compare')
  publicCompare(
    @Query('send') send: string = 'KRW',
    @Query('recv') recv: string = 'PHP',
    @Query('amount') amount?: string,
  ) {
    return this.service.getPublicRates(send, recv, amount ? parseFloat(amount) : undefined);
  }

  // GET /exchange-rates/public/best?base=KRW
  @Get('public/best')
  bestRates(@Query('base') base: string = 'KRW') {
    return this.service.getBestRates(base);
  }

  // GET /exchange-rates/public/currencies
  @Get('public/currencies')
  getCurrencies() {
    return this.service.getSupportedCurrencies();
  }

  // ── Admin Endpoints (JWT + ADMIN role) ──────────────────────────────────────

  // GET /exchange-rates/admin/stats
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getStats() {
    return this.service.getStats();
  }

  // GET /exchange-rates/admin/providers
  @Get('admin/providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getProviders(@Query('includeInactive') includeInactive?: string) {
    return this.service.getAllProviders(includeInactive === 'true');
  }

  // GET /exchange-rates/admin/presets
  @Get('admin/presets')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getPresets() {
    return this.service.getPresetCompanies();
  }

  // GET /exchange-rates/admin/providers/:id
  @Get('admin/providers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  getProvider(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.getProvider(id);
  }

  // POST /exchange-rates/admin/providers
  @Post('admin/providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  createProvider(@Body() dto: CreateProviderDto) {
    return this.service.createProvider(dto);
  }

  // PUT /exchange-rates/admin/providers/:id
  @Put('admin/providers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  updateProvider(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProviderDto) {
    return this.service.updateProvider(id, dto);
  }

  // DELETE /exchange-rates/admin/providers/:id
  @Delete('admin/providers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  deleteProvider(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.deleteProvider(id);
  }

  // POST /exchange-rates/admin/providers/:id/rate
  @Post('admin/providers/:id/rate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  setRate(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ManualRateDto) {
    return this.service.setManualRate(id, dto);
  }

  // POST /exchange-rates/admin/providers/:id/fetch
  @Post('admin/providers/:id/fetch')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  triggerFetch(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.fetchProviderRates(id);
  }

  // POST /exchange-rates/admin/fetch-all
  @Post('admin/fetch-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  fetchAll() {
    return this.service.autoFetchAllRates();
  }

  // GET /exchange-rates/admin/compare?send=KRW&recv=PHP&amount=100000
  @Get('admin/compare')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  adminCompare(
    @Query('send') send: string = 'KRW',
    @Query('recv') recv: string = 'PHP',
    @Query('amount') amount?: string,
  ) {
    return this.service.compareRates(send, recv, amount ? parseFloat(amount) : undefined);
  }
}
