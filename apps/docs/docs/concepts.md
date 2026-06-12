---
id: concepts
title: Core concepts
sidebar_position: 3
---

# Core concepts

## Drivers

A **driver** is a backend that implements the [`StorageDriver`](./api#the-storagedriver-interface) contract — `putFile`, `getFile`, `deleteFile`, `copyFile`, `getUrl`, and optionally `getSignedUrl` / `path`. The built-ins are `localDriver`, `s3Driver`, and `azureDriver`; you can add your own with [`defineDriver`](./custom-drivers).

A driver is **pure storage** — it has no Multer coupling. A single shared engine adapts any driver for uploads, so every driver (built-in or custom) behaves identically.

## The registry

You register drivers by name in `forRoot`:

```ts
NestFileStorageModule.forRoot({
  default: 'local',
  drivers: {
    local: localDriver({ /* ... */ }),
    s3: s3Driver({ /* ... */ }),
  },
});
```

The module builds a **registry** from this map. Drivers are instantiated **once** and cached (so an S3/Azure client is created once, not per request). The interceptor and the service both resolve drivers from this same registry — that's why custom and tenant drivers work everywhere.

- **`default`** names the driver used when nothing else is specified.
- A route can override with `{ driver: 'name' }`.
- A request can be routed by [tenant](./multi-tenant).

## The `UploadedFile` model (file state)

Every driver returns the **same shape** from `putFile` / `copyFile`, and the interceptor exposes it to `mapToRequestBody`. This is the one file-state model you work with, regardless of provider.

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
| `key` | the database value; the input to `getFile` / `getUrl` / `deleteFile` / `copyFile` |
| `url` | rendering/links — regenerate from `key` via `getUrl` rather than storing |
| `fullPath` | local file operations; provider-native identifier |
| `size` / `mimetype` / `originalName` | metadata to persist alongside the key |

:::tip Persist the key, derive the URL
Store `key` in your database. Build `url` on demand with `getUrl(key)` — URLs (especially signed ones) can change, keys don't.
:::

## How a key is built

When uploading, the final storage key is:

```text
joinKey(prefix, fileDist, fileName)
```

Defaults: `fileDist` = `YYYY/MM/DD`, `fileName` = `uuid-originalname`. You override `fileDist`/`fileName`/`prefix` per route (see [Uploading](./uploading#control-the-stored-key)) or per driver. A tenant `prefix` is prepended automatically for [folder isolation](./multi-tenant).
