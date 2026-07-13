export const events = Object.freeze({
  sendEmail: 'send-email',
  kyc: {
    upgraded: 'kyc.upgraded',
  },
  verification: {
    verified: 'verification.verified',
  },
  beneficiary: {
    added: 'beneficiary.added',
  },
  transactions: {
    updated: 'transaction.updated',
  },
  webhook: {
    requestReceived: 'webhook.request.received',
  },
  bills: {
    purchased: 'bills.purchased',
  },
  notifications: {
    created: 'created.notifications.new',
  },
});

export enum EmailTemplates {
  VerifyOtp = 'verify-otp',
  ResetPassword = 'reset-password',
}

export enum SupportedCurrency {
  NGN = 'NGN',
}

export enum TransactionNarrations {
  WalletTopup = 'Wallet Topup',
  BillPayment = 'Bill Payment',
}

export const UtilityBillServiceCategories = [];

export const REMOVE_EXTRA_CHARS_REGEX = /[^\w\s]/gi;

export const ErrorMessages = Object.freeze({
  DUPLICATE_EMAIL: 'Email already exists',
  DUPLICATE_TEAM_EMAIL: 'Team member with this email already exists',
});

export enum ApplicationEnvironment {
  Development = 'development',
  Staging = 'staging',
  Production = 'production',
}
