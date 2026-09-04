import { comparePassword } from '@common/utils';
import { PSP } from '@models/psp.model';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import * as jwt from 'jsonwebtoken';
import { InjectModel } from '@nestjs/mongoose';
import { CacheKeys } from '@src/shared/constants';
import { Cache } from 'cache-manager';
import { Model } from 'mongoose';
import {
  PspForgotPasswordDto,
  PspLoginDto,
  PspResetPasswordDto,
  PspVerifyResetCodeDto,
} from '../../dto/psp.dto';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { ApplicationEnvironment } from '@common/constants';
import { PSPUsers } from '@models/psp-users.model';
import { Request as UserRequest } from 'express';
import { AuditLogEvents, LogActionEvent } from '@src/lawma/audit-log/dto/event';
import { LOGTYPE, UserType } from '@models/audit-log.model';

@Injectable()
export class PspAuthService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    @InjectModel(PSPUsers.name) private readonly pspUserModel: Model<PSPUsers>,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private ee: EventEmitter2,
  ) {}

  get isProduction() {
    const environment = this.configService.get('applicationEnvironment');
    return environment === ApplicationEnvironment.Production;
  }

  async login(body: PspLoginDto) {
    const { email, password } = body;

    const psp = await this.pspUserModel.findOne({ email: email });

    if (!psp) {
      throw new NotFoundException('Psp not found');
    }

    if (psp.status !== 'active') {
      throw new UnauthorizedException(
        'Your account is currently deactivated. Please contact support your administrator',
      );
    }

    const isPasswordMatch = comparePassword(password, psp.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const loginCode = !this.isProduction
      ? '12345'
      : Math.floor(10000 + Math.random() * 90000).toString();

    await this.cacheService.set(
      CacheKeys.PspLoginCode(String(loginCode)),
      String(psp._id),
    );

    this.ee.emit(
      MailNotificationEvents.Account.VerificationOTP,
      new SendEmailEvent({
        to: String(psp.email),
        from: `"LAWMA REG" <no-reply@resend.dev>`,
        subject: 'Your Login Verification Code',
        context: {
          firstName: psp.name,
          loginCode,
        },
      }),
    );
  }

  async verifyLoginCode(loginCode: string, req: UserRequest) {
    const pspId = await this.cacheService.get(
      CacheKeys.PspLoginCode(loginCode),
    );

    if (!pspId) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const pspUser = await this.pspUserModel
      .findOne({
        _id: pspId,
      })
      .select('-password')
      .lean();

    if (!pspUser) {
      throw new BadRequestException('Invalid or expired login code');
    }
    const secret = String(this.configService.get<string>('JWT_SECRET'));
    const token = jwt.sign(
      {
        id: pspUser._id,
        email: pspUser.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    const eventObj = {
      id: String(pspUser._id),
      name: pspUser.name,
      email: pspUser.email,
      role: pspUser.role,
      ipAddress: req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
      administrator: {
        id: String(pspUser._id),
        name: pspUser.name,
        email: pspUser.email,
        role: pspUser.role,
      },
    };
    this.ee.emit(
      AuditLogEvents.UserActivity,
      new LogActionEvent({
        administrator: eventObj as any,
        action: LOGTYPE.UserLoggedIn,
        userType: UserType.PSP,
      }),
    );

    return { message: 'Login successful', token, data: pspUser };
  }

  async requestPasswordReset(body: PspForgotPasswordDto) {
    const { email } = body;
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiry = 600000;

    const psp = await this.pspUserModel.findOne({ email: email });
    if (psp) {
      await this.cacheService.set(
        CacheKeys.PspResetPasswordCode(String(resetCode)),
        String(psp._id),
        expiry,
      );
      this.ee.emit(
        MailNotificationEvents.Account.ForgotPassword,
        new SendEmailEvent({
          to: psp.email,
          from: `"LAWMA REG" <accounts@lawma.co>`,
          subject: 'Password Reset Request',
          context: {
            firstName: psp.name,
            resetCode,
          },
        }),
      );
    }
    return {
      message:
        'If an account with that email exists, a reset code has been sent',
      email,
    };
  }

  async verifyPasswordResetCode(body: PspVerifyResetCodeDto) {
    const { code } = body;
    const pspId = await this.cacheService.get(
      CacheKeys.PspResetPasswordCode(String(code)),
    );
    const psp = await this.pspUserModel.findById(pspId);

    if (!psp) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const secret = this.configService.get('jwt.secret', { infer: true });
    const token = jwt.sign(
      {
        id: psp._id,
        email: psp.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { token };
  }

  async resetPassword(pspId: string, body: PspResetPasswordDto) {
    if (body.password !== body.confirmPassword || body.password.length < 6)
      throw new BadRequestException('Passwords do not match or are too short');

    await this.pspUserModel.updateOne(
      { _id: pspId },
      { $set: { password: body.password } },
    );

    return { message: 'Password reset successful' };
  }

  async getAdminDetailsByToken(token: string) {
    const decoded = this.jwtService.verify(token);

    const pspUser = await this.pspUserModel.findById(decoded.id);
    if (!pspUser) {
      return null;
    }

    return pspUser;
  }

  async logout(token: string) {
    const tokenDetails = await this.jwtService.decode(token);

    const ttl = tokenDetails.exp - Math.floor(Date.now() / 1000);

    await this.cacheService.set(`blacklist:${token}`, true, ttl);

    return { message: 'Logged out successfully' };
  }
}
