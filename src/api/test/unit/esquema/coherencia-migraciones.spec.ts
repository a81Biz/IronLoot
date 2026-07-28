import { interpretar, type Diff } from '../../../scripts/schema-drift-check';

/**
 * PT-127 (PTSA H-014) — El checkpoint de deriva del esquema.
 *
 * Las 23 migraciones de `prisma/migrations/` **no se han ejecutado nunca**. `_prisma_migrations` no
 * existe en la base: el esquema lo construye `prisma db push --accept-data-loss` en cada arranque
 * del contenedor. Aplicadas a una base limpia producen otro esquema, y sobre el la aplicacion falla
 * en 3 de 4 sondas — una de ellas `payment_cycles`, el nucleo del ciclo de pago.
 *
 * Y `payments.reference` deja de ser unico. Esa unicidad es la que CLAUDE.md declara como garantia
 * de que un reintento de acreditacion no duplique el asiento contable.
 *
 * **PT-037 ya arreglo esto una vez**, el 23-jul. Su entrada en HISTORY.log declara el baseline
 * `migrate resolve --applied` como *pendiente*, y nunca se ejecuto. Su decision D5 dejo la
 * prevencion en una nota documental —«documentar que db push es solo para prototipado»— y su
 * out-of-scope dijo «No se elimina el script en este PT». El drift volvio en **cuatro dias**.
 *
 * La leccion es la de PT-118, en otro sitio: la disciplina sin mecanismo caduca. Este es el
 * mecanismo. Sin el, esto vuelve una tercera vez.
 *
 * Dos decisiones que conviene conocer antes de tocar esto:
 *
 * 1. **El veredicto es binario.** No hay linea base como en `audit-check`. Alli la habia porque 27
 *    avisos triados harian el CI rojo permanente; aqui el estado esperado es «cero diferencias», y
 *    admitir una diferencia «conocida» seria admitir justo lo que el PT viene a cerrar.
 * 2. **Un error de ejecucion FALLA.** Si no se puede comprobar, no se dice «bien». Es la leccion de
 *    los `catch` mudos de F-34: bastaria con romper la base sombra para desactivar el control.
 */
describe('El checkpoint de deriva del esquema (PT-127)', () => {
  const diff = (codigo: number, salida = ''): Diff => ({ codigo, salida });

  it('AC-01: sin diferencias -> pasa', () => {
    // `prisma migrate diff --exit-code` devuelve 0 cuando migraciones y esquema coinciden.
    const r = interpretar(diff(0, 'No difference detected.'));

    expect(r.falla).toBe(false);
    expect(r.diferencias).toEqual([]);
  });

  it('AC-02: hay diferencias -> falla, y las nombra', () => {
    // Codigo 2 = hay drift. Es el estado real medido en S-002 (E-017).
    const r = interpretar(
      diff(
        2,
        [
          '[+] Added tables',
          '  - account_verifications',
          '[*] Changed the `payment_cycles` table',
          '  [+] Added column `provider_ref`',
        ].join('\n'),
      ),
    );

    expect(r.falla).toBe(true);
    expect(r.diferencias.length).toBeGreaterThan(0);
    expect(r.diferencias.join('\n')).toContain('account_verifications');
    expect(r.diferencias.join('\n')).toContain('provider_ref');
  });

  it('AC-03: la perdida de un indice unico se reporta como diferencia', () => {
    // El caso silencioso de H-014: la aplicacion arrancaria, y un reintento de acreditacion podria
    // duplicar el asiento. No es una diferencia mas — pero el control no la trata distinto: la
    // reporta como todas, porque cualquier diferencia ya es fallo.
    const r = interpretar(
      diff(2, '[*] Changed the `payments` table\n  [+] Added unique index on columns (reference)'),
    );

    expect(r.falla).toBe(true);
    expect(r.diferencias.join('\n')).toContain('unique index');
  });

  it('AC-04: un error de ejecucion FALLA, no pasa en silencio', () => {
    // Codigo 1 = el comando fallo (base sombra caida, credenciales, esquema invalido...).
    // Si esto pasara, bastaria con tumbar la base sombra para desactivar el control.
    const r = interpretar(
      diff(1, 'Error: P1001 - no se puede alcanzar el servidor de base de datos'),
    );

    expect(r.falla).toBe(true);
    expect(r.motivo).toMatch(/no se pudo comprobar|error/i);
  });

  it('AC-05: un codigo inesperado tambien FALLA', () => {
    // Ante lo que no se entiende, el control no absuelve.
    const r = interpretar(diff(42, 'algo que nadie previo'));

    expect(r.falla).toBe(true);
  });

  it('AC-06: hay diferencias pero la salida viene vacia -> falla igual', () => {
    // El codigo manda sobre el texto. Una salida vacia no puede convertir un 2 en un aprobado.
    const r = interpretar(diff(2, ''));

    expect(r.falla).toBe(true);
    expect(r.motivo).toMatch(/diferencia/i);
  });

  it('AC-07: el motivo de un fallo por drift dice que hay que generar migracion', () => {
    // Un control que falla sin decir que hacer se acaba ignorando.
    const r = interpretar(diff(2, '[+] Added tables\n  - x'));

    expect(r.motivo).toMatch(/migrate dev|migraci/i);
  });
});
