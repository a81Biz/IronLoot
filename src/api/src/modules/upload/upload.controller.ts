import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';
import { MAX_BYTES } from './upload.limits';
import { JwtAuthGuard } from '../auth/guards';
import { Express } from 'express';
import 'multer';

@ApiTags('upload')
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload an image' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded',
    schema: { properties: { url: { type: 'string' } } },
  })
  // PT-124 (H-013) — El limite va en el interceptor, no en el controlador.
  //
  // El almacenamiento por defecto de Nest es en memoria: sin `limits`, el fichero entero se acumula
  // en RAM y solo despues llega el controlador a mirarlo. Validar el tamaño aqui abajo seria mirar
  // la factura despues de pagarla. Multer aborta al superar el limite, antes de terminar de leer.
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_BYTES, files: 1 } }))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('File is required');

    // El `mimetype` y el `originalname` que trae `file` los escribe el cliente. Ninguno se consulta:
    // `saveFile` decide el tipo por los bytes. Ver `file-signature.ts`.
    const url = await this.uploadService.saveFile(file);
    return { url };
  }
}
