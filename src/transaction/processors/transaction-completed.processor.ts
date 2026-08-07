import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { Topics } from '@common/topics';
import { TransactionCompletedJob } from '../dto/transaction-completed.job';
import { TransactionService } from '../transaction.service';

@Processor(Topics.Queues.Transactions)
export class TransactionCompletedProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionCompletedProcessor.name);

  constructor(private readonly transactionService: TransactionService) {
    super();
  }

  async process(job: Job<TransactionCompletedJob>): Promise<void> {
    if (job.name !== Topics.Jobs.TransactionCompleted) {
      this.logger.warn({
        message: 'Ignoring unexpected job name',
        jobName: job.name,
        jobId: job.id,
      });
      return;
    }

    this.logger.log({
      message: 'Processing transaction.completed',
      reference: job.data.reference,
      jobId: job.id,
      attempt: job.attemptsMade + 1,
    });

    await this.transactionService.completeFromWebhook(job.data);
  }
}
