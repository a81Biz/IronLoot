import {
  detectarTipoReal,
  extensionSegura,
  TIPOS_PERMITIDOS,
} from '../../../src/modules/upload/file-signature';

/**
 * PT-124 (H-013) — La unica fuente de verdad sobre que es un fichero son sus bytes.
 *
 * El defecto que estos tests fijan no estaba en una linea: estaba en la juntura de dos ficheros que
 * por separado parecian correctos. `upload.controller.ts` validaba el tipo —pero validaba
 * `file.mimetype`, que lo escribe el cliente—, y `upload.service.ts` guardaba con
 * `extname(file.originalname)` —que tambien lo escribe el cliente—. Y encima habia `nosniff` puesto,
 * funcionando, y sin aplicar al caso.
 *
 * E-016 midio el final de la cadena: `/uploads/x.html` vuelve como `text/html; charset=UTF-8`.
 */
describe('Deteccion de tipo por firma (PT-124 / H-013)', () => {
  /** Cabeceras reales de cada formato, tal y como empiezan los ficheros de verdad. */
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const GIF = Buffer.from('GIF89a' + '\0'.repeat(6), 'latin1');
  const WEBP = Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    Buffer.from([0, 0, 0, 0]),
    Buffer.from('WEBP', 'latin1'),
  ]);

  describe('Lo que debe aceptar', () => {
    it('TR-01: reconoce un PNG por su firma', () => {
      expect(detectarTipoReal(PNG)).toEqual({ mime: 'image/png', ext: '.png' });
    });

    it('TR-02: reconoce un JPEG', () => {
      expect(detectarTipoReal(JPEG)).toEqual({ mime: 'image/jpeg', ext: '.jpg' });
    });

    it('TR-03: reconoce un GIF', () => {
      expect(detectarTipoReal(GIF)).toEqual({ mime: 'image/gif', ext: '.gif' });
    });

    it('TR-04: reconoce un WEBP (RIFF....WEBP, con el tamaño en medio)', () => {
      expect(detectarTipoReal(WEBP)).toEqual({ mime: 'image/webp', ext: '.webp' });
    });
  });

  describe('Lo que debe rechazar — el caso de H-013', () => {
    it('TR-05: HTML con firma de nada NO es una imagen, diga lo que diga el cliente', () => {
      const html = Buffer.from('<script>alert(1)</script>', 'utf8');

      expect(detectarTipoReal(html)).toBeNull();
    });

    it('TR-06: un SVG es texto y NO se acepta — es image/* y ejecuta script', () => {
      // El regex viejo no lo listaba, pero eso daba igual: el mimetype lo escribia el cliente.
      const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>', 'utf8');

      expect(detectarTipoReal(svg)).toBeNull();
    });

    it('TR-07: un buffer vacio no es un PNG', () => {
      expect(detectarTipoReal(Buffer.alloc(0))).toBeNull();
    });

    it('TR-08: un buffer mas corto que la firma no revienta, devuelve null', () => {
      expect(detectarTipoReal(Buffer.from([0x89, 0x50]))).toBeNull();
    });

    it('TR-09: RIFF que NO es WEBP (un .wav) se rechaza', () => {
      const wav = Buffer.concat([
        Buffer.from('RIFF', 'latin1'),
        Buffer.from([0, 0, 0, 0]),
        Buffer.from('WAVE', 'latin1'),
      ]);

      expect(detectarTipoReal(wav)).toBeNull();
    });
  });

  describe('La extension sale del contenido, nunca del nombre', () => {
    it('TR-10: un PNG llamado "x.html" se guarda como .png', () => {
      // Este es H-013 exactamente. El nombre del cliente no participa en la decision.
      expect(extensionSegura(PNG, 'x.html')).toBe('.png');
    });

    it('TR-11: un PNG llamado "x.php.png.html.svg" sigue siendo .png', () => {
      expect(extensionSegura(PNG, 'x.php.png.html.svg')).toBe('.png');
    });

    it('TR-12: HTML llamado "inocente.png" no se guarda: lanza', () => {
      const html = Buffer.from('<html>', 'utf8');

      expect(() => extensionSegura(html, 'inocente.png')).toThrow(/no es una imagen/i);
    });

    it('TR-13: un fichero sin nombre no es un problema — el nombre nunca se usa', () => {
      expect(extensionSegura(PNG, '')).toBe('.png');
    });
  });

  it('TR-14: el catalogo de permitidos no incluye svg', () => {
    expect(TIPOS_PERMITIDOS.map((t) => t.mime)).not.toContain('image/svg+xml');
    expect(TIPOS_PERMITIDOS).toHaveLength(4);
  });
});
