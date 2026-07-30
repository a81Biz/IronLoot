import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ThrottlerRedisModule } from '../../common/redis/throttler-redis.module';

@Module({
  // PT-178 (H-026) — Sin esto, `/health/detailed` decia «Redis check not implemented» y **nunca** podia
  // dar `healthy`; una caida real de Redis era indistinguible del funcionamiento normal.
  imports: [ThrottlerRedisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
