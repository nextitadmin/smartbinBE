import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TrustpointlyService } from './trustpointly.service';

@Module({
  imports: [HttpModule],
  providers: [TrustpointlyService],
  exports: [TrustpointlyService],
})
export class TrustpointlyModule {}
