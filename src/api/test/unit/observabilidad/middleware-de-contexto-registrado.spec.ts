import { Test } from '@nestjs/testing';
import { Controller, Get, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { NextFunction, Request, Response } from 'express';
import request from 'supertest';

/**
 * PT-126 — Que el middleware que pone el `traceId` siga casando con todas las rutas.
 *
 * `app.module.ts` registra `ContextMiddleware` con `forRoutes('<patron>')`. Ese middleware genera
 * el `traceId` que une el log de una peticion con su fila en `error_events` y con su apunte en la
 * traza de pagos. Si el patron deja de casar, **no falla nada**: las peticiones siguen respondiendo
 * 200 y la trazabilidad desaparece sin ruido.
 *
 * Es la forma de fallo de F-34 —un `catch` rotulado «opcional» tuvo la puja en vivo apagada dias
 * con la suite entera en verde— y la migracion de Express 4 a 5 apunta justo aqui: `path-to-regexp`
 * pasa de 3 a 8 y la sintaxis de comodines cambia.
 *
 * ## Por que se arranca una aplicacion en vez de comprobar el patron a mano
 *
 * El primer intento compilaba el patron con `path-to-regexp` directamente y daba rojo con Nest 10,
 * **donde el middleware funciona**. La premisa era falsa: Nest no pasa `'*'` a `path-to-regexp`,
 * lo resuelve con una lista propia (`route-info-path-extractor.js`). Una prueba construida sobre un
 * modelo mental de como funciona la libreria de al lado mide el modelo, no el sistema.
 *
 * Se monta un modulo minimo con el **mismo patron literal que usa `app.module.ts`** y se comprueba
 * que el middleware corre. Eso es cierto con la 10, con la 11, y con lo que venga.
 */

/** Extrae el patron tal y como esta escrito hoy en `app.module.ts`. */
function patronDeAppModule(): string | undefined {
  const fuente = readFileSync(join(__dirname, '../../../src/app.module.ts'), 'utf8');
  return fuente.match(/ContextMiddleware\)\s*\.forRoutes\(\s*['"]([^'"]+)['"]/)?.[1];
}

describe('El comodin del ContextMiddleware sigue casando (PT-126)', () => {
  const patron = patronDeAppModule();

  it('CM-01: el registro de ContextMiddleware sigue existiendo en app.module', () => {
    // Si alguien lo quita, esto avisa antes de que se note por la ausencia de traceId.
    expect(patron).toBeDefined();
  });

  describe('CM-02: el middleware corre en rutas reales de la aplicacion', () => {
    /**
     * Cuenta las rutas por las que paso — el equivalente a «puso el traceId».
     *
     * `originalUrl` y no `req.path`: dentro de un middleware montado, Express da la ruta RELATIVA
     * al punto de montaje, y todas llegaban como «/».
     */
    const vistas: string[] = [];

    @Controller()
    class Rutas {
      @Get('api/v1/auctions') catalogo() {
        return { ok: true };
      }
      @Get('api/v1/auth/login') login() {
        return { ok: true };
      }
      @Get('api/v1/payments/webhook/mercadopago') webhook() {
        return { ok: true };
      }
      @Get() raiz() {
        return { ok: true };
      }
    }

    @Module({ controllers: [Rutas] })
    class ModuloDePrueba implements NestModule {
      configure(consumer: MiddlewareConsumer) {
        consumer
          .apply((req: Request, _res: Response, next: NextFunction) => {
            vistas.push(req.originalUrl);
            next();
          })
          // El mismo patron literal que app.module.ts. Si aquel cambia, este cambia con el.
          .forRoutes(patron as string);
      }
    }

    let app: import('@nestjs/common').INestApplication;

    beforeAll(async () => {
      const mod = await Test.createTestingModule({ imports: [ModuloDePrueba] }).compile();
      app = mod.createNestApplication();
      await app.init();
    });

    afterAll(async () => {
      await app?.close();
    });

    beforeEach(() => {
      vistas.length = 0;
    });

    it.each([
      ['/api/v1/auctions', 'el catalogo'],
      ['/api/v1/auth/login', 'el login'],
      ['/api/v1/payments/webhook/mercadopago', 'un webhook de pasarela'],
      ['/', 'la raiz'],
    ])('paso por %s (%s)', async (ruta) => {
      await request(app.getHttpServer()).get(ruta).expect(200);

      expect(vistas).toContain(ruta);
    });
  });
});
