import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-133 — Los endpoints de pago legados quedan retirados, y no vuelven.
 *
 * `POST /wallet/deposit` y `POST /payments/checkout` **no los invocaba ningun cliente**. Se
 * comprobo sobre todo `src/`: los unicos llamantes eran sus propios tests e2e.
 *
 * El flujo real de deposito lo documenta `docs-v2/4-ingenieria/Catalogo-de-API.md:51` —
 * `POST /payments/initiate` -> pasarela -> webhook / via garantizada -> acreditacion— y es el
 * ciclo de pago de PT-080 con las garantias de PT-087 (ADR-034 a ADR-040). El portal lo invoca
 * desde `public/js/pages/pages-wallet-deposit.js`.
 *
 * **Por que se retiran y no se corrigen.** `/wallet/deposit` acredita dinero: recibe un
 * `referenceId` que elige el cliente, lo verifica contra la pasarela y abona el monedero. Es
 * superficie que mueve saldo, sin llamantes, sin cobertura y sin nadie que la mantenga. Corregir su
 * manejo de errores (H-018) habria sido pulir una puerta que sobra.
 *
 * Lo que se conserva, y por que:
 *
 *   `WalletService.deposit()`      SE QUEDA — es lo que usa `creditWallet` en la via real
 *                                  (`payments.service.ts:400`). Retirarlo romperia el deposito.
 *   `PaymentsService.verifyPayment` SE RETIRA — su unico llamante era el manejador legado.
 *   `createCheckoutSession`         SE RETIRA — idem.
 *
 * Esta guarda es estrecha a proposito: mira las rutas declaradas en los dos controladores. Si
 * alguien las reintroduce, lo dice; y si hace falta reintroducirlas de verdad, hay que borrar esta
 * prueba a conciencia, que es justo lo que se quiere que ocurra.
 */
const RAIZ = raizDelMonorepo();

const leer = (p: string): string => readFileSync(join(RAIZ, p), 'utf8');

/** Las rutas que declara un controlador para un verbo dado. */
export function rutasDe(fuente: string, verbo: string): string[] {
  const re = new RegExp(`@${verbo}\\(\\s*['"]([^'"]*)['"]`, 'g');
  return [...fuente.matchAll(re)].map((m) => m[1]);
}

describe('Los endpoints de pago legados estan retirados (PT-133)', () => {
  const wallet = leer('src/api/src/modules/wallet/wallet.controller.ts');
  const payments = leer('src/api/src/modules/payments/payments.controller.ts');

  it('se han leido los controladores — si no, la guarda no compara nada', () => {
    expect(wallet.length).toBeGreaterThan(100);
    expect(payments.length).toBeGreaterThan(100);
  });

  it('AC-01: `POST /wallet/deposit` ya no existe', () => {
    expect(rutasDe(wallet, 'Post')).not.toContain('deposit');
  });

  it('AC-02: `POST /payments/checkout` ya no existe', () => {
    expect(rutasDe(payments, 'Post')).not.toContain('checkout');
  });

  it('AC-03: el flujo VIGENTE sigue en pie', () => {
    // Retirar lo legado no puede llevarse por delante el camino real. `initiate` es el que usa el
    // portal; `webhook` y `process` son las otras dos patas del ciclo (PT-080).
    const vigentes = rutasDe(payments, 'Post');

    expect(vigentes).toContain('initiate');
    expect(vigentes).toContain('webhook/:provider');
    expect(vigentes).toContain('process');
  });

  it('AC-04: `GET /payments/status/:reference` sigue en pie', () => {
    // Es lo que consulta la pagina de retorno (ADR-043): el `status` de la URL no decide nada.
    expect(rutasDe(payments, 'Get')).toContain('status/:reference');
  });

  it('AC-05: el retiro sigue en pie', () => {
    // `/wallet/withdraw` SI tiene llamante: `public/js/pages/pages-wallet-withdraw.js`.
    expect(rutasDe(wallet, 'Post')).toContain('withdraw');
  });

  it('AC-06: `WalletService.deposit()` NO se retira', () => {
    // Es lo que usa `creditWallet` en la via real. Confundir el endpoint con el servicio habria
    // roto el deposito de verdad mientras se retiraba el que no se usa.
    const servicio = leer('src/api/src/modules/wallet/wallet.service.ts');

    expect(servicio).toMatch(/async deposit\(/);
  });

  describe('casos de control', () => {
    it('C1: el extractor encuentra una ruta que si esta', () => {
      expect(rutasDe("@Post('initiate')", 'Post')).toEqual(['initiate']);
    });

    it('C2: no confunde verbos', () => {
      expect(rutasDe("@Get('deposit')", 'Post')).toEqual([]);
    });
  });
});
