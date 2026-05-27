import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';
import * as crypto from 'crypto';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class UploadService {
  constructor(private config: ConfigService) {}

  async uploadFile(file: Express.Multer.File, folder: string): Promise<string> {
    const ext = path.extname(file.originalname);
    const filename = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const key = `${folder}/${filename}`;

    if (process.env.NODE_ENV !== 'production') {
      const uploadDir = path.join(process.cwd(), 'uploads', folder);
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });
      writeFileSync(path.join(uploadDir, filename), file.buffer);
      const port = process.env.PORT || 3001;
      return `http://localhost:${port}/uploads/${key}`;
    }

    // Production: use S3
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      region: this.config.get('AWS_REGION') || 'ap-northeast-2',
    });

    const result = await s3.upload({
      Bucket: this.config.get('AWS_S3_BUCKET'),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read',
    }).promise();

    return result.Location;
  }

  async deleteFile(url: string): Promise<void> {
    if (!url.includes('s3.amazonaws.com')) return;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AWS = require('aws-sdk');
    const s3 = new AWS.S3({
      accessKeyId: this.config.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.config.get('AWS_SECRET_ACCESS_KEY'),
      region: this.config.get('AWS_REGION') || 'ap-northeast-2',
    });
    const key = url.split('.amazonaws.com/')[1];
    await s3.deleteObject({
      Bucket: this.config.get('AWS_S3_BUCKET'),
      Key: key,
    }).promise();
  }
}
