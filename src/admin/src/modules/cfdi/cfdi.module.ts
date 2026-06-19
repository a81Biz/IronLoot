import { Module } from '@nestjs/common';
import { CfdiController } from './cfdi.controller';
import { CfdiService } from './cfdi.service';

@Module({
  controllers: [CfdiController],
  providers: [CfdiService],
})
export class CfdiModule {}
