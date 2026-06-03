import { Injectable } from '@nestjs/common';

@Injectable()
export class FeatureFlagsService {
  isEnabled(flag: string): boolean {
    return process.env[flag] === 'true';
  }
}
