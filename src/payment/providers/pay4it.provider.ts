import { HttpService } from '@nestjs/axios';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';

@Injectable()
export class Pay4ItProvider {
  private logger = new Logger(Pay4ItProvider.name);
  constructor(
    private readonly configService: ConfigService<ConfigAttributes>,
    private readonly httpService: HttpService,
  ) {}

  async getTokenFromProvider(): Promise<string> {
    const { secretKey, publicKey } = this.configService.get('PAY4IT', {
      infer: true,
    });
    console.log({ secretKey, publicKey });
    const response = await this.httpService.axiosRef.post(
      'https://seerbitapi.com/api/v2/encrypt/keys',
      {
        key: `${secretKey}.${publicKey}`,
      },
    );
    console.log({ response });
    const key = response.data.data?.EncryptedSecKey?.encryptedKey;
    if (!key) {
      this.logger.error({
        message: 'Failed to initialize Pay4It provider',
        response: response.data,
      });
      throw new BadRequestException('Failed to initialize Pay4It provider');
    }
    return key;
  }
  async verifyPayment(reference: string): Promise<any> {
    const response = await this.httpService.axiosRef.post(
      `https://seerbitapi.com/api/v3/payments/query/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${await this.getTokenFromProvider()}`,
        },
      },
    );
    return response.data;
  }
}
