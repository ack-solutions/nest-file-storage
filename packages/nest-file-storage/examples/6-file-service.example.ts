/**
 * Example 6: File Service
 * 
 * This example demonstrates how to use FileStorageService to perform
 * file operations programmatically.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';
import * as fs from 'fs';

@Injectable()
export class FileService {
  /**
   * Get file content as Buffer
   */
  async getFile(key: string): Promise<Buffer> {
    try {
      const storage = await FileStorageService.getStorage();
      return await storage.getFile(key);
    } catch (error) {
      throw new NotFoundException(`File not found: ${key}`);
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(key: string): Promise<void> {
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(key);
  }

  /**
   * Copy a file to a new location
   */
  async copyFile(oldKey: string, newKey: string) {
    const storage = await FileStorageService.getStorage();
    return await storage.copyFile(oldKey, newKey);
  }

  /**
   * Upload a file from local filesystem
   */
  async uploadFromLocal(localPath: string, storageKey: string) {
    const fileBuffer = await fs.promises.readFile(localPath);
    const storage = await FileStorageService.getStorage();
    return await storage.putFile(fileBuffer, storageKey);
  }

  /**
   * Get public URL for a file
   */
  async getFileUrl(key: string): Promise<string> {
    const storage = await FileStorageService.getStorage();
    return storage.getUrl(key);
  }

  /**
   * Get signed URL (for S3)
   * Useful for temporary access to private files
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const storage = await FileStorageService.getStorage();
    
    // Check if storage supports signed URLs (S3)
    if ('getSignedUrl' in storage) {
      return await storage.getSignedUrl(key, { expiresIn });
    }
    
    // Fallback to regular URL for other storage types
    return storage.getUrl(key);
  }

  /**
   * Upload file from Buffer
   */
  async uploadBuffer(buffer: Buffer, key: string, mimetype?: string) {
    const storage = await FileStorageService.getStorage();
    const result = await storage.putFile(buffer, key);
    
    return {
      key: result.key,
      url: result.url,
      size: result.size,
      mimetype,
    };
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const storage = await FileStorageService.getStorage();
      await storage.getFile(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    const storage = await FileStorageService.getStorage();
    await Promise.all(keys.map(key => storage.deleteFile(key)));
  }

  /**
   * Get file path (Local storage only)
   */
  async getFilePath(key: string): Promise<string | undefined> {
    const storage = await FileStorageService.getStorage();
    
    if ('path' in storage) {
      return storage.path(key);
    }
    
    return undefined;
  }
}

