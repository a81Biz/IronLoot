import { checkPublicDomain } from '../../../src/common/config/public-domain-check';

/**
 * PT-095 (TD-011) — Un checkout limpio no debe fallar en silencio.
 *
 * El dominio de desarrollo es `ironloot.local` porque los navegadores **rechazan** una cookie con
 * `Domain=.localhost` (dominio de uso especial, RFC 6265) y la sesión no cruzaría de BASE a
 * CLIENT. El precio es que hace falta añadir cinco líneas al fichero hosts del sistema.
 *
 * Está documentado en README, `.env.example` y CLAUDE.md, pero es un paso **manual y silencioso**:
 * quien lo omita verá un login que «funciona» y un portal que lo trata como anónimo, sin ningún
 * mensaje que lo explique. Esta comprobación convierte ese desconcierto en un aviso al arrancar.
 */
describe('Comprobación del dominio público (PT-095)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('D-01: si el dominio resuelve, no avisa de nada', async () => {
    const resolver = jest.fn().mockResolvedValue(['127.0.0.1']);

    const avisos = await checkPublicDomain('ironloot.local', 'development', resolver);

    expect(avisos).toEqual([]);
  });

  it('D-02: si NO resuelve, avisa y dice exactamente qué añadir', async () => {
    // El aviso tiene que ser accionable: quien lo lee está a punto de perder una hora.
    const resolver = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));

    const avisos = await checkPublicDomain('ironloot.local', 'development', resolver);

    expect(avisos.length).toBeGreaterThan(0);
    const texto = avisos.join(' ');
    expect(texto).toContain('hosts');
    expect(texto).toContain('base.ironloot.local');
    expect(texto).toContain('client.ironloot.local');
  });

  it('D-03: comprueba los subdominios que la sesión necesita, no solo el dominio raíz', async () => {
    // Que resuelva `ironloot.local` no significa que resuelvan `base.` y `client.`, y son esos
    // los que la sesión cruza.
    const resolver = jest.fn().mockResolvedValue(['127.0.0.1']);

    await checkPublicDomain('ironloot.local', 'development', resolver);

    const consultados = resolver.mock.calls.map((c) => c[0]);
    expect(consultados).toEqual(
      expect.arrayContaining(['base.ironloot.local', 'client.ironloot.local']),
    );
  });

  it('D-04: con un dominio real de producción no se comprueba nada', async () => {
    // En producción el DNS es de verdad y esta comprobación no aporta: si el dominio no
    // resolviera, el problema sería mucho más visible que un aviso en el arranque.
    const resolver = jest.fn();

    const avisos = await checkPublicDomain('ironloot.com', 'production', resolver);

    expect(avisos).toEqual([]);
    expect(resolver).not.toHaveBeenCalled();
  });

  it('D-05: NUNCA aborta el arranque — solo avisa', async () => {
    // Un dominio que no resuelve es un problema del entorno de quien desarrolla, no del código.
    // Abortar por eso impediría, por ejemplo, correr los tests de integración.
    const resolver = jest.fn().mockRejectedValue(new Error('ENOTFOUND'));

    await expect(
      checkPublicDomain('ironloot.local', 'development', resolver),
    ).resolves.toBeInstanceOf(Array);
  });

  it('D-06: un fallo de la propia resolución no rompe el arranque', async () => {
    const resolver = jest.fn().mockImplementation(() => {
      throw new Error('el resolutor exploto');
    });

    await expect(
      checkPublicDomain('ironloot.local', 'development', resolver),
    ).resolves.toBeDefined();
  });
});
