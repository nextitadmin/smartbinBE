import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigAttributes } from '@src/config';
import { SubscriptionService } from './subscription.service';

@Injectable()
export class SubscriptionWorker implements OnApplicationBootstrap {
  static readonly JOB_NAME = 'subscription-expiry';

  private readonly logger = new Logger(SubscriptionWorker.name);
  private inFlight = false;

  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly config: ConfigService<ConfigAttributes>,
  ) {}

  onApplicationBootstrap() {
    void this.expireOverdueSubscriptions();
  }

  @Cron(CronExpression.EVERY_HOUR, {
    name: SubscriptionWorker.JOB_NAME,
    timeZone: 'Africa/Lagos',
  })
  async expireOverdueSubscriptions() {
    if (!this.isEnabled()) {
      return;
    }

    if (this.inFlight) {
      this.logger.warn(
        'Subscription expiry job skipped because a run is already in progress',
      );
      return;
    }

    this.inFlight = true;

    try {
      const result =
        await this.subscriptionService.expireOverdueSubscriptions();

      this.logger.log(
        `Subscription expiry job completed: expired=${result.expiredCount} matched=${result.matchedCount} durationMs=${result.durationMs}`,
      );
    } catch (error) {
      this.logger.error(
        'Subscription expiry job failed',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.inFlight = false;
    }
  }

  private isEnabled() {
    return (
      this.config.get('subscriptionExpiry.enabled', { infer: true }) !== false
    );
  }
}
