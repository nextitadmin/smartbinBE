import { ApplicationEnvironment } from '@common/constants';
import { ConfigAttributes } from '@src/config';

export const mockConfig: Partial<ConfigAttributes> = {
  database: { uri: 'mysql://void/' },
  applicationEnvironment: ApplicationEnvironment.Development,
  port: 0,
};

export const mockConfigService = {
  get: jest.fn(),
  getOrThrow: jest.fn(),
};
