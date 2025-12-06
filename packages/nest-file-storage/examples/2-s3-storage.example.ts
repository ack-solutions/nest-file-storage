/**
 * Example 2: AWS S3 Storage Configuration
 * 
 * This example shows how to configure AWS S3 for file storage.
 * Requires: @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    ConfigModule.forRoot(),
    // Async configuration with ConfigService
    NestFileStorageModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        storage: FileStorageEnum.S3,
        s3Config: {
          accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
          secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
          region: configService.get('AWS_REGION', 'us-east-1'),
          bucket: configService.get('AWS_BUCKET'),
          cloudFrontUrl: configService.get('AWS_CLOUDFRONT_URL'), // Optional CloudFront URL
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}

// Environment variables (.env file):
// AWS_ACCESS_KEY_ID=your-access-key
// AWS_SECRET_ACCESS_KEY=your-secret-key
// AWS_REGION=us-east-1
// AWS_BUCKET=your-bucket-name
// AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net (optional)

