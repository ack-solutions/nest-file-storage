/**
 * Example 4: File Upload Controller
 *
 * Different upload shapes with the FileStorageInterceptor, plus declarative validation.
 */

import { Controller, Post, UseInterceptors, Body } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('upload')
export class UploadController {
  /**
   * Single file upload — POST /upload/single, form field "file".
   */
  @Post('single')
  @UseInterceptors(FileStorageInterceptor('file'))
  uploadSingle(@Body() body: any) {
    return { message: 'File uploaded successfully', fileKey: body.file };
  }

  /**
   * Multiple files in one field — POST /upload/multiple, form field "files".
   */
  @Post('multiple')
  @UseInterceptors(
    FileStorageInterceptor({ type: 'array', fieldName: 'files', maxCount: 10 })
  )
  uploadMultiple(@Body() body: any) {
    return {
      message: 'Files uploaded successfully',
      fileKeys: body.files, // string[]
      count: body.files.length,
    };
  }

  /**
   * Multiple named fields — POST /upload/fields, fields "avatar" and "photos".
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
      avatar: body.avatar, // string[] (always an array in 'fields' mode)
      photos: body.photos, // string[]
    };
  }

  /**
   * Return the full file object instead of just the key.
   */
  @Post('with-details')
  @UseInterceptors(FileStorageInterceptor('file', { mapToRequestBody: (file) => file }))
  uploadWithDetails(@Body() body: any) {
    return { message: 'File uploaded successfully', file: body.file };
  }

  /**
   * Declarative validation (v2) — type + size checks become typed 400s.
   */
  @Post('image')
  @UseInterceptors(
    FileStorageInterceptor('image', {
      validation: {
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
        maxSize: 5 * 1024 * 1024, // 5 MB
      },
      fileName: (file) => `image-${Date.now()}.${file.originalname.split('.').pop()}`,
    })
  )
  uploadImage(@Body() body: any) {
    return { message: 'Image uploaded successfully', imageKey: body.image };
  }
}
