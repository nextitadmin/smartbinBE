import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// ✅ 1. Interface for strong typing
export interface PayerAttributes {
  payerId: string;
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: Date;
  nin: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// ✅ 2. Class with Mongoose decorators
@Schema({ timestamps: true })
export class Payer implements PayerAttributes {
  @Prop({
    unique: true,
    default: () => `PAYER-${uuidv4().split('-')[0].toUpperCase()}`,
  })
  payerId: string;

  @Prop({ required: true, trim: true })
  firstName: string;

  @Prop({ required: true, trim: true })
  lastName: string;

  @Prop({ required: true, trim: true, lowercase: true, unique: true })
  email: string;

  @Prop({ required: true, unique: true, trim: true })
  phoneNumber: string;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop({ required: true, unique: true, minlength: 11, maxlength: 11 })
  nin: string;

  createdAt?: Date;
  updatedAt?: Date;
}

// ✅ 3. Full document type for service/model usage
export type PayerDocument = Payer & Document;

// ✅ 4. Export schema
export const PayerSchema = SchemaFactory.createForClass(Payer);
