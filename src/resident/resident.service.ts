import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { Resident, ResidentDocument } from '@models/users/resident.model';
import { Payer, PayerDocument } from '@models/users/payer.model';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MailNotificationEvents,
  SendEmailEvent,
  InAppNotificationEvents,
  SendInAppEvent,
} from '@src/notification/dto/event';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys } from '@src/shared/constants';
import { SmartBinApplicationStatus, UserRole } from '@models/types';
import { JwtService } from '@nestjs/jwt';
import {
  CreateResidentAccountDto,
  ResidentLoginDto,
  ResidentVerifyResetCodeDto,
  ResidentForgotPasswordDto,
  CreateApplicationDto,
  ResetPasswordDto,
  UpdateProfileDto,
} from './dto/resident.dto';
import { SmartBinService } from '@src/smart-bin/smart-bin.service';
import { SmartBin } from '@models/smart-bin.model';
import { Bill } from '@models/bill.model';
import { Wallet } from '@models/wallet.model';
import {
  comparePassword,
  formatCustomDate,
  formatCustomTime,
  formatTimestamp,
} from '@common/utils';
import { UserKyc } from '@models/user-kyc.model';
import { Pickup } from '@models/pickup';
import { AuthUser } from '@common/types';
// import { MessagePattern } from '@nestjs/microservices';

@Injectable()
export class ResidentService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly configService: ConfigService,
    private readonly smartBinService: SmartBinService,
    private readonly jwtService: JwtService,
    @InjectModel(Resident.name)
    private readonly residentModel: Model<ResidentDocument>,
    @InjectModel(UserKyc.name) private readonly userKycModel: Model<UserKyc>,
    @InjectModel(Payer.name) private readonly payerModel: Model<PayerDocument>,
    @InjectModel(SmartBin.name) private readonly smartBinModel: Model<SmartBin>,
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(Pickup.name) private pickupModel: Model<Pickup>,
    private ee: EventEmitter2,
  ) {}

  async registerResident(body: CreateResidentAccountDto) {
    const { payerId, password, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const existing = await this.residentModel.findOne({ payerId });
    if (existing) {
      throw new ConflictException(
        'Resident already registered with this payerId',
      );
    }

    const payer = await this.payerModel.findOne({ payerId });
    if (!payer) {
      throw new NotFoundException('Invalid payerId');
    }

    const newResident = await this.residentModel.create({
      payerId,
      firstName: payer.firstName,
      lastName: payer.lastName,
      email: payer.email,
      password: password,
      phoneNumber: payer.phoneNumber,
    });

    await this.userKycModel.create({
      userId: newResident._id,
      userType: UserRole.Resident,
    });

    this.ee.emit(
      MailNotificationEvents.Account.Welcome,
      new SendEmailEvent({
        to: payer.email,
        from: `"LAWMA REG" <accounts@lawma.co>`,
        subject: 'Registration Successful',
        context: {
          firstName: newResident.firstName,
        },
      }),
    );

    return {
      message: 'Resident registered successfully',
      data: {
        id: newResident._id,
        payerId: newResident.payerId,
        fullName: `${newResident.firstName} ${newResident.lastName}`,
        email: newResident.email,
        phoneNumber: newResident.phoneNumber,
      },
    };
  }

  async login(body: ResidentLoginDto) {
    const { email, password } = body;

    const resident = await this.residentModel.findOne({ email });
    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    const isPasswordMatch = comparePassword(password, resident.password);
    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const loginCode = Math.floor(10000 + Math.random() * 90000).toString();
    const loginCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    resident.loginCode = loginCode;
    resident.loginCodeExpiry = loginCodeExpiry;

    await resident.save();

    await this.cacheService.set(
      CacheKeys.ResidentLoginCode(String(loginCode)),
      String(resident._id),
    );

    await this.cacheService.set(
      CacheKeys.ResidentLoginCode(String(12345)),
      String(resident._id),
    );

    this.ee.emit(
      MailNotificationEvents.Account.VerificationOTP,
      new SendEmailEvent({
        to: String(resident.email),
        from: `"LAWMA REG" <no-reply@resend.dev>`,
        subject: 'Your Login Verification Code',
        context: {
          firstName: resident.firstName,
          loginCode,
        },
      }),
    );
  }

  async verifyLoginCode(loginCode: string) {
    const residentId = await this.cacheService.get(
      CacheKeys.ResidentLoginCode(loginCode),
    );

    if (!residentId) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const resident = await this.residentModel
      .findOne({
        _id: residentId,
      })
      .select('-password')
      .lean();

    if (!resident) {
      throw new BadRequestException('Invalid or expired login code');
    }
    const secret = String(this.configService.get<string>('JWT_SECRET'));
    const token = jwt.sign(
      {
        id: resident._id,
        role: UserRole.Resident,
        payerId: resident.payerId,
        email: resident.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { message: 'Login successful', token, data: resident };
  }

  async updateProfilePicture(userId: string, filePath: string) {
    const resident = await this.residentModel.findById(userId);
    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    resident.profilePicture = filePath;
    await resident.save();

    return {
      message: 'Profile picture updated successfully',
      profilePicture: resident.profilePicture,
    };
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    const resident = await this.residentModel.findById(userId);
    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    if (updateData.firstName) {
      resident.firstName = updateData.firstName;
    }
    if (updateData.lastName) {
      resident.lastName = updateData.lastName;
    }
    if (updateData.email) {
      resident.email = updateData.email;
    }
    if (updateData.phoneNumber) {
      resident.phoneNumber = updateData.phoneNumber;
    }

    await resident.save();
    return {
      resident: {
        firstName: resident.firstName,
        lastName: resident.lastName,
        email: resident.email,
        phoneNumber: resident.phoneNumber,
      },
    };
  }

  async getProfile(residentId: string): Promise<any> {
    const resident = await this.residentModel
      .findById(residentId)
      .select(
        '-password -loginCode -loginCodeExpires -__v -createdAt -updatedAt',
      )
      .lean();

    const userKyc = await this.userKycModel
      .findOne({ userId: new Types.ObjectId(residentId) })
      .lean();

    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    const defaultAvatar =
      'https://res.cloudinary.com/demo/image/upload/avatar.png';

    const data = {
      address: userKyc?.address || null,
      landmark: userKyc?.closestLandmark || null,
      nextPickupDate: resident.nextPickupDate || null,
      // localGovermentArea: userKyc?.localGovernment || null,
      buildingType: userKyc?.buildingType || null,
      idDocument: userKyc?.idDocument || null,
      idDocumentNo: userKyc?.idDocumentNo || null,
      hasCompletedKyc: userKyc?.hasCompletedKyc || false,
    };
    return {
      message: 'Resident profile retrieved successfully',
      ...resident,
      ...data,
      phoneNumber: resident.phoneNumber || null,
      profilePicture: resident.profilePicture || defaultAvatar,
    };
  }

  async requestPasswordReset(body: ResidentForgotPasswordDto) {
    const { email } = body;
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
    const resetTokenExpiry = new Date(Date.now() + 20 * 60 * 1000);
    const expiry = 600000;

    const resident = await this.residentModel.findOne({ email });
    if (resident) {
      await this.cacheService.set(
        CacheKeys.ResidentLoginCode(String(resetCode)),
        String(resident._id),
        expiry,
      );
      this.ee.emit(
        MailNotificationEvents.Account.ForgotPassword,
        new SendEmailEvent({
          to: resident.email,
          from: `"LAWMA REG" <accounts@lawma.co>`,
          subject: 'Password Reset Request',
          context: {
            firstName: resident.firstName,
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

  async verifyPasswordResetCode(body: ResidentVerifyResetCodeDto) {
    const { code } = body;
    const residentId = await this.cacheService.get(
      CacheKeys.ResidentLoginCode(code),
    );
    const resident = await this.residentModel.findById(residentId);

    if (!resident) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const secret = this.configService.get('jwt.secret', { infer: true });
    const token = jwt.sign(
      {
        id: resident._id,
        role: UserRole.Resident,
        payerId: resident.payerId,
        email: resident.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { token };
  }

  async resetPassword(userId: string, body: ResetPasswordDto) {
    if (body.password !== body.confirmPassword || body.password.length < 6)
      throw new BadRequestException('Passwords do not match or are too short');

    await this.residentModel.updateOne(
      { _id: userId },
      { $set: { password: body.password } },
    );

    return { message: 'Password reset successful' };
  }

  async logout(token: string) {
    const tokenDetails = await this.jwtService.decode(token);

    const ttl = tokenDetails.exp - Math.floor(Date.now() / 1000);

    await this.cacheService.set(`blacklist:${token}`, true, ttl);

    return { message: 'Logged out successfully' };
  }

  async getResidentDetailsByToken(token: string): Promise<any> {
    const tokenDetails = await this.jwtService.decode(token);
    if (!tokenDetails) {
      throw new UnauthorizedException('unable to unauthenticate');
    }

    return this.getProfile(tokenDetails.id);
  }

  public async getDashboardDetails(userId: string) {
    const resident = await this.residentModel
      .findById(userId)
      .select('payerId firstName lastName address role')
      .lean();

    if (!resident) {
      throw new NotFoundException('Resident not found');
    }

    const [
      smartBinCount,
      totalOutstandingResult,
      walletDetails,
      lastPickUpDetails,
      smartBinApplication,
    ] = await Promise.all([
      this.smartBinModel.countDocuments({
        userId: resident._id,
        customerType: UserRole.Resident,
      }),

      this.billModel.aggregate([
        {
          $match: {
            userId: resident._id,
            status: 'pending',
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$totalOutstandingBill' },
          },
        },
      ]),

      this.walletModel
        .findOne(
          {
            userId: resident._id,
            userType: UserRole.Resident,
          },
          {
            available_balance: 1,
            _id: 0,
          },
        )
        .lean(),

      this.pickupModel
        .findOne(
          {
            accountId: resident._id,
            accountType: UserRole.Resident,
            status: 'Pending',
          },
          {
            pickupDate: 1,
            pickupTime: 1,
            _id: 0,
          },
        )
        .sort({ createdAt: -1 })
        .lean(),
      this.smartBinModel
        .findOne(
          {
            userId: resident._id,
            customerType: UserRole.Resident,
          },
          {
            applicationHistory: 1,
            _id: 0,
          },
        )
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const latestSmartBinHistory =
      smartBinApplication?.applicationHistory?.[
        smartBinApplication.applicationHistory.length - 1
      ] ?? null;

    const totalOutstandingBill = totalOutstandingResult?.[0]?.total ?? 0;

    const data = {
      name: `${resident.firstName} ${resident.lastName}`,
      role: resident.role,
      address: resident.address ?? null,
      payerId: resident.payerId,
      userId: resident._id,
      totalOutstandingBill,
      avaliableBalance: walletDetails?.available_balance ?? 0.0,
      smartBinApplicationCount: smartBinCount,
      smartBinApplicationDetails: latestSmartBinHistory
        ? {
            status: latestSmartBinHistory.status,
            statusDescription: latestSmartBinHistory.description,
            lastUpdatedDate: latestSmartBinHistory.timestamp,
            formattedlastUpdatedDate: formatTimestamp(
              latestSmartBinHistory.timestamp,
            ),
          }
        : {
            status: 'N/A',
            statusDescription: 'No application found',
            lastUpdatedDate: 'N/A',
          },
      estimatedAnnualSubscriptionFee: 0,
      nextPickUpDate: lastPickUpDetails
        ? `${formatCustomDate(lastPickUpDetails.pickupDate)} ${
            lastPickUpDetails.pickupTime
          }`
        : 'N/A',
    };

    return {
      message: 'Resident Dashboard details retrieved successfully',
      data,
    };
  }

  async createBinApplication(
    body: CreateApplicationDto & { residentId: string },
  ) {
    const data = await this.smartBinService.createBinApplication({
      accountId: body.residentId,
      accountType: UserRole.Resident,
      applicationData: body,
    });
    return data;
  }

  async getAllResidentApplications(userId: string, page = 1, limit = 10) {
    return this.smartBinService.getResidentBinApplication(userId, page, limit);
  }

  async getApplicationDetails(applicationId: string) {
    console.log('applicationId', applicationId);
    const data =
      await this.smartBinService.getBinApplicationDetails(applicationId);
    return data;
  }

  async trackApplication(applicationId: string) {
    return this.smartBinService.getOrderTimeline(applicationId);
  }

  async deleteBinApplication(applicationId: string) {
    return this.smartBinService.deleteBinApplication(applicationId);
  }

  async getAllResidents() {
    const residents = await this.residentModel
      .find()
      .select('-password -__v -createdAt -updatedAt')
      .lean();
    return {
      message: 'Residents retrieved successfully',
      data: residents,
    };
  }
}
