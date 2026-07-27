import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

/**
 * PT-098 (F-25) — Ninguna plantilla puede incrustar una dirección de la API.
 *
 * La puja en vivo estuvo rota porque `detail.html` abría el WebSocket contra
 * `http://api:3000`, la dirección **interna de Docker** que CLIENT recibe por `API_URL`. El
 * navegador no puede resolverla, socket.io reintenta solo y el fallo es silencioso: la página
 * parece viva porque la cuenta atrás corre en local.
 *
 * La corrección no fue cambiar esa dirección por otra: fue **quitarla**. Una conexión relativa al
 * propio origen no puede apuntar mal, y el proxy de CLIENT la reenvía a la API. Este test fija esa
 * decisión: añadir una plantilla que vuelva a incrustar un origen absoluto rompe la suite.
 *
 * Es la misma clase que F-17 y F-21 —una dirección interna o con puerto escapando a algo que sale
 * del sistema— y ya se persiguió tres veces. Aquí queda cerrada por construcción.
 */
describe('Las plantillas no incrustan direcciones de la API (PT-098)', () => {
  const RAIZ = join(__dirname, '..', 'views');

  /** Todas las plantillas, a cualquier profundidad. */
  function plantillas(dir: string): string[] {
    return readdirSync(dir).flatMap((entrada) => {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) return plantillas(ruta);
      return ruta.endsWith('.html') ? [ruta] : [];
    });
  }

  const ficheros = plantillas(RAIZ);

  it('hay plantillas que revisar (si no, el test no probaría nada)', () => {
    expect(ficheros.length).toBeGreaterThan(5);
  });

  it.each(ficheros.map((f) => [f.replace(RAIZ, 'views'), f]))(
    '%s no incrusta un host interno de Docker',
    (_nombre, ruta) => {
      const contenido = readFileSync(ruta, 'utf8');
      // `http://api:3000` y variantes: el nombre de servicio del compose no existe para un navegador.
      expect(contenido).not.toMatch(/https?:\/\/api:\d+/);
      expect(contenido).not.toMatch(/wss?:\/\/api:\d+/);
    },
  );

  it.each(ficheros.map((f) => [f.replace(RAIZ, 'views'), f]))(
    '%s no incrusta un localhost con puerto',
    (_nombre, ruta) => {
      const contenido = readFileSync(ruta, 'utf8');
      expect(contenido).not.toMatch(/https?:\/\/localhost:\d+/);
    },
  );

  it('ninguna plantilla declara ya la constante `API` a partir de `apiUrl`', () => {
    // Se declaraba en 9 plantillas y se usaba en 1. Una variable que no se usa pero se imprime en
    // el HTML es una filtración de topología interna sin contrapartida.
    const conApiUrl = ficheros.filter((f) => /\{\{\s*apiUrl\s*\}\}/.test(readFileSync(f, 'utf8')));
    expect(conApiUrl.map((f) => f.replace(RAIZ, 'views'))).toEqual([]);
  });

  it('la puja en vivo conecta al propio origen, no a un host externo', () => {
    const detalle = readFileSync(join(RAIZ, 'pages', 'auction', 'detail.html'), 'utf8');
    // `io('/auctions')` — relativo. `io(API + '/auctions')` o `io('http://…')` — no.
    expect(detalle).toMatch(/io\(\s*['"]\/auctions['"]/);
    expect(detalle).not.toMatch(/io\(\s*API/);
  });
});
