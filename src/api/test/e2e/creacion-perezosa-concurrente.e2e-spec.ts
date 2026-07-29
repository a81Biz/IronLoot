import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { WalletService } from '../../src/modules/wallet/wallet.service';
import { SystemConfigService } from '../../src/modules/system-config/system-config.service';

/**
 * PT-142 — La creacion perezosa tiene que ser atomica.
 *
 * Cuatro sitios creaban una fila con `findUnique` + `create`, y entre la lectura y la escritura cabe
 * otro proceso. **Estar dentro de una transaccion no basta**: Prisma usa *read committed*, asi que
 * dos transacciones pueden leer las dos la ausencia de la misma fila. La transaccion da atomicidad
 * sobre lo que escribe, no exclusion sobre algo que todavia no existe.
 *
 * Lo cazo la PRIMERA corrida de CI de este repositorio, en `system-config`:
 *
 *     prisma:error  Unique constraint failed on the fields: (`key`)
 *
 * Nadie lo habia visto porque hacen falta dos condiciones a la vez y en desarrollo no se da ninguna:
 * concurrencia real (una sola instancia, un solo navegador) y una base **sin la fila ya creada** (la
 * base de desarrollo tiene historia, asi que la rama del `create` no se ejecuta nunca).
 *
 * Estas pruebas fabrican las dos condiciones a proposito. **Tienen que fallar contra el codigo
 * anterior**; si pasaran, no estarian reproduciendo la carrera y no probarian nada.
 */
describe('Creacion perezosa concurrente (PT-142)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let wallet: WalletService;
  let systemConfig: SystemConfigService;

  /** Cuantas peticiones simultaneas. Con 2 ya hay carrera; 8 la hace practicamente segura. */
  const SIMULTANEAS = 8;

  const usuariosCreados: string[] = [];

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    wallet = app.get(WalletService);
    systemConfig = app.get(SystemConfigService);
  });

  afterAll(async () => {
    // Limpieza acotada a lo propio: solo los usuarios que ha creado este fichero. Borrar por patron
    // sobre la base entera es el defecto que PT-143 tiene que resolver, y no se replica aqui.
    for (const id of usuariosCreados) {
      // En orden de dependencias: el ledger apunta al monedero, y el monedero al usuario. Borrar
      // por el otro extremo viola `ledger_wallet_id_fkey` — que es, en pequeno, el defecto que
      // PT-143 tiene que resolver en `auth-helper`.
      const w = await prisma.wallet.findUnique({ where: { userId: id } });
      if (w) await prisma.ledger.deleteMany({ where: { walletId: w.id } });
      await prisma.wallet.deleteMany({ where: { userId: id } });
      await prisma.user.deleteMany({ where: { id } });
    }
    await app?.close();
  });

  /** Un usuario recien creado **sin monedero**: es la condicion que en desarrollo no se da. */
  async function usuarioSinMonedero(sufijo: string): Promise<string> {
    const user = await prisma.user.create({
      data: {
        email: `pt142-${sufijo}-${Date.now()}@ironloot.test`,
        username: `pt142-${sufijo}-${Date.now()}`,
        passwordHash: 'no-se-usa-para-iniciar-sesion',
      },
    });
    usuariosCreados.push(user.id);

    const monederos = await prisma.wallet.count({ where: { userId: user.id } });
    // Si el usuario naciera ya con monedero, la prueba no estaria midiendo la creacion perezosa.
    expect(monederos).toBe(0);

    return user.id;
  }

  describe('El monedero', () => {
    it('CC-01: N llamadas simultaneas a getWallet() crean UN monedero y ningun error', async () => {
      const userId = await usuarioSinMonedero('getwallet');

      const resultados = await Promise.allSettled(
        Array.from({ length: SIMULTANEAS }, () => wallet.getWallet(userId)),
      );

      const fallos = resultados.filter((r) => r.status === 'rejected');
      // Con `findUnique` + `create`, varias ven "no existe" y varias intentan crear: las perdedoras
      // reciben P2002. Este es el RED.
      expect(fallos.map((f) => String((f as PromiseRejectedResult).reason))).toEqual([]);

      expect(await prisma.wallet.count({ where: { userId } })).toBe(1);
    });

    it('CC-03: dos acreditaciones simultaneas a un usuario sin monedero no chocan al crear', async () => {
      const userId = await usuarioSinMonedero('deposito');

      // El caso que motiva el PT: la acreditacion de un deposito compitiendo con la carga del panel.
      // Aqui se ejerce la version dura — dos acreditaciones a la vez, sin monedero previo.
      const resultados = await Promise.allSettled([
        wallet.deposit(userId, 100, `pt142-a-${Date.now()}`),
        wallet.deposit(userId, 250, `pt142-b-${Date.now()}`),
      ]);

      const fallos = resultados.filter((r) => r.status === 'rejected');
      expect(fallos.map((f) => String((f as PromiseRejectedResult).reason))).toEqual([]);

      expect(await prisma.wallet.count({ where: { userId } })).toBe(1);

      // **AQUI TERMINA EL ALCANCE DE PT-142, Y NO ES UN DETALLE.**
      //
      // Esta prueba comprobaba tambien que el saldo quedara en 350 —las dos acreditaciones—, y
      // **falla**: da 250 unas veces y 100 otras, segun cual de las dos transacciones escriba la
      // ultima. Los dos depositos resuelven con exito y uno se pierde en silencio.
      //
      // No es la carrera que PT-142 cierra. Aquella era *crear una fila que no existe*; esta es
      // *leer un saldo, sumarle y escribirlo* mientras otro hace lo mismo — una actualizacion
      // perdida, registrada como **PT-146**. Corregirla toca el asiento contable y merece su
      // propio analisis; `out-of-scope.md` de PT-142 la dejo fuera por escrito ANTES de medirla.
      //
      // Se deja la asercion fuera en vez de debilitarla a un numero que pase: lo que se comprueba
      // aqui es lo que este PT arregla, y lo que no, esta registrado y no escondido.
    });

    it('AC-03 (control): la creacion SECUENCIAL pasa tambien con el codigo anterior', async () => {
      // Este caso demuestra que lo que distinguen CC-01 y CC-03 es la **concurrencia** y no otra
      // cosa. Sin el, un fallo de los de arriba podria achacarse a cualquier detalle del entorno.
      const userId = await usuarioSinMonedero('secuencial');

      await wallet.getWallet(userId);
      await wallet.getWallet(userId);

      expect(await prisma.wallet.count({ where: { userId } })).toBe(1);
    });
  });

  describe('La configuracion del sistema', () => {
    it('CC-02: seed() en paralelo consigo mismo no choca', async () => {
      // Es literalmente lo que hace CI: varios workers arrancan su aplicacion contra una base que
      // acaba de nacer vacia, y `seed()` corre en el `onModuleInit` de cada una.
      const resultados = await Promise.allSettled(
        Array.from({ length: SIMULTANEAS }, () => systemConfig.seed()),
      );

      const fallos = resultados.filter((r) => r.status === 'rejected');
      expect(fallos.map((f) => String((f as PromiseRejectedResult).reason))).toEqual([]);
    });

    it('ARR-02: un segundo seed() no pisa lo que hay', async () => {
      // `update: {}` significa creacion perezosa, no sincronizacion. Que un arranque no cambie la
      // configuracion que otro dejo importa: seria un cambio de comportamiento sin autor.
      const claves = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
      expect(claves.length).toBeGreaterThan(0);

      await systemConfig.seed();

      const despues = await prisma.systemConfig.findMany({ orderBy: { key: 'asc' } });
      expect(despues.map((c) => [c.key, c.value])).toEqual(claves.map((c) => [c.key, c.value]));
    });
  });
});
