import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  constructor(private config: ConfigService) {}

  private isCloudinaryConfigured(): boolean {
    const name = this.config.get('CLOUDINARY_CLOUD_NAME');
    const key = this.config.get('CLOUDINARY_API_KEY');
    const secret = this.config.get('CLOUDINARY_API_SECRET');
    return !!(
      name && key && secret &&
      name !== 'your_cloud_name' &&
      key !== 'your_api_key' &&
      secret !== 'your_api_secret'
    );
  }

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    // ── Development: save locally ────────────────────────────────────────────
    if (process.env.NODE_ENV !== 'production') {
      const ext = path.extname(file.originalname);
      const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
      const key = `${folder}/${filename}`;
      const uploadDir = path.join(process.cwd(), 'uploads', folder);
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      writeFileSync(path.join(uploadDir, filename), file.buffer);
      const port = process.env.PORT || 3001;
      return `http://localhost:${port}/uploads/${key}`;
    }

    // ── Production: try Cloudinary first, fallback to base64 data URL ───────
    if (this.isCloudinaryConfigured()) {
      try {
        return await this.uploadToCloudinary(file, folder);
      } catch (error) {
        this.logger.error(`Cloudinary upload failed: ${error.message}`);
        // Fall through to base64 fallback
      }
    } else {
      this.logger.warn('Cloudinary not configured — using base64 data URL fallback');
    }

    // ── Fallback: base64 data URL (works in <img> and React Native <Image>) ─
    const mime = file.mimetype || 'image/png';
    const base64 = file.buffer.toString('base64');
    return `data:${mime};base64,${base64}`;
  }

  private async uploadToCloudinary(file: Express.Multer.File, folder: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });

    return new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `ammart/${folder}`, resource_type: 'auto' },
        (error: any, result: any) => {
          if (error) reject(error);
          else resolve(result.secure_url as string);
        },
      );
      Readable.from(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(url: string): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;
    // Only delete from Cloudinary — base64 data URLs are stored inline, nothing to delete
    if (!url || !url.includes('cloudinary.com')) return;
    if (!this.isCloudinaryConfigured()) return;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { v2: cloudinary } = require('cloudinary');
    cloudinary.config({
      cloud_name: this.config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    this.config.get('CLOUDINARY_API_KEY'),
      api_secret: this.config.get('CLOUDINARY_API_SECRET'),
    });

    // Extract public_id from URL
    // e.g. https://res.cloudinary.com/CLOUD/image/upload/v123/ammart/folder/file.jpg
    //  → public_id = ammart/folder/file
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
    if (match?.[1]) {
      await cloudinary.uploader.destroy(match[1]);
    }
  }
}
