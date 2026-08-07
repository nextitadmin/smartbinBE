import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { bullmqModuleConfigOpts } from '@src/config/bullmq.config';
import { Topics } from '@common/topics';

@Global()
@Module({
  imports: [
    BullModule.forRootAsync(bullmqModuleConfigOpts),
    BullModule.registerQueue({
      name: Topics.Queues.Transactions,
    }),
  ],
  exports: [BullModule],
})
export class QueuesModule {}
