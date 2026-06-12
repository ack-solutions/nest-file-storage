---
id: getting-started
title: Getting started
sidebar_position: 2
---

# Getting started

## Install

```bash
npm i @ackplus/nest-file-storage multer reflect-metadata
```

Optional provider SDKs (only if you use them — loaded lazily):

```bash
# AWS S3
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# Azure Blob
npm i @azure/storage-blob
```

:::note Requirements
NestJS on **Express** (`@nestjs/platform-express`). Peer ranges: `@nestjs/common` / `@nestjs/core` `^10 || ^11`, `multer` `^1.4.5-lts.1 || ^2`, `reflect-metadata` `^0.2.2`.
:::

## Register the module

```ts
import { Module } from '@nestjs/common';
import { NestFileStorageModule, localDriver } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      default: 'local',
      drivers: {
        local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
      },
    }),
  ],
})
export class AppModule {}
```

The module is **global**, so `FileStorageService` and the interceptor are available everywhere without re-importing.

## Accept an upload

```ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(FileStorageInterceptor('file'))
  upload(@Body() body: { file: string }) {
    return { key: body.file };
  }
}
```

`FileStorageInterceptor('file')` parses `multipart/form-data`, stores the file, and writes the storage **key** into `request.body.file` before your handler runs.

## Async configuration

When config comes from `ConfigService`, a database, etc., use `forRootAsync`:

```ts
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFileStorageModule, s3Driver } from '@ackplus/nest-file-storage';

NestFileStorageModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    default: 's3',
    drivers: {
      s3: s3Driver({
        accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
        secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
        region: config.getOrThrow('AWS_REGION'),
        bucket: config.getOrThrow('AWS_BUCKET'),
      }),
    },
  }),
});
```

`forRootAsync` is also the path for [multi-tenant setups](./multi-tenant) — inject your tenant service into `useFactory`.

## Serving local files

For local storage, `baseUrl` only builds the URL string returned by `getUrl()` — it does **not** serve files. Add static serving for browser access:

```bash
npm i @nestjs/serve-static
```

```ts
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'uploads'),
  serveRoot: '/uploads',
});
```

Or stream files through your own controller with `FileStorageService.getFile(key)`.
