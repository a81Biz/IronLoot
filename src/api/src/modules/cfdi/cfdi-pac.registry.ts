import { Inject, Injectable, Optional } from '@nestjs/common';

/**
 * PT-237 — **El registro de PAC: quién puede timbrar una factura ante el SAT.**
 *
 * Mismo patrón que `PaymentProviderRegistry`, y a propósito: la pregunta es la misma —*«¿qué
 * proveedores externos hay, y cuáles están listos para usarse?»*— y este repositorio ya la respondió
 * una vez. Dos respuestas distintas a una misma pregunta es lo que ADR-058 retira.
 *
 * ## Por qué existe si no registra nada
 *
 * **Porque cero es la respuesta**, y hasta PT-237 el sistema no la daba: la configuración ofrecía un
 * `<input type="url">` libre para «la URL de tu PAC». Con eso aceptaba una decisión que **no podía
 * honrar** —no sabía qué PAC era, no validaba que fuese uno conocido, y no tenía adaptador para
 * ninguno—, y activarla escribía filas `PENDING` que nadie podía avanzar.
 *
 * Un registro vacío convierte *«configura la URL de tu PAC»* en *«no hay ningún PAC integrado»*, que
 * es verdad y es accionable.
 *
 * **No es un puerto sin adaptador de los que ADR-058 retira.** La diferencia es que aquí el registro
 * **se ejecuta**: valida la clave que el operador elige y decide si la facturación puede encenderse.
 * Lo que aquel caso retiraba era un contrato *declarativo* duplicando otro vivo — `IPaymentProvider`
 * describiendo lo que el API ya declaraba— y por eso era documentación falsa ejecutable.
 *
 * ## Cómo se integra un PAC, el día que haya contrato
 *
 * Escribir un adaptador que cumpla `CfdiPacProvider` y registrarlo en `CFDI_PAC_PROVIDERS` desde
 * `cfdi.module.ts`. `available()` lo ofrecerá en la pantalla en cuanto su `estaConfigurado()` diga que
 * sí. La decisión y sus requisitos viven en `TD-001`.
 */
export interface CfdiPacProvider {
  /** Clave canónica, la que se guarda en `CFDI_PAC_PROVIDER`. */
  readonly clave: string;
  /** Nombre para mostrar en la pantalla de configuración. */
  readonly nombre: string;
  /** `true` si su configuración está completa y puede timbrar. */
  estaConfigurado(): boolean;
}

/** Símbolo de inyección de los adaptadores. Hoy no lo provee nadie, que es el estado correcto. */
export const CFDI_PAC_PROVIDERS = Symbol('CFDI_PAC_PROVIDERS');

@Injectable()
export class CfdiPacRegistry {
  private readonly porClave = new Map<string, CfdiPacProvider>();

  constructor(
    @Optional()
    @Inject(CFDI_PAC_PROVIDERS)
    private readonly proveedores: CfdiPacProvider[] = [],
  ) {
    for (const p of this.proveedores) {
      this.porClave.set(this.normalizar(p.clave), p);
    }
  }

  /** Todos los adaptadores registrados, estén configurados o no. */
  all(): CfdiPacProvider[] {
    return [...this.proveedores];
  }

  /**
   * Sólo los que pueden timbrar hoy: es lo que se ofrece en la pantalla y lo que decide si
   * `CFDI_ENABLED` puede ponerse en `true`.
   */
  available(): CfdiPacProvider[] {
    return this.proveedores.filter((p) => p.estaConfigurado());
  }

  /**
   * Resuelve por clave, sin distinguir mayúsculas, guiones ni subrayados.
   *
   * La tolerancia no es cosmética: `PaymentProviderRegistry` la lleva porque una URL registrada en la
   * pasarela no siempre usa la clave canónica, y aquí la clave viaja en un formulario. Devuelve `null`
   * en vez de lanzar, para que el llamante decida qué significa «no lo conozco».
   */
  resolve(clave: string): CfdiPacProvider | null {
    if (!clave) return null;
    return this.porClave.get(this.normalizar(clave)) ?? null;
  }

  private normalizar(v: string): string {
    return v.trim().toLowerCase().replace(/[_-]/g, '');
  }
}
