import * as Joi from 'joi';

import { ConfigModuleOptions } from '@nestjs/config';
import { ApplicationEnvironment } from '@common/constants';

export interface ConfigAttributes {
  port: number;
  applicationEnvironment: string;
  logging: {
    level: string;
    disableRequestLogging: boolean;
  };
  SESSION_SECRET: string;

  database: {
    uri: string;
    pool?: {
      min: number;
      max: number;
    };
  };
  jwt: {
    secret: string;
    expiry: string;
  };
  mail: {
    smtp_host: string;
    smtp_port: string;
    smtp_user: string;
    smtp_password: string;
  };

  alatpay: {
    businessId: string;
    apiKey: string;
    publicKey: string;
    secretKey: string;
    baseUrl: string;
  };

  kyc: {
    baseUrl: string;
    testApiKey: string;
    liveApiKey: string;
  };

  frontendUrl: string;

  cloudinary: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };
}

const config = (): ConfigAttributes => ({
  port: +process.env.PORT,
  applicationEnvironment: process.env.APPLICATION_ENV || 'development',
  logging: {
    level: process.env.LOG_LEVEL,
    disableRequestLogging: Boolean(+process.env.DISABLE_REQUEST_LOGGING),
  },
  database: {
    uri: process.env.DB_URI,
    pool: {
      min: +process.env.DATABASE_POOL_MIN,
      max: +process.env.DATABASE_POOL_MAX,
    },
  },
  SESSION_SECRET: process.env.SESSION_SECRET,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiry: process.env.JWT_EXPIRY,
  },
  mail: {
    smtp_host: process.env.MAIL_SMTP_HOST,
    smtp_user: process.env.MAIL_SMTP_USERNAME,
    smtp_password: process.env.MAIL_SMTP_PASSWORD,
    smtp_port: process.env.MAIL_SMTP_PORT,
  },

  alatpay: {
    publicKey: process.env.ALAT_CLIENT_ID,
    secretKey: process.env.ALAT_CLIENT_SECRET,
    baseUrl: process.env.ALAT_BASE_URL,
    businessId: process.env.ALAT_BUSINESS_ID,
    apiKey: process.env.ALAT_API_KEY,
  },
  kyc: {
    baseUrl: process.env.KYC_BASE_URL,
    testApiKey: process.env.KYC_TEST_API_KEY,
    liveApiKey: process.env.KYC_LIVE_API_KEY,
  },
  frontendUrl: process.env.FRONTEND_URL,

  cloudinary: {
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  },
});

const schema = Joi.object<Record<string, string>>({
  PORT: Joi.string().default('4001'),
  APPLICATION_ENV: Joi.string().default(ApplicationEnvironment.Development),
  LOG_LEVEL: Joi.string().default('info'),
  DISABLE_REQUEST_LOGGING: Joi.string().allow('0', '1').default('0'),

  DB_URI: Joi.string().required(),

  JWT_SECRET: Joi.string().default('N8kNKyW36E9cv1EOLlTjsgDwR9uX'),
  JWT_EXPIRY: Joi.string().default('48h'),

  ENCRYPTION_KEY: Joi.string().default(
    'hpuVxHk-vJfr8Nlk8hY2Y6S6Zz0NDiCeoujmZ55u8_nmV6EMyP7x8YNv5-jycyOs',
  ),

  CLOUDINARY_CLOUD_NAME: Joi.string().required(),
  CLOUDINARY_API_KEY: Joi.string().required(),
  CLOUDINARY_API_SECRET: Joi.string().required(),

  MAIL_SMTP_PASSWORD: Joi.string().required(),
  MAIL_SMTP_USERNAME: Joi.string().required(),
  MAIL_SMTP_HOST: Joi.string().required(),
  MAIL_SMTP_PORT: Joi.string().required(),

  ALAT_CLIENT_ID: Joi.string().required(),
  ALAT_CLIENT_SECRET: Joi.string().required(),
  ALAT_BASE_URL: Joi.string().required(),

  KYC_BASE_URL: Joi.string().uri().required(),
  KYC_TEST_API_KEY: Joi.string().required(),
  KYC_LIVE_API_KEY: Joi.string().allow('').optional(),

  FRONTEND_URL: Joi.string().required(),
});

export const configModuleOpts: ConfigModuleOptions = {
  cache: true,
  isGlobal: true,
  load: [config],
  validationSchema: schema,
};
