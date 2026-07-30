import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-192 (AUD-015) — **Una regla crítica de dominio no puede contradecir al código que gobierna.**
 *
 * ## Lo que había, y por qué era una mina y no una errata
 *
 * `CR-002` en la declaración de valor decía:
 *
 * > *«Los fondos retenidos no pueden superar el balance disponible»* — `wallets.held_funds <= wallets.balance`
 *
 * Y eso **es falso en este sistema**. `WalletService.holdFunds()` **resta del balance y suma a
 * `heldFunds`**: son bolsas disjuntas. Un usuario con 100 que puja 100 queda en `balance = 0`,
 * `held = 100`, y la invariante se rompe con el comportamiento **correcto**.
 *
 * `RN-21` —el catálogo de reglas de negocio— ya decía lo correcto desde **PT-032**: *«`held` no puede
 * exceder el balance **al momento de bloquear**; tras bloquear **puede** exceder el restante»*. Las dos
 * afirmaciones convivían, y la equivocada era la que estaba **ejecutándose**.
 *
 * ## Lo que la hacía peligrosa: estaba armada
 *
 * No era una frase suelta en un documento. Estaba **codificada** en el checkpoint D1.N1
 * (`domain-rules.ts`) con severidad **CRÍTICA** y este SQL:
 *
 * ```sql
 * SELECT count(*) FROM wallets WHERE held_funds > balance
 * ```
 *
 * Es decir: `npm run audit:domain` estaba preparado para **declarar una violación crítica de dominio
 * sobre datos correctos**. No saltó nunca porque es un checkpoint de delta sync que necesita una base
 * con historia — el mismo motivo por el que CI no lo corre. **Un control que no se ejecuta no avisa de
 * nada**, y aquí eso lo mantuvo escondido: el día que hubiera corrido sobre datos reales habría acusado
 * al sistema de un fallo que no existe, y alguien habría «arreglado» el monedero.
 *
 * ## Qué dice ahora, y por qué esa forma
 *
 * La regla verificable **no es sobre el estado del monedero, es sobre el momento de retener**, que es
 * donde vive la protección. Se comprueba en el ledger, que es inmutable y guarda el `balanceBefore` de
 * cada retención:
 *
 * ```sql
 * SELECT count(*) FROM ledger WHERE type = 'HOLD_BID' AND amount > balance_before
 * ```
 *
 * Una retención que se hizo contra saldo insuficiente **sí** es una violación crítica: significa que
 * `holdFunds` dejó pasar algo que su `InsufficientBalanceException` tenía que haber cortado. Y a
 * diferencia de la anterior, no puede dispararse con datos correctos.
 */
const RAIZ = raizDelMonorepo();
const REGLAS = join(RAIZ, 'src', 'api', 'scripts', 'domain-rules.ts');
const F1 = join(RAIZ, 'PTSA', 'Fases', 'F-1_Declaracion_Valor.md');
const WALLET = join(RAIZ, 'src', 'api', 'src', 'modules', 'wallet', 'wallet.service.ts');

const leer = (p: string) => readFileSync(p, 'utf-8');

/**
 * Fuente sin comentarios. **Lo que hace daño es lo que se ejecuta**, y el comentario que explica el
 * defecto necesita citar el SQL viejo para que se entienda — igual que pasó con la guarda de citas del
 * contrato, esta prueba se acusaba a sí misma leyendo la explicación de lo que vigila.
 */
const ejecutable = (p: string) =>
  leer(p)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((l) => l.replace(/\/\/.*$/, ''))
    .join('\n');

describe('Las reglas criticas no contradicen al codigo — AUD-015 (PT-192)', () => {
  it('C1: ninguna regla codificada compara `held_funds` con `balance` como si fueran la misma bolsa', () => {
    // Es la comparación exacta que era falsa. Se busca en el SQL, no en la prosa: lo que hace daño es
    // lo que se ejecuta.
    const src = ejecutable(REGLAS);

    expect(src).not.toMatch(/held_funds\s*>\s*balance/);
    expect(src).not.toMatch(/held_funds\s*<=?\s*balance/);
  });

  it('C2: la declaracion de valor tampoco la enuncia', () => {
    // Corregir el código y dejar el documento diciendo lo contrario reproduce el problema con un paso
    // más: la próxima persona que codifique `CR-002` volvería a leer la versión falsa.
    expect(leer(F1)).not.toMatch(/held_funds\s*<=\s*wallets\.balance/);
  });

  it('C3: `CR-002` sigue existiendo y ahora se comprueba sobre el momento de retener', () => {
    // La salida perezosa era borrar la regla. La protección es real —`holdFunds` no debe dejar retener
    // sobre saldo insuficiente—; lo que estaba mal era dónde se medía.
    const src = ejecutable(REGLAS);
    const i = src.indexOf("id: 'CR-002'");

    expect(i).toBeGreaterThan(-1);

    const bloque = src.slice(i, src.indexOf('},', src.indexOf('sql:', i)));
    expect(bloque).toMatch(/HOLD_BID/);
    expect(bloque).toMatch(/balance_before/);
  });

  describe('casos de control', () => {
    it('AC-01: el codigo sigue haciendo lo que la regla nueva describe — retener RESTA del balance', () => {
      // Si algún día `holdFunds` dejara de restar, las dos bolsas dejarían de ser disjuntas y la regla
      // vieja volvería a ser la correcta. Este caso obliga a volver aquí antes de cambiarla.
      const src = leer(WALLET);
      const i = src.indexOf('async holdFunds(');
      const cuerpo = src.slice(i, src.indexOf('\n  async ', i + 1));

      expect(cuerpo).toMatch(/currentBalance\.minus\(/);
      expect(cuerpo).toMatch(/InsufficientBalanceException/);
    });

    it('AC-02: el catalogo de reglas conserva la formulacion correcta de RN-21', () => {
      // RN-21 es la que tenía razón desde PT-032. Si se borrara, quedaría sólo la del checkpoint y no
      // habría con qué contrastarla.
      const rn = leer(join(RAIZ, 'docs-v2', 'transversal', 'Catalogo-Maestro-de-Reglas.md'));
      const fila = rn.split('\n').find((l) => l.startsWith('| RN-21 '));

      expect(fila).toBeDefined();
      expect(fila).toMatch(/al momento de bloquear/);
    });

    it('AC-03: las demas reglas criticas siguen ahi — no se ha vaciado el checkpoint', () => {
      // La otra forma perezosa de pasar C1 es quedarse sin reglas.
      // Ocho de las quince `CR` de F-1 son comprobables por SQL; las demas se ejercen por prueba
      // (rechazos con codigo de error) y no viven aqui. Ocho es el numero medido, no una estimacion.
      const ids = ejecutable(REGLAS).match(/id: 'CR-\d+'/g) ?? [];

      expect(ids.length).toBeGreaterThanOrEqual(8);
    });
  });
});
