import { getHashedPassword } from '@common/utils';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { SchemaTypes, Types } from 'mongoose';

export type PspDocument = PSP & Document;

export enum PSPStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PspRole {
  Admin = 'admin',
  TeamMember = 'team_member',
  Viewer = 'viewer',
}

@Schema({ collection: 'psps', timestamps: true, versionKey: false })
export class PSP {
  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  company_name: string;

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  administrator_name: string;

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  administrator_email: string;


  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  administrator_phone: string;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: 'Lga',
    required: true,
  })
  lga_id: Types.ObjectId;

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  lga_address: string;

  @Prop({
    type: SchemaTypes.String,
    required: true,
  })
  company_address: string;

  @Prop({
    enum: Object.values(PSPStatus), default: PSPStatus.ACTIVE
  })
  status: string;

  @Prop({
    type: SchemaTypes.Date,
    required: false,
  })
  deleted_at: Date;
}

export const PSPSchema = SchemaFactory.createForClass(PSP);
