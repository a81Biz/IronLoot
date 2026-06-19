import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller';
import { DevelopmentOnlyGuard } from '../../common/guards/development-only.guard';

/**
 * DiagnosticsModule
 *
 * Provides endpoints for viewing logs, errors, and metrics.
 * Should only be enabled in non-production environments.
 */
@Module({
  controllers: [DiagnosticsController],
  providers: [DevelopmentOnlyGuard],
})
export class DiagnosticsModule {}
