import { Module } from '@nestjs/common';
import { SystemCleanupService } from './system-cleanup.service';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  providers: [SystemCleanupService],
})
export class SystemCleanupModule {}
