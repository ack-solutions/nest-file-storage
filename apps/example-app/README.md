# Example App

This app is a runnable NestJS example for `@ackplus/nest-file-storage`. It shows controller-level uploads, programmatic file access, Swagger docs, and local-storage configuration inside a real application.

## What It Demonstrates

- Single file upload
- Multiple files in one field
- Custom upload mapping
- Image and document upload routes
- Download, delete, copy, and URL generation
- Swagger documentation for the demo API

## Run The App

Install workspace dependencies from the repo root:

```bash
pnpm install
```

Build the library first:

```bash
pnpm -C packages/nest-file-storage build
```

Then run the example app:

```bash
pnpm -C apps/example-app start:dev
```

Optional build step:

```bash
pnpm -C apps/example-app build
```

## URLs

- App: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`

## Storage Configuration Used By Default

The example app is configured for local storage in [`src/app.module.ts`](./src/app.module.ts):

```ts
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: {
    rootPath: './uploads',
    baseUrl: 'http://localhost:3000/uploads',
  },
})
```

Uploaded files are written to:

```text
apps/example-app/uploads/
```

## Important Local Storage Note

`baseUrl` only controls the URL string returned by the storage adapter. The example app does not expose `/uploads` as a static directory by default.

That means:

- `GET /files/download/*path` works because the controller streams the file.
- `storage.getUrl(key)` returns a public-looking URL string.
- That URL will not resolve in a browser unless you add static serving, for example with `@nestjs/serve-static`.

## Demo Endpoints

- `POST /files/upload`
- `POST /files/upload-multiple`
- `POST /files/upload-image`
- `POST /files/upload-document`
- `GET /files/download/*path`
- `GET /files/url/*path`
- `GET /files/signed-url/*path`
- `DELETE /files/*path`
- `POST /files/copy`

Inspect the OpenAPI docs at `http://localhost:3000/api` for request bodies and example payloads.

## Quick cURL Examples

Upload one file:

```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@/absolute/path/to/file.pdf"
```

Upload multiple files:

```bash
curl -X POST http://localhost:3000/files/upload-multiple \
  -F "files=@/absolute/path/to/a.png" \
  -F "files=@/absolute/path/to/b.png"
```

Download a file by key:

```bash
curl -X GET "http://localhost:3000/files/download/documents/example.pdf" \
  --output downloaded-file.pdf
```

## Switching The Example To S3 Or Azure

Edit [`src/app.module.ts`](./src/app.module.ts) and replace the local config with an S3 or Azure config from the main package guide:

- Library guide: [`../../packages/nest-file-storage/README.md`](../../packages/nest-file-storage/README.md)
- Package examples: [`../../packages/nest-file-storage/examples/`](../../packages/nest-file-storage/examples/)

## Tests

```bash
pnpm -C apps/example-app test
pnpm -C apps/example-app test:e2e
```
