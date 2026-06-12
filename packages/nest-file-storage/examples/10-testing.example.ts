/**
 * Example 10: Testing File Storage
 *
 * Two approaches: (a) a real local driver against a temp directory, and
 * (b) an in-memory mock driver registered with defineDriver — no disk, no network.
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  NestFileStorageModule,
  FileStorageService,
  localDriver,
  defineDriver,
  StorageDriver,
  UploadedFile,
} from '@ackplus/nest-file-storage';
import * as fs from 'fs';
import * as path from 'path';

// (a) Local driver against a temp directory ---------------------------------

describe('FileStorageService (local)', () => {
  let fileStorage: FileStorageService;
  const testDir = './test-uploads';

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        NestFileStorageModule.forRoot({
          default: 'local',
          drivers: { local: localDriver({ rootPath: testDir, baseUrl: 'http://localhost/test' }) },
        }),
      ],
    }).compile();
    fileStorage = moduleRef.get(FileStorageService);
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('puts, reads, copies, and deletes', async () => {
    const content = Buffer.from('hello');
    const put = await fileStorage.putFile(content, 'a/b.txt');
    expect(put.key).toBe('a/b.txt');
    expect(put.size).toBe(content.length);

    expect((await fileStorage.getFile('a/b.txt')).toString()).toBe('hello');

    const copy = await fileStorage.copyFile('a/b.txt', 'a/c.txt');
    expect(copy.key).toBe('a/c.txt');

    await fileStorage.deleteFile('a/b.txt');
    await expect(fileStorage.getFile('a/b.txt')).rejects.toThrow();
  });
});

// (b) In-memory mock driver -------------------------------------------------

class MemoryDriver implements StorageDriver {
  private files = new Map<string, Buffer>();
  async putFile(content: Buffer, key: string): Promise<UploadedFile> {
    this.files.set(key, content);
    const name = path.basename(key);
    return { key, url: `mem://${key}`, originalName: name, fileName: name, size: content.length, fullPath: key };
  }
  async getFile(key: string): Promise<Buffer> {
    const f = this.files.get(key);
    if (!f) throw new Error('not found');
    return f;
  }
  async deleteFile(key: string): Promise<void> { this.files.delete(key); }
  async copyFile(src: string, dest: string): Promise<UploadedFile> { return this.putFile(await this.getFile(src), dest); }
  getUrl(key: string): string { return `mem://${key}`; }
}

describe('FileStorageService (mock driver)', () => {
  let fileStorage: FileStorageService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        NestFileStorageModule.forRoot({
          default: 'memory',
          drivers: { memory: defineDriver(MemoryDriver) },
        }),
      ],
    }).compile();
    fileStorage = moduleRef.get(FileStorageService);
  });

  it('stores in memory', async () => {
    await fileStorage.putFile(Buffer.from('x'), 'k');
    expect((await fileStorage.getFile('k')).toString()).toBe('x');
    expect(await fileStorage.getUrl('k')).toBe('mem://k');
  });
});
