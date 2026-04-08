import { InjectModel } from '@nestjs/mongoose';
import {
  CreatePspMembersDTO,
  UpdatePspMembersStatusBodyDTO,
} from '../../dto/psp.dto';
import { PSP, PspDocument } from '@models/psp.model';
import { Model } from 'mongoose';
import { PSPUsers, PspUsersDocument } from '@models/psp-users.model';
import { generateRandomChars } from '@common/utils';
import { CacheKeys } from '@src/shared/constants';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { ConfigAttributes } from '@src/config';
import { ConfigService } from '@nestjs/config';
import { PspUser } from '@common/types';

export class PspTeamManagement {
  protected clientUrl: ConfigAttributes['frontendUrl'];
  constructor(
    @InjectModel(PSP.name) private readonly psp: Model<PspDocument>,
    @InjectModel(PSPUsers.name)
    private readonly pspUser: Model<PspUsersDocument>,
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly ee: EventEmitter2,
    private readonly configService: ConfigService<ConfigAttributes>,
  ) {
    this.clientUrl = this.configService.get<string>('frontendUrl');
  }

  async createPspMembers(body: CreatePspMembersDTO, pspUser: PspUser ) {
    const password = generateRandomChars(10, 'alphanum');

    const pspAdmin = await this.pspUser.findById(pspUser.id).select('psp_id psp_details')

    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();

    const createdPspUser = await this.pspUser.create({
      ...body,
      psp_details: pspAdmin.psp_details,
      psp_id: pspAdmin.psp_id,
      password: password,
    });

    await this.cacheService.set(
      CacheKeys.PspResetPasswordCode(String(resetCode)),
      String(createdPspUser._id),
    );

    const resetLink = `${this.clientUrl}/psp-team/resetPassword/${resetCode}`;

    this.ee.emit(
      MailNotificationEvents.Account.ResetPassword,
      new SendEmailEvent({
        to: createdPspUser.email,
        from: `"LAWMA REG" <accounts@lawma.co>`,
        subject: 'Reset Your Password',
        context: {
          firstName: createdPspUser.name,
          resetLink: resetLink,
        },
      }),
    );
  }

  async getPspMembers(pspId: string) {

    return this.pspUser.find({ psp_id: pspId, deleted_at: null }).select('-password -id');
  }

  async updatePsp(pspId: string, psp: PspDocument) {
    return this.psp.findByIdAndUpdate(pspId, psp);
  }

  async updatePspMembersStatus({
    pspId,
    memberId,
    status,
  }: UpdatePspMembersStatusBodyDTO & { pspId: string; memberId: string }) {
    return this.pspUser.findByIdAndUpdate(
      {
        _id: memberId,
        psp_id: pspId,
      },
      {
        $set: {
          status,
        },
      },
    );
  }

  async deletePspMembers(pspUserId: string) {
    return this.pspUser.findByIdAndUpdate(pspUserId, {
      deleted_at: new Date(),
    });
  }

  async changePspTeamStatus(pspUserId: string, status: string) {
    await this.pspUser.updateOne(
      { _id: pspUserId },
      {
        $set: {
          status: status,
        },
      },
    );

    return null;
  }
}
