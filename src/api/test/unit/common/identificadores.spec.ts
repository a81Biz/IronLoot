import { randomUUID } from 'node:crypto';

/**
 * PT-125 — El formato de los identificadores no cambia al quitar la dependencia `uuid`.
 *
 * Estos ids no son decorativos. Van a sitios donde el formato importa:
 *
 * - `context.middleware.ts` -> `traceId`, que se persiste y se busca. Es lo que une una peticion
 *   con su error en `error_events` y con su apunte en la traza de pagos.
 * - `distributed-lock.service.ts` -> el token del cerrojo. Si dos procesos generaran el mismo, el
 *   segundo liberaria el cerrojo del primero.
 * - `upload.service.ts` -> el nombre del fichero en disco. Una colision pisa una imagen ajena.
 *
 * `crypto.randomUUID()` es v4 del propio runtime, con el mismo CSPRNG. Estas pruebas fijan que la
 * forma es la misma, para que la sustitucion sea comprobable y no un acto de fe.
 */
describe('Identificadores sin la dependencia uuid (PT-125)', () => {
  const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

  it('ID-01: la forma es exactamente la de un UUID v4', () => {
    expect(randomUUID()).toMatch(V4);
  });

  it('ID-02: 36 caracteres — el ancho con el que se guardan traceId y nombre de fichero', () => {
    expect(randomUUID()).toHaveLength(36);
  });

  it('ID-03: el nibble de version es 4 y el de variante es 8/9/a/b', () => {
    // Lo que distingue un v4 de un v1 (que lleva marca de tiempo y MAC dentro).
    const id = randomUUID();

    expect(id[14]).toBe('4');
    expect('89ab').toContain(id[19]);
  });

  it('ID-04: no repite — el supuesto del que dependen el cerrojo y el nombre de fichero', () => {
    const muchos = new Set(Array.from({ length: 10_000 }, () => randomUUID()));

    expect(muchos.size).toBe(10_000);
  });

  it('ID-05: es seguro para una URL sin escapar nada', () => {
    // `upload.service` lo mete tal cual en la URL publica que devuelve.
    const id = randomUUID();

    expect(encodeURIComponent(id)).toBe(id);
  });
});
