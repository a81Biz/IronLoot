/**
 * PT-070 — Validación de CLABE (Clave Bancaria Estandarizada, México, 18 dígitos).
 * El dígito 18 es un verificador (módulo 10 ponderado con pesos 3,7,1).
 */
export function isValidClabe(clabe: string): boolean {
  if (typeof clabe !== 'string') return false;
  const c = clabe.trim();
  if (!/^\d{18}$/.test(c)) return false;

  const weights = [3, 7, 1];
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const product = (Number(c[i]) * weights[i % 3]) % 10;
    sum += product;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === Number(c[17]);
}
