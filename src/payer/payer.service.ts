import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payer, PayerDocument } from '@models/users/payer.model';
import { CreatePayerDto } from './dto/payer.dto';
import {
  MailNotificationEvents,
  SendEmailEvent,
} from '@src/notification/dto/event';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class PayerService {
  constructor(
    @InjectModel(Payer.name) private readonly payerModel: Model<PayerDocument>,
    private ee: EventEmitter2,
  ) { }

  async createPayer(dto: CreatePayerDto) {
    const { firstName, lastName, email, dateOfBirth, nin, phoneNumber } = dto;

    const existing = await this.payerModel
      .findOne({ email })
      .select('firstName lastName payerId');
    if (existing) {
      return {
        message: 'Payer already exists',
        data: existing,
      };
    }

    try {
      const newAccount = await this.payerModel.create({
        firstName,
        lastName,
        email,
        dateOfBirth,
        nin,
        phoneNumber,
      });

      this.ee.emit(
        MailNotificationEvents.Account.PayerGenerated,
        new SendEmailEvent({
          to: email,
          from: '"LAWMA SMARTBIN" <' + process.env.MAIL_FROM + '>',
          subject: 'Your Payer ID',
          context: {
            firstName: firstName,
            payerId: newAccount.payerId,
          },
        }),
      );

      // await sendPayerIdEmail({
      //   email: newAccount.email,
      //   firstName: newAccount.firstName,
      //   payerId: newAccount.payerId,
      // });

      return {
        message:
          'Payer created successfully. Payer ID has been sent to your mail',
        data: newAccount,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        console.log('error message: ' + error),
        'Error creating payer: ' + error.message,
      );
    }
  }

  async getPayerByPayerId(payerId: string) {
    const payer = await this.payerModel
      .findOne({ payerId })
      .select('firstName lastName email phoneNumber');

    if (!payer) throw new NotFoundException('Payer not found');

    return payer;
  }
}
