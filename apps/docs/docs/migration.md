---
id: migration
title: Migration v1 → v2
sidebar_position: 11
---

# Migration: v1 → v2

v2 is a redesign around a **driver registry**: custom storage that works everywhere, per-request / multi-tenant storage, declarative validation, and an injectable service.

:::tip Your v1 config still boots
`forRoot({ storage, localConfig })` is auto-translated to the v2 shape with a one-time deprecation warning, and `FileStorageService.getStorage()` still works. Upgrade incrementally. The shims are removed in **v3**.
:::

## At a glance

| Area | v1 | v2 |
| --- | --- | --- |
| Module config | `{ storage: FileStorageEnum.LOCAL, localConfig }` | `{ default: 'local', drivers: { local: localDriver(...) } }` |
| Custom storage | `storageFactory` (interceptor-broken) | `drivers: { my: defineDriver(MyDriver, opts) }` |
| Per-request / tenant | not possible | `tenant: { resolve, driver, cache }` |
| Interceptor backend | `{ storageType, storageOptions }` | `{ driver: 's3' }` or `{ driver: (req) => '...' }` |
| Validation | thrown in `fileName()` / `multerOptions` | `{ validation: { maxSize, allowedMimeTypes, ... } }` |
| Service access | `FileStorageService.getStorage()` (static) | inject `FileStorageService` → `getDriver()` |
| Result shaping | `transformUploadedFileObject` | `mapToRequestBody` |
| Azure CDN | `AZURE_CDN_DOMAIN_NAME` env var | `azureDriver({ cdnUrl })` |
| `prefix` | ignored | implemented (per-route + per-tenant) |
| Removed | — | `transformUploadedFileObject`, `multerOptions`, `fieldname` |

## Module configuration

```ts
// v1
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: { rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' },
});

// v2
import { NestFileStorageModule, localDriver } from '@ackplus/nest-file-storage';
NestFileStorageModule.forRoot({
  default: 'local',
  drivers: { local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }) },
});
```

## Custom storage

The headline change. In v1, `storageFactory` only worked through the service and **crashed with the interceptor**. In v2 a custom driver is just an entry in `drivers` and works everywhere.

```ts
// v1 — remove
NestFileStorageModule.forRoot({ storageFactory: () => MyStorageClass, options: { /* ... */ } });

// v2
import { defineDriver } from '@ackplus/nest-file-storage';
NestFileStorageModule.forRoot({
  default: 'gcs',
  drivers: { gcs: defineDriver(GcsDriver, { bucket: 'my-bucket' }) },
});
```

See [Custom drivers](./custom-drivers).

## Choosing the backend per route

```ts
// v1
FileStorageInterceptor('avatar', { storageType: FileStorageEnum.S3, storageOptions: { bucket, region, /* creds */ } });

// v2 — credentials live in the module's `drivers`; the route just names one
FileStorageInterceptor('avatar', { driver: 's3' });
```

## Validation

```ts
// v1 — validating inside fileName
FileStorageInterceptor('image', {
  fileName: (file) => {
    if (!['image/png', 'image/jpeg'].includes(file.mimetype)) throw new BadRequestException('Invalid type');
    return `${Date.now()}-${file.originalname}`;
  },
});

// v2 — declarative
FileStorageInterceptor('image', {
  validation: { allowedMimeTypes: ['image/png', 'image/jpeg'], maxSize: 5 * 1024 * 1024 },
  fileName: (file) => `${Date.now()}-${file.originalname}`,
});
```

The `multerOptions` callback is removed: `limits` → `validation.maxSize`/`maxFiles`; `fileFilter` → `validation.fileFilter`.

## Using the service

```ts
// v1
const storage = await FileStorageService.getStorage();
await storage.putFile(buffer, key);

// v2
@Injectable()
class MyService {
  constructor(private readonly fileStorage: FileStorageService) {}
  save(buffer: Buffer, key: string) { return this.fileStorage.putFile(buffer, key); }
}
```

`FileStorageService.getStorage(name?)` still works (deprecated). `getStorage(FileStorageEnum.S3)` keeps working because the enum value (`'s3'`) is the driver name.

## Shaping the result

```ts
// v1 — driver-level hook (removed)
localConfig: { transformUploadedFileObject: (file) => ({ key: file.key, url: file.url }) }

// v2 — interceptor option
FileStorageInterceptor('file', { mapToRequestBody: (file) => ({ key: file.key, url: file.url }) });
```

## Other breaking changes

- **`UploadedFile.fieldname`** (lowercase) removed — use `fieldName`.
- **`prefix`** is now actually applied (ignored in v1) — remove it if you set it expecting a no-op.
- **`Storage` → `StorageDriver`** (a deprecated `Storage` alias remains). Drivers no longer implement Multer's `StorageEngine`.
- **S3 signed URLs** now honor `expiresIn` (it was silently ignored in v1).
- **Azure CDN** moved from `AZURE_CDN_DOMAIN_NAME` to `azureDriver({ cdnUrl })`.

## New in v2 worth adopting

- [Multi-tenant storage](./multi-tenant) and `tenantFrom` resolvers.
- Registry controls: `registerDriver`, `invalidate`, `invalidateTenant` via `fileStorage.getRegistry()`.
- Typed validation exceptions.
