# @ackplus/nest-file-storage

`@ackplus/nest-file-storage` is a NestJS file upload and storage library for Express-based applications. It connects Multer uploads to Local storage, AWS S3, or Azure Blob Storage and gives you one common runtime API for upload, read, delete, copy, and URL generation.

This README is the canonical developer guide for using the package in an application.

## What You Get

- `NestFileStorageModule` to register the default storage provider.
- `FileStorageInterceptor()` to accept multipart uploads in controllers.
- `FileStorageService` to work with files programmatically.
- Built-in storage adapters for `local`, `s3`, and `azure`.
- Request-body mapping so uploaded file keys or metadata can flow into your DTO/service layer.

## Compatibility And Prerequisites

This library is designed for NestJS on the Express platform.

Required in the consuming app:

- `@nestjs/common`
- `@nestjs/core`
- `@nestjs/platform-express`
- `multer`
- `reflect-metadata`

Peer dependency ranges exported by the package:

- `@nestjs/common`: `^10.0.0 || ^11.0.0`
- `@nestjs/core`: `^10.0.0 || ^11.0.0`
- `multer`: `^1.4.5-lts.1 || ^2.0.0`
- `reflect-metadata`: `^0.2.2`

Optional provider packages:

- AWS S3: `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
- Azure Blob Storage: `@azure/storage-blob`

## Installation

```bash
pnpm add @ackplus/nest-file-storage multer reflect-metadata
```

If your Nest app does not already include the Express platform package:

```bash
pnpm add @nestjs/platform-express
```

For AWS S3 support:

```bash
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

For Azure Blob Storage support:

```bash
pnpm add @azure/storage-blob
```

## Register The Module

### Local storage

```ts
import { Module } from '@nestjs/common';
import { FileStorageEnum, NestFileStorageModule } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.LOCAL,
      localConfig: {
        rootPath: './uploads',
        baseUrl: 'http://localhost:3000/uploads',
      },
    }),
  ],
})
export class AppModule {}
```

### AWS S3

```ts
import { Module } from '@nestjs/common';
import { FileStorageEnum, NestFileStorageModule } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.S3,
      s3Config: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        region: process.env.AWS_REGION!,
        bucket: process.env.AWS_BUCKET!,
        cloudFrontUrl: process.env.AWS_CLOUDFRONT_URL,
      },
    }),
  ],
})
export class AppModule {}
```

### Azure Blob Storage

```ts
import { Module } from '@nestjs/common';
import { FileStorageEnum, NestFileStorageModule } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.AZURE,
      azureConfig: {
        account: process.env.AZURE_STORAGE_ACCOUNT!,
        accountKey: process.env.AZURE_STORAGE_KEY!,
        container: process.env.AZURE_CONTAINER!,
      },
    }),
  ],
})
export class AppModule {}
```

### Async configuration

```ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FileStorageEnum, NestFileStorageModule } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    ConfigModule.forRoot(),
    NestFileStorageModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        storage: FileStorageEnum.S3,
        s3Config: {
          accessKeyId: config.getOrThrow('AWS_ACCESS_KEY_ID'),
          secretAccessKey: config.getOrThrow('AWS_SECRET_ACCESS_KEY'),
          region: config.getOrThrow('AWS_REGION'),
          bucket: config.getOrThrow('AWS_BUCKET'),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### Example: build module options from one shared storage config

If your app stores provider credentials in one common config record, map that record into the module options once and return the correct provider config.

```ts
import * as path from 'path';
import { FileStorageEnum } from '@ackplus/nest-file-storage';

function buildFileStorageOptions(config: {
  type: FileStorageEnum;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  bucket?: string;
  cloudFrontUrl?: string;
}, appConfig: { appUrl: string }) {
  if (config.type === FileStorageEnum.S3) {
    return {
      storage: FileStorageEnum.S3,
      s3Config: {
        endpoint: config.endpoint,
        accessKeyId: config.accessKeyId!,
        secretAccessKey: config.secretAccessKey!,
        region: config.region!,
        bucket: config.bucket!,
        cloudFrontUrl: config.cloudFrontUrl,
      },
    };
  }

  if (config.type === FileStorageEnum.AZURE) {
    return {
      storage: FileStorageEnum.AZURE,
      azureConfig: {
        account: config.accessKeyId!,
        accountKey: config.secretAccessKey!,
        container: config.bucket!,
      },
    };
  }

  return {
    storage: FileStorageEnum.LOCAL,
    localConfig: {
      rootPath: path.join(process.cwd(), 'public'),
      baseUrl: `${appConfig.appUrl}/public`,
    },
  };
}
```

This pattern is useful when:

- S3 uses `endpoint`, `accessKeyId`, `secretAccessKey`, `region`, `bucket`, and optional `cloudFrontUrl`.
- Azure reuses the same credential source but maps `accessKeyId -> account`, `secretAccessKey -> accountKey`, and `bucket -> container`.
- Local storage falls back to a public directory such as `process.cwd()/public`.

## Local Storage Note: `baseUrl` Does Not Serve Files

For local storage, `baseUrl` only controls the URL string returned by `getUrl()` and upload metadata. It does not expose the directory over HTTP by itself.

If you want browser-accessible local files, add static serving in your Nest app:

```bash
pnpm add @nestjs/serve-static
```

```ts
import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
})
export class AppModule {}
```

Without this, local files can still be downloaded through your own controller endpoints.

## Upload Files In Controllers

`FileStorageInterceptor()` wraps Multer and uploads files into the configured storage engine before your route handler runs.

All upload routes must accept `multipart/form-data`.

### Default request-body mapping

By default, the interceptor writes storage keys into `request.body`.

| Upload mode | Accepted form field(s) | Default `body` value |
| --- | --- | --- |
| `FileStorageInterceptor('file')` | `file` | `body.file: string` |
| `type: 'array'` | repeated `files` or `files[0]`, `files[1]`, ... | `body.files: string[]` |
| `type: 'fields'` | each configured field name | `body[fieldName]: string[]` |

Important behavior for `fields` mode:

- Every configured field is mapped to an array.
- That stays true even when `maxCount: 1`.

DTO note:

- Because the interceptor writes into `request.body` before your route handler executes, your DTO shape should match the mapped value.
- Typical DTO fields are `string` for single uploads, `string[]` for array uploads, and custom object shapes when you use `mapToRequestBody`.

### Single file upload

```ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('files')
export class FilesController {
  @Post('single')
  @UseInterceptors(FileStorageInterceptor('file'))
  uploadSingle(@Body() body: { file: string }) {
    return {
      key: body.file,
    };
  }
}
```

### Multiple files in one field

```ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('files')
export class FilesController {
  @Post('multiple')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'array',
      fieldName: 'files',
      maxCount: 10,
    }),
  )
  uploadMultiple(@Body() body: { files: string[] }) {
    return {
      keys: body.files,
      count: body.files.length,
    };
  }
}
```

### Multiple named fields

```ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('files')
export class FilesController {
  @Post('fields')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'fields',
      fields: [
        { name: 'avatar', maxCount: 1 },
        { name: 'attachments', maxCount: 5 },
      ],
    }),
  )
  uploadFields(@Body() body: { avatar: string[]; attachments: string[] }) {
    return body;
  }
}
```

## Validation

Use the interceptor options for validation, not the module registration.

### File size and mime type validation

Use `multerOptions()` when you want Multer to reject invalid uploads before your route handler runs.

```ts
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('images')
export class ImagesController {
  @Post()
  @UseInterceptors(
    FileStorageInterceptor('image', {
      multerOptions: () => ({
        limits: {
          fileSize: 5 * 1024 * 1024,
        },
        fileFilter: (_req, file, cb) => {
          const allowed = ['image/jpeg', 'image/png', 'image/webp'];
          if (!allowed.includes(file.mimetype)) {
            return cb(new BadRequestException('Only JPEG, PNG, and WebP files are allowed'), false);
          }
          cb(null, true);
        },
      }),
      fileDist: () => 'images',
    }),
  )
  upload(@Body() body: { image: string }) {
    return body;
  }
}
```

### Cross-field or post-upload validation

Use `afterUpload()` when validation depends on the final uploaded file list or multiple fields together.

```ts
import { BadRequestException, Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('gallery')
export class GalleryController {
  @Post()
  @UseInterceptors(
    FileStorageInterceptor(
      {
        type: 'fields',
        fields: [
          { name: 'cover', maxCount: 1 },
          { name: 'images', maxCount: 10 },
        ],
      },
      {
        afterUpload: (req) => {
          const files = req.files as Record<string, Express.Multer.File[]>;
          const imageCount = files?.images?.length ?? 0;
          if (imageCount < 2) {
            throw new BadRequestException('At least 2 gallery images are required.');
          }
        },
      },
    ),
  )
  create(@Body() body: { cover: string[]; images: string[] }) {
    return body;
  }
}
```

Practical guidance:

- Use `limits.fileSize` for upload size limits.
- Use `fileFilter` for mime-type or extension checks.
- Use `afterUpload` for rules involving multiple files or fields.
- Do not rely on `file.size` inside `fileName()`; Multer size limits are the reliable way to cap upload size.

## Control The Stored Path And Key

Two callbacks define where the file is stored and what key is saved:

- `fileDist(file, req)`: the directory or path prefix.
- `fileName(file, req)`: the final filename segment.

The final key is effectively:

```text
<fileDist>/<fileName>
```

### Default key generation

If you do not override anything:

- Local storage stores files under `rootPath/YYYY/MM/DD`.
- S3 and Azure store files under `uploads/YYYY/MM/DD`.
- The default filename is `uuid-originalname`.

Examples:

- Local key: `2026/04/23/2d0b8f6e-report.pdf`
- S3 key: `uploads/2026/04/23/2d0b8f6e-report.pdf`

### Custom path and filename

```ts
import { extname } from 'path';

FileStorageInterceptor('avatar', {
  fileDist: (_file, req) => `users/${req.user.id}/avatars`,
  fileName: (file) => `${Date.now()}${extname(file.originalname)}`,
});
```

This gives you keys such as:

```text
users/42/avatars/1713876155123.png
```

Use `fileDist` for folder structure and `fileName` for the last path segment. That is the most reliable way to control saved keys in the current implementation.

## Map Upload Results Into `request.body`

The default mapping stores only keys. If you want richer metadata in the controller body, use `mapToRequestBody`.

### Return metadata instead of just the key

```ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('documents')
export class DocumentsController {
  @Post()
  @UseInterceptors(
    FileStorageInterceptor('document', {
      mapToRequestBody: (file) => ({
        key: file.key,
        url: file.url,
        size: file.size,
        mimetype: file.mimetype,
        originalName: file.originalName,
        fullPath: file.fullPath,
      }),
    }),
  )
  upload(@Body() body: any) {
    return body.document;
  }
}
```

### Preserve an existing body field

If the request already contains a JSON/text field with the same name and you only want to populate it when missing:

```ts
FileStorageInterceptor('file', {
  overwriteBodyField: false,
});
```

## Use `FileStorageService` Programmatically

`FileStorageService.getStorage()` gives you the active storage implementation so you can upload or manage files outside controller interceptors.

```ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class DocumentStorageService {
  async upload(buffer: Buffer, key: string) {
    const storage = await FileStorageService.getStorage();
    return storage.putFile(buffer, key);
  }

  async get(key: string) {
    const storage = await FileStorageService.getStorage();
    return storage.getFile(key);
  }

  async remove(key: string) {
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(key);
  }

  async copy(oldKey: string, newKey: string) {
    const storage = await FileStorageService.getStorage();
    return storage.copyFile(oldKey, newKey);
  }

  async url(key: string) {
    const storage = await FileStorageService.getStorage();
    return storage.getUrl(key);
  }

  async signedUrl(key: string) {
    const storage = await FileStorageService.getStorage();
    if ('getSignedUrl' in storage && storage.getSignedUrl) {
      return storage.getSignedUrl(key, { expiresIn: 3600 });
    }
    return storage.getUrl(key);
  }
}
```

### Get full URL from a stored key/path

If you save only the storage key in your database, generate the public URL later with `getUrl(key)`. This works across Local, S3, and Azure.

```ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class FileUrlService {
  async getUrlFromKey(key?: string | null): Promise<string | null> {
    if (!key) {
      return null;
    }

    const storage = await FileStorageService.getStorage();
    return await Promise.resolve(storage.getUrl(key));
  }
}
```

### Add full URLs after loading entities

The usual pattern is to store only `fileKey` in the entity and attach the final URL after fetching data.

```ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

type UserRecord = {
  id: number;
  avatarKey?: string | null;
};

@Injectable()
export class UsersResponseMapper {
  async mapUser(user: UserRecord) {
    const storage = await FileStorageService.getStorage();

    return {
      ...user,
      avatarUrl: user.avatarKey
        ? await Promise.resolve(storage.getUrl(user.avatarKey))
        : null,
    };
  }
}
```

For entity-based applications:

- Store the key/path in the entity, for example `avatarKey` or `documentKey`.
- Build the full URL in a service, mapper, serializer, or response DTO step after loading the entity.
- This is usually cleaner than doing URL generation inside ORM entity hooks, because `FileStorageService.getStorage()` is async.

### Provider capability summary

| Method | Local | S3 | Azure |
| --- | --- | --- | --- |
| `putFile()` | yes | yes | yes |
| `getFile()` | yes | yes | yes |
| `deleteFile()` | yes | yes | yes |
| `copyFile()` | yes | yes | yes |
| `getUrl()` | yes | yes | yes |
| `getSignedUrl()` | no | yes | yes |
| `path()` | yes | no | no |

## Route-Level Storage Override

You can override the storage provider per route.

```ts
import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageEnum, FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('avatars')
export class AvatarController {
  @Post()
  @UseInterceptors(
    FileStorageInterceptor('avatar', {
      storageType: FileStorageEnum.S3,
      storageOptions: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        region: process.env.AWS_REGION!,
        bucket: process.env.AWS_BUCKET!,
        fileDist: (_file, req) => `users/${req.user.id}/avatars`,
      },
      mapToRequestBody: (file) => ({
        key: file.key,
        url: file.url,
      }),
    }),
  )
  upload(@Body() body: any) {
    return body.avatar;
  }
}
```

Important behavior:

- If the route uses the same provider as the module default, `storageOptions` can override pieces of that provider config.
- If the route uses a different provider than the module default, pass the full config for that provider inside `storageOptions`.

## Configuration Reference

### Common file options

These are shared by Local, S3, and Azure configs:

- `fileName(file, req)`: return the filename segment.
- `fileDist(file, req)`: return the folder/path prefix.
- `transformUploadedFileObject(file)`: transform the raw uploaded file object returned by the storage engine before Multer stores it.

### Local config

- `rootPath`: local directory where files are written.
- `baseUrl`: URL prefix used by `getUrl()`.
- Common file options listed above.

### S3 config

- `accessKeyId`
- `secretAccessKey`
- `region`
- `bucket`
- `endpoint`: optional custom S3-compatible endpoint.
- `cloudFrontUrl`: optional CDN/public URL prefix used by `getUrl()`.
- Common file options listed above.

### Azure config

- `account`
- `accountKey`
- `container`
- Common file options listed above.

Azure note:

- `getSignedUrl()` generates a SAS URL by default.
- If `AZURE_CDN_DOMAIN_NAME` is set in the runtime environment, the Azure storage adapter returns `AZURE_CDN_DOMAIN_NAME/<key>` instead of a SAS URL.

## Current Behavior Notes

- This package is implemented for NestJS with Express and Multer. It is not a Fastify-targeted integration.
- In `fields` mode, each field is mapped to an array even when `maxCount` is `1`.
- `baseUrl` is only a URL prefix. Add static serving yourself for direct local-file access.
- The exported types include a `prefix` option, but `fileDist` and `fileName` are the reliable hooks for controlling saved paths in the current implementation.
- The module stores one provider configuration at a time. For per-route provider switching, use `storageType` with `storageOptions`.
- The custom `storageFactory` module option is best treated as an advanced service-level hook. The controller upload flow documented here is the built-in path for Local, S3, and Azure storage.

## Examples And Workspace Docs

- Package examples: [`examples/`](./examples/)
- Workspace overview: [`../../README.md`](../../README.md)
- Example app: [`../../apps/example-app/README.md`](../../apps/example-app/README.md)

## License

MIT
