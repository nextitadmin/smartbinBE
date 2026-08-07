export interface TransactionCompletedJob {
  reference: string;
  gatewayResponse: Record<string, unknown>;
  provider: string;
  receivedAt: string;
}
