import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Bill, BillSchema } from '@models/bill.model';
import { Transaction, TransactionSchema } from '@models/transaction.model';
import { AuthModule } from '@src/lawma/auth/auth.module';
import { ReconciliationController } from './reconciliation.controller';
import { ReconciliationService } from './reconciliation.service';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Bill.name, schema: BillSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService],
})
export class ReconciliationModule {}
