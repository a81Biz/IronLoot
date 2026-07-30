import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Response, Request } from "express";
import * as jwt from "jsonwebtoken";
import { variableObligatoria } from "../config/variable-obligatoria";

// PT-186 (H-035) — Aqui BASE_URL es a donde se manda a alguien que no ha iniciado sesion. Con reserva a
// `localhost:5174`, un despliegue sin la variable redirigia a una direccion que solo existe en la maquina de
// quien desplego: el usuario acabaria en una pagina que no carga, sin saber por que.
const BASE_URL = variableObligatoria("BASE_URL");
// PT-040 (AUD-026): no weak fallback secret. If JWT_SECRET is unset the guard fails closed
// (jwt.verify throws → redirect to login) instead of trusting a known placeholder.
//
// PT-192 (AUD-026) — **Y eso fallaba cerrado en la PETICIÓN, no en el arranque.** Era
// `process.env.JWT_SECRET || ""`: sin la variable, el CLIENT arrancaba `healthy` y rebotaba al login a
// todo el mundo, **para siempre y sin un error en ningún log**. El usuario inicia sesión en BASE, recibe
// una cookie válida y el portal privado lo devuelve al login: el síntoma manda a mirar la cookie, el
// dominio o el `SameSite` — a cualquier sitio menos a una variable que nadie declaró. Es el modo de
// fallo de H-035, y aquí es peor porque es el secreto con el que se decide quién eres.
//
// La asimetría lo delataba: **una línea más arriba**, `BASE_URL` ya usaba `variableObligatoria()`.
//
// Se exige además la longitud mínima, la misma que el API (`jwt-secret.ts`, PT-126): un secreto de
// cuatro caracteres firma igual de bien. Y hay un segundo modo que esto no cubre pero conviene saber:
// si este `JWT_SECRET` **difiere** del del API, el CLIENT rechaza tokens válidos con el mismo síntoma.
// Por eso el mensaje de abajo lo nombra.
const LONGITUD_MINIMA = 32;
const JWT_SECRET = variableObligatoria(
  "JWT_SECRET",
  "Es el secreto con el que se verifican las sesiones, y tiene que ser **el mismo** que el del API: " +
    "sin él este sitio arranca y rebota al login a todo el mundo, sin error en ningún log.",
);
if (JWT_SECRET.length < LONGITUD_MINIMA) {
  // El valor NO se incluye en el mensaje: esto acaba en un log.
  throw new Error(
    `[CLIENT] JWT_SECRET tiene ${JWT_SECRET.length} caracteres y hacen falta al menos ` +
      `${LONGITUD_MINIMA}. Tiene que ser **el mismo** que el del API: si difieren, este sitio rechaza ` +
      `sesiones perfectamente válidas y el usuario sólo ve que vuelve al login.`,
  );
}
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

@Injectable()
export class ClientAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();

    const token = req.cookies?.["access_token"];
    if (!token) {
      res.redirect(`${BASE_URL}/auth/login`);
      return false;
    }

    try {
      const payload = jwt.verify(token, JWT_SECRET) as Record<string, unknown>;
      (req as any).user = payload;
      return true;
    } catch {
      res.clearCookie("access_token", { domain: COOKIE_DOMAIN, path: "/" });
      res.redirect(`${BASE_URL}/auth/login`);
      return false;
    }
  }
}
