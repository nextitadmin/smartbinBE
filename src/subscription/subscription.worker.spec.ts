import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { SubscriptionWorker } from './subscription.worker';

jest.mock('@models/transaction.model', () => ({
  Transaction: { name: 'Transaction' },
  TransactionStatus: { Successful: 'successful' },
}));

describe('SubscriptionWorker', () => {
  let worker: SubscriptionWorker;
  let expireOverdueSubscriptions: jest.Mock;
  let configGet: jest.Mock;
  let loggerError: jest.SpyInstance;
  let loggerWarn: jest.SpyInstance;
  let loggerLog: jest.SpyInstance;

  beforeEach(async () => {
    expireOverdueSubscriptions = jest.fn().mockResolvedValue({
      matchedCount: 1,
      expiredCount: 1,
      durationMs: 4,
      expiredAt: new Date(),
    });
    configGet = jest.fn().mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionWorker,
        {
          provide: SubscriptionService,
          useValue: { expireOverdueSubscriptions },
        },
        {
          provide: ConfigService,
          useValue: { get: configGet },
        },
      ],
    }).compile();

    worker = module.get(SubscriptionWorker);
    loggerError = jest.spyOn(worker['logger'], 'error').mockImplementation();
    loggerWarn = jest.spyOn(worker['logger'], 'warn').mockImplementation();
    loggerLog = jest.spyOn(worker['logger'], 'log').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(worker).toBeDefined();
  });

  it('expires overdue subscriptions when enabled', async () => {
    await worker.expireOverdueSubscriptions();

    expect(expireOverdueSubscriptions).toHaveBeenCalledTimes(1);
    expect(loggerLog).toHaveBeenCalled();
  });

  it('does not run when the expiry job is disabled', async () => {
    configGet.mockReturnValue(false);

    await worker.expireOverdueSubscriptions();

    expect(expireOverdueSubscriptions).not.toHaveBeenCalled();
  });

  it('skips a overlapping run while a job is in flight', async () => {
    let resolveJob: (value: unknown) => void;
    expireOverdueSubscriptions.mockReturnValue(
      new Promise((resolve) => {
        resolveJob = resolve;
      }),
    );

    const firstRun = worker.expireOverdueSubscriptions();
    const overlappingRun = worker.expireOverdueSubscriptions();

    await overlappingRun;

    expect(expireOverdueSubscriptions).toHaveBeenCalledTimes(1);
    expect(loggerWarn).toHaveBeenCalledWith(
      'Subscription expiry job skipped because a run is already in progress',
    );

    resolveJob({
      matchedCount: 0,
      expiredCount: 0,
      durationMs: 1,
      expiredAt: new Date(),
    });
    await firstRun;
  });

  it('swallows service errors so the scheduler keeps running', async () => {
    expireOverdueSubscriptions.mockRejectedValue(new Error('mongo timeout'));

    await expect(worker.expireOverdueSubscriptions()).resolves.toBeUndefined();
    expect(loggerError).toHaveBeenCalled();
  });

  it('runs a sweep when the application boots', () => {
    const expireSpy = jest
      .spyOn(worker, 'expireOverdueSubscriptions')
      .mockResolvedValue(undefined);

    worker.onApplicationBootstrap();

    expect(expireSpy).toHaveBeenCalledTimes(1);
  });
});
