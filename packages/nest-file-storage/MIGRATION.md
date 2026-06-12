# Migration Guide: v1 → v2

v2 is a redesign around a **driver registry**. The big wins: custom storage providers that work everywhere, per-request / multi-tenant storage, declarative validation, and an injectable service. This guide maps every v1 concept to its v2 replacement.

> **Good news:** your v1 module config still boots. `NestFileStorageModule.forRoot({ storage, localConfig })` is auto-translated to the v2 shape with a one-time deprecation warning, and the static `FileStorageService.getStorage()` still works. You can upgrade incrementally. The compatibility shims are removed in **v3**.

---

## TL;DR

| Area | v1 | v2 |
| --- | --- | --- |
| Module config | `{ storage: FileStorageEnum.LOCAL, localConfig }` | `{ default: 'local', drivers: { local: localDriver(...) } }` |
| Custom storage | `storageFactory` (interceptor-broken) | `drivers: { my: defineDriver(MyDriver, opts) }` |
| Per-request / tenant | not possible | `tenant: { resolve, driver, cache }` |
| Interceptor backend | `{ storageType, storageOptions }` | `{ driver: 's3' }` or `{ driver: (req) => '...' }` |
| Validation | thrown inside `fileName()` / `multerOptions` | `{ validation: { maxSize, allowedMimeTypes, ... } }` |
| Service access | `FileStorageService.getStorage()` (static) | inject `FileStorageService` → `getDriver()` |
| Result shaping | `transformUploadedFileObject` | `mapToRequestBody` |
| Azure CDN | `AZURE_CDN_DOMAIN_NAME` env var | `azureDriver({ cdnUrl })` |
| `prefix` | present but ignored | implemented (per-route + per-tenant) |
| Removed | — | `transformUploadedFileObject`, `multerOptions`, `fieldname` |

---

## 1. Module configuration

**v1**

```ts
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: { rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' },
});
```

**v2** — register named drivers and pick a default:

```ts
import { NestFileStorageModule, localDriver } from '@ackplus/nest-file-storage';

NestFileStorageModule.forRoot({
  default: 'local',
  drivers: {
    local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
  },
});
```

S3 and Azure are the same idea with `s3Driver({...})` / `azureDriver({...})`. You can register **several at once** and choose per route:

```ts
NestFileStorageModule.forRoot({
  default: 'local',
  drivers: {
    local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
    s3: s3Driver({ accessKeyId, secretAccessKey, region, bucket }),
  },
});
```

> The v1 shape still works (with a deprecation warning) — migrate when convenient.

## 2. Custom storage providers

This is the headline change. In v1, `storageFactory` only worked through `FileStorageService` and **crashed with the interceptor**. In v2, a custom driver is just another entry in `drivers` and works **everywhere**.

**v1 (remove this)**

```ts
NestFileStorageModule.forRoot({
  storageFactory: () => MyStorageClass,
  options: { /* ... */ },
});
```

**v2**

```ts
import { defineDriver, StorageDriver } from '@ackplus/nest-file-storage';

class GcsDriver implements StorageDriver {
  constructor(private opts: { bucket: string }) {}
  async putFile(content, key) { /* ... */ }
  async getFile(key) { /* ... */ }
  async deleteFile(key) { /* ... */ }
  async copyFile(src, dest) { /* ... */ }
  getUrl(key) { return `https://storage.googleapis.com/${this.opts.bucket}/${key}`; }
}

NestFileStorageModule.forRoot({
  default: 'gcs',
  drivers: { gcs: defineDriver(GcsDriver, { bucket: 'my-bucket' }) },
});
```

For async setup, pass a plain factory instead of `defineDriver`: `drivers: { gcs: () => new GcsDriver(...) }`.

## 3. Interceptor — choosing the backend

**v1**

```ts
FileStorageInterceptor('avatar', {
  storageType: FileStorageEnum.S3,
  storageOptions: { bucket: 'uploads', region: 'us-east-1', /* full creds */ },
});
```

**v2** — credentials live in the module's `drivers`; the route just names one:

```ts
FileStorageInterceptor('avatar', { driver: 's3' });
```

You can also choose dynamically: `{ driver: (req) => req.user.plan === 'pro' ? 's3' : 'local' }`.

## 4. Validation

Stop validating inside `fileName()`. v2 has a declarative `validation` block (module-level default + per-route override) that throws typed `400`s.

**v1**

```ts
FileStorageInterceptor('image', {
  fileName: (file) => {
    if (!['image/png', 'image/jpeg'].includes(file.mimetype)) {
      throw new BadRequestException('Invalid type');
    }
    return `${Date.now()}-${file.originalname}`;
  },
});
```

**v2**

```ts
FileStorageInterceptor('image', {
  validation: {
    allowedMimeTypes: ['image/png', 'image/jpeg'], // also supports 'image/*'
    maxSize: 5 * 1024 * 1024,
    allowedExtensions: ['.png', '.jpg'],
    maxFiles: 10,
  },
  fileName: (file) => `${Date.now()}-${file.originalname}`, // naming only
});
```

Rejections throw `InvalidFileTypeException`, `FileTooLargeException`, or `TooManyFilesException` (all extend `BadRequestException`).

> The v1 `multerOptions` callback is removed. `limits` → `validation.maxSize`/`maxFiles`; `fileFilter` → `validation.fileFilter` (escape hatch) or the declarative fields above.

## 5. Using the service

The service is now a normal injectable provider (the module is global). The static API still works but is deprecated.

**v1**

```ts
const storage = await FileStorageService.getStorage();
await storage.putFile(buffer, key);
```

**v2**

```ts
@Injectable()
class MyService {
  constructor(private readonly fileStorage: FileStorageService) {}

  async save(buffer: Buffer, key: string) {
    const driver = await this.fileStorage.getDriver();   // default driver
    return driver.putFile(buffer, key);
    // or the shortcut: this.fileStorage.putFile(buffer, key)
  }
}
```

`FileStorageService.getStorage(name?)` still resolves the active driver if you can't inject yet. `getStorage(FileStorageEnum.S3)` keeps working because the enum value (`'s3'`) is the driver name.

## 6. Shaping the upload result

`transformUploadedFileObject` (a driver-level hook) is removed. Use the interceptor's `mapToRequestBody`, which controls what lands in `request.body[field]`.

**v1**

```ts
localConfig: {
  transformUploadedFileObject: (file) => ({ key: file.key, url: file.url }),
}
```

**v2**

```ts
FileStorageInterceptor('file', {
  mapToRequestBody: (file) => ({ key: file.key, url: file.url }),
});
```

## 7. Azure CDN

**v1** read `process.env.AZURE_CDN_DOMAIN_NAME` implicitly. **v2** is an explicit option:

```ts
azureDriver({ account, accountKey, container, cdnUrl: 'https://cdn.example.com' });
```

## 8. Other breaking changes

- **`UploadedFile.fieldname`** (lowercase duplicate) is removed — use `fieldName`.
- **`prefix`** is now actually applied (it was ignored in v1). If you set `prefix` expecting it to do nothing, remove it.
- **`Storage` interface** is renamed to **`StorageDriver`** (a deprecated `Storage` alias remains). A driver no longer implements Multer's `StorageEngine` — the shared engine adapts it.
- **S3 signed URLs** now honor `expiresIn` (it was silently ignored in v1).

## New in v2 (worth adopting)

- **Multi-tenant storage** — route uploads to a tenant's bucket/folder per request. See the README's *Multi-tenant* section.
- **`tenantFrom`** resolvers — `jwt`, `header`, `subdomain`, `param`, `query`, `first(...)`.
- **Driver registry APIs** — `registerDriver(name, factory)`, `invalidate(name)`, `invalidateTenant(id)` via `fileStorage.getRegistry()`.
