import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OtpPurpose } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const FIREBASE_SEND_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode';
const FIREBASE_VERIFY_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private prisma: PrismaService, private config: ConfigService) {}

  // ── helpers ───────────────────────────────────────────────────────────────

  /** Convert Korean local number to E.164  (01012345678 → +8201012345678) */
  private toE164(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('82')) return `+${digits}`;
    if (digits.startsWith('0'))  return `+82${digits.slice(1)}`;
    return `+${digits}`;
  }

  private get webApiKey(): string {
    return this.config.get<string>('FIREBASE_WEB_API_KEY') || '';
  }

  // ── Firebase SMS ──────────────────────────────────────────────────────────

  /**
   * Ask Firebase to send an SMS to the phone number.
   * Returns Firebase's `sessionInfo` token (valid ~5 min).
   * Works immediately for test numbers configured in the Firebase console.
   * For real numbers in production, a `safetyNetToken` from the device is
   * required — that comes with @react-native-firebase (future upgrade).
   */
  private async firebaseSendSms(phone: string): Promise<string | null> {
    const apiKey = this.webApiKey;
    if (!apiKey) {
      this.logger.warn('FIREBASE_WEB_API_KEY not set — SMS not sent');
      return null;
    }

    const e164 = this.toE164(phone);
    const body: Record<string, string> = { phoneNumber: e164 };

    try {
      const res = await fetch(`${FIREBASE_SEND_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json() as any;

      if (!res.ok) {
        const msg = data?.error?.message || 'FIREBASE_SEND_FAILED';
        this.logger.error(`Firebase sendVerificationCode failed: ${msg} (${e164})`);
        // Don't throw — fall back to dev-mode OTP
        return null;
      }

      this.logger.log(`Firebase OTP sent to ${e164}`);
      return data.sessionInfo as string;
    } catch (err: any) {
      this.logger.error('Firebase SMS request error: ' + err.message);
      return null;
    }
  }

  /**
   * Verify the code the user typed against Firebase's sessionInfo.
   * Returns the Firebase UID on success, null on failure.
   */
  private async firebaseVerifyCode(sessionInfo: string, code: string): Promise<boolean> {
    const apiKey = this.webApiKey;
    if (!apiKey) return false;

    try {
      const res = await fetch(`${FIREBASE_VERIFY_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionInfo, code }),
      });

      const data = await res.json() as any;
      if (!res.ok) {
        this.logger.warn(`Firebase verify failed: ${data?.error?.message}`);
        return false;
      }
      return true;
    } catch (err: any) {
      this.logger.error('Firebase verify error: ' + err.message);
      return false;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Send OTP — returns the fallback code if Firebase SMS was NOT used
   * (Firebase REST API requires a client-side reCAPTCHA/SafetyNet token and
   * will always fail when called from the server).  Callers may include the
   * returned devCode in API responses so the mobile app can surface it during
   * development / when a real SMS gateway is not configured.
   */
  async sendOtp(
    userId: string,
    phone: string,
    purpose: string,
  ): Promise<{ devCode: string | null }> {
    // Invalidate any previous OTPs for this user + purpose
    await this.prisma.otpVerification.updateMany({
      where: { userId, purpose: purpose as OtpPurpose, isUsed: false },
      data:  { isUsed: true },
    });

    const expiresAt   = new Date(Date.now() + 10 * 60 * 1000); // 10 min
    const fallbackOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Try to send via Firebase (will fail from server without SafetyNet token)
    const sessionInfo = await this.firebaseSendSms(phone);

    // Save record — sessionInfo for Firebase path, fallbackOtp as otp field
    await this.prisma.otpVerification.create({
      data: {
        userId,
        phone,
        otp:         fallbackOtp,
        sessionInfo: sessionInfo ?? null,
        purpose:     purpose as OtpPurpose,
        expiresAt,
      },
    });

    if (!sessionInfo) {
      this.logger.log(`[DEV] OTP for ${phone} [${purpose}]: ${fallbackOtp}`);
      // Return code so the auth service can expose it when Firebase is unavailable
      return { devCode: fallbackOtp };
    }

    return { devCode: null };
  }

  async verifyOtp(userId: string, otp: string, purpose: string): Promise<boolean> {
    // Find the latest active record for this user + purpose
    const record = await this.prisma.otpVerification.findFirst({
      where: {
        userId,
        purpose:  purpose as OtpPurpose,
        isUsed:   false,
        expiresAt: { gt: new Date() },
        attempts:  { lt: 5 },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!record) return false;

    let valid = false;

    if (record.sessionInfo) {
      // ── Firebase path: verify against Firebase REST API ──────────────────
      valid = await this.firebaseVerifyCode(record.sessionInfo, otp);
    } else {
      // ── Fallback path: verify against DB (dev / no Firebase) ─────────────
      valid = record.otp === otp;
    }

    if (!valid) {
      // Increment failed attempts
      await this.prisma.otpVerification.update({
        where: { id: record.id },
        data:  { attempts: { increment: 1 } },
      });
      return false;
    }

    // Mark as used
    await this.prisma.otpVerification.update({
      where: { id: record.id },
      data:  { isUsed: true },
    });
    return true;
  }
}
