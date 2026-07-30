import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-196 — **La forma de la rotación, no sólo su comportamiento.**
 *
 * `rotacion-del-refresh-token.spec.ts` prueba los cuatro casos ejecutándolos. Esta guarda protege las
 * tres propiedades **estructurales** de las que depende que esos casos sigan significando algo:
 *
 * 1. **El orden de las comprobaciones.** Si el reuso se mirara antes que la revocación, una sesión ya
 *    revocada dispararía un evento de seguridad en cada reintento y el registro se llenaría de ruido
 *    justo cuando hay que leerlo. Una prueba de comportamiento pasa igual con el orden invertido si el
 *    caso no está escrito; esto lo fija.
 * 2. **El bloqueo de fila.** Sin `FOR UPDATE`, dos refrescos concurrentes con el token vigente leen el
 *    mismo estado y escriben dos rotaciones: la segunda pisa a la primera y **el token entregado
 *    primero deja de existir**. Un usuario expulsado por su propia concurrencia — y eso **no lo
 *    detecta ninguna prueba unitaria**, porque necesita dos transacciones de verdad.
 * 3. **La gracia sin reserva.** RULE-17: con `0` se expulsa por carreras, con una cifra generosa se
 *    abre una ventana que nadie decidió. Las dos se ven como «funciona».
 *
 * ## Y una que este PT aprendió de sí mismo
 *
 * `GRACIA_ROTACION_SEG` se evalúa **al cargar el módulo**. La primera versión comprobaba dentro de la
 * función, y eso significa que el API **arranca sano** y falla en el primer refresco — el modo de fallo
 * exacto de `AUD-026`. Lo cazó el caso de control de su propia prueba, y `C4` lo fija.
 */
const RAIZ = raizDelMonorepo();
const AUTH = join(RAIZ, 'src', 'api', 'src', 'modules', 'auth', 'auth.service.ts');
const GRACIA = join(RAIZ, 'src', 'api', 'src', 'modules', 'auth', 'rotation-grace.ts');

/** Lo ejecutable: el comentario que explica el defecto tiene que poder nombrarlo. */
const ejecutable = (p: string) =>
  readFileSync(p, 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

describe('La rotacion detecta reuso y no se relaja — PT-196', () => {
  it('C1: revocada y expirada se comprueban ANTES que el reuso', () => {
    const src = ejecutable(AUTH);

    const iRevocada = src.indexOf('session.revokedAt');
    const iExpirada = src.indexOf('session.expiresAt');
    const iReuso = src.indexOf('esElAnterior');

    expect(iRevocada).toBeGreaterThan(-1);
    expect(iExpirada).toBeGreaterThan(-1);
    expect(iReuso).toBeGreaterThan(iRevocada);
    expect(iReuso).toBeGreaterThan(iExpirada);
  });

  it('C2: la rotacion bloquea la fila, y dentro de una transaccion', () => {
    // RULE-24 aplicada a la sesion. Lo que esto impide no lo ve ninguna prueba unitaria: hacen falta
    // dos transacciones reales para verlo, y para entonces ya hay usuarios expulsados.
    const src = ejecutable(AUTH);
    const i = src.indexOf('const tokenRotado');
    expect(i).toBeGreaterThan(-1);

    const bloque = src.slice(i, i + 900);
    expect(bloque).toMatch(/\$transaction/);
    expect(bloque.toUpperCase()).toContain('FOR UPDATE');
  });

  it('C3: el reuso revoca LA SESION, no solo el token', () => {
    // Revocar el token dejaria al ladron dentro con el que acaba de obtener.
    const src = ejecutable(AUTH);
    const i = src.indexOf('esElAnterior');
    const bloque = src.slice(i, src.indexOf('const tokenRotado', i));

    expect(bloque).toMatch(/revokedAt:\s*new Date\(\)/);
  });

  it('C4: la gracia se valida AL CARGAR el modulo, no en cada llamada', () => {
    // Validar dentro de la funcion deja al API arrancando sano y fallando en el primer refresco: es
    // el modo de fallo de AUD-026, donde el CLIENT arrancaba `healthy` y rebotaba al login sin dejar
    // un error en ningun log.
    const src = ejecutable(GRACIA);

    expect(src).toMatch(/export const GRACIA_ROTACION_SEG\s*=\s*leer\(\)/);
  });

  it('C5: la gracia no tiene reserva', () => {
    // **La primera version de este caso no cazo su propio sabotaje.** Exigia el `||` pegado al nombre
    // de la variable, y la reserva real iba detras de `?.trim()`:
    //
    //     process.env.ROTATION_GRACE_SEC?.trim() || '30'
    //
    // Medir la forma en vez de la relacion, otra vez. Ahora se mira si hay una reserva **en algun
    // punto de la expresion** que lee la variable, no si el operador esta pegado.
    const src = ejecutable(GRACIA);

    const lineas = src.split('\n').filter((l) => l.includes('ROTATION_GRACE_SEC'));
    const conReserva = lineas.filter((l) => /\|\||\?\?/.test(l));

    expect(conReserva).toEqual([]);
    expect(src).toMatch(/throw new Error\(/);
  });

  describe('casos de control', () => {
    it('AC-01: los ficheros vigilados existen y tienen contenido', () => {
      // Sin esto, un renombrado dejaria la guarda leyendo cadenas vacias y **pasando en vacio** — el
      // modo exacto en que una guarda se vuelve inutil sin dejar de existir (RULE-32).
      expect(ejecutable(AUTH).length).toBeGreaterThan(2000);
      expect(ejecutable(GRACIA).length).toBeGreaterThan(300);
    });

    it('AC-02: la deteccion de orden distingue las dos formas', () => {
      // Si no distinguiera, C1 no estaria midiendo nada.
      const mal = 'if (esElAnterior) { … } if (session.revokedAt) { … }';
      const bien =
        'if (session.revokedAt) { … } if (session.expiresAt) { … } const esElAnterior = …';

      const ordenOk = (s: string) =>
        s.indexOf('session.revokedAt') > -1 &&
        s.indexOf('esElAnterior') > s.indexOf('session.revokedAt');

      expect(ordenOk(mal)).toBe(false);
      expect(ordenOk(bien)).toBe(true);
    });

    it('AC-04: la deteccion de reserva reconoce la forma que se le escapo', () => {
      // El sabotaje que C5 no vio en su primera version. Sin este caso, la correccion no estaria fija.
      const conReserva = "  const bruto = process.env.ROTATION_GRACE_SEC?.trim() || '30';";
      const sinReserva = '  const bruto = process.env.ROTATION_GRACE_SEC?.trim();';

      expect(/\|\||\?\?/.test(conReserva)).toBe(true);
      expect(/\|\||\?\?/.test(sinReserva)).toBe(false);
    });

    it('AC-03: el mensaje de la variable la NOMBRA', () => {
      // «Falta una variable» sin decir cual manda a buscar. Es el corolario de RULE-17.
      expect(readFileSync(GRACIA, 'utf-8')).toMatch(/Falta ROTATION_GRACE_SEC/);
    });
  });
});
