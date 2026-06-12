/**
 * Example 3: Azure Blob Storage Configuration
 *
 * Requires: @azure/storage-blob (loaded lazily).
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFileStorageModule, azureDriver } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestFileStorageModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        default: 'azure',
        drivers: {
          azure: azureDriver({
            account: config.getOrThrow('AZURE_STORAGE_ACCOUNT'),
            accountKey: config.getOrThrow('AZURE_STORAGE_KEY'),
            container: config.get('AZURE_CONTAINER', 'uploads'),
            cdnUrl: config.get('AZURE_CDN_URL'), // optional CDN for getSignedUrl()
          }),
        },
      }),
    }),
  ],
})
export class AppModule {}

// Environment variables (.env file):
// AZURE_STORAGE_ACCOUNT=your-account-name
// AZURE_STORAGE_KEY=your-account-key
// AZURE_CONTAINER=uploads
// AZURE_CDN_URL=https://cdn.example.com  (optional)
