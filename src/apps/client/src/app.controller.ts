import {
  Controller,
  Get,
  Param,
  Query,
  Render,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ClientAuthGuard } from "./common/guards/client-auth.guard";
import {
  WALLET_BALANCE_PATH,
  mapWalletBalance,
  WalletBalanceRaw,
} from "./common/bff/wallet-view";
import {
  MY_ACTIVE_BIDS_PATH,
  MY_BIDS_HISTORY_PATH,
  mapBidsList,
  BidRaw,
} from "./common/bff/bids-view";
import { toItems } from "./common/bff/list-view";

import { variableObligatoria } from "./common/config/variable-obligatoria";

// PT-186 (H-035) — Sin reserva. Ver `common/config/variable-obligatoria.ts`.
const API_URL = variableObligatoria("API_URL");
const BASE_URL = variableObligatoria("BASE_URL");
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

/**
 * PT-194 (`TD-025`) — **El `null` sigue existiendo, pero ya no es mudo.**
 *
 * Esta función devolvía `null` ante *cualquier* fallo: un 401, un 404, un 500 y una red caída daban
 * exactamente lo mismo. Con 28 llamadas, eso significa que una página podía renderizarse vacía y **no
 * quedar rastro de por qué**. Es el `catch` mudo que persigue el checkpoint D3.
 *
 * **No se cambia la firma** —28 llamadas y cada página decidiría algo distinto ante un error; eso es
 * otro PT—, pero sí se distingue el motivo en el registro. La diferencia práctica: cuando alguien
 * pregunte *«¿por qué el panel sale vacío?»*, el log dirá si fue una sesión rechazada, un endpoint que
 * no existe o el API caído.
 *
 * **El 401 ya no debería llegar aquí** desde PT-194: el guard refresca antes y actualiza
 * `req.cookies` en la misma petición. Si aparece, es señal de algo — un token que el API rechaza por
 * otro motivo, o el guard esquivado— y por eso se registra aparte.
 */
async function apiGet<T>(token: string, path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        // Que esto aparezca significa que el refresco no cubrio el caso. No es «sin datos».
        console.warn(
          `[CLIENT] 401 en ${path} pese al refresco de sesion (PT-194). La pagina se renderizara ` +
            `sin estos datos.`,
        );
      } else {
        console.warn(
          `[CLIENT] ${res.status} en ${path}; la pagina se renderizara sin estos datos.`,
        );
      }
      return null;
    }

    return res.json() as Promise<T>;
  } catch (error) {
    // El API no contesto. Distinto de «respondio que no».
    console.error(
      `[CLIENT] No se pudo llamar a ${path}: ${(error as Error).message}. ` +
        `La pagina se renderizara sin estos datos.`,
    );
    return null;
  }
}

function getToken(req: Request): string {
  return req.cookies?.["access_token"] || "";
}

@UseGuards(ClientAuthGuard)
@Controller()
export class AppController {
  // ── Buyer Portal ──────────────────────────────────────────────────────
  @Get("/dashboard")
  @Render("pages/dashboard.html")
  async dashboard(@Req() req: Request) {
    const token = getToken(req);
    const [profile, walletRaw, bidsRaw, auctions] = await Promise.all([
      apiGet(token, "/api/v1/users/me"),
      apiGet<WalletBalanceRaw>(token, WALLET_BALANCE_PATH),
      apiGet<BidRaw[]>(token, MY_ACTIVE_BIDS_PATH),
      apiGet(token, "/api/v1/auctions?status=ACTIVE&limit=6"),
    ]);
    return {
      profile,
      wallet: mapWalletBalance(walletRaw),
      bids: mapBidsList(bidsRaw),
      auctions,
      baseUrl: BASE_URL,
    };
  }

  @Get("/auth/logout")
  logout(@Res() res: Response): void {
    res.clearCookie("access_token", { domain: COOKIE_DOMAIN, path: "/" });
    res.redirect(`${BASE_URL}/auth/login`);
  }

  @Get("/profile")
  @Render("pages/profile.html")
  async profile(@Req() req: Request) {
    const profile = await apiGet(getToken(req), "/api/v1/users/me");
    return { profile };
  }

  @Get("/settings")
  @Render("pages/settings.html")
  async settings(@Req() req: Request) {
    // PT-132 (H-020) — Era `/api/v1/users/settings`, que NO EXISTE. El API expone `me/settings`.
    // La peticion caia en el comodin `@Get(':id')` de `UsersController`, el `ParseUUIDPipe`
    // rechazaba la cadena `settings` como identificador, y devolvia 400 — «uuid invalido».
    //
    // La pagina «Configuracion» esta en el menu principal y NO CARGABA para ningun usuario. Y el
    // error enga�aba: un 404 habria dicho «esa ruta no existe»; el 400 mandaba a mirar el id.
    const settings = await apiGet(getToken(req), "/api/v1/users/me/settings");
    return { settings };
  }

  @Get("/my-bids")
  @Render("pages/bids/my.html")
  async myBids(@Req() req: Request, @Query("page") page = 1) {
    const bidsRaw = await apiGet<BidRaw[]>(getToken(req), MY_BIDS_HISTORY_PATH);
    return { bids: mapBidsList(bidsRaw), page };
  }

  @Get("/auctions/won-auctions")
  @Render("pages/won-auctions.html")
  async wonAuctions(@Req() req: Request) {
    const orders = await apiGet(getToken(req), "/api/v1/orders?role=buyer");
    return { orders: toItems(orders) };
  }

  @Get("/auctions/watchlist")
  @Render("pages/watchlist.html")
  async watchlist(@Req() req: Request) {
    const items = await apiGet(getToken(req), "/api/v1/watchlist");
    return { items, baseUrl: BASE_URL };
  }

  @Get("/wallet")
  @Render("pages/wallet.html")
  async wallet(@Req() req: Request) {
    const walletRaw = await apiGet<WalletBalanceRaw>(
      getToken(req),
      WALLET_BALANCE_PATH,
    );
    return { wallet: mapWalletBalance(walletRaw) };
  }

  /** Etiqueta visible por proveedor de pago. */
  private static readonly PROVIDER_LABELS: Record<string, string> = {
    MERCADO_PAGO: "MercadoPago",
    PAYPAL: "PayPal",
    STRIPE: "Stripe",
    HEY_BANCO: "Hey Banco",
  };

  @Get("/wallet/deposit")
  @Render("pages/wallet/deposit.html")
  async deposit(@Req() req: Request) {
    // PT-076: los métodos se derivan de la configuración real de la API. Antes estaban
    // fijos en la plantilla, de modo que se ofrecía PayPal aunque no estuviera configurado
    // y el depósito fallaba al pulsar «Continuar al pago».
    const res = await apiGet<{ providers: string[] }>(
      getToken(req),
      "/api/v1/payments/providers",
    );

    const providers = (res?.providers ?? []).map((key) => ({
      key,
      label: AppController.PROVIDER_LABELS[key] ?? key,
    }));

    return { providers };
  }

  /**
   * PT-088 — Ruta canonica a la que TODAS las pasarelas devuelven al usuario.
   *
   * Antes cada una apuntaba a una ruta distinta —`/wallet/success`, `/wallet/deposit-success`,
   * `/wallet/deposit-cancel`— y **ninguna existia**: un pago real terminaba en 404 tras haber
   * cobrado. Ahora hay una, y el estado viaja como parametro.
   *
   * El `status` de la URL **lo escribe el navegador**: sirve para elegir que mostrar mientras
   * llega la respuesta, pero la verdad se pide a la API. Un usuario que edite `status=success`
   * a mano vera el estado real de su deposito, no el que puso.
   *
   * Y no se muestra «fallo» a un deposito abierto: efectivo y SPEI tardan horas.
   */
  @Get("/wallet/deposit/return")
  @Render("pages/wallet/deposit-return.html")
  async depositReturn(
    @Req() req: Request,
    @Query("ref") ref = "",
    @Query("status") status = "",
  ) {
    const deposito = ref
      ? await apiGet<Record<string, unknown>>(
          getToken(req),
          `/api/v1/payments/status/${encodeURIComponent(ref)}`,
        )
      : null;

    return {
      ref,
      // Lo que dijo la pasarela, solo para el primer pintado.
      reportado: status,
      // Lo que dice nuestra API, que es lo que manda.
      deposito,
      etiqueta: deposito
        ? AppController.PROVIDER_LABELS[String(deposito.provider)]
        : null,
    };
  }

  @Get("/wallet/withdraw")
  @Render("pages/wallet/withdraw.html")
  withdraw(@Req() _req: Request) {
    return {};
  }

  @Get("/wallet/history")
  @Render("pages/wallet/history.html")
  async walletHistory(@Req() req: Request, @Query("page") page = 1) {
    const history = await apiGet(
      getToken(req),
      `/api/v1/wallet/history?page=${page}`,
    );
    return { history, page };
  }

  @Get("/payments")
  @Render("pages/payments.html")
  async payments(@Req() req: Request) {
    const history = await apiGet(
      getToken(req),
      "/api/v1/wallet/history?types=DEBIT_ORDER,CREDIT_SALE",
    );
    return { history };
  }

  @Get("/orders")
  @Render("pages/orders/list.html")
  async orders(@Req() req: Request, @Query("page") page = 1) {
    const orders = await apiGet(getToken(req), `/api/v1/orders?page=${page}`);
    return { orders: toItems(orders), page };
  }

  @Get("/orders/:id")
  @Render("pages/orders/detail.html")
  async orderDetail(@Req() req: Request, @Param("id") id: string) {
    // PT-174 — La plantilla necesita saber si quien mira es el comprador o el vendedor, porque cada uno
    // declara una cosa distinta: el vendedor envia, el comprador confirma que recibio.
    //
    // Se resuelve **en el servidor**, comparando contra `/users/me`, y no con un dato que venga del
    // navegador. La autorizacion de verdad esta en el servicio del API (PT-174); esto solo decide **que
    // se pinta**, y aun asi no se deduce del cliente: una interfaz que se fia del navegador para saber
    // quien eres acaba ensenando el boton equivocado a la persona equivocada.
    const token = getToken(req);
    const [order, me] = await Promise.all([
      apiGet<Record<string, unknown>>(token, `/api/v1/orders/${id}`),
      apiGet<{ id?: string }>(token, "/api/v1/users/me").catch(
        () => ({}) as { id?: string },
      ),
    ]);

    const yo = me?.id;

    return {
      order,
      esComprador: Boolean(yo && order?.buyerId === yo),
      esVendedor: Boolean(yo && order?.sellerId === yo),
    };
  }

  @Get("/notifications")
  @Render("pages/notifications/list.html")
  async notifications(@Req() req: Request) {
    const notifications = await apiGet(getToken(req), "/api/v1/notifications");
    return { notifications };
  }

  @Get("/disputes")
  @Render("pages/disputes/list.html")
  async disputes(@Req() req: Request) {
    const disputes = await apiGet(getToken(req), "/api/v1/disputes");
    return { disputes };
  }

  @Get("/disputes/create")
  @Render("pages/disputes/create.html")
  disputeCreate(@Query("orderId") orderId?: string) {
    return { orderId };
  }

  @Get("/disputes/:id")
  @Render("pages/disputes/detail.html")
  async disputeDetail(@Req() req: Request, @Param("id") id: string) {
    const dispute = await apiGet(getToken(req), `/api/v1/disputes/${id}`);
    return { dispute };
  }

  @Get("/reputation")
  @Render("pages/reputation.html")
  async reputation(@Req() req: Request) {
    const profile = await apiGet(getToken(req), "/api/v1/users/me");
    return { profile };
  }

  // ── Seller Portal ─────────────────────────────────────────────────────
  @Get("/seller/onboarding")
  @Render("pages/seller/onboarding.html")
  sellerOnboarding(@Req() _req: Request) {
    return {};
  }

  @Get("/seller/auctions")
  @Render("pages/seller/auctions.html")
  async sellerAuctions(@Req() req: Request, @Query("page") page = 1) {
    // La API usa `mine=true` (no `role=seller`) para devolver TODAS las subastas del vendedor
    // (incluye DRAFT/CLOSED); responde `{data,total}` → toItems lo normaliza a `{items}`.
    const auctions = await apiGet(
      getToken(req),
      `/api/v1/auctions?mine=true&page=${page}`,
    );
    return { auctions: toItems(auctions), page };
  }

  @Get("/seller/orders")
  @Render("pages/seller/orders.html")
  async sellerOrders(@Req() req: Request, @Query("page") page = 1) {
    const orders = await apiGet(
      getToken(req),
      `/api/v1/orders?role=seller&page=${page}`,
    );
    return { orders: toItems(orders), page };
  }

  @Get("/auctions/create")
  @Render("pages/auction/create.html")
  auctionCreate(@Req() _req: Request) {
    return {};
  }

  @Get("/auctions/:id/edit")
  @Render("pages/auction/edit.html")
  async auctionEdit(@Req() req: Request, @Param("id") id: string) {
    const auction = await apiGet(getToken(req), `/api/v1/auctions/${id}`);
    return { auction };
  }

  // ── Bidding page (PT-044 / AUD-002) ───────────────────────────────────
  // Must be declared AFTER the specific /auctions/* routes so ":id" does not shadow them.
  @Get("/auctions/:id")
  @Render("pages/auction/detail.html")
  async auctionDetail(@Req() req: Request, @Param("id") id: string) {
    const token = getToken(req);
    const [auction, walletRaw, bids] = await Promise.all([
      apiGet(token, `/api/v1/auctions/${id}`),
      apiGet<WalletBalanceRaw>(token, WALLET_BALANCE_PATH),
      apiGet(token, `/api/v1/auctions/${id}/bids`),
    ]);
    return { auction, wallet: mapWalletBalance(walletRaw), bids };
  }
}
