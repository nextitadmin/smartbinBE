import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SubscriptionPlan } from '@models/subscription-plan.model';
import { Subscription, SubscriptionStatus } from '@models/subscription.model';
import { SubscriptionService } from './subscription.service';

jest.mock('@models/transaction.model', () => ({
  Transaction: { name: 'Transaction' },
  TransactionStatus: { Successful: 'successful' },
}));

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  let updateMany: jest.Mock;

  beforeEach(async () => {
    updateMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        {
          provide: getModelToken(SubscriptionPlan.name),
          useValue: {},
        },
        {
          provide: getModelToken(Subscription.name),
          useValue: { updateMany },
        },
        {
          provide: getModelToken('Transaction'),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get(SubscriptionService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('expireOverdueSubscriptions', () => {
    it('marks active subscriptions whose endDate has passed as expired', async () => {
      updateMany.mockResolvedValue({
        matchedCount: 3,
        modifiedCount: 3,
      });

      const before = Date.now();
      const result = await service.expireOverdueSubscriptions();
      const after = Date.now();

      expect(updateMany).toHaveBeenCalledTimes(1);
      const [filter, update] = updateMany.mock.calls[0];

      expect(filter).toEqual({
        status: SubscriptionStatus.ACTIVE,
        endDate: { $lte: expect.any(Date) },
      });
      expect(filter.endDate.$lte.getTime()).toBeGreaterThanOrEqual(before);
      expect(filter.endDate.$lte.getTime()).toBeLessThanOrEqual(after);
      expect(update).toEqual({
        $set: { status: SubscriptionStatus.EXPIRED },
      });

      expect(result.matchedCount).toBe(3);
      expect(result.expiredCount).toBe(3);
      expect(result.expiredAt).toBeInstanceOf(Date);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('is idempotent when no overdue subscriptions exist', async () => {
      updateMany.mockResolvedValue({
        matchedCount: 0,
        modifiedCount: 0,
      });

      const result = await service.expireOverdueSubscriptions();

      expect(result.matchedCount).toBe(0);
      expect(result.expiredCount).toBe(0);
    });

    it('reports already-expired documents as matched but not modified', async () => {
      updateMany.mockResolvedValue({
        matchedCount: 2,
        modifiedCount: 0,
      });

      const result = await service.expireOverdueSubscriptions();

      expect(result.matchedCount).toBe(2);
      expect(result.expiredCount).toBe(0);
    });
  });
});
