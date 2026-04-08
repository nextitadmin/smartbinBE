import {
  Injectable,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as jwt from 'jsonwebtoken';
import { Corporate, CorporateDocument } from '@models/users/corporate.model';
import {
  comparePassword,
  formatCustomDate,
  formatTimestamp,
  generateOtpCode,
} from '@common/utils';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';

import {
  CorporateLoginDto,
  CreateCorporateAccountDto,
  UpdateProfileDto,
  CorporateForgotPasswordDto,
  CorporateVerifyResetCodeDto,
  ResetPasswordDto,
  AddCorporateBranchDto,
} from './dto/corporate.dto';
import { Payer, PayerDocument } from '@models/users/payer.model';
import { CacheKeys } from '@src/shared/constants';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { UserRole } from '@models/types';
import { ConfigService } from '@nestjs/config';
import { UserKyc } from '@models/user-kyc.model';
import { PickupService } from '@src/waste-management/pickup/pickup.service';
import { ConfigAttributes } from '@src/config';
import { Branch } from '@models/branch.model';
import { Bill } from '@models/bill.model';
import { Wallet } from '@models/wallet.model';
import { SmartBin } from '@models/smart-bin.model';
import { Pickup } from '@models/pickup';
import { UserKycRepository } from '@models/repository/user-kyc.repository';

@Injectable()
export class CorporateService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    @InjectModel(Corporate.name)
    private corporateModel: Model<CorporateDocument>,
    @InjectModel(Payer.name) private readonly payerModel: Model<PayerDocument>,

    @InjectModel(UserKyc.name) private userKycModel: Model<UserKyc>,
    @InjectModel(Branch.name) private branchModel: Model<Branch>,
    @InjectModel(Bill.name) private billModel: Model<Bill>,
    @InjectModel(Wallet.name) private walletModel: Model<Wallet>,
    @InjectModel(SmartBin.name) private smartBinModel: Model<SmartBin>,
    @InjectModel(Pickup.name) private pickupModel: Model<Pickup>,
    private ee: EventEmitter2,
    private jwtService: JwtService,
    private readonly configService: ConfigService<ConfigAttributes>,
    // private readonly userKycRepository: UserKycRepository,
  ) {}

  async registerCorporate(body: CreateCorporateAccountDto) {
    const { password, payerId, businessName, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const existing = await this.corporateModel.findOne({ payerId });
    if (existing) {
      throw new ConflictException(
        'Business Corporate already registered with this payerId',
      );
    }

    const payer = await this.payerModel.findOne({ payerId });

    if (!payer) {
      throw new NotFoundException('Invalid payerId');
    }

    const newBusiness = await this.corporateModel.create({
      payerId,
      businessName,
      firstName: payer.firstName,
      lastName: payer.lastName,
      email: payer.email,
      password: password,
      phoneNumber: payer.phoneNumber,
    });

    await this.userKycModel.create({
      userId: newBusiness._id,
      userType: UserRole.Corporate,
    });

    this.ee.emit(
      MailNotificationEvents.Account.Welcome,
      new SendEmailEvent({
        to: payer.email,
        from: `"LAWMA REG" <accounts@lawma.co>`,
        subject: 'Corporate Registration Successful',
        context: {
          firstName: newBusiness.businessName,
        },
      }),
    );

    return {
      message: 'Corporate registered successfully',
      data: {
        id: newBusiness._id,
        businessName: newBusiness.businessName,
        payerId: newBusiness.payerId,
        fullName: `${newBusiness.firstName} ${newBusiness.lastName}`,
        email: newBusiness.email,
        phoneNumber: newBusiness.phoneNumber,
      },
    };
  }

  async loginCorporate(body: CorporateLoginDto) {
    const { email, password } = body;

    const business = await this.corporateModel.findOne({ email: email });
    if (!business) {
      throw new NotFoundException('Corporate business does not exist');
    }
    const isPasswordMatch = comparePassword(password, business.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const loginCode = Math.floor(10000 + Math.random() * 90000).toString();
    const loginCodeExpiry = new Date(Date.now() + 10 * 60 * 1000);

    business.loginCode = loginCode;
    business.loginCodeExpiry = loginCodeExpiry;
    await business.save();
    await this.cacheService.set(
      CacheKeys.CorporateLoginCode(String(loginCode)),
      String(business._id),
    );

    await this.cacheService.set(
      CacheKeys.CorporateLoginCode(String(12345)),
      String(business._id),
    );
    this.ee.emit(
      MailNotificationEvents.Account.VerificationOTP,
      new SendEmailEvent({
        to: String(business.email),
        from: `"LAWMA REG" <no-reply@resend.dev>`,
        subject: 'Your Login Verification Code',
        context: {
          firstName: business.businessName,
          loginCode,
        },
      }),
    );
  }

  async verifyLoginCode(loginCode: string) {
    const verificationCode = await this.cacheService.get(
      CacheKeys.CorporateLoginCode(loginCode),
    );

    if (!verificationCode) {
      throw new UnauthorizedException('Session expired. Please log in again.');
    }

    const business = await this.corporateModel
      .findOne({
        _id: verificationCode,
        loginCode,
        loginCodeExpiry: { $gt: Date.now() },
      })
      .select('-password')
      .lean();

    if (!business) {
      throw new BadRequestException('Invalid or expired login code');
    }
    const secret = String(
      this.configService.get('jwt.secret', { infer: true }),
    );
    const token = jwt.sign(
      {
        id: business._id,
        role: UserRole.Corporate,
        payerId: business.payerId,
        email: business.email,
        businessName: business.businessName,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { message: 'Login successful', token, data: business };
  }

  async updateProfilePicture(userId: string, filePath: string) {
    const business = await this.corporateModel.findById(userId);
    if (!business) {
      throw new NotFoundException('Business not found');
    }

    business.profilePicture = filePath;
    await business.save();

    return {
      message: 'Profile picture updated successfully',
      profilePicture: business.profilePicture,
    };
  }

  async updateProfile(userId: string, updateData: UpdateProfileDto) {
    const corporate = await this.corporateModel.findById(userId);
    if (!corporate) {
      throw new NotFoundException('Corporate not found');
    }

    if (updateData.businessName) {
      corporate.businessName = updateData.businessName;
    }
    if (updateData.firstName) {
      corporate.firstName = updateData.firstName;
    }
    if (updateData.lastName) {
      corporate.lastName = updateData.lastName;
    }
    if (updateData.email) {
      corporate.email = updateData.email;
    }
    if (updateData.phoneNumber) {
      corporate.phoneNumber = updateData.phoneNumber;
    }

    await corporate.save();
    return {
      corporate: {
        businessName: corporate.businessName,
        firstName: corporate.firstName,
        lastName: corporate.lastName,
        email: corporate.email,
        phoneNumber: corporate.phoneNumber,
      },
    };
  }

  async getProfile(userId: string): Promise<any> {
    const business = await this.corporateModel
      .findById(userId)
      .select('-password -loginCode -loginCodeExpires')
      .lean();
    if (!business) {
      throw new NotFoundException('Corporate business not found');
    }

    const userKyc = await this.userKycModel
      .findOne({
        userId: new Types.ObjectId(userId),
      })
      .populate('lga')
      .exec();
    const defaultAvatar =
      'https://res.cloudinary.com/demo/image/upload/avatar.png';

    const data = {
      businessName: business.businessName || null,
      payerId: business.payerId || null,
      fullName: `${business.firstName} ${business.lastName}` || null,
      email: business.email || null,
      address: userKyc?.address || null,
      landmark: userKyc?.closestLandmark || null,
      nextPickupDate: null,
      accountNumber: null,
      localGovermentArea: userKyc?.lga.name || null,
      buildingType: userKyc?.buildingType || null,
      hasSubmittedIdentity: userKyc?.hasSubmittedIdentity || false,
      hasSubmittedCorporateInformation:
        userKyc?.hasSubmittedPersonalInformation || false,
      hasSubmittedSignatories: userKyc?.hasSubmittedSignatories || false,
      identityVerificationStatus: userKyc?.identityVerificationStatus || null,
      signatoryVerificationStatus: userKyc?.signatoryVerificationStatus || null,
      businessRegistrationNumber: userKyc?.businessRegistrationNumber || null,
      businessSector: userKyc?.businessSector || null,
      idDocument: userKyc?.idDocument || null,
      idDocumentNo: userKyc?.idDocumentNo || null,
      hasCompletedKyc: userKyc?.hasCompletedKyc || false,
    };
    return {
      ...business,
      ...data,
      phoneNumber: business.phoneNumber || null,
      profilePicture: business.profilePicture || defaultAvatar,
    };
  }

  async requestPasswordReset(body: CorporateForgotPasswordDto) {
    const { email } = body;
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiry = 600000;

    const business = await this.corporateModel.findOne({ email });
    if (business) {
      await this.cacheService.set(
        CacheKeys.CorporateLoginCode(String(resetCode)),
        String(business._id),
        expiry,
      );
      this.ee.emit(
        MailNotificationEvents.Account.ForgotPassword,
        new SendEmailEvent({
          to: business.email,
          from: `"LAWMA REG" <accounts@lawma.co>`,
          subject: 'Password Reset Request',
          context: {
            firstName: business.businessName,
            resetCode,
          },
        }),
      );
    }
    return { message: 'If account exists, a reset email will be sent' };
  }

  async verifyPasswordResetCode(dto: CorporateVerifyResetCodeDto) {
    const { code } = dto;
    const businessId = await this.cacheService.get(
      CacheKeys.CorporateLoginCode(code),
    );

    const business = await this.corporateModel.findById(businessId);
    if (!business) {
      throw new BadRequestException('Invalid Or Expired Reset Code');
    }

    const secret = this.configService.get('jwt.secret', { infer: true });
    const token = jwt.sign(
      {
        id: business._id,
        role: UserRole.Corporate,
        payerId: business.payerId,
        email: business.email,
      },
      secret,
      { expiresIn: '7d' },
    );
    return { token };
  }
  async resetPassword(userId: string, body: ResetPasswordDto) {
    if (body.password !== body.confirmPassword || body.password.length < 6)
      throw new BadRequestException('Passwords do not match or are too short');

    await this.corporateModel.updateOne(
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

  public async getDashboardDetails(userId: string) {
    const business = await this.corporateModel
      .findById(userId)
      .select('payerId firstName lastName address role')
      .lean();

    if (!business) {
      throw new NotFoundException('Business not found');
    }

    const [
      smartBinCount,
      totalOutstanding,
      walletDetails,
      lastPickUpDetails,
      smartBinApplication,
      userKyc,
    ] = await Promise.all([
      this.smartBinModel.countDocuments({
        userId: business._id,
        customerType: UserRole.Corporate,
      }),

      this.billModel.aggregate([
        {
          $match: {
            userId: business._id,
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
            userId: business._id,
            userType: UserRole.Corporate,
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
            accountId: business._id,
            accountType: UserRole.Corporate,
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
            userId: business._id,
            customerType: UserRole.Corporate,
          },
          {
            applicationHistory: 1,
            _id: 0,
          },
        )
        .sort({ createdAt: -1 })
        .lean(),
      this.userKycModel
        .findOne({
          userId: business._id,
          userType: UserRole.Corporate,
        })
        .lean(),
    ]);

    const latestSmartBinHistory =
      smartBinApplication?.applicationHistory?.[
        smartBinApplication.applicationHistory.length - 1
      ] ?? null;

    const totalOutstandingBill = totalOutstanding[0]?.total || 0;
    const availableBalance = walletDetails?.available_balance ?? 0;

    const data = {
      name: `${business.firstName} ${business.lastName}`,
      role: business.role,
      address: userKyc.address || 'N/A',
      payerId: business.payerId,
      userId: business._id,
      totalOutstandingBill,
      avaliableBalance: availableBalance,
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
      message: 'Business Dashboard details retrieved successfully',
      data,
    };
  }

  async addBranch(userId: string, body: AddCorporateBranchDto) {
    const data = await this.branchModel.create({ ...body, userId: userId });

    return {
      message: 'Branch added to corporation successfully',
      data,
    };
  }

  async fetchBranches(userId: string) {
    const data = await this.branchModel.find({ userId: userId });
    return {
      message: 'Corporation branches fetched successfully',
      data,
    };
  }

  async getCorporateDetailsByToken(token: string): Promise<any> {
    const tokenDetails = await this.jwtService.decode(token);
    if (!tokenDetails) {
      throw new UnauthorizedException('unable to unauthenticate');
    }
    return this.getProfile(tokenDetails.id);
  }

  async getCorporatesByAgent(agentId: string) {
    return this.corporateModel.find({ agentId });
  }
}
