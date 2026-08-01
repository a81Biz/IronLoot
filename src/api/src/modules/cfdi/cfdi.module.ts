import { Module } from '@nestjs/common';
import { CfdiService } from './cfdi.service';
import { CfdiPacRegistry } from './cfdi-pac.registry';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [SystemConfigModule],
  // PT-237 — `CFDI_PAC_PROVIDERS` no lo provee nadie, y ese es el estado correcto: cero PAC
  // integrados. `CfdiPacRegistry` lo inyecta como `@Optional()` y responde cero, que es lo que la
  // pantalla de configuracion necesita poder decir. El dia que haya contrato con un PAC, su adaptador
  // se registra aqui y `available()` lo ofrece sin tocar nada mas. Ver `TD-001`.
  providers: [CfdiService, CfdiPacRegistry],
  exports: [CfdiService],
})
export class CfdiModule {}
