import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir } from 'fs/promises';
import { join, resolve } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Express } from 'express';
import 'multer';
import { apiOrigin } from '../../common/config/public-origins';
import { extensionSegura } from './file-signature';

@Injectable()
export class UploadService {
  constructor(private readonly configService: ConfigService) {}

  async saveFile(file: Express.Multer.File): Promise<string> {
    // PT-124 (H-013) — La extension sale del CONTENIDO, no de `file.originalname`.
    //
    // Antes era `extname(file.originalname)`: el cliente elegia la extension, y con ella el
    // `Content-Type` con el que `ServeStaticModule` devolvia el fichero. Un `.html` volvia como
    // `text/html` desde el origen del API, al que llegan las cookies por `COOKIE_DOMAIN=.dominio`.
    // Se comprueba antes de escribir: si no es una imagen de verdad, no se toca el disco.
    const extension = extensionSegura(file.buffer, file.originalname);

    const uploadDir = resolve(process.cwd(), 'uploads');
    // Ensure dir exists
    await mkdir(uploadDir, { recursive: true });

    const fileName = `${uuidv4()}${extension}`;
    const filePath = join(uploadDir, fileName);

    await writeFile(filePath, file.buffer);

    // PT-089 — Es una URL publica: se incrusta en la respuesta y la consume el navegador.
    const apiUrl = apiOrigin(this.configService.get('API_BASE_URL'));
    return `${apiUrl}/uploads/${fileName}`;
  }
}
