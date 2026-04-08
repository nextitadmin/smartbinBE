import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {
  Administrator,
  AdministratorRole,
  AdministratorStatus,
} from '@models/administrator.model';
import { Model } from 'mongoose';
import { CacheKeys } from '@src/shared/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { LawmaPartnerLoginDto } from './dto/auth.dto';
import { comparePassword } from '@common/utils';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { ApplicationEnvironment } from '@common/constants';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class LawmaPartnerAuthService {
  private readonly logger = new Logger(LawmaPartnerAuthService.name);
  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheService: Cache,
    @InjectModel(Administrator.name)
    private readonly administratorModel: Model<Administrator>,
    private readonly configService: ConfigService<ConfigAttributes>,
    private readonly jwtService: JwtService,
    private readonly ee: EventEmitter2,
  ) {
    this.createDefaultCredential();
  }

  get isProduction() {
    const environment = this.configService.get('applicationEnvironment');
    return environment === ApplicationEnvironment.Production;
  }

  async login(body: LawmaPartnerLoginDto) {
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
        from: `"LAWMA REG" <no-reply@resend.dev>`,
        subject: 'Your Login Verification Code',
        context: {
          firstName: administrator.name,
          loginCode,
        },
      }),
    );

    return { message: 'Verification code sent to email', success: true };
  }

  async verifyLoginCode(code: string) {
    const administratorId = await this.cacheService.get(
      CacheKeys.AdministratorLoginCode(code),
    );

    if (!administratorId) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const administrator =
      await this.administratorModel.findById(administratorId);
    if (!administrator) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.jwtService.sign({
      id: administrator._id,
      role: administrator.role,
    });

    return { message: 'Login successful', token, data: administrator };
  }

  async getAdminDetailsByToken(token: string) {
    const decoded = this.jwtService.verify(token);
    return this.administratorModel.findById(decoded.id).lean();
  }

  // Creates default credential for Smartbin Partner
  async createDefaultCredential() {
    const administrator = await this.administratorModel.findOne({
      role: AdministratorRole.SmartBinPartner,
    });

    if (!administrator) {
      await this.administratorModel.create({
        name: 'Lawma Partner',
        email: 'smartbin-partner@lawma.co',
          phoneNumber: '08123456787',
        password: 'password',
        role: AdministratorRole.SmartBinPartner,
        status: AdministratorStatus.Active,
      });

      this.logger.log('Smartbin Partner credential created');
    }
  }
}
