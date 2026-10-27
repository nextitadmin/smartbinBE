import { CacheModuleAsyncOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { createKeyv } from '@keyv/redis';

const logger = new Logger('CacheModule');
const DEFAULT_TTL_MS = 1 * 60 * 1000; // 10mins

export const cacheModuleConfigOpts: CacheModuleAsyncOptions = {
  isGlobal: true,
  useFactory: async (configService: ConfigService) => {
    const redisUrl = configService.get<string>('CACHE_URL');

    if (!redisUrl) {
      logger.warn(
        'CACHE_URL is not set; using in-memory cache. Values will not persist across restarts.',
      );
      return { ttl: DEFAULT_TTL_MS };
    }

    return {
      stores: [
        createKeyv(redisUrl, {
          namespace: 'SMTBIN',
          throwOnConnectError: true,
          throwOnErrors: true,
          connectionTimeout: 5000,
        }),
      ],
      ttl: DEFAULT_TTL_MS,
    };
  },
  inject: [ConfigService],
};
