import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Pay4ItProvider } from './providers/pay4it.provider';
import { HttpModule } from '@nestjs/axios';
import { MongooseModule } from '@nestjs/mongoose';
import { Transaction, TransactionSchema } from '@models/transaction.model';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forFeature([
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  providers: [PaymentService, Pay4ItProvider],
  controllers: [PaymentController],
})
export class PaymentModule {}
