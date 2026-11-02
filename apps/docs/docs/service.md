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

The `putFile` / `getFile` / `deleteFile` / `copyFile` / `getUrl` / `getSignedUrl` / `getSignedUploadUrl` methods delegate to the **default** driver. For a specific driver or a tenant's driver:

```ts
const s3 = await this.fileStorage.getDriver('s3');
const { driver, prefix } = await this.fileStorage.getTenantDriver('acme');
```

## Full keys and the driver prefix

These methods take a **full** key and use it exactly as given — the driver's `prefix` is applied only by
the upload interceptor. Keys you stored from uploads are already full, so pass them straight back. When
you create a **new** key in code, run it through `resolveKey` so it lands in the driver's folder like
uploads do:

```ts
const key = await this.fileStorage.resolveKey('reports/q3.pdf'); // 'my-app/reports/q3.pdf'
await this.fileStorage.putFile(buf, key);
// for a named or tenant driver: resolveKey(driver, prefix, 'reports/q3.pdf')
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

`getSignedUrl(key, { expiresIn })` returns a time-limited **download** URL on S3 (presigned) and Azure (SAS). On drivers without signing (e.g. local), it falls back to `getUrl(key)`.

```ts
const url = await this.fileStorage.getSignedUrl(key, { expiresIn: 3600 }); // 1 hour
```

## Direct uploads to storage (presigned PUT)

For large files (mobile photos, PDFs) let the client upload straight to S3 or Azure, so the bytes never
pass through your API:

```ts
// 1. Server: check the user, pick a key, sign a short-lived upload URL for it.
const key = await this.fileStorage.resolveKey(`uploads/${userId}/${randomUUID()}.jpg`);
const uploadUrl = await this.fileStorage.getSignedUploadUrl(key, {
  expiresIn: 300,            // seconds
  contentType: 'image/jpeg', // S3: signed — the client must send the same Content-Type
  contentLength: size,       // S3 only, optional: pins the exact size
});
// return { key, uploadUrl } to the client

// 2. Client: PUT the file to uploadUrl
//    S3:    headers { 'Content-Type': 'image/jpeg' }
//    Azure: headers { 'x-ms-blob-type': 'BlockBlob', 'x-ms-blob-content-type': 'image/jpeg' }

// 3. Server, when the client says it's done: check the object, then persist the key.
const buf = await this.fileStorage.getFile(key);
```

The URL is valid for exactly the key you sign — the client can't choose another. `getSignedUploadUrl`
throws on drivers that can't sign uploads (e.g. local); there is no fallback. Upload validation
(`maxSize`, MIME types) runs in the interceptor only, so check the stored object in step 3.

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
