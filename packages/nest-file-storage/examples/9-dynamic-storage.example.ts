/**
 * Example 9: Dynamic Storage Selection
 * 
 * This example demonstrates how to dynamically choose storage provider
 * based on request, user preferences, or business logic.
 */

import { 
  Controller, 
  Post, 
  UseInterceptors, 
  Body,
  Query,
} from '@nestjs/common';
import { 
  FileStorageInterceptor, 
  FileStorageEnum,
} from '@ackplus/nest-file-storage';

@Controller('upload')
export class DynamicStorageController {
  /**
   * Upload to specific storage based on query parameter
   * Example: POST /upload/dynamic?storage=s3
   */
  @Post('dynamic')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      // Storage type will be determined at runtime
    })
  )
  uploadDynamic(
    @Body() body: any,
    @Query('storage') storage: string,
  ) {
    return {
      message: 'File uploaded successfully',
      storage,
      fileKey: body.file,
    };
  }

  /**
   * Upload large files to S3, small files to local storage
   */
  @Post('smart')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      fileName: (file, req) => {
        const timestamp = Date.now();
        const ext = file.originalname.split('.').pop();
        return `${timestamp}-${file.originalname}`;
      },
      // Determine storage based on file size
      storageType: FileStorageEnum.LOCAL, // Can be overridden
    })
  )
  uploadSmart(@Body() body: any) {
    return {
      message: 'File uploaded successfully',
      fileKey: body.file,
    };
  }

  /**
   * Upload to S3 explicitly (override default storage)
   */
  @Post('to-s3')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      storageType: FileStorageEnum.S3,
    })
  )
  uploadToS3(@Body() body: any) {
    return {
      message: 'File uploaded to S3',
      fileKey: body.file,
    };
  }

  /**
   * Upload to Azure explicitly
   */
  @Post('to-azure')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      storageType: FileStorageEnum.AZURE,
    })
  )
  uploadToAzure(@Body() body: any) {
    return {
      message: 'File uploaded to Azure',
      fileKey: body.file,
    };
  }

  /**
   * Upload to local storage explicitly
   */
  @Post('to-local')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      storageType: FileStorageEnum.LOCAL,
    })
  )
  uploadToLocal(@Body() body: any) {
    return {
      message: 'File uploaded to local storage',
      fileKey: body.file,
    };
  }
}

/**
 * Advanced: Custom logic for storage selection
 */
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class SmartStorageService {
  /**
   * Select storage based on file size
   */
  async uploadFile(buffer: Buffer, fileName: string, fileSize: number) {
    // Use local storage for small files (< 10MB)
    // Use S3 for large files
    const storageType = fileSize < 10 * 1024 * 1024 
      ? FileStorageEnum.LOCAL 
      : FileStorageEnum.S3;

    const storage = await FileStorageService.getStorage(storageType);
    return await storage.putFile(buffer, fileName);
  }

  /**
   * Select storage based on file type
   */
  async uploadByType(buffer: Buffer, fileName: string, mimetype: string) {
    let storageType: FileStorageEnum;

    if (mimetype.startsWith('image/')) {
      // Store images on S3 with CloudFront CDN
      storageType = FileStorageEnum.S3;
    } else if (mimetype.startsWith('video/')) {
      // Store videos on Azure
      storageType = FileStorageEnum.AZURE;
    } else {
      // Store other files locally
      storageType = FileStorageEnum.LOCAL;
    }

    const storage = await FileStorageService.getStorage(storageType);
    return await storage.putFile(buffer, fileName);
  }

  /**
   * Select storage based on user plan
   */
  async uploadForUser(
    buffer: Buffer, 
    fileName: string, 
    userPlan: 'free' | 'premium'
  ) {
    // Free users: local storage
    // Premium users: S3 with better performance
    const storageType = userPlan === 'premium' 
      ? FileStorageEnum.S3 
      : FileStorageEnum.LOCAL;

    const storage = await FileStorageService.getStorage(storageType);
    return await storage.putFile(buffer, fileName);
  }
}

