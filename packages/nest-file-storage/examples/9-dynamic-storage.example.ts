/**
 * Example 9: Dynamic Storage Selection
 *
 * Choose the storage driver per request (by query, user plan, file type, …). Register the
 * candidate drivers in the module, then select one by name on the route or in the service.
 */

import { Controller, Post, UseInterceptors, Body, Injectable } from '@nestjs/common';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

// Assumes the module registered drivers named 'local' and 's3' (see examples 1–2).

@Controller('upload')
export class DynamicStorageController {
  /** Force a specific registered driver for this route. */
  @Post('to-s3')
  @UseInterceptors(FileStorageInterceptor('file', { driver: 's3' }))
  uploadToS3(@Body() body: any) {
    return { message: 'Uploaded to S3', fileKey: body.file };
  }

  /** Pick the driver dynamically from the request (e.g. premium users -> s3). */
  @Post('smart')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      driver: (req) => (req.user?.plan === 'premium' ? 's3' : 'local'),
    })
  )
  uploadSmart(@Body() body: any) {
    return { message: 'Uploaded', fileKey: body.file };
  }
}

/**
 * Programmatic selection in a service — resolve any registered driver by name.
 */
@Injectable()
export class SmartStorageService {
  constructor(private readonly fileStorage: FileStorageService) {}

  /** Small files -> local, large files -> s3. */
  async uploadBySize(buffer: Buffer, key: string) {
    const driverName = buffer.length < 10 * 1024 * 1024 ? 'local' : 's3';
    const driver = await this.fileStorage.getDriver(driverName);
    return driver.putFile(buffer, key);
  }

  /** Route by content type. */
  async uploadByType(buffer: Buffer, key: string, mimetype: string) {
    const driverName = mimetype.startsWith('video/') ? 'azure' : 's3';
    const driver = await this.fileStorage.getDriver(driverName);
    return driver.putFile(buffer, key, { contentType: mimetype });
  }
}

// Tip: for per-tenant routing, prefer the module's `tenant` config (see example 12) — it caches
// the resolved driver per tenant instead of selecting on every request.
