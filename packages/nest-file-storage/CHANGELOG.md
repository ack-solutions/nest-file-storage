# Changelog

All notable changes to `@ackplus/nest-file-storage` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format.

## [2.0.1] - 2026-06-13

### Changed

- Docs only. Trimmed the npm README to a concise landing page that links into the
  [documentation site](https://ack-solutions.github.io/nest-file-storage/), and added documentation
  links + badges to the package README and the repo root. No code or API changes.

## [2.0.0] - 2026-06-13

A redesign around a **driver registry**. Custom storage providers now work everywhere, storage can be
chosen per request (including multi-tenant), validation is declarative, and the service is injectable.
See [MIGRATION.md](./MIGRATION.md) for the full upgrade path.

> Most v1 apps keep booting: the old `forRoot({ storage, *Config })` config is auto-translated and the
> static `FileStorageService.getStorage()` still works, both with deprecation warnings. The shims are removed in v3.

### Added

- **Driver registry.** Register named drivers with `localDriver()`, `s3Driver()`, `azureDriver()`, or a custom
  one with `defineDriver(MyDriver, opts)` — all in a single `drivers` map with a `default`.
- **First-class custom storage.** A custom `StorageDriver` works in both the interceptor and the service
  (the v1 `storageFactory` only worked in the service and crashed in the interceptor).
- **Multi-tenant / per-request storage.** A `tenant` block resolves the tenant per request and routes to a
  shared driver + key prefix or a dedicated driver, with a per-tenant driver cache (TTL/LRU) and invalidation.
- **Composable tenant resolvers** — `tenantFrom.jwt/header/subdomain/param/query/first`.
- **Declarative validation** — `validation: { maxSize, allowedMimeTypes, allowedExtensions, maxFiles, fileFilter }`
  at module and route level, with typed exceptions `FileTooLargeException`, `InvalidFileTypeException`,
  `TooManyFilesException`.
- **Injectable `FileStorageService`** with `getDriver()`, `getTenantDriver()`, and convenience delegations
  (`putFile`/`getFile`/`deleteFile`/`copyFile`/`getUrl`/`getSignedUrl`). The module is `global`.
- **`prefix`** is now implemented as a real per-route and per-tenant key prefix.
- **Driver instance caching** — drivers are built once and reused (no per-request client churn).

### Changed

- **Module options** are now `{ default, drivers, validation?, tenant? }` instead of the
  `{ storage, localConfig | s3Config | azureConfig }` discriminated union.
- **Interceptor options**: `storageType` + `storageOptions` → `driver` (a registered name or `(req) => name`).
- **`UploadedFile`** is the single canonical result shape across all providers; `fileDist` is always relative.
- **`Storage` interface → `StorageDriver`** (drivers no longer implement Multer's `StorageEngine`; a shared
  `DriverMulterEngine` adapts any driver). A deprecated `Storage` type alias remains.
- **DI tokens** are now `Symbol`s (`FILE_STORAGE_OPTIONS`, `FILE_STORAGE_REGISTRY`).
- `noImplicitAny` is enabled; public types are tightened.

### Fixed

- **S3 signed URLs** now honor `expiresIn` (it was silently dropped into `GetObjectCommand` and ignored).
- **Per-request SDK-client churn and an unbounded cache `Map`** — drivers are cached once now.
- **S3 `putFile`** no longer makes an extra `HeadObject` round-trip per upload (uses the buffer length).
- **S3 client** is constructed with only `{ region, endpoint, credentials, clientOptions }` (v1 spread the whole
  options object, including callback functions, into the client).
- **Azure `deleteFile`** rethrows on failure (v1 swallowed the error and reported success).
- **Local multi-file rollback** (`_removeFile`) reads the stored key instead of a non-existent `file.path`.

### Deprecated

- `FileStorageService.getStorage()` / `setOptions()` / `getOptions()` (static) — inject the service instead.
- The v1 `forRoot({ storage, *Config })` configuration shape — use `{ default, drivers }`.
- `FileStorageEnum` — use driver names (strings).
- `Storage`, `LocalStorageOptions`, `S3StorageOptions`, `AzureStorageOptions` type aliases — use
  `StorageDriver`, `LocalDriverOptions`, `S3DriverOptions`, `AzureDriverOptions`.

### Removed

- `storageFactory` / `FileStorageClassOptions` — replaced by `drivers` + `defineDriver`.
- `transformUploadedFileObject` — use the interceptor's `mapToRequestBody`.
- The interceptor `multerOptions` callback — use `validation`.
- `UploadedFile.fieldname` (the lowercase duplicate) — use `fieldName`.
- The implicit `AZURE_CDN_DOMAIN_NAME` env var — use `azureDriver({ cdnUrl })`.

## [1.1.23] and earlier

See the Git history. v1 supported Local, S3, and Azure storage with a single active provider, the
`FileStorageInterceptor`, and a static `FileStorageService`.
