/**
 * Example 8: Document Management System
 *
 * Upload, download, list, copy, and delete documents — using the injected service.
 */

import { Controller, Get, Post, Delete, Param, UseInterceptors, Body, Res, NotFoundException, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

interface Document {
  id: number;
  name: string;
  key: string;
  url: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
}

class DocumentService {
  async create(_data: Partial<Document>): Promise<Document> { return {} as Document; }
  async findAll(): Promise<Document[]> { return []; }
  async findById(_id: number): Promise<Document> { return {} as Document; }
  async delete(_id: number): Promise<void> {}
}

@Controller('documents')
export class DocumentController {
  constructor(
    private readonly documentService: DocumentService,
    private readonly fileStorage: FileStorageService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileStorageInterceptor('document', { fileDist: () => 'documents', mapToRequestBody: (file) => file })
  )
  async uploadDocument(@Body() body: any) {
    const file = body.document;
    const document = await this.documentService.create({
      name: file.originalName, key: file.key, url: file.url,
      size: file.size, mimetype: file.mimetype, uploadedAt: new Date(),
    });
    return { message: 'Document uploaded successfully', document };
  }

  @Post('upload/multiple')
  @UseInterceptors(
    FileStorageInterceptor(
      { type: 'array', fieldName: 'documents', maxCount: 10 },
      { fileDist: () => 'documents', mapToRequestBody: (files) => files }
    )
  )
  async uploadMany(@Body() body: any) {
    const documents = await Promise.all(
      body.documents.map((file: any) =>
        this.documentService.create({
          name: file.originalName, key: file.key, url: file.url,
          size: file.size, mimetype: file.mimetype, uploadedAt: new Date(),
        })
      )
    );
    return { message: `${documents.length} documents uploaded successfully`, documents };
  }

  @Get()
  async getAll() {
    return { documents: await this.documentService.findAll() };
  }

  @Get(':id/download')
  async download(@Param('id') id: number, @Res({ passthrough: true }) res: Response): Promise<StreamableFile> {
    const document = await this.documentService.findById(id);
    if (!document) throw new NotFoundException('Document not found');

    const buffer = await this.fileStorage.getFile(document.key);
    res.set({
      'Content-Type': document.mimetype || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${document.name}"`,
    });
    return new StreamableFile(buffer);
  }

  @Get(':id/signed-url')
  async signedUrl(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) throw new NotFoundException('Document not found');
    return { url: await this.fileStorage.getSignedUrl(document.key, { expiresIn: 3600 }), expiresIn: 3600 };
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) throw new NotFoundException('Document not found');
    await this.fileStorage.deleteFile(document.key);
    await this.documentService.delete(id);
    return { message: 'Document deleted successfully' };
  }

  @Post(':id/copy')
  async copy(@Param('id') id: number) {
    const document = await this.documentService.findById(id);
    if (!document) throw new NotFoundException('Document not found');

    const newKey = document.key.replace(/(\.[^.]+)$/, `-copy-${Date.now()}$1`);
    const copied = await this.fileStorage.copyFile(document.key, newKey);
    const copiedDocument = await this.documentService.create({
      name: `${document.name} (Copy)`, key: copied.key, url: copied.url,
      size: copied.size, mimetype: document.mimetype, uploadedAt: new Date(),
    });
    return { message: 'Document copied successfully', document: copiedDocument };
  }
}
