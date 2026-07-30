import { variableObligatoria } from "../config/variable-obligatoria";

/**
 * PT-194 (`TD-025`) — **El único sitio del CLIENT que llama a `/auth/refresh`.**
 *
 * ## Por qué existe este módulo y no dos llamadas sueltas
 *
 * Hay **dos** llamantes: el `ClientAuthGuard` (navegación de página) y el proxy BFF (llamadas del
 * navegador). Si cada uno construyera su propia llamada, la deduplicación de peticiones concurrentes
 * sería imposible y la ruta estaría escrita dos veces. Es la forma de `PT-173` y `AUD-011`: *dos
 * puertas a lo mismo y sólo una con cerradura*.
 *
 * ## Los tres desenlaces, y por qué dos de ellos no se pueden colapsar
 *
 * | Devuelve | Significa | Qué hace el llamante |
 * |---|---|---|
 * | `Tokens` | la sesión sigue viva | seguir, con el token nuevo |
 * | `null` | **la sesión murió** — revocada, expirada, usuario suspendido. El API lo dijo | al login |
 * | *lanza* | **no se pudo preguntar** — el API no contestó o tardó de más | al login |
 *
 * Los dos últimos llevan al mismo sitio, y **aun así no son lo mismo**. Colapsarlos en `null` sería el
 * `catch` mudo que persigue el checkpoint D3: dentro de un mes, *«los usuarios se salen»* sería
 * indistinguible de *«el API está caído»*, y se buscaría en el sitio equivocado.
 *
 * ## La deduplicación, y hasta dónde llega
 *
 * Una carga de página dispara varias llamadas a la vez. Con el token expirado, **todas** querrían
 * refrescar. `enVuelo` hace que compartan la primera: cinco llamadas → **una** al API.
 *
 * **La clave es el refresh token, no el usuario.** Alguien puede tener sesión en el móvil y en el
 * escritorio: son independientes, y agruparlas por usuario haría que una revocada arrastrara a la otra.
 *
 * **El alcance es este proceso.** Con varias instancias del CLIENT, cada una deduplica la suya: el peor
 * caso son N llamadas en lugar de N×M. Es **inocuo porque el endpoint no rota el refresh token** —
 * ninguna llamada invalida a las demás. Compartirlo entre instancias exigiría Redis y un cerrojo
 * distribuido **en el camino de la sesión** para ahorrar como mucho una llamada.
 *
 * > **Cuándo deja de valer esto**: el día que se rote el refresh token, dos refrescos simultáneos **sí**
 * > se invalidarían y haría falta estado compartido. Queda escrito aquí para que quien implemente la
 * > rotación lo encuentre — es la decisión `D-2` de `changes/PT-194-refresco-de-sesion/design.md`.
 */
export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * **Refrescar es consultar.** Si se corta, no queda nada a medias: la sesión en la base de datos sigue
 * intacta y el usuario va al login. Por eso hereda el tope corto de `GATEWAY_TIMEOUTS_MS.consulta`
 * (PT-183/PT-184) y no el largo de «crear o capturar», donde abandonar algo que quizá se completó al
 * otro lado deja un cobro sin saber qué pasó.
 *
 * El valor **se deriva** de esa asimetría, no se elige por parecer razonable.
 */
export const TOPE_REFRESCO_MS = 8_000;

/** Refrescos en curso, por refresh token. Se vacía en `finally`: se comparte la llamada, no su resultado. */
const enVuelo = new Map<string, Promise<Tokens | null>>();

/** Sólo para pruebas: deja el módulo sin estado entre casos. */
export function __limpiarEnVuelo(): void {
  enVuelo.clear();
}

async function pedirAlApi(
  refreshToken: string,
  topeMs: number,
): Promise<Tokens | null> {
  const apiUrl = variableObligatoria("API_URL");
  const controlador = new AbortController();
  const reloj = setTimeout(() => controlador.abort(), topeMs);

  try {
    const res = await fetch(`${apiUrl}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      signal: controlador.signal,
    });

    // 401 y 403 son **la respuesta del API**: la sesión ya no vale. Es un `null`, no un error.
    if (res.status === 401 || res.status === 403) return null;

    // Cualquier otro fallo —500, 502, un 404 si alguien mueve la ruta— es «no se pudo preguntar».
    // Tratarlo como `null` diría «tu sesión ha caducado» cuando lo que pasa es que el API está roto.
    if (!res.ok) {
      throw new Error(
        `[CLIENT] El refresco de sesion fallo con ${res.status}. No es que la sesion haya caducado: ` +
          `es que el API no pudo responder.`,
      );
    }

    const cuerpo = (await res.json()) as {
      tokens?: { accessToken?: string; refreshToken?: string };
      accessToken?: string;
      refreshToken?: string;
    };
    // El API responde `{ tokens: {...} }`; se acepta también la forma plana por si un intermediario
    // la desenvuelve, igual que hace el proxy de BASE con las respuestas de login.
    const t = cuerpo.tokens ?? cuerpo;

    if (!t.accessToken) {
      throw new Error(
        "[CLIENT] El refresco devolvio 200 sin `accessToken`. Se trata como fallo y no como sesion " +
          "caducada: un 200 vacio es un contrato roto, no una respuesta.",
      );
    }

    return {
      accessToken: t.accessToken,
      refreshToken: t.refreshToken ?? refreshToken,
    };
  } finally {
    clearTimeout(reloj);
  }
}

/**
 * Pide tokens nuevos. Ver el bloque de arriba para los tres desenlaces.
 *
 * @param topeMs sólo para pruebas; en producción se usa `TOPE_REFRESCO_MS`.
 */
export function refrescarSesion(
  refreshToken: string,
  topeMs: number = TOPE_REFRESCO_MS,
): Promise<Tokens | null> {
  const yaEnCurso = enVuelo.get(refreshToken);
  if (yaEnCurso) return yaEnCurso;

  // Se retira del mapa pase lo que pase. Si una promesa fallida se quedara pegada, la sesión quedaria
  // envenenada: todo refresco posterior heredaria el error aunque el API ya se hubiera recuperado.
  const promesa = pedirAlApi(refreshToken, topeMs).finally(() =>
    enVuelo.delete(refreshToken),
  );

  enVuelo.set(refreshToken, promesa);
  return promesa;
}
