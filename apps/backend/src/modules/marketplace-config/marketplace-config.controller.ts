import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MarketplaceConfigService } from './marketplace-config.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Marketplace Configuration')
@Controller({ path: 'marketplace-config', version: '1' })
export class MarketplaceConfigController {
  constructor(private readonly service: MarketplaceConfigService) {}

  @Public()
  @Get('public')
  getPublicConfig(@Query('lang') lang = 'en') {
    return this.service.getPublicConfig(lang);
  }

  @Public()
  @Get('seller-registration')
  getSellerRegistrationConfig(
    @Query('scope') scope?: string,
    @Query('accountType') accountType?: string,
    @Query('lang') lang = 'en',
  ) {
    return this.service.getSellerRegistrationConfig({ scope, accountType, lang });
  }

  @Public()
  @Get('homepage')
  getHomepage(@Query('lang') lang = 'en') {
    return this.service.getHomepage(lang);
  }

  @Get('admin/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getAdminOverview() {
    return this.service.getAdminOverview();
  }

  @Get('admin/settings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getSettings(@Query('group') group?: string) {
    return this.service.getSettings(group);
  }

  @Put('admin/settings/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  upsertSetting(@Param('key') key: string, @Body() body: any, @Req() req: any) {
    return this.service.upsertSetting(key, body, req.user.id);
  }

  @Get('admin/seller-form-fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getSellerFormFields(@Query('lang') lang = 'en') {
    return this.service.getSellerFormFields(lang);
  }

  @Post('admin/seller-form-fields')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createSellerFormField(@Body() body: any, @Req() req: any) {
    return this.service.createSellerFormField(body, req.user.id);
  }

  @Put('admin/seller-form-fields/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updateSellerFormField(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateSellerFormField(id, body, req.user.id);
  }

  @Get('admin/document-requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getDocumentRequirements(@Query('lang') lang = 'en') {
    return this.service.getDocumentRequirements(lang);
  }

  @Post('admin/document-requirements')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createDocumentRequirement(@Body() body: any, @Req() req: any) {
    return this.service.createDocumentRequirement(body, req.user.id);
  }

  @Put('admin/document-requirements/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updateDocumentRequirement(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateDocumentRequirement(id, body, req.user.id);
  }

  @Get('admin/homepage-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getHomepageSections(@Query('lang') lang = 'en') {
    return this.service.getHomepageSections(lang);
  }

  @Post('admin/homepage-sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createHomepageSection(@Body() body: any, @Req() req: any) {
    return this.service.createHomepageSection(body, req.user.id);
  }

  @Put('admin/homepage-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updateHomepageSection(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateHomepageSection(id, body, req.user.id);
  }

  @Delete('admin/homepage-sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  deleteHomepageSection(@Param('id') id: string) {
    return this.service.deleteHomepageSection(id);
  }

  @Get('admin/policy-pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getPolicyPages(@Query('lang') lang = 'en') {
    return this.service.getPolicyPages(lang);
  }

  @Post('admin/policy-pages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createPolicyPage(@Body() body: any, @Req() req: any) {
    return this.service.createPolicyPage(body, req.user.id);
  }

  @Put('admin/policy-pages/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updatePolicyPage(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updatePolicyPage(id, body, req.user.id);
  }

  @Get('admin/translations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getTranslations(@Query('lang') lang = 'en') {
    return this.service.getTranslations(lang);
  }

  @Put('admin/translations/:key')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  upsertTranslation(@Param('key') key: string, @Body() body: any, @Req() req: any) {
    return this.service.upsertTranslation(key, body, req.user.id);
  }

  @Get('admin/payment-providers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getPaymentProviders() {
    return this.service.getPaymentProviders();
  }

  @Put('admin/payment-providers/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updatePaymentProvider(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updatePaymentProvider(id, body, req.user.id);
  }

  @Get('admin/shipping-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getShippingMethods() {
    return this.service.getShippingMethods();
  }

  @Post('admin/shipping-methods')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createShippingMethod(@Body() body: any) {
    return this.service.createShippingMethod(body);
  }

  @Put('admin/shipping-methods/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updateShippingMethod(@Param('id') id: string, @Body() body: any) {
    return this.service.updateShippingMethod(id, body);
  }

  @Get('admin/commission-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  getCommissionRules() {
    return this.service.getCommissionRules();
  }

  @Post('admin/commission-rules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  createCommissionRule(@Body() body: any) {
    return this.service.createCommissionRule(body);
  }

  @Put('admin/commission-rules/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  updateCommissionRule(@Param('id') id: string, @Body() body: any) {
    return this.service.updateCommissionRule(id, body);
  }
}
