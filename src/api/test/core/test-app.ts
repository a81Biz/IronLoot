import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { PaypalProvider } from '../../src/modules/payments/providers/paypal.provider';
import { MercadoPagoProvider } from '../../src/modules/payments/providers/mercadopago.provider';

/**
 * PT-143 — Doble de pasarela para e2e.
 *
 * Cumple el contrato de `PaymentProvider` —el de `modules/payments/interfaces/`, que es el que el
 * registro exige de verdad— sin salir a la red. **No simula cobros**: devuelve una
 * URL de redireccion y nada mas, que es justo lo que el endpoint bajo prueba tiene que producir.
 *
 * Lo que este doble NO cubre —que la pasarela responda como creemos— **no se pierde**: lo ejerce la
 * suite de navegador, que cobra de verdad en Mercado Pago y aprueba una orden real en PayPal
 * (PT-134). Doblar aqui es mover esa verificacion al sitio donde ya se hace bien, no renunciar a ella.
 */
export function dobleDePasarela(key: string) {
  return {
    key,
    aliases: [key.toLowerCase()],
    checkStatus: () => true,
    createPayment: async (orderId: string) => ({
      redirectUrl: `https://doble-de-pasarela.invalid/${key.toLowerCase()}/${orderId}`,
      externalId: `${key}-EXT-${orderId}`,
    }),
    // Un doble que devuelve `COMPLETED` alegremente convertiria cualquier prueba de acreditacion en
    // una prueba de si misma. Devuelve PENDING: quien necesite otra cosa, que lo diga en su suite.
    verifyPayment: async () => ({ status: 'PENDING' as const, externalId: '', amount: 0 }),
    handleWebhook: async () => null,
  };
}

export class TestApp {
  private app: INestApplication;
  private prismaService: PrismaService;

  async init(): Promise<void> {
    // Set env for tests
    process.env.JWT_SECRET = 'gVhWufw77SwrICrpSAXKWP4htd1G7XSVvJEK1Wm5EAF';
    process.env.JWT_EXPIRATION = '1h';

    // PT-143 — Esto **imponia** `ironloot_db` —la base de DESARROLLO— pisando lo que dijera el
    // entorno. Dos consecuencias, y la segunda es la grave:
    //
    //   1. En CI, donde `DATABASE_URL` apunta a `ironloot_test`, la suite se lo saltaba.
    //   2. En una maquina de desarrollo, las pruebas corrian contra la base que sostiene las
    //      validaciones PTSA — y `auth-helper.cleanup()` borra por patron de correo.
    //
    // El comentario de `auth-helper` («Ideally we run on test db») describia exactamente este
    // riesgo, sin saber que habia una linea aqui que lo garantizaba.
    //
    // Ahora se respeta lo que venga del entorno; la URL de desarrollo es solo la reserva para
    // quien ejecute en el host sin configurar nada.
    process.env.DATABASE_URL =
      process.env.DATABASE_URL ??
      'postgresql://ironloot:ironloot_dev@localhost:5432/ironloot_db?schema=public';

    // PT-143 (D4) — La pasarela se dobla en e2e, a proposito.
    //
    // `POST /payments/initiate` llamaba a `api-m.sandbox.paypal.com` de verdad. En CI, con
    // credenciales de prueba, eso es un **500** en cada push; con credenciales reales seria una
    // dependencia de red en el camino critico del pipeline.
    //
    // Lo que este endpoint tiene que demostrar es **su** contrato —que abre el ciclo de pago y
    // devuelve una URL de redireccion—, no el de PayPal. El contrato real de las pasarelas ya esta
    // cubierto donde tiene sentido: la suite de navegador cobra de verdad en Mercado Pago y aprueba
    // una orden real en PayPal (PT-134).
    //
    // `PENDIENTES.md` § S-002 ya lo habia anticipado: «si algun dia se quiere cobertura del
    // contrato de la pasarela, va en un job nocturno, no en cada push».
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PaypalProvider)
      .useValue(dobleDePasarela('PAYPAL'))
      .overrideProvider(MercadoPagoProvider)
      .useValue(dobleDePasarela('MERCADOPAGO'))
      .compile();

    this.app = moduleFixture.createNestApplication();

    this.app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    this.app.setGlobalPrefix('api');
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await this.app.init();
    this.prismaService = this.app.get(PrismaService);
  }

  getApp(): INestApplication {
    return this.app;
  }

  getPrisma(): PrismaService {
    return this.prismaService;
  }

  async close(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }
}
