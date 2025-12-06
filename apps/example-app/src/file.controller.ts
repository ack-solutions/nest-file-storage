import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  StreamableFile,
  Res,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

@ApiTags('files')
@Controller('files')
export class FileController {
  /**
   * Upload a single file
   */
  @Post('upload')
  @ApiOperation({ summary: 'Upload a single file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'File to upload',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseInterceptors(
    FileStorageInterceptor('file', {
      mapToRequestBody: (file) => file, // Return full file object
    })
  )
  uploadSingleFile(@Body() body: any) {
    return {
      message: 'File uploaded successfully',
      file: body.file,
    };
  }

  /**
   * Upload multiple files
   */
  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files (max 10)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Multiple files to upload',
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (max 10)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Files uploaded successfully' })
  @UseInterceptors(
    FileStorageInterceptor(
      {
        type: 'array',
        fieldName: 'files',
        maxCount: 10,
      },
      {
        mapToRequestBody: (files) => files,
      }
    )
  )
  uploadMultipleFiles(@Body() body: any) {
    return {
      message: 'Files uploaded successfully',
      count: body.files.length,
      files: body.files,
    };
  }

  /**
   * Upload image with validation
   */
  @Post('upload-image')
  @ApiOperation({ summary: 'Upload an image (JPEG, PNG, GIF, WebP only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Image file (JPEG, PNG, GIF, WebP)',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @UseInterceptors(
    FileStorageInterceptor('image', {
      fileName: (file) => {
        // Validate image type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.mimetype)) {
          throw new BadRequestException(
            'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'
          );
        }

        // Validate file size (5MB max)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
          throw new BadRequestException('File size must be less than 5MB');
        }

        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.originalname.split('.').pop();
        return `image-${timestamp}.${ext}`;
      },
      fileDist: () => 'images',
      mapToRequestBody: (file) => file,
    })
  )
  uploadImage(@Body() body: any) {
    return {
      message: 'Image uploaded successfully',
      image: body.image,
    };
  }

  /**
   * Upload document
   */
  @Post('upload-document')
  @ApiOperation({ summary: 'Upload a document (PDF, DOC, DOCX, TXT)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Document file to upload',
    schema: {
      type: 'object',
      properties: {
        document: {
          type: 'string',
          format: 'binary',
          description: 'Document file',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  @UseInterceptors(
    FileStorageInterceptor('document', {
      fileName: (file) => {
        const timestamp = Date.now();
        return `doc-${timestamp}-${file.originalname}`;
      },
      fileDist: () => 'documents',
      mapToRequestBody: (file) => file,
    })
  )
  uploadDocument(@Body() body: any) {
    return {
      message: 'Document uploaded successfully',
      document: body.document,
    };
  }

  /**
   * Download a file
   */
  @Get('download/*path')
  @ApiOperation({ summary: 'Download a file by key' })
  @ApiResponse({ status: 200, description: 'File downloaded successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async downloadFile(
    @Param('path') key: string,
    @Res({ passthrough: true }) res: Response
  ): Promise<StreamableFile> {
    try {
      const storage = await FileStorageService.getStorage();
      const fileBuffer = await storage.getFile(key);

      // Extract filename from key
      const filename = key.split('/').pop() || 'download';

      res.set({
        'Content-Type': 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });

      return new StreamableFile(fileBuffer);
    } catch (error) {
      throw new NotFoundException(`File not found: ${key}`);
    }
  }

  /**
   * Get file URL
   */
  @Get('url/*path')
  @ApiOperation({ summary: 'Get public URL for a file' })
  @ApiResponse({ status: 200, description: 'URL retrieved successfully' })
  async getFileUrl(@Param('path') key: string) {
    const storage = await FileStorageService.getStorage();
    const url = storage.getUrl(key);

    return {
      key,
      url,
    };
  }

  /**
   * Get signed URL (for S3)
   */
  @Get('signed-url/*path')
  @ApiOperation({ summary: 'Get signed URL for temporary access (S3 only)' })
  @ApiResponse({ status: 200, description: 'Signed URL generated successfully' })
  async getSignedUrl(@Param('path') key: string) {
    const storage = await FileStorageService.getStorage();

    let url: string;
    if ('getSignedUrl' in storage && storage.getSignedUrl) {
      url = await storage.getSignedUrl(key, { expiresIn: 3600 });
    } else {
      url = await Promise.resolve(storage.getUrl(key));
    }

    return {
      key,
      url,
      expiresIn: 3600, // seconds
    };
  }

  /**
   * Delete a file
   */
  @Delete('*path')
  @ApiOperation({ summary: 'Delete a file by key' })
  @ApiResponse({ status: 200, description: 'File deleted successfully' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async deleteFile(@Param('path') key: string) {
    try {
      const storage = await FileStorageService.getStorage();
      await storage.deleteFile(key);

      return {
        message: 'File deleted successfully',
        key,
      };
    } catch (error) {
      throw new NotFoundException(`File not found: ${key}`);
    }
  }

  /**
   * Copy a file
   */
  @Post('copy')
  @ApiOperation({ summary: 'Copy a file to a new location' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sourceKey: {
          type: 'string',
          description: 'Source file key',
          example: 'images/image-123456.jpg',
        },
        targetKey: {
          type: 'string',
          description: 'Target file key',
          example: 'images/image-123456-copy.jpg',
        },
      },
      required: ['sourceKey', 'targetKey'],
    },
  })
  @ApiResponse({ status: 201, description: 'File copied successfully' })
  @ApiResponse({ status: 404, description: 'Source file not found' })
  async copyFile(@Body() body: { sourceKey: string; targetKey: string }) {
    try {
      const storage = await FileStorageService.getStorage();
      const result = await storage.copyFile(body.sourceKey, body.targetKey);

      return {
        message: 'File copied successfully',
        source: body.sourceKey,
        target: body.targetKey,
        file: result,
      };
    } catch (error) {
      throw new NotFoundException(`Source file not found: ${body.sourceKey}`);
    }
  }
}

