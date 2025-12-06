/**
 * Example 1: Basic Local Storage Configuration
 * 
 * This example shows how to set up local file storage with basic configuration.
 */

import { Module } from '@nestjs/common';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.LOCAL,
      localConfig: {
        rootPath: './uploads', // Directory where files will be stored
        baseUrl: 'http://localhost:3000/uploads', // Base URL for accessing files
      },
    }),
  ],
})
export class AppModule {}

