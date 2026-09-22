# Changelog

All notable changes to `@ackplus/nest-file-storage` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/) and the [Keep a Changelog](https://keepachangelog.com/) format.

## [2.2.0] - 2026-09-22

### Fixed

- **A driver-level `prefix` is no longer discarded by routes and tenants that set their own.** The
  upload engine chose one prefix instead of composing them (`routePrefix ?? driverPrefix`), so
  `s3Driver({ …, prefix: 'my-app' })` only applied to routes with no `prefix` — and a tenant prefix
  (`{ use, prefix: 'tenants/acme' }`) dropped it too. Uploads still succeeded with a self-consistent
  key and URL, but files silently landed outside the driver's folder (e.g. at the root of a bucket
  shared with other apps). Prefixes now nest: `driverPrefix / tenantPrefix / routePrefix / fileDist / fileName`,
  matching the documented `KeyOptions.prefix` contract ("prepended to every key"). Route
  `fileName` / `fileDist` still **replace** the driver's — only `prefix` composes.
- Docs: the programmatic multi-tenant recipe now builds keys with
  `joinKey(driver.keyDefaults?.prefix, prefix, …)` so job-written files match uploads.

### Behavior change

Only for configurations that set **both** a driver `prefix` and a route or tenant prefix: new uploads
now land under the driver prefix (`my-app/avatars/…` instead of `avatars/…`). Setting only one of them
— or neither — is unchanged. Existing files are unaffected: stored keys are full paths and keep
resolving through `getFile` / `getUrl` / `deleteFile`. If you depended on a route escaping the driver
prefix, register a second driver without `prefix` and select it with `driver:` on those routes.

## [2.1.0] - 2026-07-14

### Added

- **`writeToBody` option** — module-level (`FileStorageModuleOptions.writeToBody`) and per-route
  (`FileStorageInterceptor('file', { writeToBody: false })`) — controls whether the interceptor writes
  the stored key onto `request.body[field]`. Defaults to `true` (unchanged behavior); a per-route value
  overrides the module default.

### Fixed

- **Uploads no longer fail under a global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.**
  Interceptors run before pipes, so the interceptor's default body write-back put a server-derived `key`
  on `request.body[field]` that a (correctly) file-less DTO then rejected with
  `property "<field>" should not exist` — 400-ing every multipart upload. Set `writeToBody: false`
  (module-wide or per route) to leave the body untouched and read the file from `@UploadedFile()`
  instead. Non-breaking: the write-back stays on by default. See the
  [Global ValidationPipe](https://ack-solutions.github.io/nest-file-storage/uploading#global-validationpipe-forbidnonwhitelisted)
  docs.

## [2.0.2] - 2026-06-15

### Changed

- **`forRootAsync` accepts the v1 config shape too** — `useFactory` and
  `FileStorageOptionsFactory.createFileStorageOptions()` now return the `FileStorageModuleOptionsInput`
  union (v2 options **or** a v1 `{ storage, *Config }`), matching `forRoot()`. The v1→v2 translation
  already ran in the async path at runtime; this only widens the **types** so a v1-returning async
  factory type-checks. Non-breaking (type widening; existing v2-returning factories are unaffected).

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
