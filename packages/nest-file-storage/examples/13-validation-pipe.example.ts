/**
 * Example 13: Uploads with a strict global ValidationPipe (forbidNonWhitelisted)
 *
 * A very common NestJS setup registers:
 *
 *   app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
 *
 * Interceptors run BEFORE pipes, so by default the FileStorageInterceptor writes the stored key
 * onto request.body[field] and the pipe then rejects it with `property "file" should not exist`
 * (the key is server-derived, so your DTO shouldn't declare it).
 *
 * Fix: set `writeToBody: false` (module-wide or per route) and read the file from `@UploadedFile()`.
 * The DTO validates only client-supplied fields; the storage key comes from the file.
 */

import { Body, Controller, Post, UploadedFile, UseInterceptors, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FileStorageInterceptor, NestFileStorageModule, localDriver } from '@ackplus/nest-file-storage';
import { IsOptional, IsString } from 'class-validator';

// --- Module: turn the body write-back off module-wide -----------------------

NestFileStorageModule.forRoot({
  default: 'local',
  drivers: {
    local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
  },
  writeToBody: false, // leave request.body untouched — read files via @UploadedFile()
});

// --- DTO: no `file` field (the key is server-derived) -----------------------

class CreateDocumentDto {
  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

// A Multer file carrying the metadata our storage engine attaches.
type StoredFile = Express.Multer.File & { key: string; url: string };

@Controller('documents')
export class DocumentsController {
  /**
   * POST /documents  (multipart/form-data: title, description?, file)
   * The DTO validates clean under forbidNonWhitelisted; the key comes from @UploadedFile().
   */
  @Post()
  @UseInterceptors(FileStorageInterceptor('file'))
  create(@Body() dto: CreateDocumentDto, @UploadedFile() file: StoredFile) {
    return { ...dto, fileKey: file.key, url: file.url };
  }

  /**
   * If you DIDN'T set `writeToBody: false` module-wide, override it per route instead:
   *
   *   @UseInterceptors(FileStorageInterceptor('file', { writeToBody: false }))
   */
}

// --- Bootstrap: the strict global pipe that makes the write-back matter ------

async function bootstrap() {
  // AppModule imports the NestFileStorageModule above and registers DocumentsController.
  // const app = await NestFactory.create(AppModule);
  // app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
  // await app.listen(3000);
  void NestFactory;
  void ValidationPipe;
}
void bootstrap;
