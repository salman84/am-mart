import { BadRequestException, Body, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Upload')
@Controller({ path: 'upload', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(@UploadedFile() file: Express.Multer.File, @Body('folder') folder: string) {
    const url = await this.uploadService.uploadFile(file, folder || 'general');
    return { url };
  }

  @Post('document')
  @Public()
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(@UploadedFile() file: Express.Multer.File, @Body('folder') folder: string) {
    if (!file) throw new BadRequestException('File is required');
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, JPG, JPEG, and PNG documents are allowed');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('Document must be under 10MB');
    }
    const url = await this.uploadService.uploadFile(file, folder || 'documents');
    return {
      url,
      originalFileName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
    };
  }
}
