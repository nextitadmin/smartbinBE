import { getHashedPassword } from '@common/utils';
import { Lga } from '@models/lgas.model';
import { AccountStatus, Gender, UserRole } from '@models/types';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export enum AgentStatus {
  Active = 'active',
  Inactive = 'inactive',
  Suspended = 'suspended',
}

export enum AgentIdType {
  NIN = 'NIN',
  DRIVERS_LICENSE = 'Drivers_License',
  VOTERS_CARD = 'Voters_Card',
  INTERNATIONAL_PASSPORT = 'International_Passport',
}

export interface AgentAddressAttributes {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface AgentAtributes {
  _id?: string | Types.ObjectId;
  payerId: string;
  agencyName: string;
  businessEmail: string;
  addresses: AgentAddressAttributes[];
  regNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nationality: string;
  gender: Gender;
  idType: AgentIdType;
  idNumber: string;
  role: UserRole.Agent;
  password: string;
  profilePicture: string;
  status: AgentStatus;
  loginCode: string;
  loginCodeExpiry: Date;
  deleted_at?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  lgaId: Types.ObjectId;
  pspCompany?: string;
}

@Schema({
  collection: 'agents',
  id: true,
  timestamps: true,
  versionKey: false,
})
export class Agent implements AgentAtributes {
  @Prop({ type: SchemaTypes.String, required: true })
  payerId: string;

  @Prop({ type: SchemaTypes.String, required: true })
  agencyName: string;

  @Prop({ type: SchemaTypes.String })
  businessEmail: string;

  @Prop({ type: [Object] })
  addresses: AgentAddressAttributes[];

  @Prop({ type: SchemaTypes.String })
  regNumber: string;

  @Prop({ type: SchemaTypes.String })
  firstName: string;

  @Prop({ type: SchemaTypes.String })
  lastName: string;

  @Prop({ type: SchemaTypes.String, required: true })
  email: string;

  @Prop({ type: SchemaTypes.String })
  phoneNumber: string;

  @Prop({ type: SchemaTypes.String })
  nationality: string;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(Gender),
  })
  gender: Gender;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(AgentIdType),
  })
  idType: AgentIdType;

  @Prop({ type: SchemaTypes.String })
  idNumber: string;

  @Prop({
    type: SchemaTypes.String,
    enum: [UserRole.Agent],
    default: UserRole.Agent,
  })
  role: UserRole.Agent;

  @Prop({
    type: SchemaTypes.String,
    required: true,
    set: (val: string) => getHashedPassword(val),
  })
  password: string;

  @Prop({ type: SchemaTypes.String })
  profilePicture: string;

  @Prop({ type: SchemaTypes.String })
  loginCode: string;

  @Prop({ type: SchemaTypes.String })
  loginCodeExpiry: Date;

  @Prop({
    type: SchemaTypes.String,
    enum: Object.values(AgentStatus),
    default: AgentStatus.Active,
  })
  status: AgentStatus;

  @Prop({
    type: SchemaTypes.ObjectId,
    ref: Lga.name,
    required: true,
  })
  lgaId: Types.ObjectId;

  @Prop({ type: SchemaTypes.String })
  pspCompany: string;

  @Prop()
  createdAt?: Date;
  @Prop()
  updatedAt?: Date;
  @Prop({ type: Date, default: null })
  deleted_at?: Date;
}

export type AgentDocument = Agent & Document;

export const AgentSchema = SchemaFactory.createForClass(Agent);

export const defaultAgentFields =
  'payerId agencyName addresses firstName lastName phoneNumber profilePicture email role statu ';

AgentSchema.virtual('residents', {
  ref: 'Resident',
  localField: '_id',
  foreignField: 'registeredBy',
  match: { registeredByModel: 'Agent' },
});

// Virtual for Corporates registered by this Agent
AgentSchema.virtual('corporates', {
  ref: 'Corporate',
  localField: '_id',
  foreignField: 'registeredBy',
  match: { registeredByModel: 'Agent' },
});
