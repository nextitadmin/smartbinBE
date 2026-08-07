/**
 * Central registry for BullMQ queue names and job names.
 * Prefer Topics over string literals when producing/consuming jobs.
 */
export const Topics = Object.freeze({
  Queues: {
    Transactions: 'transactions',
    Notifications: 'notifications',
  },
  Jobs: {
    TransactionCompleted: 'transaction.completed',
  },
} as const);

export type TopicQueueName =
  (typeof Topics.Queues)[keyof typeof Topics.Queues];
export type TopicJobName = (typeof Topics.Jobs)[keyof typeof Topics.Jobs];
