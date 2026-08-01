import {
  BadRequestException,
  Injectable,
  Logger,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { SystemConfigService } from '../system-config/system-config.service';
import { CfdiPacRegistry } from './cfdi-pac.registry';

@Injectable()
export class CfdiService {
  private readonly logger = new Logger(CfdiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemConfig: SystemConfigService,
    private readonly pacs: CfdiPacRegistry,
  ) {}

  async getCfdi(orderId: string): Promise<any> {
    return (this.prisma as any).cfdiRecord.findUnique({ where: { orderId } });
  }

  async list(page = 1, limit = 20, status?: string): Promise<any> {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      (this.prisma as any).cfdiRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      (this.prisma as any).cfdiRecord.count({ where }),
    ]);
    return { data, meta: { total, page, limit, pages: Math.ceil(total / limit) } };
  }

  async generate(orderId: string): Promise<any> {
    // PT-047 (AUD-016): CFDI is OFF by default and can be toggled on in Admin > Configuration once
    // a certified PAC is configured. While disabled, orders complete without a fiscal invoice.
    const enabled = (await this.systemConfig.get('CFDI_ENABLED')) === 'true';
    if (!enabled) {
      throw new ServiceUnavailableException(
        'CFDI está deshabilitado. Actívalo en Configuración (CFDI_ENABLED) cuando el PAC esté configurado.',
      );
    }

    const rfc = await this.systemConfig.get('CFDI_RFC_EMISOR');
    const clave = (await this.systemConfig.get('CFDI_PAC_PROVIDER')) ?? '';
    const pac = this.pacs.resolve(clave);

    // PT-237 — **Un solo camino de fallo, y nunca deja el registro en un estado que nadie avanza.**
    //
    // Antes había dos: sin configuración escribía `ERROR`; con configuración escribía `PENDING` y
    // lanzaba igual. Y `PENDING` no lo lee nadie —medido: cero puntos del sistema lo avanzan, sólo se
    // **cuenta** en el panel—, así que cada intento dejaba una fila muerta y el contador de «CFDI
    // pendientes» sólo podía crecer. Un contador que miente y pide una acción que no existe.
    //
    // `PENDING` significa «se envió al PAC y esperamos su respuesta». Mientras no haya PAC, ese
    // estado **no puede ser cierto**, y escribirlo es afirmar algo que no ocurrió.
    const motivo = !rfc
      ? 'CFDI no configurado: falta el RFC emisor'
      : !pac
        ? 'CFDI no configurado: no hay ningún PAC seleccionado, o el seleccionado no está integrado'
        : !pac.estaConfigurado()
          ? `El PAC «${pac.nombre}» está seleccionado pero su configuración está incompleta`
          : null;

    if (motivo) {
      await (this.prisma as any).cfdiRecord.upsert({
        where: { orderId },
        create: { orderId, status: 'ERROR', errorMessage: motivo },
        update: { status: 'ERROR', errorMessage: motivo },
      });
      this.logger.warn(`CFDI ${orderId}: ${motivo}`);
      throw new NotImplementedException(
        `${motivo}. Timbrar una factura exige un PAC certificado: es una dependencia externa, ` +
          'registrada como `TD-001`. Para integrarlo, registra un adaptador que cumpla ' +
          '`CfdiPacProvider` en `CFDI_PAC_PROVIDERS` (`cfdi.module.ts`).',
      );
    }

    // Con un PAC integrado y configurado, aquí iría el timbrado. `PENDING` se escribirá **entonces**,
    // que es cuando será cierto. Hoy no se llega: `available()` está vacío y `CFDI_ENABLED` no puede
    // activarse sin él.
    throw new NotImplementedException(
      `El PAC «${pac?.nombre}» está registrado pero su timbrado no está implementado.`,
    );
  }

  async cancel(orderId: string): Promise<void> {
    await (this.prisma as any).cfdiRecord.update({
      where: { orderId },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
  }

  /**
   * PT-237 — La configuración incluye **qué se puede elegir**, no sólo lo elegido.
   *
   * Sin `proveedores`, la pantalla no tiene forma de decir *por qué* el desplegable está vacío, y
   * volvería a ofrecer un campo libre. La lista **es** la explicación.
   */
  async getConfig(): Promise<any> {
    return {
      enabled: (await this.systemConfig.get('CFDI_ENABLED')) === 'true',
      rfcEmisor: (await this.systemConfig.get('CFDI_RFC_EMISOR')) ?? '',
      pacProvider: (await this.systemConfig.get('CFDI_PAC_PROVIDER')) ?? '',
      pacUrl: (await this.systemConfig.get('CFDI_PAC_URL')) ?? '',
      pacApiKey: '****',
      proveedores: this.pacs.available().map((p) => ({ clave: p.clave, nombre: p.nombre })),
      hayProveedores: this.pacs.available().length > 0,
    };
  }

  async updateConfig(
    data: {
      enabled?: boolean;
      rfcEmisor?: string;
      pacProvider?: string;
      pacUrl?: string;
      pacApiKey?: string;
    },
    adminUser: string,
  ): Promise<void> {
    // Se valida TODO antes de escribir NADA: una validación intercalada dejaría la configuración a
    // medias si la segunda comprobación falla, y el operador vería un error habiendo cambiado cosas.
    if (data.pacProvider) {
      const pac = this.pacs.resolve(data.pacProvider);
      if (!pac) {
        throw new BadRequestException(
          `«${data.pacProvider}» no es un PAC integrado en este sistema. ` +
            `Integrados hoy: ${this.pacs.all().length}. Ver \`TD-001\`.`,
        );
      }
    }

    // **Activar exige un PAC disponible; desactivar siempre se puede.** La asimetría es del dominio:
    // encender un subsistema que no puede funcionar es lo que hacía el interruptor hasta hoy, y nunca
    // se impide apagar algo — esa dirección es la segura.
    if (data.enabled === true && this.pacs.available().length === 0) {
      throw new BadRequestException(
        'No se puede activar la facturación: no hay ningún PAC integrado en este sistema. ' +
          'Timbrar exige un PAC certificado, que es una dependencia externa registrada como `TD-001`.',
      );
    }

    if (data.enabled !== undefined)
      await this.systemConfig.set('CFDI_ENABLED', String(data.enabled), adminUser);
    if (data.rfcEmisor !== undefined)
      await this.systemConfig.set('CFDI_RFC_EMISOR', data.rfcEmisor, adminUser);
    // La cadena vacía es «ninguno», y tiene que poder escribirse: es lo que hace reversible una
    // elección equivocada. Por eso se compara con `undefined`, nunca por falsy.
    if (data.pacProvider !== undefined)
      await this.systemConfig.set('CFDI_PAC_PROVIDER', data.pacProvider, adminUser);
    if (data.pacUrl !== undefined)
      await this.systemConfig.set('CFDI_PAC_URL', data.pacUrl, adminUser);
    if (data.pacApiKey !== undefined)
      await this.systemConfig.set('CFDI_PAC_API_KEY', data.pacApiKey, adminUser);
  }
}
