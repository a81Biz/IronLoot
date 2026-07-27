import { baseOrigin, clientOrigin, apiOrigin } from '../../../src/common/config/public-origins';

/**
 * PT-089 — Ninguna URL que abandone el sistema puede caer en un `localhost:<puerto>`.
 *
 * PT-088 lo resolvió para las URLs de retorno de pago. Quedaban tres sitios con el mismo
 * defecto, y el peor eran los enlaces de **verificación de correo y reset de contraseña**: se
 * envían a usuarios reales, y sin `BASE_URL` apuntaban a `localhost:5174`.
 *
 * Un valor de reserva con puerto no falla al arrancar: falla en producción, en silencio, cuando
 * alguien ya recibió el correo.
 */
describe('Orígenes públicos (PT-089)', () => {
  const ORIGINAL_ENV = { ...process.env };

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const casos = [
    {
      nombre: 'baseOrigin',
      fn: baseOrigin,
      env: 'BASE_URL',
      reserva: 'http://base.ironloot.local',
    },
    {
      nombre: 'clientOrigin',
      fn: clientOrigin,
      env: 'CLIENT_URL',
      reserva: 'http://client.ironloot.local',
    },
    {
      nombre: 'apiOrigin',
      fn: apiOrigin,
      env: 'API_BASE_URL',
      reserva: 'http://api.ironloot.local',
    },
  ];

  it.each(casos)('$nombre usa su variable de entorno', ({ fn, env }) => {
    process.env[env] = 'https://algo.ironloot.com';
    expect(fn()).toBe('https://algo.ironloot.com');
  });

  it.each(casos)(
    '$nombre sin configurar cae en el subdominio, NUNCA en un puerto',
    ({ fn, env, reserva }) => {
      delete process.env[env];
      expect(fn()).toBe(reserva);
      expect(fn()).not.toMatch(/localhost/);
      expect(fn()).not.toMatch(/:\d{4}/);
    },
  );

  it.each(casos)('$nombre descarta la barra final', ({ fn, env }) => {
    process.env[env] = 'https://algo.ironloot.com/';
    expect(fn()).toBe('https://algo.ironloot.com');
  });

  it.each(casos)('$nombre acepta un valor inyectado por ConfigService', ({ fn, env }) => {
    // Los servicios que usan `ConfigService` pasan el valor ya resuelto; debe ganar al entorno.
    process.env[env] = 'https://del-entorno.example';
    expect(fn('https://inyectado.example')).toBe('https://inyectado.example');
  });

  it('un valor vacío no se toma por bueno: cae en la reserva', () => {
    // `BASE_URL=` en un .env produce cadena vacía, que es indistinguible de «sin configurar»
    // para lo que aquí importa — y peor, generaría URLs que empiezan por `/`.
    process.env.BASE_URL = '   ';
    expect(baseOrigin()).toBe('http://base.ironloot.local');
  });

  it('los tres orígenes son distintos entre sí por defecto', () => {
    delete process.env.BASE_URL;
    delete process.env.CLIENT_URL;
    delete process.env.API_BASE_URL;
    expect(new Set([baseOrigin(), clientOrigin(), apiOrigin()]).size).toBe(3);
  });
});
