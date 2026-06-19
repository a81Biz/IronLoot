import { Module } from '@nestjs/common';
import { CfdiService } from './cfdi.service';
import { SystemConfigModule } from '../system-config/system-config.module';

@Module({
  imports: [SystemConfigModule],
  providers: [CfdiService],
  exports: [CfdiService],
})
export class CfdiModule {}
