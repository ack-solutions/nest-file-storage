/**
 * Example 2: AWS S3 Storage Configuration
 *
 * Configure AWS S3 (or an S3-compatible store like MinIO / R2 / Spaces).
 * Requires: @aws-sdk/client-s3 @aws-sdk/s3-request-presigner (loaded lazily).
 */

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFileStorageModule, s3Driver } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestFileStorageModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        default: 's3',
        drivers: {
          s3: s3Driver({
            accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
            secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
            region: config.get('AWS_REGION', 'us-east-1'),
            bucket: config.getOrThrow('AWS_BUCKET'),
            cloudFrontUrl: config.get('AWS_CLOUDFRONT_URL'), // optional CDN for getUrl()
            endpoint: config.get('S3_ENDPOINT'), // optional, for S3-compatible stores
          }),
        },
      }),
    }),
  ],
})
export class AppModule {}

// Environment variables (.env file):
// AWS_ACCESS_KEY_ID=your-access-key
// AWS_SECRET_ACCESS_KEY=your-secret-key
// AWS_REGION=us-east-1
// AWS_BUCKET=your-bucket-name
// AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net  (optional)
// S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com  (optional, S3-compatible)
