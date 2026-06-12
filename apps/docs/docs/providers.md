---
id: providers
title: Built-in providers
sidebar_position: 4
---

# Built-in providers

Register any combination of providers under `drivers` and pick a `default`. Each helper returns a `DriverFactory`; the registry builds it once on first use.

## Local

```ts
import { localDriver } from '@ackplus/nest-file-storage';

localDriver({
  rootPath: './uploads',
  baseUrl: 'http://localhost:3000/uploads',
});
```

:::note
`baseUrl` only builds the URL string — it does not serve files. Add static serving (see [Getting started](./getting-started#serving-local-files)) for browser access.
:::

## AWS S3 (and S3-compatible)

Works with AWS S3 and S3-compatible stores like MinIO, Cloudflare R2, and DigitalOcean Spaces.

```ts
import { s3Driver } from '@ackplus/nest-file-storage';

s3Driver({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: process.env.AWS_REGION!,
  bucket: process.env.AWS_BUCKET!,
  endpoint: process.env.S3_ENDPOINT,    // optional — for S3-compatible stores
  cloudFrontUrl: process.env.CDN_URL,   // optional — used by getUrl()
  clientOptions: { forcePathStyle: true }, // optional — forwarded to the AWS S3 client
});
```

Requires `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` (loaded lazily). `getSignedUrl(key, { expiresIn })` returns a presigned URL.

## Azure Blob Storage

```ts
import { azureDriver } from '@ackplus/nest-file-storage';

azureDriver({
  account: process.env.AZURE_ACCOUNT!,
  accountKey: process.env.AZURE_KEY!,
  container: process.env.AZURE_CONTAINER!,
  cdnUrl: process.env.AZURE_CDN_URL,   // optional — used by getSignedUrl()
});
```

Requires `@azure/storage-blob` (loaded lazily). `getSignedUrl(key, { expiresIn })` returns a SAS URL (or the CDN URL when `cdnUrl` is set).

## Comparison

| Capability | Local | S3 | Azure | Custom |
| --- | :---: | :---: | :---: | :---: |
| `putFile` / `getFile` / `deleteFile` / `copyFile` | ✅ | ✅ | ✅ | ✅ |
| `getUrl` | ✅ | ✅ | ✅ | ✅ |
| `getSignedUrl` | — | ✅ | ✅ (SAS) | optional |
| `path` (absolute FS path) | ✅ | — | — | optional |
| Public URLs need extra setup | static serving | bucket/CDN policy | container/CDN policy | your call |
| Extra dependency | none | `@aws-sdk/*` | `@azure/storage-blob` | your SDK |

## Multiple providers at once

```ts
NestFileStorageModule.forRoot({
  default: 'local',
  drivers: {
    local: localDriver({ /* ... */ }),
    s3: s3Driver({ /* ... */ }),
  },
});
```

Then pick per route: `FileStorageInterceptor('file', { driver: 's3' })`, or per request via [tenant resolution](./multi-tenant).
