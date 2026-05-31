import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { Readable } from 'stream';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

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

    // ── Production: Cloudinary ───────────────────────────────────────────────
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
    if (!url || !url.includes('cloudinary.com')) return;

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
