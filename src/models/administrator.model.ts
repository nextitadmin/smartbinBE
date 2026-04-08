import { getHashedPassword } from '@common/utils';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export enum AdministratorRole {
  SuperAdmin = 'super_admin',
  Admin = 'admin',
  TeamMember = 'team_member',
  SmartBinPartner = 'smartbin_partner',
  PSPAdmin = 'psp_admin',
}

export enum AdministratorStatus {
  Active = 'active',
  Inactive = 'inactive',
}

export interface AdministratorAttributes {
  name: string;
  email: string;
  phoneNumber: string;
  role: AdministratorRole;
  password: string;
  status: AdministratorStatus;
  createdAt?:Date | null;
  updatedAt?:Date | null;
  deleted_at?: Date | null;
}

@Schema({
  collection: 'administrators',
  timestamps: true,
})
export class Administrator implements AdministratorAttributes {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop({ required: true, enum: Object.values(AdministratorRole) })
  role: AdministratorRole;

  @Prop({ required: true })
  password: string;

  @Prop({
    enum: Object.values(AdministratorStatus),
    default: AdministratorStatus.Active,
  })
  status: AdministratorStatus;

  @Prop({ type: Date, default: null })
  deleted_at?: Date;
}

export const AdministratorSchema = SchemaFactory.createForClass(Administrator);

AdministratorSchema.pre('save', function (next) {
  if (this.isModified('password')) {
    this.password = getHashedPassword(this.password);
  }

  next();
});
