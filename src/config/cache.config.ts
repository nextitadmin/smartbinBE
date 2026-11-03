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

    const keyv = createKeyv(redisUrl, {
      namespace: 'SMTBIN',
      throwOnConnectError: true,
      throwOnErrors: true,
      connectionTimeout: 5000,
    });

    // The raw Redis client emits 'error' on socket drops. Without a listener
    // Node treats that as fatal and the whole process exits.
    const redisClient = (
      keyv.store as unknown as {
        client?: { on: (event: 'error', cb: (err: Error) => void) => void };
      }
    ).client;
    redisClient?.on('error', (err) => {
      logger.error(`Redis connection error: ${err.message}`);
    });

    return {
      stores: [keyv],
      ttl: DEFAULT_TTL_MS,
    };
  },
  inject: [ConfigService],
};
