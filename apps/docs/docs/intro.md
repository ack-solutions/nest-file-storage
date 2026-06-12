---
id: intro
title: Introduction
slug: /
sidebar_position: 1
---

# @ackplus/nest-file-storage

**One file-storage API for NestJS** — Local, S3, Azure, or your own driver. Upload through a controller interceptor or call it directly. Pick storage **per request** (great for multi-tenant apps), validate declaratively, and get one consistent file shape everywhere.

```bash
npm i @ackplus/nest-file-storage multer reflect-metadata
```

## Why this library?

Wiring Multer to S3/Azure/local by hand means juggling storage engines, SDK clients, key generation, URL building, and validation in every project — and swapping providers later means rewriting it all. This library gives you **one stable API** over all of them.

- **Provider-agnostic.** Write your upload code once. Switch Local → S3 → Azure (or your own backend) by changing config, not controllers.
- **Custom storage is first-class.** Implement a small [`StorageDriver`](./custom-drivers) interface and it works **everywhere** — interceptor and service alike.
- **Per-request / multi-tenant storage.** Route each upload to the right bucket/folder based on the request. Built-in caching means one client per tenant, not per request. See [Multi-tenant](./multi-tenant).
- **Declarative validation.** Size, MIME type, extension, and file-count limits as data — rejections are typed `400`s. See [Validation & limits](./validation).
- **One result shape.** Every upload returns the same [`UploadedFile`](./concepts#the-uploadedfile-model-file-state), so the rest of your app never branches on provider.
- **Lean dependencies.** The AWS and Azure SDKs are optional peers, loaded lazily only if you use them.
- **NestJS-native.** A dynamic module, an injectable service, and a route interceptor.

## 60-second example

```ts
// app.module.ts
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

```ts
// files.controller.ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('files')
export class FilesController {
  @Post('upload')
  @UseInterceptors(FileStorageInterceptor('file'))
  upload(@Body() body: { file: string }) {
    return { key: body.file }; // body.file is the stored key
  }
}
```

:::tip Upgrading from v1?
See the [Migration guide](./migration). Your old config still boots (with a deprecation warning) while you migrate incrementally.
:::

## Next steps

- [Getting started](./getting-started) — install, configure, and run.
- [Core concepts](./concepts) — drivers, the registry, and the file model.
- [Custom drivers](./custom-drivers) · [Multi-tenant](./multi-tenant) · [Validation](./validation).
