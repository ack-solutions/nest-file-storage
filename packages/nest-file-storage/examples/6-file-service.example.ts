/**
 * Example 6: File Service
 *
 * Use the injectable FileStorageService to work with files programmatically.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';
import * as fs from 'fs';

@Injectable()
export class FileService {
  // v2: inject the service (no more static FileStorageService.getStorage()).
  constructor(private readonly fileStorage: FileStorageService) {}

  /** Read file content as a Buffer. */
  async getFile(key: string): Promise<Buffer> {
    try {
      return await this.fileStorage.getFile(key);
    } catch {
      throw new NotFoundException(`File not found: ${key}`);
    }
  }

  /** Delete a file. */
  deleteFile(key: string): Promise<void> {
    return this.fileStorage.deleteFile(key);
  }

  /** Copy a file to a new key. */
  copyFile(oldKey: string, newKey: string) {
    return this.fileStorage.copyFile(oldKey, newKey);
  }

  /** Upload a file from the local filesystem. */
  async uploadFromLocal(localPath: string, storageKey: string) {
    const buffer = await fs.promises.readFile(localPath);
    return this.fileStorage.putFile(buffer, storageKey);
  }

  /** Public URL for a key. */
  getFileUrl(key: string): Promise<string> {
    return this.fileStorage.getUrl(key);
  }

  /** Time-limited signed URL (S3/Azure); falls back to the public URL otherwise. */
  getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    return this.fileStorage.getSignedUrl(key, { expiresIn });
  }

  /** Upload from a Buffer. */
  async uploadBuffer(buffer: Buffer, key: string, contentType?: string) {
    const result = await this.fileStorage.putFile(buffer, key, { contentType });
    return { key: result.key, url: result.url, size: result.size };
  }

  /** Resolve a specific (non-default) driver by name. */
  async uploadToS3(buffer: Buffer, key: string) {
    const s3 = await this.fileStorage.getDriver('s3');
    return s3.putFile(buffer, key);
  }

  /** Delete several files. */
  deleteMany(keys: string[]): Promise<void[]> {
    return Promise.all(keys.map((key) => this.fileStorage.deleteFile(key)));
  }
}
