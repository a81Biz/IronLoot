import { BadRequestException } from '@nestjs/common';

/**
 * PT-124 (H-013) — Qué es un fichero lo dicen sus bytes.
 *
 * Antes, la subida preguntaba dos veces y las dos al cliente: `file.mimetype` para decidir si era
 * una imagen, y `extname(file.originalname)` para decidir con qué extensión guardarla. Ambos son
 * campos del `multipart` que escribe quien sube. Un fichero declarado `image/png` y llamado
 * `x.html` se guardaba como `<uuid>.html`, y `ServeStaticModule` lo devolvía como `text/html`
 * (medido en E-016). `nosniff` estaba puesto y no ayudaba: sólo impide *adivinar* un tipo distinto
 * del declarado, y aquí el declarado ya era `text/html`.
 *
 * ## Por qué no se usa `file-type`
 *
 * Está en el árbol y haría esto mismo. También tiene un aviso abierto —bucle infinito en su parser
 * ASF, uno de los 12 de TD-015— que PT-123 clasificó como **inalcanzable precisamente porque aquí
 * sólo se suben imágenes**. Llamarlo desde este punto lo volvería alcanzable: arreglaríamos un
 * agujero abriendo el de al lado.
 *
 * Cuatro formatos, firmas de longitud fija, cero parsing. No hay entrada que pueda colgarlo.
 */

export interface TipoImagen {
  mime: string;
  ext: string;
}

interface Firma extends TipoImagen {
  /** Bytes que deben coincidir, por posición. `null` = cualquier byte (hueco). */
  bytes: (number | null)[];
}

/**
 * SVG no está, y no es un olvido: es `image/*` y **ejecuta script** en navegación directa. El regex
 * anterior tampoco lo listaba, pero daba igual — el `mimetype` que comparaba lo escribía el cliente.
 */
const FIRMAS: Firma[] = [
  {
    mime: 'image/png',
    ext: '.png',
    bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  },
  {
    // Cubre JFIF, Exif y JPEG crudo: los tres empiezan por SOI + marcador.
    mime: 'image/jpeg',
    ext: '.jpg',
    bytes: [0xff, 0xd8, 0xff],
  },
  {
    mime: 'image/gif',
    ext: '.gif',
    bytes: [0x47, 0x49, 0x46, 0x38], // "GIF8" — cubre 87a y 89a
  },
  {
    // RIFF....WEBP — los cuatro bytes de en medio son el tamaño y varían con cada fichero.
    // Sin el hueco, un .wav (RIFF....WAVE) pasaría por webp.
    mime: 'image/webp',
    ext: '.webp',
    bytes: [0x52, 0x49, 0x46, 0x46, null, null, null, null, 0x57, 0x45, 0x42, 0x50],
  },
];

export const TIPOS_PERMITIDOS: TipoImagen[] = FIRMAS.map(({ mime, ext }) => ({ mime, ext }));

/**
 * Devuelve el tipo real del contenido, o `null` si no es ninguna de las imágenes permitidas.
 * Nunca lanza: un buffer vacío o más corto que la firma es simplemente un no-match.
 */
export function detectarTipoReal(contenido: Buffer): TipoImagen | null {
  for (const { mime, ext, bytes } of FIRMAS) {
    if (contenido.length < bytes.length) continue;

    const coincide = bytes.every((b, i) => b === null || contenido[i] === b);
    if (coincide) return { mime, ext };
  }

  return null;
}

/**
 * La extensión con la que se persiste. `nombreCliente` se recibe **sólo para no aceptarlo**: está en
 * la firma para que quede escrito que se ve y se descarta, y para que quien lea el código no vuelva
 * a introducirlo pensando que falta.
 */
export function extensionSegura(contenido: Buffer, _nombreCliente: string): string {
  const tipo = detectarTipoReal(contenido);

  if (!tipo) {
    throw new BadRequestException(
      'El fichero no es una imagen valida (PNG, JPEG, GIF o WEBP). ' +
        'Se comprueba el contenido, no el nombre ni el tipo declarado.',
    );
  }

  return tipo.ext;
}
