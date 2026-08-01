import {
  Controller,
  Get,
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
    };
  }

  @Get("/about")
  @Render("pages/static/about.html")
  about() {
    return { clientUrl: CLIENT_URL };
  }

  // PT-053 (FINDING-QA-07): the footer linked to /contact but no route existed → 404.
  @Get("/contact")
  @Render("pages/static/contact.html")
  contact() {
    return { clientUrl: CLIENT_URL };
  }

  @Get("/privacy")
  @Render("pages/static/privacy.html")
  privacy() {
    return { clientUrl: CLIENT_URL };
  }

  @Get("/terms")
  @Redirect("/static/terms", 301)
  termsRedirect() {}

  @Get("/static/terms")
  @Render("pages/static/terms.html")
  terms() {
    return { clientUrl: CLIENT_URL };
  }

  @Get("/auctions")
  @Render("pages/auctions/list.html")
  async auctionsList(@Query("page") page = 1, @Query("q") q?: string) {
    const params = new URLSearchParams({
      page: String(page),
      ...(q ? { q } : {}),
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
      page,
      q,
      clientUrl: CLIENT_URL,
      apiUrl: API_URL,
    };
  }

  @Get("/auctions/:id")
  @Render("pages/auctions/detail.html")
  async auctionDetail(@Param("id") id: string) {
    const auction = await fetchJson<any>(`${API_URL}/api/v1/auctions/${id}`);
    // PT-054 (FINDING-QA-08): a missing auction must 404, not render an empty detail page with 200.
    if (!auction) throw new NotFoundException();
    return { auction, clientUrl: CLIENT_URL, apiUrl: API_URL };
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
