import { UploadService } from '../../../src/modules/upload/upload.service';
import { ConfigService } from '@nestjs/config';
import { writeFile, mkdir } from 'fs/promises';
import type { Express } from 'express';

jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

/**
 * PT-124 (H-013) — Que el disco no se toque cuando el fichero no es lo que dice ser.
 *
 * `file-signature.spec` fija la funcion pura. Esto fija la **conducta**: la comprobacion ocurre
 * ANTES de escribir. Si algun dia alguien mueve la llamada dos lineas mas abajo —despues del
 * `writeFile`— la funcion pura seguiria pasando sus catorce tests y el fichero ya estaria en disco.
 */
describe('UploadService — no escribe lo que no ha verificado (PT-124)', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

  const fichero = (buffer: Buffer, originalname: string) =>
    ({ buffer, originalname, mimetype: 'image/png' }) as Express.Multer.File;

  let service: UploadService;

  beforeEach(() => {
    jest.clearAllMocks();
    const config = { get: jest.fn().mockReturnValue('http://api.ironloot.local') };
    service = new UploadService(config as unknown as ConfigService);
  });

  it('US-01: un PNG de verdad se guarda con extension .png', async () => {
    const url = await service.saveFile(fichero(PNG, 'foto.png'));

    expect(url).toMatch(/\/uploads\/[0-9a-f-]{36}\.png$/);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it('US-02: un PNG llamado "x.html" se guarda como .png — H-013', async () => {
    const url = await service.saveFile(fichero(PNG, 'x.html'));

    expect(url).toMatch(/\.png$/);
    expect(url).not.toMatch(/\.html/);
  });

  it('US-03: HTML disfrazado de PNG lanza y NO llega al disco', async () => {
    const html = fichero(Buffer.from('<script>alert(1)</script>', 'utf8'), 'inocente.png');

    await expect(service.saveFile(html)).rejects.toThrow(/no es una imagen/i);

    // Lo que importa: ni `writeFile` ni siquiera `mkdir`.
    expect(writeFile).not.toHaveBeenCalled();
    expect(mkdir).not.toHaveBeenCalled();
  });

  it('US-04: un SVG con script tampoco llega al disco', async () => {
    const svg = fichero(
      Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', 'utf8'),
      'logo.svg',
    );

    await expect(service.saveFile(svg)).rejects.toThrow();
    expect(writeFile).not.toHaveBeenCalled();
  });
});
