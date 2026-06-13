# @ackplus/nest-file-storage

> One file-storage API for NestJS — Local, S3, Azure, or your own driver. Upload through a controller interceptor or call it directly. Pick storage **per request** (great for multi-tenant apps), validate declaratively, and get one consistent file shape everywhere.

[![npm](https://img.shields.io/npm/v/@ackplus/nest-file-storage.svg)](https://www.npmjs.com/package/@ackplus/nest-file-storage)
[![docs](https://img.shields.io/badge/docs-website-3b82f6.svg)](https://ack-solutions.github.io/nest-file-storage/)
[![downloads](https://img.shields.io/npm/dm/@ackplus/nest-file-storage.svg)](https://www.npmjs.com/package/@ackplus/nest-file-storage)
[![license](https://img.shields.io/npm/l/@ackplus/nest-file-storage.svg)](./LICENSE)

## 📖 Documentation → **<https://ack-solutions.github.io/nest-file-storage/>**

**This README is just a quick start.** The full guides, the custom-driver and multi-tenant cookbooks, the complete API reference, and the v1 → v2 migration guide all live on the **[documentation site](https://ack-solutions.github.io/nest-file-storage/)**.

---

## Why this library?

Wiring Multer to S3/Azure/local by hand means juggling storage engines, SDK clients, key generation, URL building, and validation in every project — and swapping providers later means rewriting it all. This library gives you **one stable API** over all of them.

- **Provider-agnostic** — write upload code once; switch Local → S3 → Azure (or your own backend) by changing config, not controllers.
- **Custom storage is first-class** — implement a small [`StorageDriver`](https://ack-solutions.github.io/nest-file-storage/custom-drivers) and it works everywhere (interceptor + service).
- **Per-request / multi-tenant** — route each upload to the right bucket/folder, with per-tenant driver caching. See [multi-tenant](https://ack-solutions.github.io/nest-file-storage/multi-tenant).
- **Declarative validation** — size, MIME, extension, and count limits as data → typed `400`s.
- **One result shape** — every upload returns the same `UploadedFile` (`key`, `url`, `size`, …).
- **Lean dependencies** — the AWS and Azure SDKs are optional peers, loaded lazily only if you use them.

## Install

```bash
npm i @ackplus/nest-file-storage multer reflect-metadata
# optional, only if you use them:
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner   # AWS S3
npm i @azure/storage-blob                                # Azure Blob
```

Requires NestJS on **Express** (`@nestjs/platform-express`). Peer ranges: `@nestjs/common`/`@nestjs/core` `^10 || ^11`, `multer` `^1.4.5-lts.1 || ^2`, `reflect-metadata` `^0.2.2`.

## Quick start

**1. Register a driver:**

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

**2. Accept uploads in a controller:**

```ts
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

That's the basics. Everything else — providers, custom drivers, multi-tenant, validation, the service API — is in the docs.

## Documentation

| Guide | |
| --- | --- |
| 🚀 [Getting started](https://ack-solutions.github.io/nest-file-storage/getting-started) | install, configure, async setup |
| 🧩 [Core concepts](https://ack-solutions.github.io/nest-file-storage/concepts) | drivers, the registry, the file model |
| 🗄️ [Providers](https://ack-solutions.github.io/nest-file-storage/providers) | Local / S3 / Azure + comparison |
| 🔌 [Custom drivers](https://ack-solutions.github.io/nest-file-storage/custom-drivers) | implement your own backend |
| 🏢 [Multi-tenant storage](https://ack-solutions.github.io/nest-file-storage/multi-tenant) | per-request / per-tenant routing |
| ✅ [Validation & limits](https://ack-solutions.github.io/nest-file-storage/validation) | size, MIME, extension, count |
| ⬆️ [Uploading in controllers](https://ack-solutions.github.io/nest-file-storage/uploading) | single / array / fields, key control |
| 🛠️ [Using the service](https://ack-solutions.github.io/nest-file-storage/service) | programmatic access |
| 📚 [API reference](https://ack-solutions.github.io/nest-file-storage/api) | every option |
| 🔄 [Migration v1 → v2](https://ack-solutions.github.io/nest-file-storage/migration) | upgrade path |

Runnable snippets also live in [`examples/`](./examples).

## Upgrading from v1?

v2 is a redesign around a driver registry. Most v1 apps keep booting — the old `forRoot({ storage, *Config })` config is auto-translated and the static `FileStorageService.getStorage()` still works, both with deprecation warnings. See the **[migration guide](https://ack-solutions.github.io/nest-file-storage/migration)**.

## License

MIT
