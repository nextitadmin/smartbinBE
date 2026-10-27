import { SharedBullAsyncConfiguration } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

export const bullmqModuleConfigOpts: SharedBullAsyncConfiguration = {
  useFactory: (configService: ConfigService) => {
    const redisUrl = configService.get<string>('CACHE_URL');

    if (!redisUrl) {
      throw new Error('REDIS is required for BullMQ');
    }

    return {
      connection: {
        url: redisUrl,
      },
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    };
  },
  inject: [ConfigService],
};
