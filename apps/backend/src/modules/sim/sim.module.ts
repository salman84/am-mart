import { Module } from '@nestjs/common';
import { SimController } from './sim.controller';
import { SimService } from './sim.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [SimController],
  providers: [SimService],
  exports: [SimService],
})
export class SimModule {}
