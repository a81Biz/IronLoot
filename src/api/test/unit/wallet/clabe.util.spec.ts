import { isValidClabe } from '../../../src/modules/wallet/clabe.util';

/**
 * PT-070 — Validación de CLABE. La CLABE válida usada aquí tiene dígito verificador correcto.
 */
describe('isValidClabe (PT-070)', () => {
  it('acepta una CLABE válida', () => {
    // 002010077777777771 — CLABE de ejemplo de la documentación de Banxico (verificador válido)
    expect(isValidClabe('002010077777777771')).toBe(true);
  });

  it('rechaza CLABE con dígito verificador incorrecto', () => {
    expect(isValidClabe('002010077777777770')).toBe(false);
  });

  it('rechaza longitud != 18 o no numérica', () => {
    expect(isValidClabe('12345')).toBe(false);
    expect(isValidClabe('00201007777777777X')).toBe(false);
    expect(isValidClabe('')).toBe(false);
    expect(isValidClabe(null as any)).toBe(false);
  });
});
