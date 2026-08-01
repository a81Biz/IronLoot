import { readFileSync } from 'fs';
import { join } from 'path';
import { Test } from '@nestjs/testing';
import { BadRequestException, NotImplementedException } from '@nestjs/common';
import { CfdiService } from '@/modules/cfdi/cfdi.service';
import { CfdiPacRegistry } from '@/modules/cfdi/cfdi-pac.registry';
import { PrismaService } from '@/database/prisma.service';
import { SystemConfigService } from '@/modules/system-config/system-config.service';
import { raizDelMonorepo } from '../../../scripts/raiz-monorepo';

/**
 * PT-237 — **Un PAC se elige de un conjunto declarado; hoy ese conjunto está vacío, y eso se dice.**
 *
 * ## Qué había
 *
 * La pantalla de configuración ofrecía `CFDI_ENABLED`, `CFDI_RFC_EMISOR` y un `<input type="url">`
 * libre para la URL del PAC. Con eso, el sistema aceptaba **una decisión que no podía honrar**: no
 * sabía qué PAC era, no validaba que fuese uno conocido, y no tenía adaptador para ninguno.
 *
 * Y hacerlo **empeoraba** el estado:
 *
 *   1. `generate()` escribía `status: 'PENDING'` y **acto seguido lanzaba**. Medido: ningún punto del
 *      sistema lee un `cfdiRecord` en `PENDING` para avanzarlo — sólo se **cuentan**, en el panel. Así
 *      que cada intento dejaba una fila muerta y el contador de «CFDI pendientes» **sólo podía crecer**.
 *   2. El mensaje decía *«implement a concrete `ICfdiPacProvider` (`@ironloot/core integrations`)»*, y
 *      **`integrations/` se retiró entero en PT-193 (`TD-024`)** por no tener implementadores. Quien
 *      siguiera la instrucción iba a un sitio que no existe: H-016 dentro del código que se ejecuta.
 *
 * ## Lo que esta guarda NO exige
 *
 * **No exige que haya un PAC integrado.** Sigue siendo `TD-001`: un PAC certificado es una dependencia
 * externa con contrato y credenciales. Lo que exige es que **el sistema no pida lo que no puede
 * recibir**, y que no escriba un estado que nadie avanza.
 *
 * Por eso `AC-01` comprueba que el registro puede estar **vacío** sin que nada se rompa: cero es hoy la
 * respuesta correcta, y el día que deje de serlo esta guarda seguirá valiendo.
 */
const RAIZ = raizDelMonorepo();
const SERVICIO = join(RAIZ, 'src/api/src/modules/cfdi/cfdi.service.ts');

describe('La selección del PAC se declara, no se simula — PT-237', () => {
  let service: CfdiService;
  let registro: CfdiPacRegistry;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma: any = { cfdiRecord: { upsert: jest.fn(), findUnique: jest.fn() } };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cfg: any = { get: jest.fn(), set: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const mod = await Test.createTestingModule({
      providers: [
        CfdiService,
        CfdiPacRegistry,
        { provide: PrismaService, useValue: prisma },
        { provide: SystemConfigService, useValue: cfg },
      ],
    }).compile();
    service = mod.get(CfdiService);
    registro = mod.get(CfdiPacRegistry);
  });

  describe('AC-1: activar la facturación exige un PAC disponible', () => {
    it('sin ningún PAC integrado, activar falla NOMBRANDO el motivo', async () => {
      // El mensaje tiene que decir qué falta, no «error de configuración». Quien lee esto está
      // intentando facturar y necesita saber que le falta una integración, no un campo.
      await expect(service.updateConfig({ enabled: true }, 'admin')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      await expect(service.updateConfig({ enabled: true }, 'admin')).rejects.toThrow(/PAC/i);
      expect(cfg.set).not.toHaveBeenCalledWith('CFDI_ENABLED', 'true', 'admin');
    });

    it('AC-1b (control): APAGARLO siempre se puede, haya PAC o no', () => {
      // Sin esta mitad, bastaría con rechazar todo `updateConfig` y el caso de arriba pasaría. Y
      // además es la dirección segura: nunca se impide desactivar un subsistema.
      return expect(service.updateConfig({ enabled: false }, 'admin')).resolves.toBeUndefined();
    });
  });

  describe('AC-2: la clave del proveedor se valida contra el registro', () => {
    it('una clave que nadie ha registrado se rechaza', async () => {
      await expect(
        service.updateConfig({ pacProvider: 'el-pac-de-mi-primo' }, 'admin'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(cfg.set).not.toHaveBeenCalledWith('CFDI_PAC_PROVIDER', 'el-pac-de-mi-primo', 'admin');
    });

    it('AC-2b (control): la cadena vacía es «ninguno», y se acepta', async () => {
      // Poder volver a «sin proveedor» es lo que hace reversible la configuración. Si esto fallara,
      // una clave mal puesta dejaría la instalación atascada.
      await expect(service.updateConfig({ pacProvider: '' }, 'admin')).resolves.toBeUndefined();
      expect(cfg.set).toHaveBeenCalledWith('CFDI_PAC_PROVIDER', '', 'admin');
    });
  });

  describe('AC-3: `generate()` no escribe un estado que nadie avanza', () => {
    it('sin PAC, no queda ninguna fila en PENDING', async () => {
      cfg.get.mockImplementation((k: string) =>
        Promise.resolve(
          k === 'CFDI_ENABLED' ? 'true' : k === 'CFDI_RFC_EMISOR' ? 'AAA010101AAA' : undefined,
        ),
      );

      await expect(service.generate('o1')).rejects.toBeInstanceOf(NotImplementedException);

      const escritos = prisma.cfdiRecord.upsert.mock.calls.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (c: any[]) => c[0].create.status,
      );

      // Se comprueba que SE ESCRIBIÓ algo —el registro del intento fallido sigue siendo útil— y que
      // ninguno de esos estados es `PENDING`. Sin la primera mitad, un método que no escribiera nada
      // pasaría este caso sin cumplir su propósito.
      expect(escritos.length).toBeGreaterThan(0);
      expect(escritos).not.toContain('PENDING');
      expect(escritos.every((e: string) => e === 'ERROR')).toBe(true);
    });
  });

  describe('AC-4: ningún mensaje del módulo nombra lo que no existe', () => {
    it('no se cita `@ironloot/core integrations`, retirado entero por PT-193', () => {
      const fuente = readFileSync(SERVICIO, 'utf-8');

      expect(fuente).not.toMatch(/ICfdiPacProvider/);
      expect(fuente).not.toMatch(/core\s+integrations/);
    });

    it('AC-4b (control): la guarda está leyendo el fichero de verdad', () => {
      // Sin esto, una ruta equivocada daría un fichero vacío y los dos `not.toMatch` de arriba
      // pasarían por no tener nada que leer. Es el modo exacto en que `forma-de-lista-ssr.spec.ts`
      // salió verde cruzando cero plantillas.
      const fuente = readFileSync(SERVICIO, 'utf-8');

      expect(fuente).toContain('class CfdiService');
      expect(fuente.length).toBeGreaterThan(1500);
    });
  });

  describe('casos de control del registro', () => {
    it('AC-01: el registro puede estar vacío, y hoy lo está', () => {
      // **Cero es la respuesta correcta hoy**, y decirlo es el objetivo de este PT. El día que se
      // integre un PAC, este caso cambiará su cifra — no su sentido.
      expect(registro.all()).toEqual([]);
      expect(registro.available()).toEqual([]);
      expect(registro.resolve('cualquiera')).toBeNull();
    });

    it('AC-02: `available()` es un subconjunto de `all()`, no una lista aparte', () => {
      // La distinción que `PaymentProviderRegistry` ya hace: registrado no es lo mismo que
      // configurado. Se comprueba la relación, no las cifras, para que siga valiendo con proveedores.
      const claves = new Set(registro.all().map((p) => p.clave));

      expect(registro.available().every((p) => claves.has(p.clave))).toBe(true);
    });
  });
});
