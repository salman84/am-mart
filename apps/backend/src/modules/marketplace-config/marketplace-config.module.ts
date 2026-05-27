import { Module } from '@nestjs/common';
import { MarketplaceConfigController } from './marketplace-config.controller';
import { MarketplaceConfigService } from './marketplace-config.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [MarketplaceConfigController],
  providers: [MarketplaceConfigService],
  exports: [MarketplaceConfigService],
})
export class MarketplaceConfigModule {}
