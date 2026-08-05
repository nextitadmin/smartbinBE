import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Pay4ItProvider } from './providers/pay4it.provider';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  providers: [PaymentService, Pay4ItProvider],
  controllers: [PaymentController],
})
export class PaymentModule {}
