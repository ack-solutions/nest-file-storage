/**
 * Example 10: Testing File Storage
 * 
 * This example demonstrates how to write tests for file storage functionality.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { 
  NestFileStorageModule, 
  FileStorageService,
  FileStorageEnum,
} from '@ackplus/nest-file-storage';

describe('File Storage (e2e)', () => {
  let app: INestApplication;
  let storage: any;
  const testDir = './test-uploads';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        NestFileStorageModule.forRoot({
          storage: FileStorageEnum.LOCAL,
          localConfig: {
            rootPath: testDir,
            baseUrl: 'http://localhost:3000/test-uploads',
          },
        }),
        // Import your controllers and services
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    storage = await FileStorageService.getStorage();
  });

  afterAll(async () => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    await app.close();
  });

  describe('File Upload', () => {
    it('should upload a single file', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload/single')
        .attach('file', Buffer.from('test content'), 'test.txt')
        .expect(201);

      expect(response.body.fileKey).toBeDefined();
      expect(response.body.message).toBe('File uploaded successfully');
    });

    it('should upload multiple files', async () => {
      const response = await request(app.getHttpServer())
        .post('/upload/multiple')
        .attach('files', Buffer.from('test 1'), 'test1.txt')
        .attach('files', Buffer.from('test 2'), 'test2.txt')
        .expect(201);

      expect(response.body.fileKeys).toHaveLength(2);
    });

    it('should reject invalid file types', async () => {
      await request(app.getHttpServer())
        .post('/upload/image')
        .attach('image', Buffer.from('not an image'), 'test.txt')
        .expect(400);
    });
  });

  describe('FileStorageService', () => {
    const testKey = 'test/file.txt';
    const testContent = Buffer.from('Hello, World!');

    it('should upload a file', async () => {
      const result = await storage.putFile(testContent, testKey);

      expect(result.key).toBe(testKey);
      expect(result.size).toBe(testContent.length);
      expect(result.url).toContain(testKey);
    });

    it('should retrieve a file', async () => {
      await storage.putFile(testContent, testKey);
      const retrieved = await storage.getFile(testKey);

      expect(retrieved.toString()).toBe(testContent.toString());
    });

    it('should get file URL', () => {
      const url = storage.getUrl(testKey);
      expect(url).toContain(testKey);
      expect(url).toContain('http://localhost:3000');
    });

    it('should delete a file', async () => {
      await storage.putFile(testContent, testKey);
      await storage.deleteFile(testKey);

      await expect(storage.getFile(testKey)).rejects.toThrow();
    });

    it('should copy a file', async () => {
      const sourceKey = 'test/source.txt';
      const targetKey = 'test/target.txt';

      await storage.putFile(testContent, sourceKey);
      const result = await storage.copyFile(sourceKey, targetKey);

      expect(result.key).toBe(targetKey);

      const copiedContent = await storage.getFile(targetKey);
      expect(copiedContent.toString()).toBe(testContent.toString());

      // Cleanup
      await storage.deleteFile(sourceKey);
      await storage.deleteFile(targetKey);
    });

    it('should handle multiple files', async () => {
      const files = [
        { key: 'test/file1.txt', content: Buffer.from('Content 1') },
        { key: 'test/file2.txt', content: Buffer.from('Content 2') },
        { key: 'test/file3.txt', content: Buffer.from('Content 3') },
      ];

      // Upload multiple files
      await Promise.all(
        files.map(file => storage.putFile(file.content, file.key))
      );

      // Verify all files exist
      const results = await Promise.all(
        files.map(file => storage.getFile(file.key))
      );

      expect(results).toHaveLength(3);
      expect(results[0].toString()).toBe('Content 1');

      // Cleanup
      await Promise.all(
        files.map(file => storage.deleteFile(file.key))
      );
    });
  });

  describe('File Service', () => {
    // Test your custom file service
    it('should handle file operations', async () => {
      // Your file service tests here
    });
  });
});

/**
 * Unit Test Example
 */
describe('FileService', () => {
  let service: any; // Your file service

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        NestFileStorageModule.forRoot({
          storage: FileStorageEnum.LOCAL,
          localConfig: {
            rootPath: './test-uploads',
            baseUrl: 'http://localhost:3000/test-uploads',
          },
        }),
      ],
      providers: [/* Your FileService */],
    }).compile();

    service = module.get(/* Your FileService */);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Add more unit tests...
});

/**
 * Mock Storage for Testing
 */
class MockStorage {
  private files = new Map<string, Buffer>();

  async putFile(content: Buffer, key: string) {
    this.files.set(key, content);
    return {
      key,
      url: `http://mock/${key}`,
      size: content.length,
      fileName: path.basename(key),
      originalName: path.basename(key),
      fullPath: key,
    };
  }

  async getFile(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) {
      throw new Error('File not found');
    }
    return file;
  }

  async deleteFile(key: string): Promise<void> {
    this.files.delete(key);
  }

  async copyFile(oldKey: string, newKey: string) {
    const file = await this.getFile(oldKey);
    return await this.putFile(file, newKey);
  }

  getUrl(key: string): string {
    return `http://mock/${key}`;
  }
}

