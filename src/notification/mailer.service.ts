import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { readFileSync } from 'fs';
import { createTransport, Transporter } from 'nodemailer';
import { renderString } from 'nunjucks';
import path from 'path';
import { MailNotificationEvents, SendEmailEvent, Templates } from './dto/event';
import { OnEvent } from '@nestjs/event-emitter';
import { template } from 'handlebars';

@Injectable()
export class MailerService {
  private mailer: Transporter;
  constructor(private readonly configService: ConfigService<ConfigAttributes>) {
    const { smtp_host, smtp_password, smtp_user, smtp_port } =
      this.configService.get('mail', { infer: true });

    this.mailer = createTransport({
      host: smtp_host,
      port: +smtp_port,
      auth: {
        user: smtp_user,
        pass: smtp_password,
      },
    });
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
    options.html = this.compileTemplate(options.template, options.context);
    options.from = '"LAWMA REG" <no-reply@healthrak.com>'; // will remove later
    await this.mailer.sendMail(options).then(console.log).catch(console.error);
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
    })
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
            contentType: file.mimetype,
          },
        ]
        : [],
    });
  }
}
