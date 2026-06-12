---
id: service
title: Using the service
sidebar_position: 9
---

# Using the service programmatically

`FileStorageService` is injectable (the module is global). Use it in services, jobs, response mappers — anywhere you need storage outside the upload interceptor.

```ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class DocsService {
  constructor(private readonly fileStorage: FileStorageService) {}

  upload(buf: Buffer, key: string) { return this.fileStorage.putFile(buf, key); }
  read(key: string)                { return this.fileStorage.getFile(key); }
  remove(key: string)              { return this.fileStorage.deleteFile(key); }
  url(key: string)                 { return this.fileStorage.getUrl(key); }
  signedUrl(key: string)           { return this.fileStorage.getSignedUrl(key, { expiresIn: 3600 }); }
}
```

The `putFile` / `getFile` / `deleteFile` / `copyFile` / `getUrl` / `getSignedUrl` methods delegate to the **default** driver. For a specific driver or a tenant's driver:

```ts
const s3 = await this.fileStorage.getDriver('s3');
const { driver, prefix } = await this.fileStorage.getTenantDriver('acme');
```

## Build URLs when serializing

A common pattern: store only the `key` in your database and build the URL when returning a response.

```ts
@Injectable()
export class UserMapper {
  constructor(private readonly fileStorage: FileStorageService) {}

  async toResponse(user: { id: number; avatarKey?: string | null }) {
    return {
      ...user,
      avatarUrl: user.avatarKey ? await this.fileStorage.getUrl(user.avatarKey) : null,
    };
  }
}
```

## Signed URLs

`getSignedUrl(key, { expiresIn })` returns a time-limited URL on S3 (presigned) and Azure (SAS). On drivers without signing (e.g. local), it falls back to `getUrl(key)`.

```ts
const url = await this.fileStorage.getSignedUrl(key, { expiresIn: 3600 }); // 1 hour
```

## The registry (advanced)

`getRegistry()` exposes runtime controls:

```ts
const registry = this.fileStorage.getRegistry();
registry.registerDriver('reports', defineDriver(ReportsDriver, opts)); // add/replace at runtime
registry.invalidate('s3');             // drop a cached driver instance
registry.invalidateTenant('acme');     // drop a cached tenant driver
```

## Non-DI call sites (deprecated)

If you can't inject yet, the static facade still resolves the active driver:

```ts
const driver = await FileStorageService.getStorage();      // default
const s3 = await FileStorageService.getStorage('s3');      // by name
```

This is **deprecated** — prefer injecting `FileStorageService`. It's removed in v3.
