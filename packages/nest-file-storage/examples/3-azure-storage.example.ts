/**
 * Example 3: Azure Blob Storage Configuration
 * 
 * This example shows how to configure Azure Blob Storage.
 * Requires: @azure/storage-blob
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestFileStorageModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: FileStorageEnum.AZURE,
        azureConfig: {
          account: configService.get('AZURE_STORAGE_ACCOUNT'),
          accountKey: configService.get('AZURE_STORAGE_KEY'),
          container: configService.get('AZURE_CONTAINER', 'uploads'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}

// Environment variables (.env file):
// AZURE_STORAGE_ACCOUNT=your-account-name
// AZURE_STORAGE_KEY=your-account-key
// AZURE_CONTAINER=uploads

