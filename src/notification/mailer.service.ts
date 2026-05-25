import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { readFileSync } from 'fs';
import { renderString } from 'nunjucks';
import path from 'path';
import { Resend } from 'resend';
import { MailNotificationEvents, SendEmailEvent, Templates } from './dto/event';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class MailerService {
  private resend: Resend;

  constructor(private readonly configService: ConfigService<ConfigAttributes>) {
    // Retrieve your Resend API key from your config service
    // const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  compileTemplate(templateName: string, context: Record<string, any>) {
    try {
      const templateFilePath = path.join(
        __dirname,
        `../assets/${templateName}.html`,
      );
      const getFileContent = readFileSync(templateFilePath).toString();
      return renderString(getFileContent, {
        ...context,
      });
    } catch (error) {
      throw new Error(
        `Template '${templateName}.html' not found in assets directory`,
      );
    }
  }

  async sendMail(options: any) {
    const html = this.compileTemplate(options.template, options.context);
    const from = options.from ?? 'Medama <noreply@medama.ng>';

    // Format attachments from Multer format to Resend format if they exist
    const attachments = options.attachments?.map((file: any) => ({
      filename: file.filename,
      content: file.content, // Resend accepts Buffer streams directly
    }));

    try {
      const data = await this.resend.emails.send({
        from,
        to: options.to,
        subject: options.subject,
        html,
        ...(attachments && { attachments }),
      });
      console.log('Email sent successfully:', data);
    } catch (error) {
      console.error('Failed to send email:', error);
    }
  }

  @OnEvent(MailNotificationEvents.Account.PayerGenerated)
  async onAccountPayerGenerated(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.PayerGenerated,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Account.Welcome)
  async onAccountWelcome(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.Welcome,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Account.ResetPassword)
  async onAccountResetPassword(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.ResetPassword,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Account.ForgotPassword)
  async onAccountReset(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.ForgotPassword,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Account.VerificationOTP)
  async onAccountOTPRequested(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.VerifyOTP,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Application.SmartBinUpdate)
  async onSmartBinUpdate(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.SmartBinUpdate,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Application.GeneralAppUpdate)
  async onAppUpdate(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.GeneralAppUpdate,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Application.LowWalletBalance)
  async onLowBalance(event: SendEmailEvent) {
    const { from, context, to, subject } = event.data;
    await this.sendMail({
      from,
      template: Templates.LowWalletBalance,
      to,
      context,
      subject,
    });
  }

  @OnEvent(MailNotificationEvents.Support.NewRequest)
  async onSupportRequest(event: SendEmailEvent, file?: Express.Multer.File) {
    await this.sendMail({
      to: event.data.to,
      from: event.data.from,
      subject: event.data.subject,
      context: event.data.context,
      template: Templates.SupportRequest,
      attachments: file
        ? [
            {
              filename: file.originalname,
              content: file.buffer,
            },
          ]
        : [],
    });
  }
}