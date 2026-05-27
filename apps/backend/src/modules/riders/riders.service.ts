import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RidersService {
  constructor(private prisma: PrismaService, private notifications: NotificationsService) {}

  async registerAsRider(userId: string, dto: RiderRegistrationDto) {
    const rider = await this.prisma.rider.create({
      data: { userId, ...dto, riderStatus: 'OFFLINE' },
    });
    await this.prisma.user.update({ where: { id: userId }, data: { role: 'RIDER' } });
    return { message: 'Rider registration submitted', rider };
  }

  async getRiderProfile(userId: string) {
    const rider = await this.prisma.rider.findFirst({
      where: { userId },
      include: { user: { select: { fullName: true, phone: true, email: true, avatar: true } } },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  async updateOnlineStatus(userId: string, isOnline: boolean, lat?: number, lng?: number) {
    const rider = await this.prisma.rider.findFirst({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider not found');

    return this.prisma.rider.update({
      where: { id: rider.id },
      data: {
        isOnline,
        riderStatus: isOnline ? 'AVAILABLE' : 'OFFLINE',
        currentLat: lat,
        currentLng: lng,
      },
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
  }

  async getAllRiders(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.riderStatus = status;

    const [total, riders] = await Promise.all([
      this.prisma.rider.count({ where }),
      this.prisma.rider.findMany({
        where, skip, take: limit,
        include: { user: { select: { fullName: true, phone: true, avatar: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    return { total, page, limit, riders };
  }
}

interface RiderRegistrationDto {
  vehicleType: string;
  vehicleNumber: string;
  licenseNumber: string;
  licenseDocUrl?: string;
  idDocUrl?: string;
}
