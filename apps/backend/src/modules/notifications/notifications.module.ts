import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { ParcelNotificationsService } from './parcel-notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, ParcelNotificationsService],
  exports: [NotificationsService, ParcelNotificationsService],
})
export class NotificationsModule {}
