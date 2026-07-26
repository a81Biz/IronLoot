import { Inject, Injectable } from '@nestjs/common';
import { PaymentProvider } from './interfaces';

/** Token de inyección múltiple. Cada adaptador se registra bajo él en `payments.module.ts`. */
export const PAYMENT_PROVIDERS = Symbol('PAYMENT_PROVIDERS');

/**
 * PT-080 — Registro de pasarelas.
 *
 * Antes, añadir una pasarela exigía **cinco** ediciones en la lógica de transacción: el
 * `switch` de `initiatePayment`, la cadena `if/else` de `handleWebhook`, el mapa de alias,
 * `getAvailableProviders` y el tipado en duro de `reconcilePayments`. Quitarla no tenía
 * camino: había que cazar ramas a mano.
 *
 * Ahora cada adaptador declara su clave y sus alias, y el registro lo resuelve. Añadir una
 * pasarela es crear el adaptador y registrarlo en el módulo; quitarla, borrar esas dos cosas.
 * Cero ediciones aquí.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly byKey = new Map<string, PaymentProvider>();

  constructor(@Inject(PAYMENT_PROVIDERS) private readonly providers: PaymentProvider[]) {
    for (const provider of providers) {
      this.byKey.set(this.normalize(provider.key), provider);
      for (const alias of provider.aliases ?? []) {
        this.byKey.set(this.normalize(alias), provider);
      }
    }
  }

  /**
   * Resuelve por clave canónica o alias, sin distinguir mayúsculas ni guiones bajos.
   * La URL registrada en la pasarela no siempre usa la clave canónica: `/webhook/mercadopago`
   * debe resolver a `MERCADO_PAGO` (bug de PT-064, que no puede reaparecer).
   */
  resolve(nameOrAlias: string): PaymentProvider | null {
    if (!nameOrAlias) return null;
    return this.byKey.get(this.normalize(nameOrAlias)) ?? null;
  }

  /** Todos los adaptadores registrados, estén configurados o no. */
  all(): PaymentProvider[] {
    return [...this.providers];
  }

  /** Solo los que tienen su configuración completa: es lo que se ofrece al usuario. */
  available(): PaymentProvider[] {
    return this.providers.filter((p) => p.checkStatus());
  }

  availableKeys(): string[] {
    return this.available().map((p) => p.key);
  }

  private normalize(value: string): string {
    return String(value).toUpperCase().replace(/_/g, '');
  }
}
