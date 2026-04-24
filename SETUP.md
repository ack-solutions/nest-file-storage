# Setup Notes

This repository has two moving parts:

- `packages/nest-file-storage`: the published library
- `apps/example-app`: a demo NestJS application that consumes the workspace package

## Recommended local workflow

```bash
pnpm install
pnpm -C packages/nest-file-storage build
pnpm -C apps/example-app build
pnpm -C apps/example-app start:dev
```

## Why build order matters

The example app imports `@ackplus/nest-file-storage` from the workspace package. Build the package before building the example app so the generated `dist` output and type declarations are available.

## Local uploads

By default the example app uses:

- `rootPath: ./uploads`
- `baseUrl: http://localhost:3000/uploads`

Files are stored under `apps/example-app/uploads`.

`baseUrl` does not automatically serve those files. If you want browser-accessible local URLs, add static serving in the Nest app. The library guide shows one way to do that with `@nestjs/serve-static`.

## Canonical docs

- Workspace README: [`README.md`](./README.md)
- Library guide: [`packages/nest-file-storage/README.md`](./packages/nest-file-storage/README.md)
- Example app guide: [`apps/example-app/README.md`](./apps/example-app/README.md)
