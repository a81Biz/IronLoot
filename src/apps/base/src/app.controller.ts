import {
  Controller,
  Get,
  Header,
  NotFoundException,
  Param,
  Query,
  Redirect,
  Render,
} from "@nestjs/common";

import { variableObligatoria } from "./common/config/variable-obligatoria";
// PT-204 (H-UI-001/002) — La forma de las listas del API se normaliza en un solo sitio.
import { toItems } from "./common/bff/list-view";
// PT-186 (H-035) — Sin reserva: a donde llamar es una conexion, y un `localhost:<puerto>` de reserva no falla
// al arrancar, falla en silencio. Es la frase que PT-089 escribio en el API y que no llego hasta aqui.
const API_URL = variableObligatoria("API_URL");
const CLIENT_URL = variableObligatoria("CLIENT_URL");
// PT-223 (H-UI-039) — El origen publico del sitio, para las URL canonicas y Open Graph.
// Se deriva de la misma variable que ya usa el resto: escribir aqui un `localhost` seria justo lo que
// PT-088 prohibe, y una canonica equivocada es peor que ninguna (le dice al buscador que indexe otra).
const SITE_URL = variableObligatoria("PUBLIC_SITE_URL");

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  } catch {
    return null;
  }
}

@Controller()
export class AppController {
  @Get("/")
  @Render("pages/home.html")
  async home() {
    // PT-204 (H-UI-002) — Esto pedía `any[]` y el API devuelve `{data,total,page,limit}`. El `?? []`
    // no llegaba a actuar —el objeto no es nulo—, así que la plantilla hacía `auctions.length` sobre
    // un objeto: `undefined`, falsy, `{% else %}`. **La portada anunciaba «No hay subastas activas en
    // este momento» hubiera las que hubiera**, e invitaba a publicar «la primera».
    const auctions = await fetchJson<unknown>(
      `${API_URL}/api/v1/auctions?status=ACTIVE&limit=6`,
    );
    return {
      auctions: toItems(auctions),
      clientUrl: CLIENT_URL,
      apiUrl: API_URL,
      canonical: SITE_URL,
    };
  }

  @Get("/about")
  @Render("pages/static/about.html")
  about() {
    return { clientUrl: CLIENT_URL, canonical: `${SITE_URL}/about` };
  }

  // PT-053 (FINDING-QA-07): the footer linked to /contact but no route existed → 404.
  @Get("/contact")
  @Render("pages/static/contact.html")
  contact() {
    return { clientUrl: CLIENT_URL, canonical: `${SITE_URL}/contact` };
  }

  /**
   * PT-226 (ausencias A-10/A-11) — El centro de ayuda.
   *
   * `docs-v2/7-ux/FAQ-y-Mensajes.md` estaba escrito, mantenido y **sin publicar en ninguna parte**: el
   * usuario que necesitaba ayuda tenia un `mailto:` invisible (H-UI-035) y nada mas.
   */
  @Get("/help")
  @Render("pages/static/help.html")
  help() {
    return { clientUrl: CLIENT_URL, canonical: `${SITE_URL}/help` };
  }

  /**
   * PT-219 (H-UI-031) — La politica de cookies, que no existia.
   *
   * La privacidad no mencionaba cookies en NINGUN punto, y el sistema instala dos de sesion compartidas
   * entre subdominios y carga tipografias desde Google en toda pagina publica.
   */
  @Get("/cookies")
  @Render("pages/static/cookies.html")
  cookies() {
    return { clientUrl: CLIENT_URL, canonical: `${SITE_URL}/cookies` };
  }

  @Get("/privacy")
  @Render("pages/static/privacy.html")
  privacy() {
    return { clientUrl: CLIENT_URL, canonical: `${SITE_URL}/privacy` };
  }

  @Get("/terms")
  @Redirect("/static/terms", 301)
  termsRedirect() {}

  @Get("/static/terms")
  @Render("pages/static/terms.html")
  terms() {
    return { clientUrl: CLIENT_URL, canonical: `${SITE_URL}/terms` };
  }

  @Get("/auctions")
  @Render("pages/auctions/list.html")
  async auctionsList(
    @Query("page") page = 1,
    @Query("q") q?: string,
    @Query("minPrice") minPrice?: string,
    @Query("maxPrice") maxPrice?: string,
    @Query("sort") sort?: string,
  ) {
    // PT-209 (H-UI-010) — Los parámetros que la barra lateral emitía y **nadie leía**: ni este
    // controlador ni el API. El usuario cambiaba un filtro, obtenía lo mismo, y concluía que no había
    // resultados que cumplieran su criterio — cuando lo que ocurría es que el criterio se descartaba.
    const params = new URLSearchParams({
      page: String(page),
      ...(q ? { q } : {}),
      ...(minPrice ? { minPrice } : {}),
      ...(maxPrice ? { maxPrice } : {}),
      ...(sort ? { sort } : {}),
    });
    // PT-204 (H-UI-001) — Esto leía `data?.items`. **Esa clave no existe**: el API emite
    // `{data,total,page,limit}`. El catálogo público devolvía `[]` siempre y pintaba «No hay subastas
    // disponibles», que es exactamente lo que pintaría un catálogo vacío de verdad.
    //
    // El normalizador ya estaba escrito y probado en CLIENT desde PT-067; aquí no lo usaba nadie.
    const data = await fetchJson<unknown>(
      `${API_URL}/api/v1/auctions?${params}`,
    );
    const auctions = toItems(data);
    return {
      auctions,
      // PT-209 (H-UI-042) — El total real, no el tamaño de la página.
      total: auctions.total ?? 0,
      page: Number(page),
      q,
      minPrice,
      maxPrice,
      sort,
      clientUrl: CLIENT_URL,
      apiUrl: API_URL,
      canonical: `${SITE_URL}/auctions`,
    };
  }

  @Get("/auctions/:id")
  @Render("pages/auctions/detail.html")
  async auctionDetail(@Param("id") id: string) {
    const auction = await fetchJson<any>(`${API_URL}/api/v1/auctions/${id}`);
    // PT-054 (FINDING-QA-08): a missing auction must 404, not render an empty detail page with 200.
    if (!auction) throw new NotFoundException();
    // PT-223 — La canonica de un lote usa su `slug`, que el modelo tiene desde siempre y las URL no
    // usaban: `/auctions/<uuid>` no dice nada a un buscador ni a una persona.
    return {
      auction,
      clientUrl: CLIENT_URL,
      apiUrl: API_URL,
      canonical: `${SITE_URL}/auctions/${auction.slug || id}`,
    };
  }

  /**
   * PT-223 (H-UI-039) — El sitemap, generado desde el catálogo real.
   *
   * No existía ninguno, y `robots.txt` tampoco. Sin ellos, un buscador sólo encuentra lo que otra página
   * enlace — y las subastas se enlazan desde un catálogo paginado que caduca cada pocas horas.
   *
   * Se genera **a partir del API**, no de una lista escrita a mano: una lista fija envejece y acaba
   * declarando lotes que ya cerraron, que es la familia de H-016 aplicada al indexado.
   *
   * Usa el `slug` que el modelo tiene desde siempre y las URL no usaban.
   */
  @Get("/sitemap.xml")
  @Header("Content-Type", "application/xml; charset=utf-8")
  async sitemap(): Promise<string> {
    const data = await fetchJson<unknown>(
      `${API_URL}/api/v1/auctions?limit=200`,
    );
    const auctions = toItems<{
      slug?: string;
      id?: string;
      updatedAt?: string;
    }>(data);

    const estaticas = [
      "",
      "/auctions",
      "/about",
      "/help",
      "/contact",
      "/terms",
      "/privacy",
      "/cookies",
    ];

    const urls = [
      ...estaticas.map((ruta) => `  <url><loc>${SITE_URL}${ruta}</loc></url>`),
      ...auctions.items.map(
        (a) =>
          `  <url><loc>${SITE_URL}/auctions/${a.slug || a.id}</loc>` +
          (a.updatedAt
            ? `<lastmod>${String(a.updatedAt).slice(0, 10)}</lastmod>`
            : "") +
          `</url>`,
      ),
    ];

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      "</urlset>",
      "",
    ].join("\n");
  }

  @Get("/auth/login")
  @Render("pages/auth/login.html")
  login() {
    return { apiUrl: API_URL, clientUrl: CLIENT_URL };
  }

  @Get("/auth/register")
  @Render("pages/auth/register.html")
  register() {
    return { apiUrl: API_URL, clientUrl: CLIENT_URL };
  }

  @Get("/auth/recovery")
  @Render("pages/auth/recovery.html")
  recovery() {
    return { apiUrl: API_URL };
  }

  @Get("/auth/reset-password")
  @Render("pages/auth/reset-password.html")
  resetPassword(@Query("token") token?: string) {
    return { apiUrl: API_URL, token };
  }

  @Get("/auth/verify-email")
  @Render("pages/auth/verify-email.html")
  verifyEmail(@Query("token") token?: string) {
    return { apiUrl: API_URL, token };
  }

  @Get("/auth/verify-email-pending")
  @Render("pages/auth/verify-email-pending.html")
  verifyEmailPending() {
    return { clientUrl: CLIENT_URL };
  }
}
