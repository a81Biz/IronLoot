import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * PT-137 (RULE-17) — Toda variable de entorno que el API lee esta declarada en un `.env.example`.
 *
 * El defecto que origina esta guarda: dos de los tres clientes de Redis leian `REDIS_HOST`/
 * `REDIS_PORT` con reserva `localhost`, mientras `docker-compose.yml` declaraba **solo**
 * `REDIS_URL`. Lo que hacia funcionar el contenedor de desarrollo era `REDIS_HOST=redis` dentro de
 * `src/api/.env`, **un fichero que no esta en git** (F-135-A).
 *
 * El sintoma no mencionaba Redis ni configuracion: decia `maxRetriesPerRequest`, que manda a mirar
 * reintentos. Es la familia de PT-111/F-39 —ADMIN apuntando a `localhost:6379` sin que nadie lo
 * notara— y la de H-016: **lo que hace funcionar el sistema no es lo que esta declarado.**
 *
 * PT-147 dio otra prueba de la misma familia: la imagen de ADMIN se quedo reintentando contra
 * `redis://redis:6379` —su reserva, escrita para la red de `docker-compose`— y nunca llego a
 * `healthy`.
 *
 * ## Una declaracion comentada CUENTA, y es deliberado
 *
 * `.env.example` documenta que una variable **existe** y que el sistema la lee. Comentarla es la
 * forma de decir «opcional, o depende de una integracion que no todo el mundo activa». Exigir que
 * este activa obligaria a inventar valores por defecto para credenciales de terceros, que es peor.
 *
 * Lo que la guarda impide es que una variable se lea **sin estar en ninguna parte**: ahi es donde
 * vive el defecto de que el sistema funcione por un fichero que nadie mas tiene.
 */
const RAIZ = join(__dirname, '..', '..', '..', '..', '..');
const SRC = join(RAIZ, 'src/api/src');

/** Los `.env.example` que declaran lo que el API puede leer. */
const EJEMPLOS = ['.env.example', 'src/api/.env.example'];

/**
 * Excepciones **declaradas**, con motivo. Son variables que **no** pone el operador: las inyecta la
 * plataforma o el propio ejecutor de pruebas, asi que documentarlas en un `.env.example` seria
 * pedirle a alguien que las escriba cuando no debe tocarlas.
 *
 * Como en la lista de RULE-22: **una excepcion sin motivo escrito hace fallar la prueba**. Una lista
 * sin razones se convierte en el cajon donde se aparcan los defectos.
 */
const EXCEPCIONES_DECLARADAS: { variable: string; motivo: string }[] = [
  { variable: 'NODE_ENV', motivo: 'La inyecta el entorno de ejecucion, no el operador.' },
  { variable: 'PORT', motivo: 'La inyecta la plataforma de despliegue o el `docker run`.' },
  { variable: 'CI', motivo: 'La inyecta GitHub Actions; nadie la escribe en un fichero.' },
  { variable: 'JEST_WORKER_ID', motivo: 'La inyecta Jest al repartir suites entre workers.' },
  { variable: 'TZ', motivo: 'Zona horaria del sistema; la fija la imagen o el host.' },
];

function ficherosTs(dir: string): string[] {
  const salida: string[] = [];
  for (const e of readdirSync(dir)) {
    const completa = join(dir, e);
    if (statSync(completa).isDirectory()) salida.push(...ficherosTs(completa));
    else if (e.endsWith('.ts') && !e.endsWith('.spec.ts')) salida.push(completa);
  }
  return salida;
}

/**
 * Las variables que un fichero lee, por cualquiera de las dos vias que usa el API.
 *
 * **Los comentarios se descartan primero.** Esta guarda se acuso a si misma en cuanto se escribio:
 * `redis-url.ts` explica el defecto citando `config.get('REDIS_HOST', 'localhost')` —para contar que
 * esa era la forma equivocada— y la guarda lo leyo como una lectura viva.
 *
 * Es la octava vez en esta tanda que le pasa a una guarda de este repositorio, y la leccion es
 * siempre la misma: **si documentar por que algo se retiro hace fallar la guarda, la forma de
 * tenerla en verde es no explicar nada.** Una guarda que penaliza escribir la razon acaba
 * produciendo ficheros sin razones.
 */
export function variablesLeidas(codigo: string): string[] {
  const sinComentarios = codigo.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');

  const directas = [...sinComentarios.matchAll(/process\.env\.([A-Z][A-Z0-9_]{2,})/g)].map(
    (m) => m[1],
  );
  const porConfig = [...sinComentarios.matchAll(/\.get(?:<[^>]*>)?\('([A-Z][A-Z0-9_]{2,})'/g)].map(
    (m) => m[1],
  );
  return [...new Set([...directas, ...porConfig])];
}

/** Las variables que un `.env.example` declara. **Comentada cuenta**: declara que existe. */
export function variablesDeclaradas(contenido: string): string[] {
  return [...new Set([...contenido.matchAll(/^\s*#?\s*([A-Z][A-Z0-9_]+)=/gm)].map((m) => m[1]))];
}

describe('Toda variable que el API lee esta declarada — RULE-17 (PT-137)', () => {
  const ficheros = ficherosTs(SRC);

  const declaradas = new Set(
    EJEMPLOS.filter((r) => existsSync(join(RAIZ, r))).flatMap((r) =>
      variablesDeclaradas(readFileSync(join(RAIZ, r), 'utf8')),
    ),
  );

  it('hay codigo y ejemplos que comparar', () => {
    // Si cualquiera de los dos estuviera vacio, la comparacion pasaria vacuamente.
    expect(ficheros.length).toBeGreaterThan(50);
    expect(declaradas.size).toBeGreaterThan(20);
  });

  it('toda excepcion declarada lleva su motivo', () => {
    for (const e of EXCEPCIONES_DECLARADAS) {
      expect(e.motivo.length).toBeGreaterThan(25);
    }
  });

  it('ninguna variable se lee sin estar declarada en ningun sitio', () => {
    const exentas = new Set(EXCEPCIONES_DECLARADAS.map((e) => e.variable));

    const sinDeclarar = [
      ...new Set(
        ficheros
          .flatMap((f) => variablesLeidas(readFileSync(f, 'utf8')))
          .filter((v) => !exentas.has(v)),
      ),
    ]
      .filter((v) => !declaradas.has(v))
      .sort();

    expect(sinDeclarar).toEqual([]);
  });

  describe('casos de control', () => {
    it('C1: `process.env.X` se detecta', () => {
      expect(variablesLeidas('const a = process.env.MI_VARIABLE;')).toEqual(['MI_VARIABLE']);
    });

    it('C2: `config.get(...)` tambien', () => {
      expect(variablesLeidas("config.get<string>('OTRA_VARIABLE')")).toEqual(['OTRA_VARIABLE']);
    });

    it('C3: una declaracion activa cuenta', () => {
      expect(variablesDeclaradas('MI_VARIABLE=valor')).toEqual(['MI_VARIABLE']);
    });

    it('C4: una declaracion COMENTADA tambien cuenta', () => {
      // Comentar es como se dice «opcional». Exigir que este activa obligaria a inventar valores
      // por defecto para credenciales de terceros, que seria peor que el problema.
      expect(variablesDeclaradas('# MI_VARIABLE=valor')).toEqual(['MI_VARIABLE']);
    });

    it('C5: una variable leida y NO declarada se acusa', () => {
      const leidas = variablesLeidas('process.env.NO_DECLARADA_JAMAS');
      const decl = new Set(variablesDeclaradas('OTRA=1'));

      expect(leidas.filter((v) => !decl.has(v))).toEqual(['NO_DECLARADA_JAMAS']);
    });

    it('C5b: una variable citada en un COMENTARIO no cuenta como lectura', () => {
      // Sin este caso, explicar por que `REDIS_HOST` se retiro haria fallar la guarda, y la unica
      // forma de tenerla en verde seria borrar la explicacion.
      const conComentario = [
        "// antes: config.get('REDIS_HOST', 'localhost') — esa era la forma equivocada",
        '/* y process.env.REDIS_PORT tampoco se usa ya */',
        "const url = config.get('REDIS_URL');",
      ].join('\n');

      expect(variablesLeidas(conComentario)).toEqual(['REDIS_URL']);
    });

    it('C6: un texto sin variables no inventa ninguna', () => {
      expect(variablesLeidas('const a = 1;')).toEqual([]);
      expect(variablesDeclaradas('# solo un comentario')).toEqual([]);
    });
  });
});
