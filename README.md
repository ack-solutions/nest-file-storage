# nest-file-storage

[![npm](https://img.shields.io/npm/v/@ackplus/nest-file-storage.svg)](https://www.npmjs.com/package/@ackplus/nest-file-storage)
[![docs](https://img.shields.io/badge/docs-website-3b82f6.svg)](https://ack-solutions.github.io/nest-file-storage/)
[![license](https://img.shields.io/npm/l/@ackplus/nest-file-storage.svg)](./packages/nest-file-storage/LICENSE)

Monorepo for **[`@ackplus/nest-file-storage`](https://www.npmjs.com/package/@ackplus/nest-file-storage)** — a NestJS library for uploading files to Local storage, AWS S3, Azure Blob, or your own custom driver.

## 📖 Documentation → <https://ack-solutions.github.io/nest-file-storage/>

**New here? Start at the [documentation site](https://ack-solutions.github.io/nest-file-storage/)** — getting started, providers, custom drivers, multi-tenant, validation, the API reference, and the v1 → v2 migration guide.

- 📦 npm: <https://www.npmjs.com/package/@ackplus/nest-file-storage>
- 💻 GitHub: <https://github.com/ack-solutions/nest-file-storage>
- 📂 Library source & quick-start README: [`packages/nest-file-storage/`](./packages/nest-file-storage)

- 📖 **Documentation:** <https://ack-solutions.github.io/nest-file-storage/>
- 📦 **npm:** <https://www.npmjs.com/package/@ackplus/nest-file-storage>
- 💻 **GitHub:** <https://github.com/ack-solutions/nest-file-storage>

## Workspace Layout

```text
.
|-- packages/nest-file-storage/   # Published library
|-- apps/example-app/             # Runnable NestJS example app
|-- QUICK_START.md                # Short repo setup commands
|-- SETUP.md                      # Additional local setup notes
`-- scripts/publish.js            # Publish helper
```

## Main Docs

- 📖 Documentation site: <https://ack-solutions.github.io/nest-file-storage/>
- 📦 npm package: <https://www.npmjs.com/package/@ackplus/nest-file-storage>
- Library guide: [`packages/nest-file-storage/README.md`](./packages/nest-file-storage/README.md)
- Example app guide: [`apps/example-app/README.md`](./apps/example-app/README.md)
- Package examples: [`packages/nest-file-storage/examples/`](./packages/nest-file-storage/examples/)

## Local Development

Install workspace dependencies:

```bash
pnpm install
```

Build the library:

```bash
pnpm -C packages/nest-file-storage build
```

Build the example app after the library build finishes:

```bash
pnpm -C apps/example-app build
```

Run the example app:

```bash
pnpm -C apps/example-app start:dev
```

Useful URLs once the app is running:

- App: `http://localhost:3000`
- Swagger UI: `http://localhost:3000/api`

## Contributor Notes

- The package publishes the compiled `dist` output plus the package README and examples.
- The example app consumes the workspace package, so build the package before building the app.
- Local uploads in the example app are written under `apps/example-app/uploads`.
- The example app demonstrates upload and storage APIs, but local files are not automatically exposed as static assets unless you add static serving yourself.

## Testing

Current workspace testing is centered around the example app:

```bash
pnpm -C apps/example-app test
pnpm -C apps/example-app test:e2e
```

The package itself does not currently define a dedicated test script in `packages/nest-file-storage/package.json`.

## Publishing

The repo includes a publish helper:

```bash
pnpm run publish
```

Review [`scripts/publish.js`](./scripts/publish.js) before using it in a release workflow.
