import { puntuar, type Veredicto } from '../../../scripts/domain-rules';

/**
 * PT-120 (`[R57]` / checkpoint D1.N1) — Las reglas de dominio son codigo.
 *
 * `audit-scope.yaml` declara este checkpoint desde el 23-jun. No existia — y lo incomodo es que
 * las reglas **si se habian escrito**: tres veces, en DS-004, DS-006 y DS-008, con guiones que
 * vivian en una carpeta temporal y se perdian. Cada delta sync rehacia el mismo trabajo.
 *
 * `[R57]` existe justamente para eso: una regla objetiva y repetible DEBE ser un test ejecutable,
 * «para permitir su verificacion automatica en cada Delta Sync y en CI».
 *
 * Lo que estos tests fijan es el **motor**, no las reglas: que el score se calcule, y sobre todo
 * que `SIN_DATOS` no se confunda con `CUMPLE`. Un catalogo que da verde sobre una base vacia miente
 * en la direccion comoda — la misma familia que el `catch` mudo de F-34.
 */
describe('El motor de reglas de dominio (PT-120)', () => {
  const v = (id: string, peso: number, veredicto: Veredicto) => ({ id, peso, veredicto });

  it('DR-01: todas cumplen -> rubric 100 y no falla', () => {
    const r = puntuar([v('CR-001', 20, 'CUMPLE'), v('CR-002', 80, 'CUMPLE')]);

    expect(r.rubric).toBe(100);
    expect(r.falla).toBe(false);
  });

  it('DR-02: una violada baja el score y hace fallar', () => {
    const r = puntuar([v('CR-001', 20, 'VIOLADA'), v('CR-002', 80, 'CUMPLE')]);

    expect(r.rubric).toBe(80);
    expect(r.falla).toBe(true);
    expect(r.violadas).toEqual(['CR-001']);
  });

  it('DR-03: una SIN_DATOS queda FUERA del denominador', () => {
    // No se puede puntuar lo que no se ha podido mirar. Contarla como cumplida inflaria el
    // numero; como violada, lo hundiria. Ninguna de las dos seria cierta.
    const r = puntuar([v('CR-001', 20, 'SIN_DATOS'), v('CR-002', 80, 'CUMPLE')]);

    expect(r.rubric).toBe(100);
    expect(r.falla).toBe(false);
    expect(r.sinDatos).toEqual(['CR-001']);
  });

  it('DR-04: todas SIN_DATOS -> rubric null, NUNCA 100', () => {
    // Este es el caso que distingue un catalogo honesto de uno decorativo.
    const r = puntuar([v('CR-001', 20, 'SIN_DATOS'), v('CR-002', 80, 'SIN_DATOS')]);

    expect(r.rubric).toBeNull();
    expect(r.falla).toBe(false);
    expect(r.motivo).toMatch(/sin datos/i);
  });

  it('DR-05: el score se redondea como manda la especificacion', () => {
    // rubric_compliance_score = round(100 x score / total)
    const r = puntuar([v('a', 1, 'CUMPLE'), v('b', 1, 'CUMPLE'), v('c', 1, 'VIOLADA')]);

    expect(r.rubric).toBe(67);
  });

  it('DR-06: sin reglas en absoluto -> null, y lo dice', () => {
    const r = puntuar([]);

    expect(r.rubric).toBeNull();
    expect(r.motivo).toMatch(/sin (datos|reglas)/i);
  });
});
