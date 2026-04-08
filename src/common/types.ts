import { AdministratorRole } from '@models/administrator.model';
import { UserRole } from '@models/types';
import { Types } from 'mongoose';
import { StringDecoder } from 'string_decoder';

// export type QueryFilter<T> = WhereOptions<T>;
// type RawModelAttributes<T extends Model> = InferAttributes<
//   T,
//   { omit: 'createdAt' | 'updatedAt' | 'deletedAt' | 'version' }
// >;
// export type RawModel<T extends Model> = RawModelAttributes<T>;

// export type RawModelWithAttributes<
//   T extends Model,
//   A extends keyof RawModelAttributes<T>,
// > = Pick<RawModel<T>, A>;

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  token?: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
};

export type CorporateUser = AuthUser;
export type FacilityManagerUser = AuthUser;
export type AgentUser = AuthUser;
export type ResidentUser = AuthUser;

export type AdminUser = {
  id: string;
  email: string;
  role: AdministratorRole;
  name: string;
  token?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type PspUser = {
  id: string;
  pspId?: string;
  email: string;
  name: string;
  role?:string;
  token?: string;
  ipAddress?: string;
  userAgent?: string;
  lga_id?: Types.ObjectId;
};

export type PspTeamMember = {
  id: string;
  pspId?:string;
  email: string;
  name: string;
  token?: string;
  ipAddress?: string;
  userAgent?: string;
};

export type SmartbinPartnerUser = {
  id: string;
  email: string;
  name: string;
  role: AdministratorRole.SmartBinPartner;
};
