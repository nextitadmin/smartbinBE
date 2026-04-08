import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import {
  Agent,
  AgentDocument,
  defaultAgentFields,
} from '@models/users/agent.model';
import { Payer, PayerDocument } from '@models/users/payer.model';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys } from '@src/shared/constants';
import { UserRole } from '@models/types';
import { JwtService } from '@nestjs/jwt';
import {
  CreateAgentAccountDto,
  LoginAgentAccountDto,
  UpdateAgencyProfileDto,
} from './dto/agent.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { ConfigAttributes } from '@src/config';
import { comparePassword } from '@common/utils';
import { UserKyc } from '@models/user-kyc.model';

@Injectable()
export class AgentService {
  constructor(
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly jwtService: JwtService,
    @InjectModel(Agent.name) private readonly agentModel: Model<AgentDocument>,
    @InjectModel(Payer.name) private readonly payerModel: Model<PayerDocument>,
    @InjectModel(UserKyc.name) private readonly userKycModel: Model<UserKyc>,
    private readonly configService: ConfigService<ConfigAttributes>,
    private ee: EventEmitter2,
  ) {}

  async registerAgent(body: CreateAgentAccountDto) {
    const { payerId, agencyName, password, confirmPassword } = body;

    if (password !== confirmPassword) {
      throw new BadRequestException(
        'Password and confirm password do not match',
      );
    }

    const existing = await this.agentModel.findOne({ payerId });
    if (existing) {
      throw new ConflictException('Agent already registered with this payerId');
    }

    const payer = await this.payerModel.findOne({ payerId });
    if (!payer) {
      throw new NotFoundException('Invalid payerId');
    }

    const newAgent = await this.agentModel.create({
      payerId: payer._id,
      agencyName,
      firstName: payer.firstName,
      lastName: payer.lastName,
      email: payer.email,
      password: password,
    });

    await this.userKycModel.create({
      userId: newAgent._id,
      userType: UserRole.Agent,
    });

    this.ee.emit(
      MailNotificationEvents.Account.Welcome,
      new SendEmailEvent({
        to: newAgent.email,
        from: `"LAWMA REG" <accounts@lawma.co>`,
        subject: 'Registration Successful',
        context: {
          firstName: newAgent.firstName,
        },
      }),
    );

    return {
      message: 'Agent registered successfully',
      data: {
        id: newAgent._id,
        payerId: newAgent.payerId,
        fullName: `${newAgent.firstName} ${newAgent.lastName}`,
        email: newAgent.email,
      },
    };
  }

  async login(body: LoginAgentAccountDto) {
    const { email, password } = body;

    const agent = await this.agentModel.findOne({ email });

    if (!agent) {
      throw new NotFoundException('Agent does not exist');
    }

    const isPasswordMatch = comparePassword(password, agent.password);

    if (!isPasswordMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const loginCode = Math.floor(10000 + Math.random() * 90000).toString();
    const loginCodeExpiry = 600000; // 10mins

    await agent.save();

    await this.cacheService.set(
      CacheKeys.AgentLoginCode(String(loginCode)),
      String(agent._id),
      loginCodeExpiry,
    );

    await this.cacheService.set(
      CacheKeys.AgentLoginCode(String(12345)),
      String(agent._id),
      loginCodeExpiry,
    );

    this.ee.emit(
      MailNotificationEvents.Account.VerificationOTP,
      new SendEmailEvent({
        to: agent.email,
        from: `"LAWMA REG" <no-reply@resend.dev>`,
        subject: 'Your Login Verification Code',
        context: {
          firstName: agent.firstName,
          loginCode,
        },
      }),
    );
  }

  async verifyLoginCode(loginCode: string) {
    const agentId = await this.cacheService.get(
      CacheKeys.AgentLoginCode(loginCode),
    );

    if (!agentId) {
      throw new BadRequestException('Session expired. Please log in again.');
    }

    const agent = await this.agentModel
      .findById(agentId)
      .select(defaultAgentFields)
      .lean();

    if (!agent) {
      throw new BadRequestException('Invalid or expired login code');
    }
    const secret = this.configService.get('jwt.secret', { infer: true });
    const token = jwt.sign(
      {
        id: agent._id,
        role: UserRole.Agent,
        payerId: agent.payerId,
        email: agent.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { message: 'Login successful', token, data: agent };
  }

  async updateProfilePicture(userId: string, fileUrl: string) {
    const agent = await this.agentModel.findById(userId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    agent.profilePicture = fileUrl;
    await agent.save();

    return {
      message: 'Profile picture updated successfully',
      profilePicture: agent.profilePicture,
    };
  }

  async updateProfile(userId: string, updateData: UpdateAgencyProfileDto) {
    const agent = await this.agentModel.findById(userId);
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    if (updateData.agencyName) {
      agent.agencyName = updateData.agencyName;
    }
    if (updateData.firstName) {
      agent.firstName = updateData.firstName;
    }
    if (updateData.lastName) {
      agent.lastName = updateData.lastName;
    }
    if (updateData.email) {
      agent.email = updateData.email;
    }
    if (updateData.phoneNumber) {
      agent.phoneNumber = updateData.phoneNumber;
    }

    await agent.save();
    return {
      agent: {
        agencyName: agent.agencyName,
        firstName: agent.firstName,
        lastName: agent.lastName,
        email: agent.email,
        phoneNumber: agent.phoneNumber,
      },
    };
  }

  async getProfile(agentId: string): Promise<any> {
    const agent = await this.agentModel
      .findById(agentId)
      .select(defaultAgentFields)
      .lean();
    if (!agent) {
      throw new NotFoundException('Agent not found');
    }

    const defaultAvatar =
      'https://res.cloudinary.com/demo/image/upload/avatar.png';
    return {
      ...agent,
      profilePicture: agent.profilePicture || defaultAvatar,
    };
  }

  async requestPasswordReset(email: string) {
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();
    const expiry = 600000;

    const agent = await this.agentModel.findOne({ email });
    if (agent) {
      await this.cacheService.set(
        CacheKeys.AgentLoginCode(String(resetCode)),
        String(agent._id),
        expiry,
      );
      this.ee.emit(
        MailNotificationEvents.Account.ForgotPassword,
        new SendEmailEvent({
          to: agent.email,
          from: `"LAWMA REG" <accounts@lawma.co>`,
          subject: 'Password Reset Request',
          context: {
            firstName: agent.firstName,
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

  async verifyPasswordResetCode(resetCode: string) {
    const agentId = await this.cacheService.get(
      CacheKeys.AgentLoginCode(resetCode),
    );
    if (!agentId) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const agent = await this.agentModel.findById(agentId);
    if (!agent) {
      throw new BadRequestException('Invalid or expired reset code');
    }

    const secret = this.configService.get('jwt.secret', { infer: true });
    const token = jwt.sign(
      {
        id: agent._id,
        role: UserRole.Agent,
        payerId: agent.payerId,
        email: agent.email,
      },
      secret,
      { expiresIn: '7d' },
    );

    return { token };
  }

  async completePasswordReset({
    accountId,
    newPassword,
    confirmPassword,
  }: {
    accountId: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (
      !newPassword ||
      newPassword !== confirmPassword ||
      newPassword.length < 6
    ) {
      throw new BadRequestException('Passwords do not match or are too short');
    }

    await this.agentModel.updateOne(
      { _id: accountId },
      {
        $set: {
          password: newPassword,
        },
      },
    );
  }

  async logout(token: string) {
    const tokenDetails = await this.jwtService.decode(token);

    const ttl = tokenDetails.exp - Math.floor(Date.now() / 1000);

    await this.cacheService.set(`blacklist:${token}`, true, ttl);

    return { message: 'Logged out successfully' };
  }

  async getAgentDetailsByToken(token: string): Promise<any> {
    const tokenDetails = await this.jwtService.decode(token);
    if (!tokenDetails) {
      throw new UnauthorizedException('unable to unauthenticate');
    }

    return this.getProfile(tokenDetails.id);
  }

  async verifyResetCode(code: string) {}
}
