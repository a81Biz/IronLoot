import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/**
 * PT-110 (PTSA H-008) — `engine.io` no vuelve al rango vulnerable.
 *
 * El aviso «Engine.IO Polling Transport Connection Exhaustion» cubre `4.1.0 - 6.6.7`, y el
 * proyecto tenia **6.6.5**. Importa mas que los otros 70 avisos por una razon concreta: el
 * namespace `auctions` es **publico de solo lectura por diseño** (PT-039), asi que el agotamiento
 * de conexiones lo puede provocar cualquiera **sin autenticarse**, contra la puja en vivo — que es
 * el producto.
 *
 * Esta guarda no reemplaza a `npm audit`: fija **una** version concreta que ya nos mordio. Un
 * `npm install` que resuelva `engine.io` hacia atras la hace fallar aqui, en milisegundos, en vez
 * de esperar a la proxima auditoria.
 */

/** Rango vulnerable del aviso, tal como lo publica el registro. */
const VULNERABLE = { desde: '4.1.0', hasta: '6.6.7' };

/** Compara versiones semver simples (`x.y.z`). Devuelve -1, 0 o 1. */
export function comparar(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) < (pb[i] ?? 0) ? -1 : 1;
  }
  return 0;
}

export function estaEnRangoVulnerable(version: string): boolean {
  return comparar(version, VULNERABLE.desde) >= 0 && comparar(version, VULNERABLE.hasta) <= 0;
}

/** La version de `engine.io` realmente instalada, leida del arbol de node_modules. */
function versionInstalada(): string | null {
  const ruta = join(__dirname, '..', '..', '..', 'node_modules', 'engine.io', 'package.json');
  if (!existsSync(ruta)) return null;
  return (JSON.parse(readFileSync(ruta, 'utf8')) as { version: string }).version;
}

describe('Dependencias vulnerables (PT-110 / H-008)', () => {
  it('VU-01: `engine.io` NO esta en el rango vulnerable 4.1.0 - 6.6.7', () => {
    const v = versionInstalada();

    // Si no esta instalada, el test no puede afirmar nada — y decirlo es mas honesto que pasar.
    expect(v).not.toBeNull();
    expect(`engine.io@${v}`).toBe(
      estaEnRangoVulnerable(v as string) ? 'FUERA DEL RANGO VULNERABLE' : `engine.io@${v}`,
    );
  });

  it('VU-02: la comprobacion RECHAZA una version del rango (control)', () => {
    // Sin este caso, VU-01 podria estar pasando por no saber leer una version.
    expect(estaEnRangoVulnerable('6.6.5')).toBe(true);
    expect(estaEnRangoVulnerable('4.1.0')).toBe(true);
    expect(estaEnRangoVulnerable('6.6.7')).toBe(true);
  });

  it('VU-03: la comprobacion ACEPTA una version fuera del rango (control)', () => {
    expect(estaEnRangoVulnerable('6.6.8')).toBe(false);
    expect(estaEnRangoVulnerable('6.6.9')).toBe(false);
    expect(estaEnRangoVulnerable('4.0.9')).toBe(false);
  });

  it('VU-04: los dos gateways publicos declaran cota de conexion', () => {
    // El namespace `auctions` es publico SIN autenticar, y `events` tampoco autentica. El
    // `@nestjs/throttler` global cubre HTTP, **no sockets**: si no hay cota aqui, no hay cota.
    const gateways = [
      join(__dirname, '..', '..', '..', 'src', 'modules', 'auctions', 'auctions.gateway.ts'),
      join(__dirname, '..', '..', '..', 'src', 'modules', 'notifications', 'events.gateway.ts'),
    ];

    const sinCota = gateways
      .filter((g) => !/maxHttpBufferSize/.test(readFileSync(g, 'utf8')))
      .map((g) => g.split(/[\\/]/).pop());

    expect(sinCota.join(', ')).toBe('');
  });
});
