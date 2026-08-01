import { readFileSync } from 'fs';
import { join } from 'path';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-211 (R-040 · H-UI-033, H-UI-034) — **El contraste se calcula, no se opina.**
 *
 * La auditoría midió dos incumplimientos de WCAG 2.1 AA sobre el texto que más importa:
 *
 *   - **el precio actual** —el dato central del producto— en oro `#C89B3C` sobre tarjeta blanca:
 *     **2,56:1**. AA exige 4,5:1 para texto normal y **3:1 incluso para texto grande**, así que
 *     `.price-value` (2 rem / 700) también falla;
 *   - **el cuerpo de los términos y la privacidad** en `#6B7280` sobre el fondo de página `#F6F6F6`:
 *     **4,47:1**, por debajo del 4,5 exigido. Incumplimiento marginal, sobre el contenido menos
 *     negociable que publica el producto.
 *
 * ## Por qué una guarda que calcula y no un valor «revisado a ojo»
 *
 * El contraste es una función de dos colores: se computa. Una revisión visual da opiniones y no detecta
 * que alguien oscurezca un fondo o aclare un token dentro de seis meses. Esta guarda vuelve a fallar el
 * día que ocurra, y dice el número.
 *
 * ## Lo que NO se cambia, y por qué importa
 *
 * `--cl-gold` (`#C89B3C`) **se conserva** para bordes, fondos, iconos y texto sobre oscuro, donde su
 * contraste es holgado. Lo que se añade es `--cl-gold-texto`, una variante para texto sobre claro. La
 * identidad de marca de `docs/design/Modo_Luz.md` —Gold como secundario, «valor y jerarquía»— queda
 * intacta: lo que estaba mal no era el color, era usarlo para texto sobre blanco.
 */
const RAIZ = raizDelMonorepo();

/** Luminancia relativa de un `#rrggbb`, según la fórmula de WCAG 2.1. */
export function luminancia(hex: string): number {
  const limpio = hex.replace('#', '');
  const canal = (i: number): number => {
    const c = parseInt(limpio.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(0) + 0.7152 * canal(2) + 0.0722 * canal(4);
}

/** Razón de contraste entre dos colores. Simétrica: el orden no importa. */
export function contraste(a: string, b: string): number {
  const [alta, baja] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alta + 0.05) / (baja + 0.05);
}

/** El valor de una variable CSS (`--nombre: #xxxxxx;`) declarada en una hoja. */
export function tokenDeCss(css: string, nombre: string): string | null {
  const m = css.match(new RegExp(`${nombre}\\s*:\\s*(#[0-9A-Fa-f]{6})`));
  return m ? m[1] : null;
}

interface Par {
  sitio: 'BASE' | 'CLIENT';
  que: string;
  token: string;
  fondo: string;
  /** 4.5 para texto normal · 3 para texto grande (≥ 24px, o ≥ 18.66px en negrita). */
  minimo: number;
}

/**
 * Los pares que se comprueban, declarados uno a uno.
 *
 * Se declaran en vez de deducirse recorriendo el CSS: resolver qué fondo hereda cada selector exige un
 * motor de cascada, y una guarda que lo aproximara daría falsos positivos — que es como una guarda acaba
 * borrada (PT-103). La contrapartida es que **esta lista es su límite**, exactamente como la de
 * `conexiones-sin-reserva.spec.ts`; se dice aquí porque esa debilidad ya mordió dos veces (E-038, PT-233).
 */
const PARES: Par[] = [
  // El precio, en tarjeta blanca y en el panel de puja. `--cl-surface` es #FFFFFF.
  {
    sitio: 'BASE',
    que: '.current-price (tarjeta de subasta)',
    token: '--cl-gold-texto',
    fondo: '#FFFFFF',
    minimo: 3,
  },
  {
    sitio: 'BASE',
    que: '.price-value (panel de puja)',
    token: '--cl-gold-texto',
    fondo: '#FFFFFF',
    minimo: 3,
  },
  // Enlace de sección: texto pequeño, umbral de texto normal.
  { sitio: 'BASE', que: '.section-link', token: '--cl-gold-texto', fondo: '#FFFFFF', minimo: 4.5 },
  // La prosa de términos y privacidad va sobre el fondo de página, no sobre tarjeta.
  {
    sitio: 'BASE',
    que: '.prose p (términos y privacidad)',
    token: '--cl-text-muted',
    fondo: '#F6F6F6',
    minimo: 4.5,
  },
  {
    sitio: 'CLIENT',
    que: '.text-muted (notas y estados vacíos)',
    token: '--cl-text-muted',
    fondo: '#FFFFFF',
    minimo: 4.5,
  },
];

const CSS: Record<'BASE' | 'CLIENT', string> = {
  BASE: readFileSync(join(RAIZ, 'src/apps/base/public/css/base.css'), 'utf8'),
  CLIENT: readFileSync(join(RAIZ, 'src/apps/client/public/css/client.css'), 'utf8'),
};

describe('Contraste de texto — WCAG 2.1 AA (PT-211)', () => {
  it.each(PARES.map((p) => [`${p.sitio} ${p.que}`, p] as const))(
    '%s cumple el mínimo',
    (_titulo, par) => {
      const color = tokenDeCss(CSS[par.sitio], par.token);
      expect(color).not.toBeNull();

      const ratio = contraste(color as string, par.fondo);
      // El mensaje lleva el número: un fallo que no dice cuánto obliga a recalcularlo a mano.
      expect({ par: par.que, ratio: Math.round(ratio * 100) / 100 }).toEqual({
        par: par.que,
        ratio: expect.any(Number),
      });
      expect(ratio).toBeGreaterThanOrEqual(par.minimo);
    },
  );

  describe('casos de control — los números de la auditoría, reproducidos', () => {
    it('C1: el oro decorativo sobre blanco da 2,56:1 — el defecto de H-UI-033', () => {
      expect(Math.round(contraste('#C89B3C', '#FFFFFF') * 100) / 100).toBe(2.56);
      expect(contraste('#C89B3C', '#FFFFFF')).toBeLessThan(3);
    });

    it('C2: `--cl-gold-dark` tampoco bastaba (3,53:1 < 4,5)', () => {
      expect(contraste('#a8832e', '#FFFFFF')).toBeLessThan(4.5);
    });

    it('C3: el gris anterior sobre el fondo de página daba 4,47:1 — el defecto de H-UI-034', () => {
      expect(Math.round(contraste('#6B7280', '#F6F6F6') * 100) / 100).toBe(4.47);
      expect(contraste('#6B7280', '#F6F6F6')).toBeLessThan(4.5);
    });

    it('C4: negro sobre blanco da 21:1 y blanco sobre blanco 1:1 — la fórmula es correcta', () => {
      expect(Math.round(contraste('#000000', '#FFFFFF'))).toBe(21);
      expect(contraste('#FFFFFF', '#FFFFFF')).toBe(1);
    });
  });

  it('el oro decorativo se conserva para su uso legítimo sobre oscuro', () => {
    const oro = tokenDeCss(CSS.BASE, '--cl-gold');
    expect(oro).toBe('#C89B3C');
    // Sobre Iron Black, el mismo color es holgadamente legible: no había que cambiarlo, sino dejar de
    // usarlo para texto sobre claro.
    expect(contraste('#C89B3C', '#151515')).toBeGreaterThanOrEqual(4.5);
  });
});
