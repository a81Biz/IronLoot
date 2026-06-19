import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir } from 'fs/promises';
import { join, extname, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import 'multer';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  async saveFile(file: Express.Multer.File): Promise<string> {
    const uploadDir = resolve(process.cwd(), 'uploads');
    // Ensure dir exists
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${uuidv4()}${extname(file.originalname)}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, file.buffer);

    const apiUrl = this.configService.get('API_URL', 'http://localhost:3000');
    return `${apiUrl}/uploads/${fileName}`;
  }
}
