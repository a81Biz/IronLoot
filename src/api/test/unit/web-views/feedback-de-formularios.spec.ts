import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-228 (R-043 · H-UI-046, H-UI-047) — **El sistema tiene que decir lo que pasa.**
 *
 * Dos defectos que comparten causa: la interfaz ejecuta una acción y no informa de su resultado.
 *
 * **1. Ningún formulario bloqueaba su botón durante el envío** —salvo uno—. Sin bloqueo, un doble clic
 * en «Depositar» o en «Solicitar retiro» dispara **dos movimientos de dinero**. Y el estándar existía
 * dentro del propio repositorio: `pages-orders-detail.js` (PT-174) hace `boton.disabled = true` y
 * pregunta con `window.confirm` antes de una acción con consecuencia económica. Se aplicaba en **uno de
 * doce** ficheros.
 *
 * **2. Ningún contenedor de mensaje declaraba una región viva.** Se rellenan por JavaScript y se
 * muestran quitando una clase: para una tecnología asistiva, **no pasa nada**. El usuario que no ve la
 * pantalla no puede saber si su puja se aceptó, si el depósito falló o si el retiro se registró.
 *
 * Es la dimensión D3 —observabilidad— aplicada a la interfaz: un mensaje que nadie puede percibir es el
 * equivalente en pantalla de un `catch` mudo.
 *
 * ## Lo que esta guarda comprueba, y lo que no
 *
 * Comprueba **dos hechos verificables**: que todo contenedor de mensaje declare `aria-live`, y que todo
 * fichero de página que envíe un formulario deshabilite su botón. No juzga la redacción de los mensajes
 * —eso sería una guarda que lee prosa, y este repositorio ya sabe cómo acaba eso.
 */
const RAIZ = raizDelMonorepo();

interface Sitio {
  nombre: string;
  vistas: string;
  js: string;
}

const SITIOS: Sitio[] = [
  {
    nombre: 'CLIENT',
    vistas: join(RAIZ, 'src/apps/client/views'),
    js: join(RAIZ, 'src/apps/client/public/js/pages'),
  },
  {
    nombre: 'BASE',
    vistas: join(RAIZ, 'src/apps/base/views'),
    js: join(RAIZ, 'src/apps/base/public/js/pages'),
  },
];

/** Contenedores de mensaje: `id="algoMsg"` o `id="algoError"`. */
export function contenedoresDeMensaje(html: string): { tag: string; vivo: boolean }[] {
  return [...html.matchAll(/<div[^>]*id="[a-zA-Z]*(?:Msg|Error)"[^>]*>/g)].map((m) => ({
    tag: m[0],
    vivo: /aria-live=/.test(m[0]),
  }));
}

/**
 * Un fichero que envía algo **a raíz de una acción del usuario**.
 *
 * Las dos condiciones hacen falta. Un `fetch` con `POST` que se dispara **al cargar la página** —como la
 * verificación de correo, que consume el token de la URL— no tiene botón que bloquear: nadie puede hacer
 * doble clic sobre él. Exigirle el bloqueo sería un falso positivo, y una guarda con falsos positivos
 * acaba borrada con todo lo que protege (PT-103).
 *
 * Lo que se mide es el riesgo real: **una acción del usuario que puede repetirse**.
 */
export function envia(fuente: string): boolean {
  const escribe = /method:\s*['"`](POST|PATCH|PUT|DELETE)['"`]/.test(fuente);
  const porAccion = /addEventListener\(\s*['"`](submit|click)['"`]/.test(fuente);
  return escribe && porAccion;
}

/** ¿Bloquea el control mientras la petición está en vuelo? */
export function bloquea(fuente: string): boolean {
  return /\.disabled\s*=\s*true/.test(fuente);
}

function ficheros(dir: string, ext: string, prefijo = ''): { nombre: string; contenido: string }[] {
  const out: { nombre: string; contenido: string }[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...ficheros(join(dir, e.name), ext, `${prefijo}${e.name}/`));
    else if (e.name.endsWith(ext))
      out.push({
        nombre: `${prefijo}${e.name}`,
        contenido: readFileSync(join(dir, e.name), 'utf8'),
      });
  }
  return out;
}

describe('La interfaz dice lo que pasa — PT-228', () => {
  it.each(SITIOS.map((s) => [s.nombre, s] as const))(
    '%s: todo contenedor de mensaje es una región viva',
    (nombreSitio, sitio) => {
      const vistas = ficheros(sitio.vistas, '.html');
      expect(vistas.length).toBeGreaterThan(10);

      const mudos: string[] = [];
      let contados = 0;

      for (const { nombre, contenido } of vistas) {
        for (const c of contenedoresDeMensaje(contenido)) {
          contados++;
          if (!c.vivo) mudos.push(`${nombreSitio} ${nombre}: ${c.tag}`);
        }
      }

      // Sin esto, una guarda que no encuentre ningún contenedor sale en verde sin haber medido nada.
      expect(contados).toBeGreaterThan(3);
      expect(mudos).toEqual([]);
    },
  );

  it.each(SITIOS.map((s) => [s.nombre, s] as const))(
    '%s: todo script que envía un formulario bloquea su botón',
    (nombreSitio, sitio) => {
      const scripts = ficheros(sitio.js, '.js');
      expect(scripts.length).toBeGreaterThan(2);

      const sinBloqueo: string[] = [];
      let conEnvio = 0;

      for (const { nombre, contenido } of scripts) {
        if (!envia(contenido)) continue;
        conEnvio++;
        if (!bloquea(contenido)) {
          sinBloqueo.push(
            `${nombreSitio}/${nombre}: envía sin deshabilitar el botón — un doble clic dispara dos veces`,
          );
        }
      }

      expect(conEnvio).toBeGreaterThan(2);
      expect(sinBloqueo).toEqual([]);
    },
  );

  describe('casos de control', () => {
    it('C1: detecta un contenedor mudo', () => {
      const [c] = contenedoresDeMensaje('<div id="bidMsg" class="alert oculto"></div>');
      expect(c.vivo).toBe(false);
    });

    it('C2: NO acusa a uno que sí declara la región', () => {
      const [c] = contenedoresDeMensaje(
        '<div id="bidMsg" class="alert" role="status" aria-live="polite"></div>',
      );
      expect(c.vivo).toBe(true);
    });

    it('C3: distingue un script que envía por acción del usuario de uno que sólo lee', () => {
      expect(envia("addEventListener('submit', () => fetch('/x', { method: 'POST' }))")).toBe(true);
      expect(envia("addEventListener('submit', () => fetch('/x'))")).toBe(false);
    });

    it('C4bis: NO acusa a un envío automático al cargar la página', () => {
      // La verificación de correo consume el token de la URL nada más cargar: no hay botón que
      // bloquear ni doble clic posible.
      expect(envia("fetch('/api/v1/auth/verify-email', { method: 'POST' })")).toBe(false);
    });

    it('C4: detecta la ausencia de bloqueo', () => {
      expect(bloquea('boton.disabled = true;')).toBe(true);
      expect(bloquea("const res = await fetch('/x', { method: 'POST' });")).toBe(false);
    });
  });
});
