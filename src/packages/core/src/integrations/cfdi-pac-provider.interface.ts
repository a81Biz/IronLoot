/**
 * Contrato con un Proveedor Autorizado de Certificacion (PAC) del SAT.
 *
 * PT-113 (H-005 / F-40) — ADVERTENCIA sobre `CfdiData`.
 *
 * Los seis campos de abajo NO bastan para timbrar un CFDI 4.0. Un PAC rechazaria la peticion:
 * faltan `UsoCFDI`, `RegimenFiscal` del emisor Y del receptor, `LugarExpedicion` (codigo postal),
 * `MetodoPago`, `FormaPago`, `ClaveProdServ` y `ClaveUnidad` de los catalogos del SAT, y el
 * desglose de impuestos.
 *
 * No se amplia todavia, y el motivo es deliberado: **no esta decidido quien emite la factura**.
 * IronLoot intermedia ventas entre particulares, y caben tres modelos —el vendedor emite, IronLoot
 * emite por cuenta del vendedor, o IronLoot solo factura su comision— con datos, obligaciones y
 * contrato de PAC distintos. Ampliar la interfaz antes de esa decision seria inventarse la forma.
 *
 * Esa decision, y no el tramite con el SAT, es el bloqueo real de H-005. Ver PT-113 en
 * `DISCOVERY.md` y F-40 en la matriz.
 */
export interface CfdiData {
  orderId: string;
  sellerRfc: string;
  buyerRfc: string;
  amount: number;
  currency: string;
  description: string;
}

export interface StampedCfdi {
  uuid: string;
  xml: string;
  pdf?: string;
}

export interface ICfdiPacProvider {
  stampCfdi(cfdi: CfdiData): Promise<StampedCfdi>;
  cancelCfdi(uuid: string, reason: string): Promise<void>;
}
