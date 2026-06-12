/**
 * Example 11: Custom Storage Driver
 *
 * Implement the StorageDriver interface and register it with defineDriver. A custom driver works
 * everywhere a built-in does — in the interceptor, the service, and tenant resolution.
 *
 * This example sketches a Google Cloud Storage driver; swap in any backend.
 */

import { Module, Injectable } from '@nestjs/common';
import {
  NestFileStorageModule,
  defineDriver,
  FileStorageService,
  StorageDriver,
  UploadedFile,
  PutFileMeta,
} from '@ackplus/nest-file-storage';
// import { Storage } from '@google-cloud/storage';

class GcsDriver implements StorageDriver {
  // private storage = new Storage();
  constructor(private readonly opts: { bucket: string }) {}

  // private file(key: string) { return this.storage.bucket(this.opts.bucket).file(key); }

  async putFile(content: Buffer, key: string, meta?: PutFileMeta): Promise<UploadedFile> {
    // await this.file(key).save(content, { contentType: meta?.contentType });
    void content;
    void meta;
    const name = key.split('/').pop()!;
    return { key, url: this.getUrl(key), originalName: name, fileName: name, size: content.length, fullPath: key };
  }

  async getFile(key: string): Promise<Buffer> {
    // const [buf] = await this.file(key).download();
    // return buf;
    throw new Error(`download ${key} not implemented in this sketch`);
  }

  async deleteFile(key: string): Promise<void> {
    // await this.file(key).delete();
    void key;
  }

  async copyFile(src: string, dest: string): Promise<UploadedFile> {
    // await this.file(src).copy(this.file(dest));
    void src;
    const name = dest.split('/').pop()!;
    return { key: dest, url: this.getUrl(dest), originalName: name, fileName: name, size: 0, fullPath: dest };
  }

  getUrl(key: string): string {
    return `https://storage.googleapis.com/${this.opts.bucket}/${key}`;
  }
}

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      default: 'gcs',
      drivers: {
        // defineDriver(Class, opts) is sugar for () => new Class(opts).
        gcs: defineDriver(GcsDriver, { bucket: 'my-bucket' }),
        // For async setup, pass a plain factory instead:
        // gcs: async () => new GcsDriver(await loadGcsConfig()),
      },
    }),
  ],
})
export class AppModule {}

@Injectable()
export class ReportService {
  constructor(private readonly fileStorage: FileStorageService) {}

  // Use the custom driver by name — identical to a built-in.
  async save(buffer: Buffer, key: string) {
    const gcs = await this.fileStorage.getDriver('gcs');
    return gcs.putFile(buffer, key);
  }
}
