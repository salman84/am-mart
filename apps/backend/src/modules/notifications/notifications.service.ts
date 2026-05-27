import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotificationType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(private prisma: PrismaService, private config: ConfigService) {
    this.initFirebase();
  }

  private initFirebase() {
    try {
      const projectId = this.config.get('FIREBASE_PROJECT_ID');
      const privateKey = this.config.get('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
      const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');

      if (projectId && privateKey && clientEmail) {
        if (!admin.apps.length) {
          admin.initializeApp({
            credential: admin.credential.cert({ projectId, privateKey, clientEmail }),
          });
        }
        this.firebaseInitialized = true;
      }
    } catch (e) {
      this.logger.warn('Firebase not configured: ' + e.message);
    }
  }

  async sendPushToUser(userId: string, payload: PushPayload) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    await this.prisma.notification.create({
      data: {
        userId,
        title: payload.title,
        body: payload.body,
        type: (payload.data?.type as NotificationType) || NotificationType.SYSTEM,
        data: payload.data || {},
      },
    });

    if (user?.fcmToken && this.firebaseInitialized) {
      await this.sendFcm(user.fcmToken, payload);
    }
  }

  async sendPushToMultiple(userIds: string[], payload: PushPayload) {
    await Promise.allSettled(userIds.map((id) => this.sendPushToUser(id, payload)));
  }

  async sendPushToRole(role: UserRole, payload: PushPayload) {
    const users = await this.prisma.user.findMany({
      where: { role, fcmToken: { not: null } },
      select: { id: true },
    });
    await this.sendPushToMultiple(users.map((u) => u.id), payload);
  }

  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [total, notifications, unreadCount] = await Promise.all([
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.findMany({
        where: { userId },
        skip, take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);
    return { total, page, limit, unreadCount, notifications };
  }

  async markRead(userId: string, notificationId?: string) {
    if (notificationId) {
      await this.prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true },
      });
    } else {
      await this.prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    }
    return { message: 'Marked as read' };
  }

  private async sendFcm(token: string, payload: PushPayload) {
    try {
      await admin.messaging().send({
        token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ? Object.fromEntries(
          Object.entries(payload.data).map(([k, v]) => [k, String(v)])
        ) : {},
        android: { priority: 'high' },
        apns: { payload: { aps: { sound: 'default' } } },
      });
    } catch (e) {
      this.logger.error('FCM send failed:', e.message);
    }
  }
}

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}
