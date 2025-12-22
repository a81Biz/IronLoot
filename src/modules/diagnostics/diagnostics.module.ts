import { Module } from '@nestjs/common';
import { DiagnosticsController } from './diagnostics.controller';

/**
 * DiagnosticsModule
 *
 * Provides endpoints for viewing logs, errors, and metrics.
 * Should only be enabled in non-production environments.
 */
@Module({
  controllers: [DiagnosticsController],
})
export class DiagnosticsModule {}
