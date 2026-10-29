import {
  Administrator,
  AdministratorRole,
  AdministratorStatus,
} from '@models/administrator.model';
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  LawmaAuthCompletePasswordResetDto,
  LawmaAuthLoginDto,
} from './dto/auth.dto';
import { comparePassword } from '@common/utils';
import { CacheKeys } from '@src/shared/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { ResetPasswordDto } from '@src/agent/dto/agent.dto';
import { UserRole } from '@models/types';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { ApplicationEnvironment } from '@common/constants';
import { Request as UserRequest } from 'express';
import { AuditLogEvents, LogActionEvent } from '../audit-log/dto/event';
import { LOGTYPE, UserType } from '@models/audit-log.model';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    @InjectModel(Administrator.name)
    private administratorModel: Model<Administrator>,
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private jwtService: JwtService,
    private readonly configService: ConfigService<ConfigAttributes>,
    private ee: EventEmitter2,
  ) {}

  async onModuleInit() {
    const usersCreated = await this.administratorModel.exists({
      email: 'superadmin@lawma.co',
    });

    if (!usersCreated) {
      await this.administratorModel.create({
        name: `Lawma Super Admin`,
        email: 'superadmin@lawma.co',
        phoneNumber: '08123456789',
        password: 'password',
        role: AdministratorRole.SuperAdmin,
        status: AdministratorStatus.Active,
      });

      this.logger.log('admins created');
    }
  }

  get isProduction() {
    const environment = this.configService.get('applicationEnvironment');
    return environment === ApplicationEnvironment.Production;
  }

  async login(body: LawmaAuthLoginDto) {
    const { email, password } = body;
    const administrator = await this.administratorModel.findOne({ email });
    if (!administrator) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordMatch = comparePassword(password, administrator.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const loginCode = !this.isProduction
      ? '12345'
      : Math.floor(10000 + Math.random() * 90000).toString();
    const loginCodeExpiry = 600000; // 10mins

    await this.cacheService.set(
      CacheKeys.AdministratorLoginCode(String(loginCode)),
      String(administrator._id),
      loginCodeExpiry,
    );

    this.ee.emit(
      MailNotificationEvents.Account.VerificationOTP,
      new SendEmailEvent({
        to: String(administrator.email),
        from: '"LAWMA SMARTBIN" <' + process.env.MAIL_FROM + '>',
        subject: 'Your Login Verification Code',
        context: {
          firstName: administrator.name,
          loginCode,
        },
      }),
    );
  }

  async verifyLoginCode(code: string, req: UserRequest) {
    const administratorId = await this.cacheService.get(
      CacheKeys.AdministratorLoginCode(code),
    );

    const administrator =
      await this.administratorModel.findById(administratorId);
    if (!administrator) {
      throw new BadRequestException('Invalid or expired code');
    }

    const token = this.jwtService.sign({
      id: administrator._id,
      role: administrator.role,
    });

    const eventObj = {
      id: administrator.id,
      name: administrator.name,
      email: administrator.email,
      role: administrator.role,
      ipAddress: req.headers['x-forwarded-for'] as string,
      userAgent: req.headers['user-agent'],
    }

    this.ee.emit(
      AuditLogEvents.UserActivity,
      new LogActionEvent({
        administrator: eventObj,
        action: LOGTYPE.UserLoggedIn,
        userType: UserType.Admin
      }),
    );

    return { token };
  }

  async getAdminDetailsByToken(token: string) {
    const decoded = this.jwtService.verify(token);

    const administrator = await this.administratorModel.findById(decoded.id);
    if (!administrator) {
      return null;
    }

    return administrator;
  }

  async initiateResetPassword(email: string) {
    const administrator = await this.administratorModel.findOne({ email });
    if (!administrator) {
      throw new BadRequestException('Invalid email');
    }

    const resetCode = !this.isProduction
      ? '12345'
      : Math.floor(10000 + Math.random() * 90000).toString();
    const resetCodeExpiry = 600000; // 10mins

    await this.cacheService.set(
      CacheKeys.AdministratorResetPasswordCode(String(resetCode)),
      String(administrator._id),
      resetCodeExpiry,
    );
  }

  async verifyResetPasswordCode(code: string) {
    const administratorId = await this.cacheService.get(
      CacheKeys.AdministratorResetPasswordCode(code),
    );

    const administrator =
      await this.administratorModel.findById(administratorId);
    if (!administrator) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const token = this.jwtService.sign({
      id: administrator._id,
      role: administrator.role,
    });

    return { token };
  }

  async completeResetPassword(
    body: LawmaAuthCompletePasswordResetDto & { adminId: string },
  ) {
    const administrator = await this.administratorModel.findById(body.adminId);
    if (!administrator) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    // save() runs the Administrator pre('save') hook, which hashes the password.
    // findByIdAndUpdate skips that hook and would store it in plain text.
    administrator.password = body.password;
    await administrator.save();

    return { message: 'Password reset successful' };
  }
}
