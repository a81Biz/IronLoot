import {
  Controller,
  Get,
  Param,
  Query,
  Redirect,
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
// PT-216 (H-UI-005/006) — La cadena de cobro del vendedor: KYC, metodo de pago, verificacion y retiro.
import {
  RETIROS_PATH,
  METODOS_PATH,
  KYC_PATH,
  estadoDeCobro,
} from "./common/bff/retiro-view";

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
    // PT-231 (H-UI-055) — El dashboard obtenia `profile` y `bids` y **la plantilla no los usaba**: dos
    // cifras y tres botones, sin decir si el correo esta verificado, si eres vendedor, si el KYC esta
    // pendiente ni si hay algo esperando tu accion. Es la pantalla de aterrizaje del portal y obligaba a
    // recorrer dieciseis secciones para descubrir si algo requeria atencion.
    const [profile, walletRaw, bidsRaw, auctions, notifs, kyc, ordenes] =
      await Promise.all([
        apiGet<Record<string, unknown>>(token, "/api/v1/users/me"),
        apiGet<WalletBalanceRaw>(token, WALLET_BALANCE_PATH),
        apiGet<BidRaw[]>(token, MY_ACTIVE_BIDS_PATH),
        apiGet(token, "/api/v1/auctions?status=ACTIVE&limit=6"),
        apiGet<{ count?: number }>(token, "/api/v1/notifications/unread-count"),
        apiGet<{ status?: string | null; approved?: boolean }>(token, KYC_PATH),
        apiGet(token, "/api/v1/orders"),
      ]);

    const misOrdenes = toItems<{
      status?: string;
      shipment?: { status?: string };
    }>(ordenes).items;
    return {
      profile,
      wallet: mapWalletBalance(walletRaw),
      bids: mapBidsList(bidsRaw),
      // PT-204 (H-UI-001) — `auctions` llegaba crudo del API (`{data,total,page,limit}`) y la
      // plantilla comprobaba `auctions.items`. La tarjeta «Subastas activas» **no se pintaba nunca**,
      // y como el bloque entero vive dentro de ese `{% if %}`, se omitía en silencio.
      auctions: toItems(auctions),
      baseUrl: BASE_URL,
      // PT-231 — Lo que necesita atencion, resuelto en el servidor.
      atencion: {
        sinLeer: Number(notifs?.count ?? 0),
        kycAprobado: kyc?.approved === true,
        kycEstado: kyc?.status ?? null,
        esVendedor: profile?.isSeller === true,
        correoVerificado: Boolean(profile?.emailVerifiedAt),
        // Compras entregadas que el comprador todavia no ha confirmado no existen: lo que espera accion
        // suya es un envio declarado y sin confirmar.
        porConfirmar: misOrdenes.filter((o) => o.shipment?.status === "SHIPPED")
          .length,
        pujasActivas: mapBidsList(bidsRaw).items.length,
      },
    };
  }

  /**
   * PT-227 (R-037 · H-UI-024) — **«Salir» borraba UNA de las dos cookies.**
   *
   * Esto limpiaba `access_token` y dejaba `refresh_token` viva **siete días** en el navegador. El guard
   * de este mismo servicio hace lo contrario, y lo explica con estas palabras:
   *
   * > *«Borra **las dos** cookies y manda al login. Dejar la de refresco sería dejar una llave muerta.»*
   *
   * La misma decisión de seguridad estaba tomada de dos formas contradictorias en el mismo servicio, y
   * **la que ejecutaba el usuario era la insegura**. En un equipo compartido, tras «Salir» quedaba una
   * credencial válida durante una semana.
   *
   * Y ademas se **revoca en el servidor**: borrar la cookie deja el token vivo para quien lo tenga
   * copiado. `POST /auth/logout` invalida la sesión, que es lo que el usuario cree que hace este botón.
   */
  @Get("/auth/logout")
  async logout(@Req() req: Request, @Res() res: Response): Promise<void> {
    const refresh = req.cookies?.["refresh_token"];

    if (refresh) {
      try {
        await fetch(`${API_URL}/api/v1/auth/logout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken(req)}`,
          },
          body: JSON.stringify({ refreshToken: refresh }),
        });
      } catch (error) {
        // No se propaga: el usuario pidio salir y tiene que salir. Pero **se registra**, porque una
        // sesion que no se revoco en el servidor es una llave viva y quien investigue un acceso raro
        // necesita saber que esto fallo.
        console.error(
          `[CLIENT] No se pudo revocar la sesion en el API al cerrar sesion: ` +
            `${(error as Error).message}. Las cookies SI se borran.`,
        );
      }
    }

    const opciones = { domain: COOKIE_DOMAIN, path: "/" };
    res.clearCookie("access_token", opciones);
    res.clearCookie("refresh_token", opciones);
    res.redirect(`${BASE_URL}/auth/login`);
  }

  /**
   * PT-227 (R-037 · H-UI-023) — Seguridad de la cuenta.
   *
   * No habia cambio de contraseña autenticado en todo el portal: el unico camino era cerrar sesion y
   * usar «¿Olvidaste tu contraseña?». Y el `Manual de Usuario §1` instruye explicitamente —tras
   * detectar reuso de token— *«si no fuiste tu, **cambia la contraseña**»*: mandaba a una accion que la
   * interfaz no ofrecia.
   *
   * Tampoco habia forma de activar 2FA, aunque `PRD RF-02` la declara operable y el API expone
   * `/2fa/generate` y `/2fa/enable`.
   */
  @Get("/security")
  @Render("pages/security.html")
  async security(@Req() req: Request) {
    const perfil = await apiGet<{ isTwoFactorEnabled?: boolean }>(
      getToken(req),
      "/api/v1/users/me",
    );
    return { dosFactores: perfil?.isTwoFactorEnabled === true };
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
    // PT-219 — La seccion de datos personales enlaza al aviso de privacidad, que vive en BASE.
    return { settings, baseUrl: BASE_URL };
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
    // PT-204 — `/watchlist` devuelve un array plano hoy, y la plantilla lo recorría en crudo. Funciona
    // hasta el dia en que el API pagine, que es como se rompieron las otras cuatro. Se normaliza igual.
    const raw = await apiGet(getToken(req), "/api/v1/watchlist");
    return { watchlist: toItems(raw), baseUrl: BASE_URL };
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

  /**
   * PT-216 — La ruta antigua no se retira: se redirige.
   *
   * `/wallet/withdraw` esta enlazada desde `/wallet` y puede estar en marcadores. Retirarla produciria
   * un 404 donde antes habia un formulario — un defecto nuevo para corregir uno viejo.
   */
  @Get("/wallet/withdraw")
  @Redirect("/wallet/withdrawals", 301)
  withdrawLegacy(): void {}

  /**
   * PT-216 (H-UI-005) — Solicitar un retiro y **ver los que ya solicitaste**.
   *
   * `GET /wallet/withdrawals` existia y no lo consumia nadie: el vendedor solicitaba, el importe se
   * reservaba de su disponible (RN-65) y **no volvia a ver ese dinero en ninguna pantalla** hasta que el
   * admin lo pagara. Aqui se ve, con su estado.
   */
  @Get("/wallet/withdrawals")
  @Render("pages/wallet/withdrawals.html")
  async withdrawals(@Req() req: Request) {
    const token = getToken(req);
    const [retiros, metodos, kyc, walletRaw] = await Promise.all([
      apiGet(token, RETIROS_PATH),
      apiGet(token, METODOS_PATH),
      apiGet<{ status?: string | null; approved?: boolean }>(token, KYC_PATH),
      apiGet<WalletBalanceRaw>(token, WALLET_BALANCE_PATH),
    ]);

    return {
      retiros: toItems(retiros),
      cobro: estadoDeCobro(kyc, metodos),
      wallet: mapWalletBalance(walletRaw),
      // El limite diario es una regla de negocio (RN-65, BC-04) y el usuario lo descubria por rechazo.
      limiteDiario: process.env.WITHDRAWAL_DAILY_LIMIT || "5000",
    };
  }

  /**
   * PT-216 (H-UI-006) — Alta y verificacion de la cuenta de cobro.
   *
   * `RN-63` exige CLABE de 18 digitos con digito verificador **y nombre del titular**. No habia ninguna
   * pantalla: la puerta 2 del retiro era infranqueable, y la 3 —la verificacion por micro-deposito de
   * PT-092— tampoco tenia por donde pasarse.
   */
  @Get("/wallet/payment-methods")
  @Render("pages/wallet/payment-methods.html")
  async paymentMethods(@Req() req: Request) {
    const metodos = await apiGet(getToken(req), METODOS_PATH);
    return { metodos: toItems(metodos) };
  }

  /**
   * PT-216 (H-UI-006) — Envio de documentos KYC y su estado.
   *
   * `RN-62` dice que el vendedor envia documentos por `POST /api/v1/kyc`. En todo el portal habia UNA
   * mencion a KYC: una frase informativa en el onboarding. Ni formulario, ni estado, ni motivo de
   * rechazo. El vendedor no podia saber si estaba pendiente, aprobado o rechazado.
   */
  @Get("/seller/kyc")
  @Render("pages/seller/kyc.html")
  async kyc(@Req() req: Request) {
    const kyc = await apiGet<{ status?: string | null; approved?: boolean }>(
      getToken(req),
      KYC_PATH,
    );
    return { kyc };
  }

  @Get("/wallet/history")
  @Render("pages/wallet/history.html")
  async walletHistory(@Req() req: Request, @Query("page") page = 1) {
    // PT-229 (H-UI-044) — `page` viajaba y el API lo ignoraba: la lista se truncaba en silencio a los
    // diez ultimos movimientos. Ahora el API pagina de verdad y devuelve el total.
    const history = await apiGet<{ total?: number; limit?: number }>(
      getToken(req),
      `/api/v1/wallet/history?page=${page}&limit=20`,
    );
    return {
      history,
      page: Number(page),
      total: history?.total ?? 0,
      limit: 20,
    };
  }

  @Get("/payments")
  @Render("pages/payments.html")
  async payments(@Req() req: Request) {
    // PT-229 — El filtro por tipos ya estaba implementado en el SERVICIO del API; lo descartaba su
    // controlador. «Mis pagos» mostraba el ledger completo, duplicando «Historial» en vez de filtrarlo.
    const history = await apiGet(
      getToken(req),
      "/api/v1/wallet/history?types=DEBIT_ORDER,CREDIT_SALE,DEPOSIT,REFUND&limit=50",
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
    // PT-204 (H-UI-003) — El API devuelve `NotificationDto[]`, un array plano, y la plantilla iteraba
    // `notifications.items`. Un array no tiene `.items`: la pagina decia «No tienes notificaciones»
    // **siempre**. Es el aviso de «te han superado» (RN-23), que es como un comprador vuelve a pujar.
    const raw = await apiGet(getToken(req), "/api/v1/notifications");
    return { notifications: toItems(raw) };
  }

  @Get("/disputes")
  @Render("pages/disputes/list.html")
  async disputes(@Req() req: Request) {
    // PT-204 (H-UI-004) — Mismo defecto que en notificaciones: `Dispute[]` contra `.items`. Quien abria
    // una disputa recibia su confirmacion y **no la volvia a ver jamas**.
    const raw = await apiGet(getToken(req), "/api/v1/disputes");
    return { disputes: toItems(raw) };
  }

  /**
   * PT-220 (R-035 · H-UI-021) — Abrir una disputa **sin teclear un UUID**.
   *
   * El formulario pedía «ID de la orden — UUID de la orden» en un `input` de texto libre, y **ninguna
   * pantalla generaba el enlace con `?orderId=`**: el único camino era copiar un identificador de
   * máquina a mano, en el peor momento posible — cuando el usuario ya tiene un problema con su compra.
   *
   * Ahora se cargan sus órdenes disputables y se eligen de una lista. `RN-40` acota a órdenes
   * `PAID`/`SHIPPED`/`DELIVERED`, una disputa por orden y 14 días desde la entrega; la lista lo
   * refleja para que el usuario vea **por qué** una orden no aparece.
   */
  @Get("/disputes/create")
  @Render("pages/disputes/create.html")
  async disputeCreate(@Req() req: Request, @Query("orderId") orderId?: string) {
    const token = getToken(req);
    const [orders, disputes] = await Promise.all([
      apiGet(token, "/api/v1/orders?role=buyer"),
      apiGet(token, "/api/v1/disputes"),
    ]);

    const yaDisputadas = new Set(
      toItems<{ orderId?: string }>(disputes).items.map((d) => d.orderId),
    );

    const disputables = toItems<{
      id: string;
      status?: string;
      auction?: { title?: string };
    }>(orders).items.filter(
      (o) =>
        ["PAID", "SHIPPED", "DELIVERED"].includes(String(o.status)) &&
        !yaDisputadas.has(o.id),
    );

    return { orderId, disputables, ventanaDias: 14 };
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
      apiGet<{ currentPrice?: number; status?: string; minNextBid?: number }>(
        token,
        `/api/v1/auctions/${id}`,
      ),
      apiGet<WalletBalanceRaw>(token, WALLET_BALANCE_PATH),
      apiGet(token, `/api/v1/auctions/${id}/bids`),
    ]);
    // PT-204 — `bids` se recorria en crudo. Hoy el API devuelve un array; se normaliza por el mismo
    // motivo que la watchlist.
    return {
      auction,
      wallet: mapWalletBalance(walletRaw),
      bids: toItems(bids),
    };
  }
}
