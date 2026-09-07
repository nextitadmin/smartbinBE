import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModuleAsyncOptions } from '@nestjs/mongoose';

export const mongodbConfigOptions: MongooseModuleAsyncOptions = {
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: async (configService: ConfigService) => ({
    uri: configService.get<string>('DB_URI'),
    dbName: configService.get<string>('DB_NAME') ?? 'smartbin_dev',
    onConnectionCreate: (connection) => {
      connection.on('error', (error) => {
        console.error('MongoDB connection error', error);
      });
      connection.on('connected', () => {
        console.log('MongoDB connected', connection.db.databaseName);
      });
    },
  }),
};
