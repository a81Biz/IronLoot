import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-143 (RULE-23) — Ninguna prueba borra sin filtro.
 *
 * `orders-flow.e2e-spec.ts` truncaba **once tablas** en su `beforeAll` —rating, shipment,
 * commissionRecord, dispute, ledger, order, bid, auction, notification, wallet, session— y Jest corre
 * las suites en paralelo. Mientras `ratings.e2e` preparaba su pedido, `orders-flow` lo borraba.
 *
 * De ahi lo que no encajaba: `expected 201, got 404` en ratings, `auctions_seller_id_fkey` violada en
 * `auth-helper`, y fallos que **cambiaban de sitio entre corridas** — la firma de una carrera.
 *
 * Y la segunda razon es peor que el paralelismo: **`deleteMany()` sin filtro borra sobre la base a la
 * que apunte `DATABASE_URL`**. `auth-helper.ts:105` lo temia por escrito —«Be careful not to delete
 * real users if running on dev db. Ideally we run on test db»— y se quedo en un comentario donde
 * hacia falta un mecanismo. La base de desarrollo de este repositorio sostiene validaciones PTSA.
 *
 * Lo que NO vale como arreglo: `--runInBand`. Serializar hace verde una suite que sigue sin poder
 * correr en paralelo, y este PT existe porque algo verde tapaba un defecto.
 */
const RAIZ = raizDelMonorepo();
const TESTS = join(RAIZ, 'src/api/test');

/** `deleteMany()` y `deleteMany({})` son lo mismo: el segundo lleva dos llaves de disfraz. */
const BORRADO_SIN_FILTRO = /\.deleteMany\(\s*(?:\{\s*\})?\s*\)/;

function ficherosTs(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const completa = join(dir, entrada);
    if (statSync(completa).isDirectory()) salida.push(...ficherosTs(completa));
    else if (entrada.endsWith('.ts')) salida.push(completa);
  }
  return salida;
}

export interface Borrado {
  fichero: string;
  linea: number;
  texto: string;
}

export function buscarBorradosSinFiltro(codigo: string, fichero = ''): Borrado[] {
  return codigo
    .split('\n')
    .map((texto, i) => ({ fichero, linea: i + 1, texto: texto.trim() }))
    .filter((l) => BORRADO_SIN_FILTRO.test(l.texto));
}

describe('Ninguna prueba borra sin filtro — RULE-23 (PT-143)', () => {
  const ficheros = ficherosTs(TESTS);

  it('hay pruebas que revisar', () => {
    // Si esto fallara, lo de abajo pasaria vacuamente. No se aprueba lo que no se puede mirar.
    expect(ficheros.length).toBeGreaterThan(20);
  });

  it('ningun fichero de prueba trunca una tabla entera', () => {
    const borrados = ficheros
      // Esta guarda se excluye a si misma: sus casos de control CONTIENEN el patron prohibido, y
      // tienen que contenerlo para demostrar que sabe detectarlo. Se acuso a si misma en su primera
      // ejecucion, que es la sexta vez en esta tanda que le pasa a una guarda de este repositorio.
      .filter((f) => !f.endsWith('limpieza-de-tests-acotada.spec.ts'))
      .flatMap((f) =>
        buscarBorradosSinFiltro(readFileSync(f, 'utf8'), f.replace(RAIZ, '').replace(/\\/g, '/')),
      );

    // Con fichero y linea: un fallo tiene que decir donde, no solo que.
    expect(borrados.map((b) => `${b.fichero}:${b.linea}  ${b.texto}`)).toEqual([]);
  });

  describe('casos de control', () => {
    it('C1: `deleteMany()` sin argumento se acusa', () => {
      expect(buscarBorradosSinFiltro('await prisma.order.deleteMany();')).toHaveLength(1);
    });

    it('C2: `deleteMany({ where })` no se acusa', () => {
      const acotado = 'await prisma.order.deleteMany({ where: { buyerId: id } });';

      expect(buscarBorradosSinFiltro(acotado)).toEqual([]);
    });

    it('C3: `deleteMany({})` SI se acusa — es el mismo borrado disfrazado', () => {
      // Sin este caso, la guarda se esquiva escribiendo dos llaves. Es la diferencia entre una
      // guarda y una molestia que todo el mundo aprende a rodear.
      expect(buscarBorradosSinFiltro('await prisma.session.deleteMany({});')).toHaveLength(1);
    });

    it('C4: `deleteMany({ })` con espacios tambien', () => {
      expect(buscarBorradosSinFiltro('await prisma.session.deleteMany({  });')).toHaveLength(1);
    });

    it('C5: `delete` de una fila concreta no es lo mismo', () => {
      expect(buscarBorradosSinFiltro('await prisma.user.delete({ where: { id } });')).toEqual([]);
    });

    it('C6: una linea que solo menciona `deleteMany` en un comentario no se acusa', () => {
      expect(buscarBorradosSinFiltro('// nunca usar deleteMany sin filtro aqui')).toEqual([]);
    });
  });
});
