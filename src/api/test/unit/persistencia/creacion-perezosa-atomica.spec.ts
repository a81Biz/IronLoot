import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * PT-142 (RULE-22) — Una fila con restriccion de unicidad no se crea con `findX` + `create`.
 *
 * Entre la lectura y la escritura cabe otro proceso. Este repositorio tenia **nueve** sitios asi,
 * y tres estaban en el camino del dinero: la creacion perezosa del monedero al consultarlo, en el
 * asiento de un deposito, y en el abono al vendedor al cerrar una subasta.
 *
 * Lo cazo la primera corrida de CI, en `system-config`:
 *
 *     Unique constraint failed on the fields: (`key`)
 *
 * Y no se habia visto nunca porque hacen falta dos condiciones a la vez que en desarrollo no se dan:
 * concurrencia real y una base **sin la fila ya creada**. La base de desarrollo tiene historia, asi
 * que la rama del `create` no llega a ejecutarse.
 *
 * Lo que esta guarda comprueba es lo que se puede comprobar leyendo: que no quede el patron. Que la
 * correccion **funcione** lo comprueba `creacion-perezosa-concurrente.e2e-spec.ts`, que fabrica la
 * carrera — y hace falta, porque las dos salidas evidentes no valian: `upsert` dentro de una
 * transaccion interactiva no es atomico, y fuera tampoco lo garantiza.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');
const SRC = join(RAIZ, 'src/api/src');

/** Cada `.ts` de un arbol, recursivamente. */
function ficherosTs(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const completa = join(dir, entrada);
    if (statSync(completa).isDirectory()) {
      salida.push(...ficherosTs(completa));
    } else if (entrada.endsWith('.ts') && !entrada.endsWith('.spec.ts')) {
      salida.push(completa);
    }
  }
  return salida;
}

const LECTURA = /(?:this\.prisma|tx|prisma)\s*\.\s*(\w+)\s*\.\s*(?:findUnique|findFirst|count)\b/;
const ESCRITURA = /(?:this\.prisma|tx|prisma)\s*\.\s*(\w+)\b[^\n]{0,24}?\.\s*create\(/;

/** Distancia en lineas dentro de la cual una lectura y una escritura son "lo mismo". */
const VENTANA = 25;

export interface Hallazgo {
  fichero: string;
  modelo: string;
  lineaLectura: number;
  lineaCreate: number;
}

/**
 * Busca `findX` de un modelo seguido de `create` **del mismo modelo**.
 *
 * Que sea el mismo modelo es la parte que evita los falsos positivos: leer un pedido y crear un
 * envio es lo normal y no tiene carrera. La carrera es comprobar si algo existe y crear **eso
 * mismo**.
 *
 * Una linea con `P2002` cerca desactiva el hallazgo: es la salida declarada de RULE-22 —capturar el
 * choque y traducirlo— y tiene que quedar visible en el codigo, no escondida.
 */
export function buscarPatron(codigo: string, fichero = ''): Hallazgo[] {
  const lineas = codigo.split('\n');
  const hallazgos: Hallazgo[] = [];

  for (let i = 0; i < lineas.length; i++) {
    const lectura = LECTURA.exec(lineas[i]);
    if (!lectura) continue;

    for (let j = i + 1; j < Math.min(i + VENTANA, lineas.length); j++) {
      const escritura = ESCRITURA.exec(lineas[j]);
      if (!escritura) continue;
      if (escritura[1] !== lectura[1]) break;

      // La ventana mira **hacia atras tambien**: un `FOR UPDATE` va al principio de la transaccion,
      // antes de la lectura. Mirando solo hacia delante, la guarda acusaba codigo correctamente
      // bloqueado — lo demostro C5b al escribirlo.
      const entorno = lineas
        .slice(Math.max(0, i - VENTANA), Math.min(j + VENTANA, lineas.length))
        .join('\n');

      // Dos salidas declaradas, y las dos quedan VISIBLES en el codigo:
      //
      //  1. `P2002` capturado y traducido — cuando rechazar el duplicado es la respuesta util.
      //  2. `FOR UPDATE` — cuando la invariante es PARCIAL y no cabe en un indice, asi que se
      //     serializa por la fila que delimita su ambito (RULE-25, PT-145).
      //
      // La segunda se añadio cuando esta guarda acuso al codigo de PT-145. Enseñarle la salida es
      // mejor que apuntar el fichero como excepcion: una excepcion exime a uno, una regla vale para
      // el siguiente.
      if (entorno.includes('P2002') || entorno.includes('FOR UPDATE')) break;

      hallazgos.push({ fichero, modelo: lectura[1], lineaLectura: i + 1, lineaCreate: j + 1 });
      break;
    }
  }

  return hallazgos;
}

/**
 * Excepciones **declaradas**, con su motivo. Una lista sin razones se convierte en un cajon, y el
 * cajon es donde vivieron estos nueve sitios durante meses.
 *
 * **Esta vacia, y llego a estarlo sola.** PT-142 declaro dos —`ratings` y `account-verification`,
 * que no tenian restriccion unica— y PT-145 las corrigio. La prueba de caducidad de mas abajo
 * —«ninguna excepcion sobra»— se puso roja en cuanto los dos sitios quedaron limpios, que es
 * exactamente para lo que se escribio: una excepcion que ya no hace falta es una mentira que
 * envejece.
 */
const EXCEPCIONES_DECLARADAS: { fichero: string; motivo: string }[] = [];

describe('Creacion perezosa atomica — RULE-22 (PT-142)', () => {
  const ficheros = ficherosTs(SRC);

  it('toda excepcion declarada lleva su motivo y su PT', () => {
    // Sin esto, la lista de arriba se convierte en el sitio donde se aparcan los defectos.
    for (const e of EXCEPCIONES_DECLARADAS) {
      expect(e.motivo).toMatch(/PT-\d{3}/);
      expect(e.motivo.length).toBeGreaterThan(40);
    }
  });

  it('ninguna excepcion declarada sobra — si el sitio ya esta limpio, se retira', () => {
    // Una excepcion que ya no hace falta es una mentira que envejece. Si PT-145 corrige uno de los
    // dos y nadie retira su linea, esta prueba lo dice.
    for (const e of EXCEPCIONES_DECLARADAS) {
      const completa = join(SRC, e.fichero.replace(/^src\//, ''));
      const hallazgos = buscarPatron(readFileSync(completa, 'utf8'), e.fichero);
      expect(hallazgos.length).toBeGreaterThan(0);
    }
  });

  it('hay codigo que revisar', () => {
    // Si esto fallara, todo lo de abajo pasaria vacuamente. No se aprueba lo que no se puede mirar.
    expect(ficheros.length).toBeGreaterThan(50);
  });

  it('ningun servicio comprueba y crea la misma fila sin atomicidad', () => {
    const exentos = EXCEPCIONES_DECLARADAS.map((e) => e.fichero.replace(/^src\//, ''));

    const hallazgos = ficheros
      .filter((f) => !exentos.some((e) => f.replace(/\\/g, '/').endsWith(e)))
      .flatMap((f) =>
        buscarPatron(readFileSync(f, 'utf8'), f.replace(RAIZ, '').replace(/\\/g, '/')),
      );

    // Se listan con fichero y linea: un fallo tiene que decir donde, no solo que.
    expect(
      hallazgos.map(
        (h) => `${h.fichero}:${h.lineaLectura} -> create :${h.lineaCreate} (${h.modelo})`,
      ),
    ).toEqual([]);
  });

  describe('casos de control', () => {
    it('C1: detecta el patron sobre el mismo modelo', () => {
      const malo = [
        'const w = await this.prisma.wallet.findUnique({ where: { userId } });',
        'if (!w) {',
        '  await this.prisma.wallet.create({ data: { userId } });',
        '}',
      ].join('\n');

      expect(buscarPatron(malo)).toHaveLength(1);
    });

    it('C2: `upsert` no se acusa', () => {
      const bueno =
        'await this.prisma.wallet.upsert({ where: { userId }, create: {}, update: {} });';

      expect(buscarPatron(bueno)).toEqual([]);
    });

    it('C3: `createMany` con `skipDuplicates` no se acusa', () => {
      const bueno = [
        'await this.prisma.wallet.createMany({ data: [{ userId }], skipDuplicates: true });',
        'return this.prisma.wallet.findUniqueOrThrow({ where: { userId } });',
      ].join('\n');

      expect(buscarPatron(bueno)).toEqual([]);
    });

    it('C4: modelos DISTINTOS no son la carrera', () => {
      // Leer un pedido y crear un envio es lo normal. Acusarlo haria la guarda insufrible, y una
      // guarda insufrible acaba desactivada.
      const legitimo = [
        'const order = await this.prisma.order.findUnique({ where: { id } });',
        'await this.prisma.shipment.create({ data: { orderId: id } });',
      ].join('\n');

      expect(buscarPatron(legitimo)).toEqual([]);
    });

    it('C5: la salida declarada —capturar P2002— no se acusa', () => {
      const declarado = [
        'const existing = await this.prisma.shipment.findUnique({ where: { orderId } });',
        'if (existing) throw new BadRequestException("ya existe");',
        'try {',
        '  await this.prisma.shipment.create({ data: { orderId } });',
        '} catch (error) {',
        '  if ((error as { code?: string }).code === "P2002") {',
        '    throw new BadRequestException("ya existe");',
        '  }',
        '  throw error;',
        '}',
      ].join('\n');

      expect(buscarPatron(declarado)).toEqual([]);
    });

    it('C5b: la otra salida declarada —bloquear la fila— tampoco se acusa', () => {
      const bloqueado = [
        'const x = await this.prisma.$transaction(async (tx) => {',
        '  await tx.$queryRaw`SELECT id FROM metodos WHERE id = ${id}::uuid FOR UPDATE`;',
        '  const enCurso = await tx.verificacion.findFirst({ where: { id } });',
        '  if (enCurso) return enCurso;',
        '  return tx.verificacion.create({ data: { id } });',
        '});',
      ].join('\n');

      expect(buscarPatron(bloqueado)).toEqual([]);
    });

    it('C6: el patron sobre `tx` tambien se acusa', () => {
      // Estar dentro de una transaccion NO da exclusion sobre una fila que aun no existe. Fue el
      // error que costo mas medir en este PT, y por eso tiene su caso de control.
      const enTransaccion = [
        'const w = await tx.wallet.findUnique({ where: { userId } });',
        'if (!w) await tx.wallet.create({ data: { userId } });',
      ].join('\n');

      expect(buscarPatron(enTransaccion)).toHaveLength(1);
    });

    it('C7: una lectura sin `create` cerca no se acusa', () => {
      expect(
        buscarPatron('const w = await this.prisma.wallet.findUnique({ where: { userId } });'),
      ).toEqual([]);
    });
  });
});
