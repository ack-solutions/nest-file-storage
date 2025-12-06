/**
 * Example 8: Document Management System
 * 
 * This example demonstrates a complete document management system with
 * upload, download, listing, and deletion features.
 */

import { 
  Controller, 
  Get, 
  Post, 
  Delete,
  Param,
  UseInterceptors,
  Body,
  Res,
  NotFoundException,
  StreamableFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

// Document entity interface
interface Document {
  id: number;
  name: string;
  key: string;
  url: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

// Document service (example)
class DocumentService {
  async create(data: Partial<Document>): Promise<Document> {
    // Save to database
    return {} as Document;
  }

  async findAll(): Promise<Document[]> {
    // Get all documents from database
    return [] as Document[];
  }

  async findById(id: number): Promise<Document> {
    // Get document from database
    return {} as Document;
  }

  async delete(id: number): Promise<void> {
    // Delete from database
  }
}

@Controller('documents')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  /**
   * Upload single document
   */
  @Post('upload')
  @UseInterceptors(
    FileStorageInterceptor('document', {
      fileDist: () => 'documents',
      mapToRequestBody: (file) => file, // Return full file object
    })
  )
  async uploadDocument(@Body() body: any) {
    const uploadedFile = body.document;

    // Save document info to database
    const document = await this.documentService.create({
      name: uploadedFile.originalName,
      key: uploadedFile.key,
      url: uploadedFile.url,
      size: uploadedFile.size,
      mimetype: uploadedFile.mimetype,
      uploadedAt: new Date(),
    });

    return {
      message: 'Document uploaded successfully',
      document,
    };
  }

  /**
   * Upload multiple documents
   */
  @Post('upload/multiple')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'array',
      fieldName: 'documents',
      maxCount: 10,
    }, {
      fileDist: () => 'documents',
      mapToRequestBody: (files) => files,
    })
  )
  async uploadMultipleDocuments(@Body() body: any) {
    const uploadedFiles = body.documents;

    // Save all documents to database
    const documents = await Promise.all(
      uploadedFiles.map(file =>
        this.documentService.create({
          name: file.originalName,
          key: file.key,
          url: file.url,
          size: file.size,
          mimetype: file.mimetype,
          uploadedAt: new Date(),
        })
      )
    );

    return {
      message: `${documents.length} documents uploaded successfully`,
      documents,
    };
  }

  /**
   * Get all documents
   */
  @Get()
  async getAllDocuments() {
    const documents = await this.documentService.findAll();
    return { documents };
  }

  /**
   * Download document
   */
  @Get(':id/download')
  async downloadDocument(
    @Param('id') id: number,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    // Get document from database
    const document = await this.documentService.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Get file from storage
    const storage = await FileStorageService.getStorage();
    const fileBuffer = await storage.getFile(document.key);

    // Set response headers
    res.set({
      'Content-Type': document.mimetype || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.name}"`,
      'Content-Length': document.size,
    });

    return new StreamableFile(fileBuffer);
  }

  /**
   * Get document URL (for preview or direct access)
   */
  @Get(':id/url')
  async getDocumentUrl(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return {
      url: document.url,
      expiresIn: null, // Permanent URL
    };
  }

  /**
   * Get signed URL (for S3, temporary access)
   */
  @Get(':id/signed-url')
  async getSignedUrl(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    const storage = await FileStorageService.getStorage();
    
    let url: string;
    if ('getSignedUrl' in storage) {
      // Generate signed URL (valid for 1 hour)
      url = await storage.getSignedUrl(document.key, { expiresIn: 3600 });
    } else {
      // Fallback to regular URL
      url = storage.getUrl(document.key);
    }

    return {
      url,
      expiresIn: 3600, // seconds
    };
  }

  /**
   * Delete document
   */
  @Delete(':id')
  async deleteDocument(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete from storage
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(document.key);

    // Delete from database
    await this.documentService.delete(id);

    return {
      message: 'Document deleted successfully',
    };
  }

  /**
   * Copy document
   */
  @Post(':id/copy')
  async copyDocument(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Generate new key for the copy
    const timestamp = Date.now();
    const newKey = document.key.replace(
      /(\.[^.]+)$/,
      `-copy-${timestamp}$1`
    );

    // Copy file in storage
    const storage = await FileStorageService.getStorage();
    const copiedFile = await storage.copyFile(document.key, newKey);

    // Save copy to database
    const copiedDocument = await this.documentService.create({
      name: `${document.name} (Copy)`,
      key: copiedFile.key,
      url: copiedFile.url,
      size: copiedFile.size,
      mimetype: document.mimetype,
      uploadedAt: new Date(),
    });

    return {
      message: 'Document copied successfully',
      document: copiedDocument,
    };
  }
}

