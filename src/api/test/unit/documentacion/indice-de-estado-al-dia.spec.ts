import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';
import {
  ABIERTOS,
  MARCA,
  analizar,
  bloquesDeCierre,
  estadoReal,
  generar,
} from '../../../scripts/indice-de-estado';

/**
 * PT-187 — **El índice de estado de `HISTORY.log` dice la verdad, y un BUG no se cierra solo.**
 *
 * ## Por qué existe el índice
 *
 * `HISTORY.log` es append-only, así que el cierre de un PT se anota **más abajo**, en un bloque de VoBo. La
 * consecuencia medida: **102 entradas siguen diciendo `Status: VALIDATION_PENDING` estando cerradas.**
 *
 * Eso costó tiempo real. Se reportó PT-147 como pendiente cuando llevaba cerrado desde el 2026-07-29, y el humano
 * lo señaló: *«¿por qué PT-147 sigue pendiente si se ha pedido más de una vez que se cierre?»*. No seguía
 * pendiente — lo decía el fichero, y yo lo repetí sin comprobarlo.
 *
 * El índice **añade** al final en vez de reescribir las 102 líneas: reescribirlas se leería mejor y falsificaría
 * el registro, porque borraría el momento en que se supo cada cosa. Es la misma razón por la que el log es
 * append-only.
 *
 * ## Y el defecto que el índice encontró en su primera ejecución
 *
 * `PT-181` estaba en `VALIDATION_PENDING` **sin bloque de cierre** —su VoBo se anotó en `PENDING_TASKS.md` y
 * nunca en el log que manda para lo terminado— y `PT-182 … PT-186` se escribieron con **`Status: DONE`
 * directamente**, siendo los cinco BUG. FDGE STATE 6 dice que el agente no cierra bugs.
 *
 * El resultado era correcto —el VoBo estaba dado de antemano— pero **un cierre sin constancia de quién lo
 * autorizó es indistinguible de uno que el agente se dio a sí mismo**, y esa distinción es la razón de ser de
 * STATE 6. De ahí C4.
 */
const RAIZ = raizDelMonorepo();
const HISTORY = join(RAIZ, 'docs', 'implementation', 'HISTORY.log');

/** El log **sin** el índice: es lo que el generador toma como entrada. */
function logSinIndice(): string {
  const log = readFileSync(HISTORY, 'utf-8');
  const corte = log.indexOf(MARCA);
  return corte < 0 ? log : log.slice(0, log.lastIndexOf('\n---', corte));
}

describe('El indice de estado de HISTORY.log esta al dia — PT-187', () => {
  const log = readFileSync(HISTORY, 'utf-8');
  const previo = logSinIndice();

  it('C1: el indice existe', () => {
    // Sin el, cualquiera que lea una entrada ve el `Status:` historico y lo toma por el estado de hoy. Es lo que
    // paso con PT-147.
    expect(log).toContain(MARCA);
  });

  it('C2: el indice esta REGENERADO — coincide con lo que produce el generador', () => {
    // Si alguien anade un PT y no regenera, el indice miente con la misma confianza con la que hoy dice la
    // verdad. Un derivado desactualizado es peor que no tenerlo: se lee igual.
    expect(log.slice(previo.length)).toBe(generar(previo));
  });

  it('C3: ningun PT queda realmente abierto sin figurar en PENDING_TASKS.md', () => {
    // Es la mitad de RULE-34 aplicada al estado REAL y no al declarado. Antes se resolvia recorriendo el log a
    // mano; ahora hay un unico sitio que lo calcula.
    const pendientes = join(RAIZ, 'docs', 'implementation', 'PENDING_TASKS.md');
    const texto = readFileSync(pendientes, 'utf-8');

    // Se pregunta por los estados **declaradamente abiertos**, no por «todo lo que no sea CLOSED ni DONE». La
    // primera version lo hacia asi y acusaba a seis entradas antiguas —PT-039…PT-044— que son de un formato
    // anterior al campo `Status:`: aparecen como `SIN_DECLARAR`, que no es «abierto», es «no lo dice». Un
    // desconocido no es un pendiente, y tratarlo como tal es inventar trabajo.
    const abiertos = analizar(previo)
      .filter((e) => ABIERTOS.has(estadoReal(e)))
      .flatMap((e) => e.pts);

    const ausentes = abiertos.filter((pt) => !texto.includes(pt));

    expect(ausentes).toEqual([]);
  });

  it('C4: un BUG no figura DONE sin un bloque de VoBo que lo nombre', () => {
    // **El defecto que este PT corrige.** PT-182…PT-186 se escribieron `DONE` siendo BUG, y FDGE STATE 6 dice
    // que el agente no cierra bugs. El VoBo estaba dado, pero no constaba en el log: un cierre sin constancia de
    // quien lo autorizo es indistinguible de uno que el agente se dio a si mismo.
    // `bloquesDeCierre` es una función con nombre y no un regex aquí dentro **por lo que pasó al escribirlo**:
    // el regex original terminaba en `(?=\n## |$)` con la bandera `m`, y con `m` el `$` casa fin de **línea**.
    // Cada bloque se cortaba en su encabezado, así que este caso comprobaba títulos y acusaba a cinco PT que
    // estaban nombrados en el cuerpo del bloque de al lado.
    const bloquesVoBo = bloquesDeCierre(previo);

    // Y `cerradoEn` cubre las **declaraciones de totalidad** («dalos a todos por validados»), que es como se
    // cerraron los BUG antiguos. Sin eso, este caso acusaría para siempre a PT-026, PT-083, PT-085, PT-131 y
    // PT-132: cerrados en bloque, sin que nadie los enumerase uno a uno.
    const sinConstancia = analizar(previo)
      .filter((e) => /BUG/i.test(e.titulo) && e.estado === 'DONE')
      .filter((e) => !e.cerradoEn && !e.pts.some((pt) => bloquesVoBo.includes(pt)))
      .flatMap((e) => e.pts);

    expect(sinConstancia).toEqual([]);
  });

  describe('casos de control', () => {
    it('AC-01: una entrada CERRADA por un bloque posterior se lee como CLOSED', () => {
      const falso = [
        '## PT-900 — BUG: algo',
        'Status: VALIDATION_PENDING',
        '',
        '## CIERRE CON VoBo HUMANO — PT-900',
        'El humano dio el VoBo sobre PT-900.',
      ].join('\n');

      expect(estadoReal(analizar(falso)[0])).toBe('CLOSED');
    });

    it('AC-02: una entrada SIN cierre posterior sigue abierta — el indice no regala cierres', () => {
      const falso = ['## PT-901 — BUG: algo', 'Status: VALIDATION_PENDING'].join('\n');

      expect(estadoReal(analizar(falso)[0])).toBe('VALIDATION_PENDING');
    });

    it('AC-03: un bloque ANTERIOR no cierra un PT posterior', () => {
      // Sin esto, un «dalos a todos por validados» de julio cerraría lo que se escriba en diciembre. El orden
      // importa, y es lo que la primera version de la guarda de RULE-34 no entendio: acuso a treinta PT.
      const falso = [
        '## CIERRE CON VoBo HUMANO — toda la validacion pendiente',
        'dalos a todos por validados con mi VoBo',
        '',
        '## PT-902 — BUG: algo posterior',
        'Status: VALIDATION_PENDING',
      ].join('\n');

      expect(estadoReal(analizar(falso)[0])).toBe('VALIDATION_PENDING');
    });

    it('AC-04: un encabezado agrupado cuenta como varios PT', () => {
      // `## PT-149 / PT-150 — …` es una forma real de este log, y contar por encabezado en vez de por PT es lo
      // que produjo siete falsos positivos en PT-169.
      expect(analizar('## PT-149 / PT-150 — algo\nStatus: DONE')[0].pts).toEqual([
        'PT-149',
        'PT-150',
      ]);
    });
  });
});
