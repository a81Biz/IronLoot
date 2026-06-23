import { Module, Global } from '@nestjs/common';
import { AdminApiClient } from './admin-api-client.service';

@Global()
@Module({
  providers: [AdminApiClient],
  exports: [AdminApiClient],
})
export class SharedModule {}
