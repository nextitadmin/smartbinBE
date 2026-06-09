import { NotificationType } from '@models/notification.model';

export const MailNotificationEvents = Object.freeze({
  Account: {
    ForgotPassword: 'password.forgot.account',
    VerificatonCode: 'verification.code.account',
    PayerGenerated: 'generated.payer.account',
    VerificationOTP: 'verificaton.otp.account',
    Welcome: 'welcome.account',
    ResetPassword: 'password.reset.account',
  },
  Application: {
    SmartBinUpdate: 'notification.smartbin.updated',
    PickupUpdate: 'notification.pickup.updated',
    WalletUpdate: 'notification.wallet.updated',
    LowWalletBalance: 'notification.wallet.low',
    GeneralAppUpdate: 'notification.app.update',
  },
  Support: {
    NewRequest: 'support.new.request',
  },
});

export enum Templates {
  ForgotPassword = 'forgot-password',
  ResetPassword = 'reset-password',
  LoginCode = 'login-code',
  PayerGenerated = 'payer-generated',
  VerificationOTP = 'verify-otp',
  Welcome = 'welcome',
  SmartBinUpdate = 'smartbin-update',
  PickupUpdate = 'pickup-update',
  WalletUpdate = 'wallet-update',
  LowWalletBalance = 'low-balance',
  GeneralAppUpdate = 'app-update',
  SupportRequest = 'support-request',
}

export interface SendEmailEventData {
  to: string;
  from: string;
  subject: string;
  context: any;
  replyTo?: string;
}

export class SendEmailEvent {
  constructor(public data: SendEmailEventData) {}
}

export const InAppNotificationEvents = Object.freeze({
  SmartBinUpdate: 'notification.smartbin.updated',
  PickupUpdate: 'notification.pickup.updated',
  WalletUpdate: 'notification.wallet.updated',
  LowWalletBalance: 'notification.wallet.low',
  GeneralAppUpdate: 'notification.app.update',
  SupportRequest: 'support.new.request',
});

export interface SendInAppEventData {
  userId: string;
  type: NotificationType;
  email?: string;
  isRead: boolean;
  text: string;
  subject?: string;
}

export class SendInAppEvent {
  constructor(public data: SendInAppEventData) {}
}
