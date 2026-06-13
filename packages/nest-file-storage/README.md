# @ackplus/nest-file-storage

> One file-storage API for NestJS — Local, S3, Azure, or your own driver. Upload through a controller interceptor or call it directly. Pick storage **per request** (great for multi-tenant apps), validate declaratively, and store one consistent file shape everywhere.

[![npm](https://img.shields.io/npm/v/@ackplus/nest-file-storage.svg)](https://www.npmjs.com/package/@ackplus/nest-file-storage)
[![docs](https://img.shields.io/badge/docs-website-3b82f6.svg)](https://ack-solutions.github.io/nest-file-storage/)
[![license](https://img.shields.io/npm/l/@ackplus/nest-file-storage.svg)](./LICENSE)

📖 **[Read the full documentation →](https://ack-solutions.github.io/nest-file-storage/)** &nbsp;·&nbsp; 📦 [npm](https://www.npmjs.com/package/@ackplus/nest-file-storage) &nbsp;·&nbsp; 💻 [GitHub](https://github.com/ack-solutions/nest-file-storage)

> This page is a quick reference. The **[documentation site](https://ack-solutions.github.io/nest-file-storage/)** has the full guides, driver setup, and examples.

---

## Why this library?

Wiring Multer to S3/Azure/local by hand means juggling storage engines, SDK clients, key generation, URL building, and validation in every project — and swapping providers later means rewriting it all. This library gives you **one stable API** over all of them.

- **Provider-agnostic.** Write your upload code once. Switch Local → S3 → Azure (or your own backend) by changing config, not controllers.
- **Custom storage is first-class.** Implement a small `StorageDriver` interface and it works **everywhere** — interceptor and service alike. No fork, no adapter glue.
- **Per-request / multi-tenant storage.** Route each upload to the right bucket/folder based on the request (tenant, user plan, file type). Built-in caching means one client per tenant, not per request.
- **Declarative validation.** Size, MIME type, extension, and file-count limits as data — not hand-rolled checks scattered through your handlers. Rejections are typed `400`s.
- **One result shape.** Every upload — local or cloud — returns the same `UploadedFile` (`key`, `url`, `size`, …), so the rest of your app never branches on provider.
- **Lean dependencies.** The AWS and Azure SDKs are optional peers, loaded lazily only if you use them. Install nothing extra for local storage.
- **NestJS-native.** A dynamic module, an injectable service, and a route interceptor — the patterns you already use.

> **Upgrading from v1?** See **[MIGRATION.md](./MIGRATION.md)**. Your old config still boots (with a deprecation warning) while you migrate.

## Contents

- [Install](#install) · [Quick start](#quick-start) · [Core concepts](#core-concepts)
- [Configure providers](#configure-providers) · [Provider comparison](#provider-comparison)
- [Custom storage drivers](#custom-storage-drivers) · [Multi-tenant storage](#multi-tenant-storage)
- [Uploading in controllers](#uploading-in-controllers) · [Validation & limits](#validation--limits)
- [Mapping results into the body](#mapping-results-into-the-request-body) · [Using the service](#using-the-service-programmatically)
- [The `UploadedFile` model (file state)](#the-uploadedfile-model-file-state) · [API reference](#api-reference)

---

## Install

```bash
npm i @ackplus/nest-file-storage multer reflect-metadata
# AWS S3 (optional):
npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
# Azure Blob (optional):
npm i @azure/storage-blob
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
        local: localDriver({
          rootPath: './uploads',
          baseUrl: 'http://localhost:3000/uploads',
        }),
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

The interceptor parses `multipart/form-data`, stores the file, and writes the storage key into `request.body.file` before your handler runs.

## Core concepts

- **Driver** — a backend implementing the [`StorageDriver`](#the-storagedriver-interface) contract (put/get/delete/copy/url). Built-ins: `localDriver`, `s3Driver`, `azureDriver`. Bring your own with `defineDriver`.
- **Registry** — the module builds a registry from your `drivers` map. Drivers are instantiated **once** and cached. The interceptor and the service both resolve from it, so everything behaves the same.
- **Default driver** — `default` names the driver used when nothing else is specified.
- **`UploadedFile`** — the one result shape returned by every driver. See [file state](#the-uploadedfile-model-file-state).

## Configure providers

### Local

```ts
localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' })
```

> `baseUrl` only builds the URL string — it does not serve files. Add static serving (e.g. `@nestjs/serve-static`) for browser access, or stream files through your own controller.

### AWS S3 (and S3-compatible: MinIO, R2, Spaces)

```ts
s3Driver({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
  bucket: process.env.AWS_BUCKET!,
  endpoint: process.env.S3_ENDPOINT,       // optional, for S3-compatible
  cloudFrontUrl: process.env.CDN_URL,      // optional, used by getUrl()
})
```

### Azure Blob Storage

```ts
azureDriver({
  account: process.env.AZURE_ACCOUNT!,
  accountKey: process.env.AZURE_KEY!,
  container: process.env.AZURE_CONTAINER!,
  cdnUrl: process.env.AZURE_CDN_URL,       // optional, used by getSignedUrl()
})
```

### Async configuration

Use `forRootAsync` when config comes from `ConfigService`, a database, etc.:

```ts
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

### Provider comparison

| Capability | Local | S3 | Azure | Custom |
| --- | :---: | :---: | :---: | :---: |
| `putFile` / `getFile` / `deleteFile` / `copyFile` | ✅ | ✅ | ✅ | ✅ |
| `getUrl` | ✅ | ✅ | ✅ | ✅ |
| `getSignedUrl` | — | ✅ | ✅ (SAS) | optional |
| `path` (absolute FS path) | ✅ | — | — | optional |
| Public URLs need extra setup | static serving | bucket/CDN policy | container/CDN policy | your call |
| Extra dependency | none | `@aws-sdk/*` | `@azure/storage-blob` | your SDK |

## Custom storage drivers

Implement the small [`StorageDriver`](#the-storagedriver-interface) interface and register it with `defineDriver`. It then works in the interceptor, the service, and tenant resolution — identically to the built-ins.

```ts
import { defineDriver, StorageDriver, UploadedFile } from '@ackplus/nest-file-storage';
import { Storage } from '@google-cloud/storage';

class GcsDriver implements StorageDriver {
  private storage = new Storage();
  constructor(private opts: { bucket: string }) {}

  async putFile(content: Buffer, key: string, meta?): Promise<UploadedFile> {
    await this.storage.bucket(this.opts.bucket).file(key).save(content, {
      contentType: meta?.contentType,
    });
    return {
      key, url: this.getUrl(key), originalName: key.split('/').pop()!,
      fileName: key.split('/').pop()!, size: content.length, fullPath: key,
    };
  }
  async getFile(key: string) { const [buf] = await this.storage.bucket(this.opts.bucket).file(key).download(); return buf; }
  async deleteFile(key: string) { await this.storage.bucket(this.opts.bucket).file(key).delete(); }
  async copyFile(src: string, dest: string) { /* copy + return UploadedFile */ }
  getUrl(key: string) { return `https://storage.googleapis.com/${this.opts.bucket}/${key}`; }
}

NestFileStorageModule.forRoot({
  default: 'gcs',
  drivers: { gcs: defineDriver(GcsDriver, { bucket: 'my-bucket' }) },
});
```

For async setup, register a plain factory instead: `drivers: { gcs: async () => new GcsDriver(await load()) }`.

## Multi-tenant storage

Route each upload to the right storage based on the request — a different **folder per tenant** in one bucket, a **dedicated bucket per tenant**, or a mix. The library does no authentication: your guard/middleware identifies the tenant; these hooks read it.

```ts
import { NestFileStorageModule, localDriver, s3Driver, tenantFrom } from '@ackplus/nest-file-storage';

NestFileStorageModule.forRootAsync({
  inject: [TenantStorageService],
  useFactory: (tenants: TenantStorageService) => ({
    default: 'local',
    drivers: {
      local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
    },
    tenant: {
      // Identify the tenant — try several strategies in order.
      resolve: tenantFrom.first(
        tenantFrom.jwt('tenantId'),      // req.user.tenantId (after your auth guard)
        tenantFrom.subdomain(),          // acme.app.com -> 'acme'
        tenantFrom.header('x-tenant-id'),
      ),
      // Resolve a tenant -> storage. Cached by tenant id (this runs once per tenant).
      driver: async (tenantId) => {
        const cfg = await tenants.find(tenantId);            // your DB lookup
        if (cfg?.dedicated) {
          return { factory: s3Driver({ bucket: cfg.bucket, region: cfg.region,
            accessKeyId: cfg.key, secretAccessKey: cfg.secret }) };  // dedicated bucket
        }
        return { use: 'local', prefix: `tenants/${tenantId}` };       // shared + folder
      },
      cache: { ttlMs: 10 * 60_000, max: 500 },
      fallback: 'default', // no tenant on the request -> use the default driver ('error' to 400)
    },
  }),
});
```

Controllers need **no tenant-specific code** — a plain `FileStorageInterceptor('file')` is routed automatically:

```ts
@Post('upload')
@UseInterceptors(FileStorageInterceptor('file'))
upload(@Body() body: { file: string }) { return { key: body.file }; }
```

Outside a request (jobs, URL generation), resolve a tenant's driver programmatically — it uses the same cache:

```ts
const { driver, prefix } = await this.fileStorage.getTenantDriver('acme');
const url = await driver.getUrl(key);
```

When a tenant changes its storage settings, drop the cached driver: `this.fileStorage.getRegistry().invalidateTenant('acme')`.

**`tenant.driver(tenantId)` returns one of:**

| Return | Meaning |
| --- | --- |
| `'local'` | a registered driver, no prefix |
| `{ use: 'local', prefix: 'tenants/acme' }` | a shared driver + per-tenant key prefix (folder isolation) |
| `{ factory: s3Driver({...}), prefix? }` | a dedicated driver built for this tenant (bucket isolation) |

## Uploading in controllers

`FileStorageInterceptor(field, options?)` accepts `multipart/form-data`, stores the file(s), and writes the result into `request.body`.

```ts
// Single file (field name 'file')
@UseInterceptors(FileStorageInterceptor('file'))
upload(@Body() body: { file: string }) {}

// Multiple files in one field
@UseInterceptors(FileStorageInterceptor({ type: 'array', fieldName: 'photos', maxCount: 5 }))
uploadMany(@Body() body: { photos: string[] }) {}

// Multiple named fields
@UseInterceptors(FileStorageInterceptor({
  type: 'fields',
  fields: [{ name: 'avatar', maxCount: 1 }, { name: 'docs', maxCount: 10 }],
}))
uploadFields(@Body() body: { avatar: string[]; docs: string[] }) {}
```

| Mode | Accepted field(s) | Default `body` value |
| --- | --- | --- |
| `'file'` (string) | `file` | `body.file: string` |
| `{ type: 'array' }` | repeated `photos` or `photos[0]`, `photos[1]`, … | `body.photos: string[]` |
| `{ type: 'fields' }` | each named field | `body[field]: string[]` |

### Control the stored key

```ts
FileStorageInterceptor('avatar', {
  fileDist: (_file, req) => `users/${req.user.id}/avatars`, // folder (relative)
  fileName: (file) => `${Date.now()}${extname(file.originalname)}`, // last segment
  prefix: 'public', // optional static prefix
});
// -> public/users/42/avatars/1713876155123.png
```

The final key is `joinKey(prefix, fileDist, fileName)`. Defaults: `fileDist` = `YYYY/MM/DD`, `fileName` = `uuid-originalname`.

### Override the driver for one route

```ts
FileStorageInterceptor('file', { driver: 's3' });                        // by name
FileStorageInterceptor('file', { driver: (req) => req.user.plan });      // dynamically
FileStorageInterceptor('file', { tenant: false });                       // opt out of tenant routing
```

## Validation & limits

Declare limits as data — at the module level (applies to every route) and/or per route (merged over the module default). Rejections throw typed `400`s.

```ts
// module-wide default
validation: { maxSize: 10 * 1024 * 1024 }

// per route
FileStorageInterceptor('image', {
  validation: {
    maxSize: 5 * 1024 * 1024,                       // bytes
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/*'], // wildcards supported
    allowedExtensions: ['.jpg', '.png'],            // case-insensitive
    maxFiles: 10,                                   // total files per request
    fileFilter: (req, file, cb) => cb(null, true),  // escape hatch (runs after the above)
  },
});
```

| Rule | Becomes | Throws on violation |
| --- | --- | --- |
| `maxSize` | Multer `limits.fileSize` | `FileTooLargeException` |
| `maxFiles` | Multer `limits.files` | `TooManyFilesException` |
| `allowedMimeTypes` / `allowedExtensions` | generated `fileFilter` | `InvalidFileTypeException` |

All three extend `BadRequestException`, so they surface as standard `400` responses. For cross-field rules (e.g. "at least 2 images"), use `afterUpload`:

```ts
FileStorageInterceptor({ type: 'fields', fields: [{ name: 'images', maxCount: 10 }] }, {
  afterUpload: (req) => {
    const files = req.files as Record<string, Express.Multer.File[]>;
    if ((files?.images?.length ?? 0) < 2) throw new BadRequestException('At least 2 images required.');
  },
});
```

## Mapping results into the request body

By default the interceptor writes the storage **key** into `request.body[field]`. Customize it with `mapToRequestBody`:

```ts
FileStorageInterceptor('document', {
  mapToRequestBody: (file) => ({ key: file.key, url: file.url, size: file.size }),
});
// body.document === { key, url, size }
```

Set `overwriteBodyField: false` to keep an existing body value (e.g. a JSON field with the same name on a PATCH).

## Using the service programmatically

`FileStorageService` is injectable (the module is global). Use it in services, jobs, or response mappers.

```ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class DocsService {
  constructor(private readonly fileStorage: FileStorageService) {}

  upload(buf: Buffer, key: string) { return this.fileStorage.putFile(buf, key); }
  read(key: string) { return this.fileStorage.getFile(key); }
  remove(key: string) { return this.fileStorage.deleteFile(key); }
  url(key: string) { return this.fileStorage.getUrl(key); }
  signedUrl(key: string) { return this.fileStorage.getSignedUrl(key, { expiresIn: 3600 }); }

  // a specific driver, or a tenant's driver:
  async s3() { return this.fileStorage.getDriver('s3'); }
  async forTenant(id: string) { return this.fileStorage.getTenantDriver(id); }
}
```

A common pattern: store only the `key` in your database and build the URL when serializing a response.

```ts
async toResponse(user: { avatarKey?: string }) {
  return { ...user, avatarUrl: user.avatarKey ? await this.fileStorage.getUrl(user.avatarKey) : null };
}
```

## The `UploadedFile` model (file state)

Every driver returns the same shape from `putFile`/`copyFile`, and the interceptor exposes it to `mapToRequestBody`. Persist the **`key`** (stable); derive the **`url`** when you need it.

```ts
interface UploadedFile {
  key: string;          // storage key/path — persist THIS
  url: string;          // public URL (local needs static serving)
  originalName: string; // original client filename
  fileName: string;     // final filename segment of the key
  size: number;         // bytes
  mimetype?: string;    // when known
  fieldName?: string;   // upload field it came from
  fullPath: string;     // provider-native path (local absolute; cloud key)
  encoding?: string;
  buffer?: Buffer;      // when the provider returns bytes
}
```

| Field | Use it for |
| --- | --- |
| `key` | the database value; the input to `getFile`/`getUrl`/`deleteFile`/`copyFile` |
| `url` | rendering/links (regenerate from `key` via `getUrl` rather than storing) |
| `fullPath` | local file operations; provider-native identifier |
| `size` / `mimetype` / `originalName` | metadata you may want to persist alongside the key |

## API reference

### `NestFileStorageModule`

- `forRoot(options)` / `forRootAsync(asyncOptions)` → a global `DynamicModule`.
- Options: `{ default: string; drivers: Record<string, DriverFactory>; validation?: UploadValidation; tenant?: TenantOptions }`.

### Driver factories

- `localDriver(options)` · `s3Driver(options)` · `azureDriver(options)` · `defineDriver(DriverClass, options?)` → `DriverFactory`.

### `FileStorageService` (injectable)

- `getDriver(name?)` · `getTenantDriver(tenantId)` · `getRegistry()`
- `putFile` · `getFile` · `deleteFile` · `copyFile` · `getUrl` · `getSignedUrl` (delegate to the default driver)
- `static getStorage(name?)` — *deprecated* facade for non-DI call sites.

### `FileStorageInterceptor(field, options?)`

`field`: a string (single file) or `{ type, fieldName?, maxCount?, fields? }`.
`options`: `{ driver?, fileName?, fileDist?, prefix?, validation?, mapToRequestBody?, overwriteBodyField?, afterUpload?, tenant? }`.

### The `StorageDriver` interface

```ts
interface StorageDriver {
  putFile(content: Buffer, key: string, meta?: PutFileMeta): Promise<UploadedFile>;
  getFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  copyFile(sourceKey: string, destKey: string): Promise<UploadedFile>;
  getUrl(key: string): string | Promise<string>;
  getSignedUrl?(key: string, options?: SignedUrlOptions): Promise<string>;
  path?(key: string): string | Promise<string>;
  readonly keyDefaults?: { fileName?; fileDist?; prefix? };
}
```

### Tenant resolvers — `tenantFrom`

`jwt(path?)` · `header(name)` · `subdomain({ rootDomain?, ignore? })` · `param(name)` · `query(name)` · `first(...resolvers)`.

### Exceptions

`FileTooLargeException` · `InvalidFileTypeException` · `TooManyFilesException` (all extend `BadRequestException`).

---

## More

- **[Migration from v1](./MIGRATION.md)** · **[Changelog](./CHANGELOG.md)** · **[Examples](./examples/)**

## License

MIT
