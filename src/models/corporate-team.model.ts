import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';
import { Gender, UserRole } from './types';

export enum IdVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
}

export enum AddressVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
}

export enum SignatoryVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  REJECTED = 'rejected',
}

export interface CorporateTeamAttributes {
  userId: Types.ObjectId;
  userType: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  gender: Gender;
  jobTitle: string;
  address: string;
  NinNo: string;
  idDocument: string;
  deletedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({
  collection: 'corporate_teams',
  timestamps: true,
  versionKey: false,
})
export class CorporateTeam extends Document {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
  })
  userId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(UserRole),
    required: true,
  })
  userType: UserRole;

  @Prop({ type: SchemaTypes.String, required: false })
  firstName: string;

  @Prop({ type: SchemaTypes.String, required: false })
  lastName: string;

  @Prop({ type: SchemaTypes.String, required: false })
  email: string;

  @Prop({ type: SchemaTypes.String, required: false })
  phoneNumber: string;

  @Prop({ type: SchemaTypes.String, required: false })
  nationality: string;

  @Prop({ type: SchemaTypes.String, enum: Object.values(Gender), required: false })
  gender: Gender;

  @Prop({ type: SchemaTypes.String, required: false })
  jobTitle: string;

  @Prop({ type: SchemaTypes.String, required: false })
  address: string;

  @Prop({ type: SchemaTypes.String, required: false })
  NinNo: string;

  @Prop({ type: SchemaTypes.String, required: false })
  idDocument: string;

  @Prop({ type: Date })
  deletedAt?: Date;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const CorporateTeamSchema = SchemaFactory.createForClass(CorporateTeam);
