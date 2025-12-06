/**
 * Example 4: File Upload Controller
 * 
 * This example demonstrates different file upload scenarios using the FileStorageInterceptor.
 */

import { Controller, Post, UseInterceptors, Body, BadRequestException } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('upload')
export class UploadController {
  /**
   * Single file upload
   * POST /upload/single
   * Form field: "file"
   */
  @Post('single')
  @UseInterceptors(FileStorageInterceptor('file'))
  uploadSingle(@Body() body: any) {
    return {
      message: 'File uploaded successfully',
      fileKey: body.file, // File key is automatically added to body
    };
  }

  /**
   * Multiple files upload (same field name)
   * POST /upload/multiple
   * Form field: "files" (multiple files)
   */
  @Post('multiple')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'array',
      fieldName: 'files',
      maxCount: 10, // Maximum 10 files
    })
  )
  uploadMultiple(@Body() body: any) {
    return {
      message: 'Files uploaded successfully',
      fileKeys: body.files, // Array of file keys
      count: body.files.length,
    };
  }

  /**
   * Multiple fields with different files
   * POST /upload/fields
   * Form fields: "avatar" (1 file), "photos" (up to 5 files)
   */
  @Post('fields')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'fields',
      fields: [
        { name: 'avatar', maxCount: 1 },
        { name: 'photos', maxCount: 5 },
      ],
    })
  )
  uploadFields(@Body() body: any) {
    return {
      message: 'Files uploaded successfully',
      avatar: body.avatar, // Single file key
      photos: body.photos, // Array of file keys
    };
  }

  /**
   * Upload with custom file information
   * Returns full file object instead of just the key
   */
  @Post('with-details')
  @UseInterceptors(
    FileStorageInterceptor('file', {
      mapToRequestBody: (file) => {
        // Return the full file object
        return file;
      },
    })
  )
  uploadWithDetails(@Body() body: any) {
    return {
      message: 'File uploaded successfully',
      file: body.file, // Full file object with key, url, size, etc.
    };
  }

  /**
   * Upload with validation
   */
  @Post('image')
  @UseInterceptors(
    FileStorageInterceptor('image', {
      fileName: (file) => {
        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          throw new BadRequestException('Only image files are allowed');
        }

        // Generate filename with timestamp
        const timestamp = Date.now();
        const ext = file.originalname.split('.').pop();
        return `image-${timestamp}.${ext}`;
      },
    })
  )
  uploadImage(@Body() body: any) {
    return {
      message: 'Image uploaded successfully',
      imageKey: body.image,
    };
  }
}

