import { lookup } from 'dns/promises';

/**
 * PT-095 (TD-011) — Avisa si el dominio de desarrollo no resuelve.
 *
 * El dominio de desarrollo es `ironloot.local` y no `localhost` porque los navegadores
 * **rechazan** una cookie con `Domain=.localhost` (dominio de uso especial, RFC 6265): la sesión
 * no cruzaría de BASE a CLIENT. El precio de esa decisión es que hace falta añadir cinco líneas
 * al fichero hosts del sistema.
 *
 * Está documentado en README, `.env.example` y CLAUDE.md, pero es un paso **manual y silencioso**.
 * Quien lo omita verá un login que aparentemente funciona y un portal que lo trata como anónimo,
 * sin ningún mensaje que lo explique. Es media hora de desconcierto, y le pasa a cada persona
 * nueva una vez.
 *
 * Esta función convierte ese desconcierto en un aviso al arrancar. **Nunca aborta**: un dominio
 * que no resuelve es un problema del entorno de quien desarrolla, no del código, y abortar
 * impediría cosas legítimas como correr los tests de integración.
 */

/** Los subdominios entre los que la sesión tiene que cruzar. */
const SUBDOMINIOS = ['base', 'client'] as const;

type Resolver = (host: string) => Promise<unknown>;

export async function checkPublicDomain(
  dominio: string,
  env: string,
  resolver: Resolver = (host) => lookup(host),
): Promise<string[]> {
  // En producción el DNS es real. Si el dominio no resolviera, el problema sería mucho más
  // visible que un aviso en el arranque.
  if (env === 'production' || !dominio.endsWith('.local')) return [];

  const noResuelven: string[] = [];

  for (const sub of SUBDOMINIOS) {
    const host = `${sub}.${dominio}`;
    try {
      await resolver(host);
    } catch {
      noResuelven.push(host);
    }
  }

  if (noResuelven.length === 0) return [];

  // El aviso tiene que ser accionable: quien lo lee está a punto de perder una hora.
  const lineas = [
    dominio,
    ...SUBDOMINIOS.map((s) => `${s}.${dominio}`),
    `api.${dominio}`,
    `admin.${dominio}`,
  ]
    .map((h) => `    127.0.0.1  ${h}`)
    .join('\n');

  return [
    `El dominio de desarrollo no resuelve: ${noResuelven.join(', ')}.`,
    'Los flujos autenticados NO funcionaran: iniciaras sesion en BASE y CLIENT te tratara como',
    'anonimo, porque la cookie se emite para un dominio que tu maquina no conoce.',
    'Anade estas lineas al fichero hosts del sistema:',
    lineas,
    '  (Windows: C:\\Windows\\System32\\drivers\\etc\\hosts, como Administrador)',
    '  (Linux/macOS: /etc/hosts, con sudo)',
  ];
}
