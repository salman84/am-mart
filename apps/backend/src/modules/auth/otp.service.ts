import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendOtp(userId: string, phone: string, purpose: string): Promise<void> {
    await this.prisma.otpVerification.updateMany({
      where: { userId, purpose: purpose as OtpPurpose, isUsed: false },
      data: { isUsed: true },
    });

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otpVerification.create({
      data: { userId, phone, otp, purpose: purpose as OtpPurpose, expiresAt },
    });

    // In production, send via Twilio
    if (process.env.NODE_ENV === 'development') {
      this.logger.log(`DEV OTP for ${phone} [${purpose}]: ${otp}`);
    } else {
      await this.sendSms(phone, `Your AM Mart OTP: ${otp}. Valid for 10 minutes.`);
    }
  }

  async verifyOtp(userId: string, otp: string, purpose: string): Promise<boolean> {
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        userId,
        otp,
        purpose: purpose as OtpPurpose,
        isUsed: false,
        expiresAt: { gt: new Date() },
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) {
      await this.prisma.otpVerification.updateMany({
        where: { userId, purpose: purpose as OtpPurpose, isUsed: false },
        data: { attempts: { increment: 1 } },
      });
      return false;
    }

    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data: { isUsed: true },
    });

    return true;
  }

  private async sendSms(phone: string, message: string): Promise<void> {
    try {
      const twilio = require('twilio')(
        this.config.get('TWILIO_ACCOUNT_SID'),
        this.config.get('TWILIO_AUTH_TOKEN'),
      );
      await twilio.messages.create({
        body: message,
        from: this.config.get('TWILIO_PHONE_NUMBER'),
        to: phone,
      });
    } catch (err) {
      this.logger.error('SMS send failed', err.message);
    }
  }
}
