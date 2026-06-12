---
id: api
title: API reference
sidebar_position: 10
---

# API reference

## `NestFileStorageModule`

```ts
NestFileStorageModule.forRoot(options: FileStorageModuleOptions): DynamicModule
NestFileStorageModule.forRootAsync(options: FileStorageAsyncOptions): DynamicModule
```

Both return a **global** module that exports `FileStorageService` and the registry token.

```ts
interface FileStorageModuleOptions {
  default: string;                          // name of the default driver (a key in `drivers`)
  drivers: Record<string, DriverFactory>;   // named drivers
  validation?: UploadValidation;            // module-wide default validation
  tenant?: TenantOptions;                   // optional multi-tenant resolution
}
```

`forRootAsync` accepts `{ imports?, useFactory + inject }`, `{ useClass }`, or `{ useExisting }` returning `FileStorageModuleOptions`.

## Driver factories

```ts
localDriver(options: LocalDriverOptions): DriverFactory
s3Driver(options: S3DriverOptions): DriverFactory
azureDriver(options: AzureDriverOptions): DriverFactory
defineDriver(DriverClass, options?): DriverFactory
```

| Options | Fields |
| --- | --- |
| `LocalDriverOptions` | `rootPath`, `baseUrl`, + `fileName?`, `fileDist?`, `prefix?` |
| `S3DriverOptions` | `accessKeyId`, `secretAccessKey`, `region`, `bucket`, `endpoint?`, `cloudFrontUrl?`, `clientOptions?` |
| `AzureDriverOptions` | `account`, `accountKey`, `container`, `cdnUrl?` |

## `FileStorageService` (injectable)

```ts
getDriver(name?: string): Promise<StorageDriver>
getTenantDriver(tenantId: string): Promise<{ driver: StorageDriver; prefix?: string }>
getRegistry(): DriverRegistry

// delegate to the default driver:
putFile(content, key, meta?) · getFile(key) · deleteFile(key)
copyFile(src, dest) · getUrl(key) · getSignedUrl(key, options?)

// deprecated static facade:
static getStorage(name?): Promise<StorageDriver>
```

## `DriverRegistry`

```ts
get(name?): Promise<StorageDriver>
getTenantDriver(tenantId): Promise<{ driver, prefix? }>
registerDriver(name, factory): void
invalidate(name): void
invalidateTenant(tenantId): void
```

## `FileStorageInterceptor(field, options?)`

`field`: a string (single file) or `{ type: 'single' | 'array' | 'fields'; fieldName?; maxCount?; fields? }`.

```ts
interface FileStorageInterceptorOptions {
  driver?: string | ((req) => string);
  fileName?: (file, req?) => string | Promise<string>;
  fileDist?: (file, req?) => string | Promise<string>;
  prefix?: string;
  validation?: UploadValidation;
  mapToRequestBody?: (file, fieldName, req?) => unknown | Promise<unknown>;
  overwriteBodyField?: boolean; // default true
  afterUpload?: (req, fileConfig) => void | Promise<void>;
  tenant?: false; // opt this route out of tenant resolution
}
```

## The `StorageDriver` interface

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

## `UploadValidation`

```ts
interface UploadValidation {
  maxSize?: number;             // bytes
  allowedMimeTypes?: string[];  // exact or wildcard (image/*)
  allowedExtensions?: string[]; // with or without leading dot
  maxFiles?: number;
  fileFilter?: multer.Options['fileFilter']; // escape hatch
}
```

## `TenantOptions`

```ts
interface TenantOptions {
  resolve: (req) => string | undefined | Promise<...>;
  driver: (tenantId) => TenantDriverSpec | Promise<TenantDriverSpec>;
  cache?: { ttlMs?: number; max?: number };
  fallback?: 'default' | 'error'; // default 'default'
}

type TenantDriverSpec =
  | string
  | { use: string; prefix?: string }
  | { factory: DriverFactory; prefix?: string };
```

## `tenantFrom`

```ts
tenantFrom.jwt(path?)                         // req.user[path], default 'tenantId'
tenantFrom.header(name)
tenantFrom.subdomain({ rootDomain?, ignore? })
tenantFrom.param(name)
tenantFrom.query(name)
tenantFrom.first(...resolvers)
```

## Exceptions

`FileTooLargeException` · `InvalidFileTypeException` · `TooManyFilesException` — all extend `BadRequestException` (HTTP 400).

## DI tokens

`FILE_STORAGE_REGISTRY` · `FILE_STORAGE_OPTIONS` (symbols) — inject for advanced access.
