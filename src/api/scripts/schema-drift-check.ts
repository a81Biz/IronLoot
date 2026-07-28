/**
 * PT-127 (PTSA H-014) — Checkpoint de deriva del esquema.
 *
 * Las 23 migraciones de `prisma/migrations/` no se habian ejecutado nunca: el esquema lo construia
 * `prisma db push --accept-data-loss` en cada arranque, y `db push` no escribe
 * `_prisma_migrations`. Aplicadas a una base limpia producian **otro** esquema — el cliente Prisma
 * fallaba en 3 de 4 sondas, y `payments.reference` perdia la unicidad que impide acreditar un
 * deposito dos veces.
 *
 * **PT-037 ya lo arreglo una vez**, el 23-jul. Dejo la prevencion en una nota documental y el
 * `db push` en su sitio. El drift volvio en **cuatro dias**. La leccion es la de PT-118 en otro
 * sitio: la disciplina sin mecanismo caduca. Esto es el mecanismo.
 *
 * Dos decisiones que conviene conocer antes de tocar esto:
 *
 * 1. **Veredicto binario, sin linea base.** `audit-check` compara contra una linea base porque 27
 *    avisos triados harian el CI rojo permanente. Aqui el estado esperado es «cero diferencias»:
 *    admitir una diferencia «conocida» seria admitir justo lo que este control viene a cerrar.
 * 2. **Si no se puede comprobar, FALLA.** Un error de ejecucion no es un aprobado. Si lo fuera,
 *    bastaria con tumbar la base sombra para desactivar el control — la leccion de los `catch`
 *    mudos de F-34.
 *
 * Uso:  npm run audit:schema
 */
import { execSync } from 'child_process';
import { join } from 'path';

export interface Diff {
  /** Codigo de salida de `prisma migrate diff --exit-code`: 0 sin cambios · 1 error · 2 hay drift. */
  codigo: number;
  salida: string;
}

export interface Resultado {
  falla: boolean;
  motivo: string;
  diferencias: string[];
}

const QUE_HACER =
  'Genera la migracion que falta con `npm run db:migrate` (prisma migrate dev) y vuelve a ' +
  'comprobar. No apliques el cambio con `db push`: no deja migracion, y esto es exactamente ' +
  'como llego H-014.';

/**
 * Traduce el resultado del `migrate diff` a un veredicto.
 *
 * El **codigo manda sobre el texto**: una salida vacia no puede convertir un 2 en un aprobado.
 */
export function interpretar({ codigo, salida }: Diff): Resultado {
  const lineas = salida
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (codigo === 0) {
    return { falla: false, motivo: 'Las migraciones reproducen el esquema', diferencias: [] };
  }

  if (codigo === 2) {
    return {
      falla: true,
      motivo:
        `Las migraciones y \`schema.prisma\` han divergido: ${lineas.length || 'varias'} ` +
        `linea(s) de diferencia. ${QUE_HACER}`,
      diferencias: lineas,
    };
  }

  // Codigo 1 (error) y cualquier otro. No se absuelve lo que no se ha podido comprobar.
  return {
    falla: true,
    motivo:
      `No se pudo comprobar la deriva del esquema (codigo ${codigo}). Un error de ejecucion no ` +
      'es un aprobado: revisa la base sombra, las credenciales y que `schema.prisma` sea valido.',
    diferencias: lineas,
  };
}

function main(): void {
  const raiz = join(__dirname, '..');
  const sombra = process.env.SHADOW_DATABASE_URL ?? derivarSombra(process.env.DATABASE_URL);

  if (!sombra) {
    console.error(
      '[audit:schema] FALLA — hace falta una base sombra. Define `SHADOW_DATABASE_URL`, o\n' +
        '                `DATABASE_URL` para derivarla. Sin base sombra no se puede comprobar,\n' +
        '                y sin comprobar no se aprueba.',
    );
    process.exit(1);
  }

  const cmd =
    'npx prisma migrate diff --from-migrations prisma/migrations ' +
    '--to-schema-datamodel prisma/schema.prisma ' +
    `--shadow-database-url "${sombra}" --exit-code`;

  let diff: Diff;
  try {
    const salida = execSync(cmd, { cwd: raiz, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
    diff = { codigo: 0, salida };
  } catch (e) {
    const err = e as { status?: number; stdout?: string; stderr?: string };
    diff = { codigo: err.status ?? 1, salida: (err.stdout ?? '') + (err.stderr ?? '') };
  }

  const r = interpretar(diff);

  if (!r.falla) {
    console.log('[audit:schema] OK — las migraciones reproducen `schema.prisma`.');
    return;
  }

  console.error(`\n[audit:schema] FALLA — ${r.motivo}\n`);
  for (const l of r.diferencias) {
    console.error(`  ${l}`);
  }
  console.error('');
  process.exit(1);
}

/** La base sombra es desechable: se deriva de la principal con sufijo, nunca es la principal. */
export function derivarSombra(url: string | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^(.*\/)([^/?]+)(\?.*)?$/);
  if (!m) return null;
  return `${m[1]}${m[2]}_shadow_check${m[3] ?? ''}`;
}

if (require.main === module) {
  main();
}
