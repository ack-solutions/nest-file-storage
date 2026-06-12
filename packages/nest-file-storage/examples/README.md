# Examples

Runnable-style snippets for `@ackplus/nest-file-storage` (v2). Copy what you need into your app.

> New to the library? Start with the [docs](https://ack-solutions.github.io/nest-file-storage/) or the package [README](../README.md). Upgrading from v1? See [MIGRATION.md](../MIGRATION.md).

## Configuration

1. **[Basic local storage](./1-basic-local-storage.example.ts)** — one `localDriver`, made the default.
2. **[AWS S3](./2-s3-storage.example.ts)** — `s3Driver` via `forRootAsync` + `ConfigService`.
3. **[Azure Blob](./3-azure-storage.example.ts)** — `azureDriver` via `forRootAsync` + `ConfigService`.
5. **[Custom key generation](./5-custom-configuration.example.ts)** — default `fileName` / `fileDist` on the driver.

## Uploading

4. **[Upload controller](./4-upload-controller.example.ts)** — single / array / fields, and declarative validation.
7. **[User avatar](./7-user-avatar.example.ts)** — validation, old-file cleanup, DB update.
8. **[Document management](./8-document-management.example.ts)** — upload, download, copy, delete.

## Programmatic & advanced

6. **[File service](./6-file-service.example.ts)** — the injectable `FileStorageService`.
9. **[Dynamic storage](./9-dynamic-storage.example.ts)** — pick a driver per route/request by name.
11. **[Custom driver](./11-custom-driver.example.ts)** — implement `StorageDriver` + `defineDriver`.
12. **[Multi-tenant](./12-multi-tenant.example.ts)** — route storage per tenant (shared + prefix or dedicated).

## Testing

10. **[Testing](./10-testing.example.ts)** — a local driver against a temp dir, and an in-memory mock driver.

---

**Key v2 changes you'll see in these examples**

- Config is `{ default, drivers: { name: someDriver(...) } }` — not `{ storage, localConfig }`.
- The service is **injected** (`constructor(private fileStorage: FileStorageService)`), not static.
- Validation is **declarative** (`validation: { maxSize, allowedMimeTypes, ... }`), not thrown inside `fileName`.
- Custom storage is a first-class `StorageDriver` registered with `defineDriver` — and works everywhere.

Found an issue or want a new example? PRs welcome — open one on [GitHub](https://github.com/ack-solutions/nest-file-storage).
