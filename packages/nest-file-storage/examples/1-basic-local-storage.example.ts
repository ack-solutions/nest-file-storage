/**
 * Example 1: Basic Local Storage Configuration
 *
 * The simplest setup — register a single local driver and make it the default.
 */

import { Module } from '@nestjs/common';
import { NestFileStorageModule, localDriver } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      default: 'local',
      drivers: {
        local: localDriver({
          rootPath: './uploads', // directory where files are written
          baseUrl: 'http://localhost:3000/uploads', // URL prefix used by getUrl()
        }),
      },
    }),
  ],
})
export class AppModule {}

// Note: `baseUrl` only builds the URL string — it does not serve files over HTTP.
// Add static serving (e.g. @nestjs/serve-static) or stream files via your own controller.
