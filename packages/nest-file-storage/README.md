# @ackplus/nest-file-storage

A flexible and feature-rich file storage solution for NestJS applications with support for Local, AWS S3, and Azure Blob Storage.

## ✨ Features

- 📦 **Multiple Storage Providers** - Local, AWS S3, and Azure Blob Storage support
- 🔄 **Easy Switching** - Switch between storage providers with minimal configuration
- 🎯 **NestJS Integration** - Seamless integration with NestJS decorators and interceptors
- 📁 **File Operations** - Upload, download, delete, copy files with ease
- 🔐 **Signed URLs** - Generate presigned URLs for secure file access (S3)
- 🎨 **Customizable** - Custom file naming, directory structure, and transformations
- 📝 **TypeScript** - Full TypeScript support with type safety
- 🧪 **Test-Friendly** - Easy to mock and test

## 📦 Installation

```bash
npm install @ackplus/nest-file-storage
# or
pnpm add @ackplus/nest-file-storage
# or
yarn add @ackplus/nest-file-storage
```

**For AWS S3 support:**

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**For Azure Blob Storage support:**

```bash
npm install @azure/storage-blob
```

## 🚀 Quick Start

### Step 1: Configure Module

Choose your storage provider and configure the module:

#### Local Storage

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';

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

#### AWS S3

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.S3,
      s3Config: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
        bucket: process.env.AWS_BUCKET,
      },
    }),
  ],
})
export class AppModule {}
```

#### Azure Blob Storage

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.AZURE,
      azureConfig: {
        account: process.env.AZURE_STORAGE_ACCOUNT,
        accountKey: process.env.AZURE_STORAGE_KEY,
        container: process.env.AZURE_CONTAINER,
      },
    }),
  ],
})
export class AppModule {}
```

### Step 2: Upload Files in Controller

```typescript
// upload.controller.ts
import { Controller, Post, UseInterceptors } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('upload')
export class UploadController {
  // Single file upload
  @Post('single')
  @UseInterceptors(FileStorageInterceptor('file'))
  uploadSingle(@Body() body: any) {
    // File key is automatically added to body.file
    return {
      message: 'File uploaded successfully',
      fileKey: body.file,
    };
  }

  // Multiple files upload
  @Post('multiple')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'array',
      fieldName: 'files',
      maxCount: 10,
    })
  )
  uploadMultiple(@Body() body: any) {
    // File keys are automatically added to body.files as array
    return {
      message: 'Files uploaded successfully',
      fileKeys: body.files,
    };
  }

  // Multiple fields
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
      avatar: body.avatar,
      photos: body.photos,
    };
  }
}
```

### Step 3: Use File Storage Service

```typescript
// file.service.ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class FileService {
  // Get file
  async getFile(key: string): Promise<Buffer> {
    const storage = await FileStorageService.getStorage();
    return await storage.getFile(key);
  }

  // Delete file
  async deleteFile(key: string): Promise<void> {
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(key);
  }

  // Copy file
  async copyFile(oldKey: string, newKey: string) {
    const storage = await FileStorageService.getStorage();
    return await storage.copyFile(oldKey, newKey);
  }

  // Get public URL
  async getFileUrl(key: string): Promise<string> {
    const storage = await FileStorageService.getStorage();
    return storage.getUrl(key);
  }

  // Get signed URL (S3 only)
  async getSignedUrl(key: string): Promise<string> {
    const storage = await FileStorageService.getStorage();
    if ('getSignedUrl' in storage) {
      return await storage.getSignedUrl(key, { expiresIn: 3600 });
    }
    return storage.getUrl(key);
  }
}
```

## 📚 Configuration Options

### Local Storage Options

```typescript
interface LocalStorageOptions {
  rootPath: string; // Directory to store files
  baseUrl: string; // Base URL for file access
  prefix?: string; // Optional prefix for file keys
  fileName?: (file: any, req: Request) => string; // Custom file naming
  fileDist?: (file: any, req: Request) => string; // Custom directory structure
  transformUploadedFileObject?: (file: any) => any; // Transform uploaded file object
}
```

### S3 Storage Options

```typescript
interface S3StorageOptions {
  accessKeyId: string; // AWS access key
  secretAccessKey: string; // AWS secret key
  region: string; // AWS region
  bucket: string; // S3 bucket name
  endpoint?: string; // Custom S3 endpoint (for S3-compatible services)
  cloudFrontUrl?: string; // CloudFront distribution URL
  prefix?: string; // Optional prefix for file keys
  fileName?: (file: any, req: Request) => string; // Custom file naming
  fileDist?: (file: any, req: Request) => string; // Custom directory structure
  transformUploadedFileObject?: (file: any) => any; // Transform uploaded file object
}
```

### Azure Storage Options

```typescript
interface AzureStorageOptions {
  account: string; // Azure storage account name
  accountKey: string; // Azure storage account key
  container: string; // Container name
  prefix?: string; // Optional prefix for file keys
  fileName?: (file: any, req: Request) => string; // Custom file naming
  fileDist?: (file: any, req: Request) => string; // Custom directory structure
  transformUploadedFileObject?: (file: any) => any; // Transform uploaded file object
}
```

## 🎨 Advanced Usage

### Custom File Naming

```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: {
    rootPath: './uploads',
    baseUrl: 'http://localhost:3000/uploads',
    fileName: (file, req) => {
      // Custom file name with timestamp
      const timestamp = Date.now();
      const ext = file.originalname.split('.').pop();
      return `${timestamp}-${file.originalname}`;
    },
  },
})
```

### Custom Directory Structure

```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: {
    rootPath: './uploads',
    baseUrl: 'http://localhost:3000/uploads',
    fileDist: (file, req) => {
      // Organize by year/month/day
      const date = new Date();
      return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
    },
  },
})
```

### Transform Uploaded File Object

```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.S3,
  s3Config: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET,
    transformUploadedFileObject: (file) => {
      // Return only specific fields
      return {
        key: file.key,
        url: file.url,
        size: file.size,
        mimetype: file.mimetype,
      };
    },
  },
})
```

### Custom File Mapping in Interceptor

```typescript
@Post('upload')
@UseInterceptors(
  FileStorageInterceptor('file', {
    mapToRequestBody: (file, fieldName, req) => {
      // Return full file object instead of just key
      return file;
    },
  })
)
uploadFile(@Body() body: any) {
  // body.file now contains the full file object
  return {
    message: 'File uploaded',
    file: body.file,
  };
}
```

### Async Configuration

```typescript
// app.module.ts
NestFileStorageModule.forRootAsync({
  imports: [ConfigModule],
  useFactory: async (configService: ConfigService) => ({
    storage: FileStorageEnum.S3,
    s3Config: {
      accessKeyId: configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: configService.get('AWS_SECRET_ACCESS_KEY'),
      region: configService.get('AWS_REGION'),
      bucket: configService.get('AWS_BUCKET'),
    },
  }),
  inject: [ConfigService],
})
```

### Dynamic Storage Type

```typescript
// Override storage type per route
@Post('upload-to-s3')
@UseInterceptors(
  FileStorageInterceptor('file', {
    storageType: FileStorageEnum.S3,
  })
)
uploadToS3(@Body() body: any) {
  return { fileKey: body.file };
}
```

## 🔥 Complete Examples

### Image Upload with Validation

```typescript
import { Controller, Post, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('images')
export class ImageController {
  @Post('upload')
  @UseInterceptors(
    FileStorageInterceptor('image', {
      fileName: (file, req) => {
        // Validate image type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.mimetype)) {
          throw new BadRequestException('Only image files are allowed');
        }
        
        // Generate unique filename
        const timestamp = Date.now();
        const ext = file.originalname.split('.').pop();
        return `image-${timestamp}.${ext}`;
      },
      fileDist: (file, req) => {
        // Organize by year/month
        const date = new Date();
        return `images/${date.getFullYear()}/${date.getMonth() + 1}`;
      },
    })
  )
  async uploadImage(@Body() body: any) {
    return {
      message: 'Image uploaded successfully',
      imageKey: body.image,
    };
  }
}
```

### User Avatar Upload

```typescript
import { Controller, Post, UseInterceptors, Body } from '@nestjs/common';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('avatar')
  @UseInterceptors(
    FileStorageInterceptor('avatar', {
      fileName: (file, req) => {
        const userId = req.user.id; // Assuming user from auth guard
        const ext = file.originalname.split('.').pop();
        return `avatar-${userId}.${ext}`;
      },
      fileDist: () => 'avatars',
    })
  )
  async uploadAvatar(@Body() body: any, @Request() req) {
    // Delete old avatar if exists
    const user = await this.userService.findById(req.user.id);
    if (user.avatarKey) {
      const storage = await FileStorageService.getStorage();
      await storage.deleteFile(user.avatarKey);
    }

    // Update user with new avatar
    await this.userService.updateAvatar(req.user.id, body.avatar);

    return {
      message: 'Avatar updated successfully',
      avatarKey: body.avatar,
    };
  }
}
```

### Document Management

```typescript
import { Controller, Get, Post, Delete, Param, UseInterceptors, Body } from '@nestjs/common';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

@Controller('documents')
export class DocumentController {
  @Post('upload')
  @UseInterceptors(
    FileStorageInterceptor({
      type: 'array',
      fieldName: 'documents',
      maxCount: 10,
    }, {
      fileDist: () => 'documents',
      mapToRequestBody: (files, fieldName) => {
        // Return detailed file info
        return files;
      },
    })
  )
  async uploadDocuments(@Body() body: any) {
    return {
      message: `${body.documents.length} documents uploaded`,
      documents: body.documents,
    };
  }

  @Get(':key/download')
  async downloadDocument(@Param('key') key: string, @Res() res) {
    const storage = await FileStorageService.getStorage();
    const file = await storage.getFile(key);
    
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${key}"`);
    res.send(file);
  }

  @Delete(':key')
  async deleteDocument(@Param('key') key: string) {
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(key);
    
    return { message: 'Document deleted successfully' };
  }

  @Get(':key/url')
  async getDocumentUrl(@Param('key') key: string) {
    const storage = await FileStorageService.getStorage();
    const url = storage.getUrl(key);
    
    return { url };
  }
}
```

## 📚 API Reference

### FileStorageService

```typescript
class FileStorageService {
  // Get storage instance
  static async getStorage(storageType?: FileStorageEnum): Promise<Storage>
  
  // Get module options
  static getOptions(): FileStorageModuleOptions
  
  // Set module options
  static setOptions(options: FileStorageModuleOptions): void
}
```

### Storage Interface

```typescript
interface Storage {
  // Get file content as Buffer
  getFile(key: string): Promise<Buffer> | Buffer
  
  // Delete file
  deleteFile(key: string): Promise<void> | void
  
  // Upload file
  putFile(fileContent: Buffer, key: string): Promise<UploadedFile> | UploadedFile
  
  // Copy file
  copyFile(oldKey: string, newKey: string): Promise<UploadedFile>
  
  // Get file URL
  getUrl(key: string): Promise<string> | string
  
  // Get signed URL (S3 only)
  getSignedUrl?(key: string, options: any): Promise<string> | string
  
  // Get file path (Local only)
  path?(filePath: string): Promise<string> | string
}
```

### FileStorageInterceptor

```typescript
// Single file upload
FileStorageInterceptor(
  fieldName: string,
  options?: FileStorageInterceptorOptions
)

// Multiple files or fields
FileStorageInterceptor(
  config: {
    type: 'single' | 'array' | 'fields';
    fieldName?: string;
    maxCount?: number;
    fields?: { name: string; maxCount?: number }[];
  },
  options?: FileStorageInterceptorOptions
)
```

### UploadedFile Interface

```typescript
interface UploadedFile {
  fieldName?: string;      // Form field name
  fileName: string;        // Generated file name
  originalName: string;    // Original file name
  size: number;           // File size in bytes
  mimetype?: string;      // MIME type
  buffer?: Buffer;        // File buffer (optional)
  key: string;           // Storage key/path
  url: string;           // Public URL
  fullPath: string;      // Full storage path
  encoding?: string;     // File encoding
}
```

## 🧪 Testing

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NestFileStorageModule, FileStorageService, FileStorageEnum } from '@ackplus/nest-file-storage';

describe('FileService', () => {
  let service: FileService;
  let storage: Storage;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        NestFileStorageModule.forRoot({
          storage: FileStorageEnum.LOCAL,
          localConfig: {
            rootPath: './test-uploads',
            baseUrl: 'http://localhost:3000/test-uploads',
          },
        }),
      ],
      providers: [FileService],
    }).compile();

    service = module.get<FileService>(FileService);
    storage = await FileStorageService.getStorage();
  });

  it('should upload file', async () => {
    const buffer = Buffer.from('test content');
    const result = await storage.putFile(buffer, 'test/file.txt');
    
    expect(result.key).toBe('test/file.txt');
    expect(result.size).toBeGreaterThan(0);
  });

  it('should delete file', async () => {
    const buffer = Buffer.from('test content');
    await storage.putFile(buffer, 'test/file.txt');
    
    await storage.deleteFile('test/file.txt');
    
    await expect(storage.getFile('test/file.txt')).rejects.toThrow();
  });
});
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [NestJS](https://nestjs.com/)
- Uses [Multer](https://github.com/expressjs/multer) for file handling
- AWS S3 support via [@aws-sdk/client-s3](https://www.npmjs.com/package/@aws-sdk/client-s3)
- Azure support via [@azure/storage-blob](https://www.npmjs.com/package/@azure/storage-blob)

## 📮 Support

If you have any questions or need help:
- Open an issue on [GitHub](https://github.com/ack-solutions/nest-file-storage/issues)
- Check the [examples](./examples/) directory

---

Made with ❤️ for the NestJS community
