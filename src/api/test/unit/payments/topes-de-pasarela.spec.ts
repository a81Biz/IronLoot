import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  GATEWAY_TIMEOUTS_MS,
  conSenalDeAborto,
} from '@/modules/payments/providers/gateway-timeouts';

/**
 * PT-184 (H-034) — **Toda llamada a una pasarela declara su tope.**
 *
 * Las seis llamadas de los tres adaptadores usaban `fetch` sin `signal` y sin `AbortController` en todo el
 * directorio. Es el patrón de H-033 en el camino del dinero, y salió del barrido que la recomendación de S-007
 * dejó escrita minutos antes: *«los candidatos siguientes son los otros terceros: la pasarela de pago, Redis,
 * el almacenamiento»*. El primero de la lista lo tenía.
 *
 * **Lo que este fichero comprueba y lo que no.** Comprueba que ninguna llamada del directorio se quede sin
 * tope y que los valores conserven la asimetría que el dominio pide. **No** comprueba que una llamada colgada
 * se corte de verdad contra una pasarela real: eso exigiría un tercero que cuelgue a voluntad. La ficha de
 * H-034 lo dice igual de claro — a diferencia de H-033, donde los 121 s **se midieron**, aquí el defecto está
 * comprobado por código.
 */
describe('Las llamadas a las pasarelas declaran su tope — H-034 (PT-184)', () => {
  const DIR = join(__dirname, '..', '..', '..', 'src', 'modules', 'payments', 'providers');
  const PROVEEDORES = readdirSync(DIR).filter(
    (f) => f.endsWith('.provider.ts') && !f.endsWith('.spec.ts'),
  );

  /**
   * Texto de la llamada `fetch(...)` que empieza en `desde`, cerrando por paréntesis balanceados.
   *
   * Se cuenta el balance en vez de buscar un cierre por indentación —lo que hacía la primera versión— porque
   * los cuerpos de estas llamadas son largos: el de `POST /payments` de HeyBanco pasa de 500 caracteres, así
   * que la ventana fija cortaba **antes** de llegar al `signal` y el caso acusaba una llamada ya corregida. Un
   * falso positivo enseña a desconfiar de la guarda, que es la manera silenciosa de perderla.
   */
  function textoDeLaLlamada(fuente: string, desde: number): string {
    let nivel = 0;

    for (let i = fuente.indexOf('(', desde); i < fuente.length; i++) {
      if (fuente[i] === '(') nivel++;
      else if (fuente[i] === ')') {
        nivel--;
        if (nivel === 0) return fuente.slice(desde, i + 1);
      }
    }

    return fuente.slice(desde);
  }

  it('C1: ningún `fetch` del directorio se queda sin señal de aborto', () => {
    // Se recorre el directorio entero y no una lista escrita a mano: un adaptador nuevo tiene que caer dentro
    // de esta comprobación sin que nadie se acuerde de añadirlo. Es la lección de RULE-32.
    const sinTope: string[] = [];

    for (const f of PROVEEDORES) {
      const fuente = readFileSync(join(DIR, f), 'utf-8');

      for (const m of fuente.matchAll(/\bfetch\(/g)) {
        const llamada = textoDeLaLlamada(fuente, m.index ?? 0);

        if (!/\bsignal\b/.test(llamada)) {
          sinTope.push(`${f}:${fuente.slice(0, m.index).split('\n').length}`);
        }
      }
    }

    expect(sinTope).toEqual([]);
  });

  it('C2: hay un `conSenalDeAborto` por cada `fetch`, en los tres proveedores', () => {
    // Tres `AbortController` escritos a mano serían tres oportunidades de olvidar el `clearTimeout`, y un
    // temporizador sin limpiar mantiene el bucle de eventos despierto. El helper lo hace en un `finally`.
    //
    // **Se cuentan, no se busca la palabra.** La primera versión sólo exigía que el fichero *contuviera*
    // `conSenalDeAborto`, y con eso bastaba la línea del `import`: al devolver una llamada a su forma sin tope,
    // el caso seguía verde. Se vio pasar con el defecto puesto antes de contarlo así.
    const conFetch = PROVEEDORES.filter((f) =>
      /\bfetch\(/.test(readFileSync(join(DIR, f), 'utf-8')),
    );

    expect(conFetch.length).toBeGreaterThan(0);

    for (const f of conFetch) {
      const fuente = readFileSync(join(DIR, f), 'utf-8');
      const llamadas = [...fuente.matchAll(/\bfetch\(/g)].length;
      const envueltas = [...fuente.matchAll(/conSenalDeAborto\(/g)].length;

      expect(envueltas).toBe(llamadas);
    }
  });

  it('C3: consultar corta antes que crear o capturar — la asimetría es del dominio', () => {
    // Consultar el estado de un pago puede cortarse pronto: el proceso periódico volverá. **Crear o capturar**
    // no, porque abandonar una operación que quizá se completó al otro lado es peor que esperar algo más. Es el
    // mismo razonamiento que hizo `socketTimeout` mayor que `connectionTimeout` en H-033.
    expect(GATEWAY_TIMEOUTS_MS.consulta).toBeLessThan(GATEWAY_TIMEOUTS_MS.operacion);
  });

  it('C4: ningún tope llega al minuto', () => {
    // Dos minutos fue el valor de fábrica que produjo H-033. Cualquier tope que se le acerque reproduce el
    // problema con otro número.
    for (const ms of Object.values(GATEWAY_TIMEOUTS_MS)) {
      expect(ms).toBeGreaterThan(0);
      expect(ms).toBeLessThan(60_000);
    }
  });

  describe('casos de control', () => {
    it('AC-01: el helper corta de verdad cuando el tercero no responde', async () => {
      // Lo único de este fichero que se ejecuta en vez de leerse. Una promesa que nunca resuelve es el tercero
      // colgado; si el helper no cortara, este caso se quedaría en el tope de Jest.
      const nuncaResponde = (senal: AbortSignal) =>
        new Promise<string>((_, rechaza) => {
          senal.addEventListener('abort', () => rechaza(new Error('abortado')));
        });

      await expect(conSenalDeAborto(50, nuncaResponde)).rejects.toThrow('abortado');
    });

    it('AC-02: una llamada que responde a tiempo pasa sin tocarla', async () => {
      const responde = async () => 'ok';

      await expect(conSenalDeAborto(5_000, responde)).resolves.toBe('ok');
    });

    it('AC-03: el temporizador se limpia también en el camino feliz', async () => {
      // Un `setTimeout` sin limpiar mantiene el bucle de eventos despierto: el proceso no termina, y en una
      // suite eso aparece como «Jest did not exit» — un fallo que se atribuye a cualquier otra cosa.
      jest.useFakeTimers();
      await conSenalDeAborto(5_000, async () => 'ok');
      const restantes = jest.getTimerCount();
      jest.useRealTimers();

      expect(restantes).toBe(0);
    });
  });
});
