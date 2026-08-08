import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, PopulatedDoc, SchemaTypes, Types } from 'mongoose';
import { Gender, UserRole } from './types';
import { Lga, LGAAttributes } from './lgas.model';

export enum IdVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AddressVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum AgencyInformationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum SignatoryVerificationStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

interface BranchDetails {
  branchName: string;
  branchAddress: string;
}

export interface UserKycAttributes {
  userId: Types.ObjectId;
  userType: UserRole;
  lawmaCustomerType?: string;
  nationality?: string;
  gender?: Gender;
  NinNo?: string;
  idDocument?: string;
  buildingType?: string;
  houseNumber?: string;
  flatNumber?: string;
  address?: string;
  lga: any;
  closestLandmark?: string;
  branches?: BranchDetails[];
  signatories?: Types.ObjectId[];
  hasSubmittedPersonalInformation?: boolean;
  hasSubmittedIdentity?: boolean;
  hasSubmittedAddress?: boolean;
  hasSubmittedAgencyInformation?: boolean;
  hasSubmittedAgencyDocument?: boolean;
  hasSubmittedSignatories?: boolean;
  identityVerificationStatus?: IdVerificationStatus;
  addressVerificationStatus?: AddressVerificationStatus;
  agencyInformationStatus?: AgencyInformationStatus;
  signatoryVerificationStatus?: SignatoryVerificationStatus;
  agencyName?: string;
  businessName?: string;
  businessRegistrationNumber?: string;
  businessEmailAddress?: string;
  businessPhoneNumber?: string;
  businessSector?: string;
  agencyCertificateDocument?: string;
  ninVerificationReference?: string;
  ninVerificationProviderStatus?: string;
  rejectionReason?: string;
  hasCompletedKyc?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserKycDocument = UserKycAttributes & Document;
@Schema({
  collection: 'user_kycs',
  timestamps: true,
  versionKey: false,
})
export class UserKyc extends Document {
  @Prop({
    type: SchemaTypes.ObjectId,
    required: true,
    refPath: 'userType',
  })
  userId: Types.ObjectId;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(UserRole),
    required: true,
  })
  userType: UserRole;

  @Prop({ type: SchemaTypes.String, required: false })
  lawmaCustomerType: string;

  @Prop({ type: SchemaTypes.String, required: false })
  nationality: string;

  @Prop({ type: SchemaTypes.String, enum: Object.values(Gender), required: false })
  gender: Gender;

  @Prop({ type: SchemaTypes.String, required: false })
  NinNo: string;

  @Prop({ type: SchemaTypes.String, required: false })
  idDocument: string;

  @Prop({ type: SchemaTypes.String, required: false })
  buildingType: string;

  @Prop({ type: SchemaTypes.String, required: false })
  houseNumber: string;

  @Prop({ type: SchemaTypes.String, required: false })
  flatNumber: string;

  @Prop({ type: SchemaTypes.String, required: false })
  address: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: Lga.name, required: true })
  lga?: any;

  @Prop({ type: SchemaTypes.String, required: false })
  closestLandmark: string;

  @Prop({ type: [{ type: SchemaTypes.ObjectId }], required: false })
  signatories: Types.ObjectId[];

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasSubmittedPersonalInformation: boolean;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasSubmittedIdentity: boolean;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasSubmittedAddress: boolean;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasSubmittedAgencyInformation?: boolean;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasSubmittedAgencyDocument?: boolean;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasSubmittedSignatories: boolean;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(IdVerificationStatus),
    default: IdVerificationStatus.PENDING,
  })
  identityVerificationStatus: IdVerificationStatus;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(AddressVerificationStatus),
    default: AddressVerificationStatus.PENDING,
  })
  addressVerificationStatus: AddressVerificationStatus;

  @Prop({
    type: [
      {
        branchName: { type: SchemaTypes.String, required: true },
        branchAddress: { type: SchemaTypes.String, required: true },
      },
    ],
    required: false,
    default: [],
  })
  branches: BranchDetails[];

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(AgencyInformationStatus),
    default: AgencyInformationStatus.PENDING,
  })
  agencyInformationStatus: AgencyInformationStatus;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(SignatoryVerificationStatus),
    default: SignatoryVerificationStatus.PENDING,
  })
  signatoryVerificationStatus: SignatoryVerificationStatus;

  @Prop({ type: SchemaTypes.String, required: false })
  agencyName: string;

  @Prop({ type: SchemaTypes.String, required: false })
  businessName: string;

  @Prop({ type: SchemaTypes.String, required: false })
  businessRegistrationNumber: string;

  @Prop({ type: SchemaTypes.String, required: false })
  businessEmailAddress: string;

  @Prop({ type: SchemaTypes.String, required: false })
  businessPhoneNumber: string;

  @Prop({ type: SchemaTypes.String, required: false })
  businessSector: string;

  @Prop({ type: SchemaTypes.String, required: false })
  agencyCertificateDocument: string;

  @Prop({ type: SchemaTypes.String, required: false })
  ninVerificationReference: string;

  @Prop({ type: SchemaTypes.String, required: false })
  ninVerificationProviderStatus: string;

  @Prop({ type: SchemaTypes.String, required: false })
  rejectionReason: string;

  @Prop({ type: SchemaTypes.Boolean, default: false })
  hasCompletedKyc: boolean;

  @Prop({ type: Date })
  createdAt?: Date;

  @Prop({ type: Date })
  updatedAt?: Date;
}

export const UserKycSchema = SchemaFactory.createForClass(UserKyc);
