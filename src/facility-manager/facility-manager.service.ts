import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import {
  defaultManagerFields,
  FacilityManager,
  FacilityManagerDocument,
} from '@models/users/facility-manager.model';
import { Payer, PayerDocument } from '@models/users/payer.model';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  CreateManagerAccountDto,
  LoginManagerAccountDto,
  UpdateFacilityManagerProfileDto,
} from './dto/facility-manager.dto';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys } from '@src/shared/constants';
import { UserRole } from '@models/types';
import { defaultAgentFields } from '@models/users/agent.model';
import { ConfigAttributes } from '@src/config';
import { ConfigService } from '@nestjs/config';
import { comparePassword } from '@common/utils';
import { JwtService } from '@nestjs/jwt';
import { UserKyc } from '@models/user-kyc.model';

@Injectable()
export class FacilityManagerService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    @InjectModel(FacilityManager.name)
    private facilityModel: Model<FacilityManagerDocument>,
    @InjectModel(Payer.name) private payerModel: Model<PayerDocument>,
    @InjectModel(UserKyc.name) private userKycModel: Model<UserKyc>,
    private readonly configService: ConfigService<ConfigAttributes>,
    private readonly jwtService: JwtService,
    private ee: EventEmitter2,
  ) { }

  async register(dto: CreateManagerAccountDto) {
    const {
      payerId,
      password,
      confirmPassword,
      organizationName,
      phoneNumber,
    } = dto;

    if (password !== confirmPassword)
      throw new BadRequestException('Passwords do not match');

    const existing = await this.facilityModel.findOne({ payerId });
    if (existing)
      throw new BadRequestException('Already registered with this payerId');

    const payer = await this.payerModel.findOne({ payerId });
    if (!payer) throw new NotFoundException('Invalid payerId');

    const manager = await this.facilityModel.create({
      payerId,
      organizationName,
      phoneNumber,
      firstName: payer.firstName,
      lastName: payer.lastName,
      email: payer.email,
      password: password,
    });
    if (!manager) {
      console.log(Error);
      throw new BadRequestException('Failed to create facility manager account');
    }

    await this.userKycModel.create({
      userId: manager._id,
      userType: UserRole.Facility,
    });

    this.ee.emit(
      MailNotificationEvents.Account.Welcome,
      new SendEmailEvent({
        to: payer.email,
        from: '"LAWMA SMARTBIN" <' + process.env.MAIL_FROM + '>',
        subject: 'Registration Successful',
        context: {
          firstName: payer.firstName,
          // loginCode,
        },
      }),
    );
    // await sendConfirmationMail(manager.email, manager.firstName);

    return {
      message: 'Facility manager registered successfully',
      manager: {
        id: manager._id,
        payerId: manager.payerId,
        fullName: `${manager.firstName} ${manager.lastName}`,
        email: manager.email,
        organizationName: manager.organizationName,
        phoneNumber: manager.phoneNumber,
      },
    };
  }

  async login(dto: LoginManagerAccountDto) {
    const manager = await this.facilityModel.findOne({ email: dto.email });
    if (!manager) throw new NotFoundException('Manager not found');

    const valid = comparePassword(dto.password, manager.password);

    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const code = Math.floor(10000 + Math.random() * 90000).toString();
    const expires = 600000; // 10mins

    await this.cacheService.set(
      CacheKeys.FacilityManagerLoginCode(String(code)),
      String(manager._id),
      expires,
    );

    await this.cacheService.set(
      CacheKeys.FacilityManagerLoginCode(String(12345)),
      String(manager._id),
      expires,
    );

    this.ee.emit(
      MailNotificationEvents.Account.VerificationOTP,
      new SendEmailEvent({
        to: manager.email,
        from: '"LAWMA SMARTBIN" <' + process.env.MAIL_FROM + '>',
        subject: 'Your Login Verification Code',
        context: {
          firstName: manager.firstName,
          loginCode: code,
        },
      }),
    );
    // await sendLoginCodeEmail(manager.email, manager.firstName, code);

    return {
      message: 'Verification code sent to email',
      email: manager.email,
      id: manager._id,
    };
  }

  async verifyLoginCode(code: string) {
    const managerId = await this.cacheService.get(
      CacheKeys.FacilityManagerLoginCode(code),
    );

    const manager = await this.facilityModel
      .findById(managerId)
      .select(defaultManagerFields);
    if (!manager) {
      throw new BadRequestException('Invalid or expired code');
    }

    const token = jwt.sign(
      {
        id: manager._id,
        payerId: manager.payerId,
        email: manager.email,
        role: UserRole.Facility,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    return { token, manager };
  }

  async updateProfilePicture(userId: string, fileUrl: string) {
    const manager = await this.facilityModel.findById(userId);
    if (!manager) throw new NotFoundException('Manager not found');

    manager.profilePicture = fileUrl;
    await manager.save();
    return { message: 'Profile picture updated', profilePicture: fileUrl };
  }

  async updateProfile(
    userId: string,
    updateData: UpdateFacilityManagerProfileDto,
  ) {
    const manager = await this.facilityModel.findById(userId);
    if (!manager) {
      throw new NotFoundException('Manager not found');
    }

    if (updateData.firstName) {
      manager.firstName = updateData.firstName;
    }
    if (updateData.lastName) {
      manager.lastName = updateData.lastName;
    }
    if (updateData.email) {
      manager.email = updateData.email;
    }
    if (updateData.phoneNumber) {
      manager.phoneNumber = updateData.phoneNumber;
    }

    await manager.save();
    return {
      manager: {
        firstName: manager.firstName,
        lastName: manager.lastName,
        email: manager.email,
        phoneNumber: manager.phoneNumber,
      },
    };
  }

  async getProfile(userId: string) {
    const manager = await this.facilityModel
      .findById(userId)
      .select(
        '_id firstName lastName profilePicture email profilePicture payerId phoneNumber nationality gender lawmaCustomerType role',
      );

    const userKyc = await this.userKycModel
      .findOne({ userId: new Types.ObjectId(userId) })
      .lean();
    if (!manager) throw new NotFoundException('Manager not found');

    return {
      _id: manager._id,
      payerId: manager.payerId || null,
      email: manager.email,
      fullName: `${manager.firstName} ${manager.lastName}`,
      phoneNumber: manager.phoneNumber || null,
      profilePicture:
        manager.profilePicture ||
        'https://res.cloudinary.com/demo/image/upload/avatar.png',
      address: userKyc.address || null,
      landmark: userKyc.closestLandmark || null,
      localGovermentArea: userKyc.lga.name || null,
      buildingType: userKyc.buildingType || null,
    };
  }

  async requestPasswordReset(email: string) {
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiry = 600000;

    const manager = await this.facilityModel.findOne({ email });
    if (manager) {
      await this.cacheService.set(
        CacheKeys.FacilityManagerLoginCode(String(resetCode)),
        String(manager._id),
        expiry,
      );
      this.ee.emit(
        MailNotificationEvents.Account.ForgotPassword,
        new SendEmailEvent({
          to: manager.email,
          from: `"LAWMA SMARTBIN" <${process.env.MAIL_FROM}}>`,
          subject: 'Password Reset Request',
          context: {
            firstName: manager.firstName,
            resetCode,
          },
        }),
      );
    }
    return {
      message:
        'If an account with that email exists, a reset code has been sent',
    };
  }

  async verifyResetCode(code: string) {
    const managerId = await this.cacheService.get(
      CacheKeys.FacilityManagerLoginCode(code),
    );
    const manager = await this.facilityModel.findById(managerId);
    if (!manager) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const secret = this.configService.get('jwt.secret', { infer: true });
    const token = jwt.sign(
      {
        id: manager._id,
        role: UserRole.Facility,
        payerId: manager.payerId,
        email: manager.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { token };
  }

  async completePasswordReset(
    userId: string,
    param: { newPassword: string; confirmPassword: string },
  ) {
    if (
      param.newPassword !== param.confirmPassword ||
      param.newPassword.length < 6
    )
      throw new BadRequestException('Passwords do not match or are too short');

    await this.facilityModel.updateOne(
      { _id: userId },
      { $set: { password: param.newPassword } },
    );

    return { message: 'Password reset successful' };
  }

  public async getFacilityManagerDetailsByToken(token: string) {
    const tokenDetails = await this.jwtService.decode(token);
    if (!tokenDetails) {
      throw new UnauthorizedException('unable to unauthenticate');
    }

    return this.getProfile(tokenDetails.id);
  }

  async logout(token: string) {
    const tokenDetails = await this.jwtService.decode(token);

    const ttl = tokenDetails.exp - Math.floor(Date.now() / 1000);

    await this.cacheService.set(`blacklist:${token}`, true, ttl);

    return { message: 'Logged out successfully' };
  }
}
