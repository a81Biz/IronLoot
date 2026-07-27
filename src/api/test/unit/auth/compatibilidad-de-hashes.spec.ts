import * as bcrypt from 'bcrypt';

/**
 * PT-125 — Que subir bcrypt no deje a todos los usuarios fuera.
 *
 * Es el unico riesgo grave de la subida 5->6, y no se puede comprobar leyendo el changelog: hay que
 * verificar un hash **hecho por la version vieja** contra la nueva.
 *
 * El fixture de abajo se genero con **bcrypt 5.1.1** el 2026-07-27, antes de tocar `package.json`.
 * No es un hash de ningun usuario real: es una contraseña de prueba hasheada a proposito para esto.
 *
 * ## Por que se queda para siempre
 *
 * No es una prueba de la migracion, es una prueba de **compatibilidad hacia atras del formato**. La
 * proxima vez que alguien suba bcrypt —o lo cambie por otra cosa— esta prueba es la que le dira, en
 * segundos, si la base de usuarios sobrevive. Borrarla al terminar PT-125 seria tirar justo lo que
 * costo escribir.
 */
describe('Compatibilidad de hashes entre versiones de bcrypt (PT-125)', () => {
  /**
   * Generado por bcrypt 5.1.1 — `hashSync('Prueba1234!', 10)`. Congelado a proposito.
   *
   * El coste es 10 y **la aplicacion usa `saltRounds` (12)**. Da igual para lo que se comprueba
   * aqui: el coste va escrito dentro del propio hash y `compare` lo lee de ahi; lo que se verifica
   * es que el formato `$2b$` cruza de version. La conducta con el coste real se verifico contra el
   * API en ejecucion (evidencia de PT-125), con un usuario cuyo hash lo escribio bcrypt 5.
   */
  const HASH_DE_BCRYPT_5 = '$2b$10$jbvvVF61OsLbjUuTSx.vGORmeZRvTDhVbcFDrLcwMbIr9m17K6MfC';
  const CLAVE = 'Prueba1234!';

  it('CH-01: un hash creado por bcrypt 5 valida con la version instalada hoy', async () => {
    // Si esto falla, NADIE puede entrar. Es la prueba que decide si la subida se queda.
    await expect(bcrypt.compare(CLAVE, HASH_DE_BCRYPT_5)).resolves.toBe(true);
  });

  it('CH-02: y sigue rechazando la contraseña equivocada', async () => {
    // Sin esto, un `compare` que devolviera `true` siempre pasaria CH-01 con nota.
    await expect(bcrypt.compare('otra-cosa', HASH_DE_BCRYPT_5)).resolves.toBe(false);
  });

  it('CH-03: el prefijo del formato sigue siendo $2b$ con 10 rondas', async () => {
    // Un cambio silencioso de coste o de variante se veria aqui antes que en produccion.
    const nuevo = await bcrypt.hash(CLAVE, 10);

    expect(nuevo.slice(0, 7)).toBe('$2b$10$');
    expect(nuevo.slice(0, 7)).toBe(HASH_DE_BCRYPT_5.slice(0, 7));
  });

  it('CH-04: un hash nuevo valida con la misma llamada que usa el login', async () => {
    const nuevo = await bcrypt.hash(CLAVE, 10);

    await expect(bcrypt.compare(CLAVE, nuevo)).resolves.toBe(true);
    await expect(bcrypt.compare(CLAVE.toLowerCase(), nuevo)).resolves.toBe(false);
  });
});
