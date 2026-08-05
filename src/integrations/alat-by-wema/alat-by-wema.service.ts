import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ConfigAttributes } from '@src/config';
import { AxiosInstance } from 'axios';

@Injectable()
export class AlatByWemaService {
  private httpClient: AxiosInstance;
  constructor(
    // Inject any necessary dependencies here, such as HTTP clients or configuration services
    private readonly httpService: HttpService,
    private readonly configService: ConfigService<ConfigAttributes>,
  ) {
    // const alatConfig = this.configService.get('alatpay', { infer: true });
    // const { baseUrl, businessId, apiKey } = alatConfig;
    // this.httpClient = this.httpService.axiosRef.create({
    //   baseURL: baseUrl,
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Business-ID': businessId,
    //     'Ocp-Apim-Subscription-Key': apiKey,
    //   },
    // });
  }

  async getTransactionStatus(
    transactionId: string,
  ): Promise<Record<string, any>> {
    return this.dummyTransaction(transactionId);
  }

  dummyTransaction(transactionReference: string): Record<string, any> {
    // This is a dummy implementation for demonstration purposes
    const dummyResponse = {
      Amount: 100.0,
      OrderId: '',
      Description: null,
      PaymentMethodId: 3,
      SessionId: 'M245679862',
      Customer: {
        Id: 'e423456d-ce62-4c3a-fb93-08dce9ab4259',
        TransactionId: 'aeee1f3456789',
        CreatedAt: '2024-11-01T15:47:09.1193923',
        Email: 'johndoe@gmail.com',
        Phone: '081****01',
        FirstName: 'john',
        LastName: 'doe',
        Metadata: 'your metadata',
      },
      Otp: null,
      Id: 'a5768e1f0d-2ef5-4f99-96b4-8b60bc538d4f',
      MerchantId: '4aa46573-66c2-4ed2-2fdc-08dc53a699fb',
      BusinessId: '123456f70-d966-4c79-0823-08dc57d6698e',
      Channel: null,
      CallbackUrl: 'https://webhook.site/afc97e4a-3400-4fb0-a424-209c00dcca9e',
      FeeAmount: 0,
      BusinessName: 'your-business-name',
      Currency: 'NGN',
      Status: 'completed',
      StatusReason: null,
      SettlementType: 'Manual',
      CreatedAt: '2024-11-01T15:47:09.1193392',
      UpdatedAt: '2024-11-01T16:47:31.070972Z',
      NgnVirtualBankAccountNumber: '999NGNxxxxx',
      NgnVirtualBankCode: null,
      UsdVirtualAccountNumber: '999USDx',
      UsdVirtualBankCode: null,
    };
    return {
      success: true,
      data: {
        amount: dummyResponse.Amount,
        currency: 'NGN',
        providerId: dummyResponse.OrderId,
        customer: {
          id: dummyResponse.Customer.Id,
          firstName: dummyResponse.Customer.FirstName,
          lastName: dummyResponse.Customer.LastName,
          email: dummyResponse.Customer.Email,
          phone: dummyResponse.Customer.Phone,
        },
        transactionReference,
        id: dummyResponse.Id,
        status: dummyResponse.Status,
        createdAt: dummyResponse.CreatedAt,
        updatedAt: dummyResponse.UpdatedAt,
      },
      message: 'Transaction completed successfully',
    };
  }
}
