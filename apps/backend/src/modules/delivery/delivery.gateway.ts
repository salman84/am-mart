import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/tracking' })
export class DeliveryGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(DeliveryGateway.name);
  private riderSockets = new Map<string, string>();

  constructor(private jwt: JwtService, private prisma: PrismaService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];
      const payload = this.jwt.verify(token);
      client.data.userId = payload.sub;
      client.data.role = payload.role;

      if (payload.role === 'RIDER') {
        this.riderSockets.set(payload.sub, client.id);
        await this.prisma.rider.update({ where: { userId: payload.sub }, data: { isOnline: true } });
      }

      this.logger.log(`Client connected: ${client.id} (${payload.role})`);
    } catch {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data.role === 'RIDER') {
      this.riderSockets.delete(client.data.userId);
      await this.prisma.rider.update({
        where: { userId: client.data.userId },
        data: { isOnline: false, riderStatus: 'OFFLINE' },
      }).catch(() => {});
    }
  }

  @SubscribeMessage('rider:location')
  async handleRiderLocation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { lat: number; lng: number; orderId?: string },
  ) {
    if (client.data.role !== 'RIDER') return;

    await this.prisma.rider.update({
      where: { userId: client.data.userId },
      data: { currentLat: data.lat, currentLng: data.lng, riderStatus: 'BUSY' },
    });

    if (data.orderId) {
      const assignment = await this.prisma.deliveryAssignment.findFirst({
        where: { orderId: data.orderId, rider: { userId: client.data.userId } },
      });

      if (assignment) {
        await this.prisma.deliveryTracking.create({
          data: {
            assignmentId: assignment.id,
            riderId: assignment.riderId,
            lat: data.lat,
            lng: data.lng,
          },
        });

        // Broadcast to customers tracking this order
        this.server.to(`order:${data.orderId}`).emit('rider:position', {
          orderId: data.orderId,
          lat: data.lat,
          lng: data.lng,
          timestamp: new Date(),
        });
      }
    }
  }

  @SubscribeMessage('track:order')
  handleTrackOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    client.join(`order:${data.orderId}`);
  }

  @SubscribeMessage('untrack:order')
  handleUntrackOrder(@ConnectedSocket() client: Socket, @MessageBody() data: { orderId: string }) {
    client.leave(`order:${data.orderId}`);
  }

  emitOrderStatusUpdate(orderId: string, status: string, riderLocation?: { lat: number; lng: number }) {
    this.server.to(`order:${orderId}`).emit('order:status', { orderId, status, riderLocation });
  }
}
