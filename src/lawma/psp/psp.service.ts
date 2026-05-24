import { PSPUsers, PspUsersDocument } from '@models/psp-users.model';
import { PSP, PspDocument } from '@models/psp.model';
import { Inject, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { CreatePspDTO, CreatePspMembersDTO } from './dto/psp.dto';
import { InjectModel } from '@nestjs/mongoose';
import { UpdatePspMembersStatusBodyDTO } from './dto/psp.dto';
import { Lga } from '@models/lgas.model';
import { Administrator, AdministratorRole } from '@models/administrator.model';
import { AuditLogEvents, LogActionEvent } from '../audit-log/dto/event';
import { LOGTYPE, UserType } from '@models/audit-log.model';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AdminUser, PspUser } from '@common/types';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { CacheKeys } from '@src/shared/constants';
import { generateRandomChars } from '@common/utils';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { RbacService } from '@src/rbac/rbac.service';
import { AddRoleDto } from '@src/rbac/dto/rbac.dto';

@Injectable()
export class PspService {
  protected clientUrl: ConfigAttributes['frontendUrl'];

  constructor(
    @InjectModel(PSP.name)
    private readonly psp: Model<PspDocument>,
    @InjectModel(PSPUsers.name)
    private readonly pspUser: Model<PspUsersDocument>,
    @InjectModel(Lga.name) private lga: Model<Lga>,
    private readonly ee: EventEmitter2,
    @Inject(CACHE_MANAGER) private cacheService: Cache,
    private readonly configService: ConfigService<ConfigAttributes>,
    private readonly rbacService: RbacService
  ) {
    this.clientUrl = this.configService.get<string>('frontendUrl');
  }

  async createPsp(psp: CreatePspDTO, admin: AdminUser) {
    const password = generateRandomChars(9, 'alphanum');
    console.log(password);

    const pspData = await this.psp.create({ ...psp });

    await this.pspUser.create({
      psp_id: pspData._id,
      psp_details: {
        _id: pspData._id,
        company_name: pspData.company_name
      },
      name: pspData.administrator_name,
      email: pspData.administrator_email,
      password: password,
      phone_number: pspData.administrator_phone,
      status: "active",
      role: "administrator",
    })
    const resetCode = Math.floor(10000 + Math.random() * 90000).toString();

    await this.cacheService.set(
      CacheKeys.PspResetPasswordCode(String(resetCode)),
      String(pspData._id),
    );

    const resetLink = `${this.clientUrl}/psp-admin/resetpassword/${resetCode}`;

    this.ee.emit(
      AuditLogEvents.UserActivity,
      new LogActionEvent({
        administrator: admin,
        action: LOGTYPE.PspAdded,
        userType: UserType.Admin,
      }),
    );

    this.ee.emit(
      MailNotificationEvents.Account.ResetPassword,
      new SendEmailEvent({
        to: psp.administrator_email,
        from: `"LAWMA SMARTBIN" <${process.env.MAIL_FROM}>`,
        subject: 'Reset Your Password',
        context: {
          firstName: psp.administrator_name,
          resetLink: resetLink,
        },
      }),
    );

    return {
      email: pspData.administrator_email,
      name: pspData.company_name,
      id: pspData._id,
    };
    
  }

  async getPspLgas() {
    return this.lga.find();
  }

  async createPspMembers(pspMembers: CreatePspMembersDTO & { psp_id: string }) {
    const password = generateRandomChars(6, 'alphanum');
    
    const psp = await this.psp
      .findById(pspMembers.psp_id)
      .select('company_name');
    return this.pspUser.create({
      ...pspMembers,
      psp_details: psp,
      psp_id: pspMembers.psp_id,
      password: password
    });
  }

  async getPsps() {
    return this.psp.find({ deleted_at: null });
  }

  async getPsp(pspId: string) {
    return this.psp.findById(pspId);
  }

  async changePspStatus(pspId: string, status: string, admin: AdminUser) {
    await this.psp.updateOne(
      { _id: pspId },
      {
        $set: {
          status: status,
        },
      },
    );

    const userAction = status === "inactive" ? LOGTYPE.PspDeactivated : LOGTYPE.PspActivated

    this.ee.emit(AuditLogEvents.UserActivity,  new LogActionEvent({
      action: userAction,
      administrator: admin,
      userType: UserType.Admin
    }))

    return null;
  }

  async getPspMembers(pspId: string) {
    return this.pspUser.find({ psp_id: pspId, deleted_at: null });
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

  async deletePsp(pspId: string) {
    // return this.psp.findByIdAndDelete(pspId);
    return this.psp.findByIdAndUpdate(pspId, {
      deleted_at: new Date(),
    });
  }

  async deletePspMembers(pspMembersId: string) {
    // return this.pspMembers.findByIdAndDelete(pspMembersId);
    return this.pspUser.findByIdAndUpdate(pspMembersId, {
      deleted_at: new Date(),
    });
  }

  async getRoles(createdBy: string) {
    return this.rbacService.getRoles(createdBy);
  }

  async getPermissions() {
    return this.rbacService.getPermissions();
  }
  async addRole(payload: AddRoleDto & { createdBy: string }) {
    return this.rbacService.createRole(payload);
  }
}
