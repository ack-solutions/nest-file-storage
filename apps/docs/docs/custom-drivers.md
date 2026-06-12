---
id: custom-drivers
title: Custom drivers
sidebar_position: 5
---

# Custom storage drivers

Implement the small `StorageDriver` interface and register it with `defineDriver`. It then works in the interceptor, the service, and tenant resolution — identically to the built-ins.

## The contract

```ts
interface StorageDriver {
  putFile(content: Buffer, key: string, meta?: PutFileMeta): Promise<UploadedFile>;
  getFile(key: string): Promise<Buffer>;
  deleteFile(key: string): Promise<void>;
  copyFile(sourceKey: string, destKey: string): Promise<UploadedFile>;
  getUrl(key: string): string | Promise<string>;
  // optional:
  getSignedUrl?(key: string, options?: SignedUrlOptions): Promise<string>;
  path?(key: string): string | Promise<string>;
  readonly keyDefaults?: { fileName?; fileDist?; prefix? };
}
```

Only the required methods matter; implement `getSignedUrl` / `path` if your backend supports them.

## Example: Google Cloud Storage

```ts
import { defineDriver, StorageDriver, UploadedFile, PutFileMeta } from '@ackplus/nest-file-storage';
import { Storage } from '@google-cloud/storage';

class GcsDriver implements StorageDriver {
  private storage = new Storage();
  constructor(private opts: { bucket: string }) {}

  private file(key: string) {
    return this.storage.bucket(this.opts.bucket).file(key);
  }

  async putFile(content: Buffer, key: string, meta?: PutFileMeta): Promise<UploadedFile> {
    await this.file(key).save(content, { contentType: meta?.contentType });
    const name = key.split('/').pop()!;
    return { key, url: this.getUrl(key), originalName: name, fileName: name, size: content.length, fullPath: key };
  }

  async getFile(key: string): Promise<Buffer> {
    const [buf] = await this.file(key).download();
    return buf;
  }

  async deleteFile(key: string): Promise<void> {
    await this.file(key).delete();
  }

  async copyFile(src: string, dest: string): Promise<UploadedFile> {
    await this.file(src).copy(this.file(dest));
    const [meta] = await this.file(dest).getMetadata();
    const name = dest.split('/').pop()!;
    return { key: dest, url: this.getUrl(dest), originalName: name, fileName: name, size: Number(meta.size ?? 0), fullPath: dest };
  }

  getUrl(key: string): string {
    return `https://storage.googleapis.com/${this.opts.bucket}/${key}`;
  }
}
```

## Register it

```ts
import { NestFileStorageModule, defineDriver } from '@ackplus/nest-file-storage';

NestFileStorageModule.forRoot({
  default: 'gcs',
  drivers: { gcs: defineDriver(GcsDriver, { bucket: 'my-bucket' }) },
});
```

`defineDriver(DriverClass, options)` is sugar for `() => new DriverClass(options)`. For **async setup** (e.g. fetching credentials), pass a plain factory:

```ts
drivers: {
  gcs: async () => new GcsDriver(await loadGcsConfig()),
}
```

Either way, the driver is built **once** and cached by the registry.

## Use it

Exactly like a built-in — by name in the interceptor or the service:

```ts
@UseInterceptors(FileStorageInterceptor('file', { driver: 'gcs' }))
// or
const driver = await this.fileStorage.getDriver('gcs');
```

:::tip
Custom drivers also slot into [multi-tenant resolution](./multi-tenant) — return one from `tenant.driver(tenantId)` as a dedicated per-tenant backend.
:::

## Runtime registration

Register or replace a driver after startup (e.g. when a new tenant is provisioned):

```ts
const registry = this.fileStorage.getRegistry();
registry.registerDriver('tenant-acme', defineDriver(GcsDriver, { bucket: 'acme-bucket' }));
registry.invalidate('tenant-acme'); // drop the cached instance to rebuild
```
