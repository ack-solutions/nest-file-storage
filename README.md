# @ackplus/nest-file-storage

<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">A flexible and feature-rich file storage solution for NestJS applications</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@ackplus/nest-file-storage"><img src="https://img.shields.io/npm/v/@ackplus/nest-file-storage.svg" alt="NPM Version" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-file-storage"><img src="https://img.shields.io/npm/l/@ackplus/nest-file-storage.svg" alt="Package License" /></a>
  <a href="https://www.npmjs.com/package/@ackplus/nest-file-storage"><img src="https://img.shields.io/npm/dm/@ackplus/nest-file-storage.svg" alt="NPM Downloads" /></a>
</p>

## 📦 About

`@ackplus/nest-file-storage` is a comprehensive file storage solution for NestJS applications that supports multiple storage providers including Local Storage, AWS S3, and Azure Blob Storage. Upload, download, delete, and manage files with ease.

### Key Features

- 📦 **Multiple Storage Providers** - Local, AWS S3, and Azure Blob Storage
- 🔄 **Easy Switching** - Switch between providers with minimal configuration
- 🎯 **NestJS Integration** - Seamless integration with decorators and interceptors
- 📁 **File Operations** - Upload, download, delete, copy files
- 🔐 **Signed URLs** - Generate presigned URLs for secure access (S3)
- 🎨 **Customizable** - Custom file naming and directory structure
- ✅ **Type-Safe** - Full TypeScript support

## 📦 Installation

```bash
npm install @ackplus/nest-file-storage
```

**For AWS S3:**
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**For Azure Blob Storage:**
```bash
npm install @azure/storage-blob
```

## 🚀 Quick Example

**1. Configure Module:**

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

**2. Upload Files in Controller:**

```typescript
// upload.controller.ts
import { Controller, Post, UseInterceptors, Body } from '@nestjs/common';
import { FileStorageInterceptor } from '@ackplus/nest-file-storage';

@Controller('upload')
export class UploadController {
  @Post('single')
  @UseInterceptors(FileStorageInterceptor('file'))
  uploadSingle(@Body() body: any) {
    return {
      message: 'File uploaded successfully',
      fileKey: body.file, // File key automatically added
    };
  }
}
```

**3. Manage Files with Service:**

```typescript
// file.service.ts
import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@ackplus/nest-file-storage';

@Injectable()
export class FileService {
  async getFile(key: string): Promise<Buffer> {
    const storage = await FileStorageService.getStorage();
    return await storage.getFile(key);
  }

  async deleteFile(key: string): Promise<void> {
    const storage = await FileStorageService.getStorage();
    await storage.deleteFile(key);
  }
}
```

**Done! 🎉**

## 📚 Documentation

### Package Documentation

- **[📖 Complete Documentation](./packages/nest-file-storage/README.md)** - Full guide with all features
- **[📁 Examples](./packages/nest-file-storage/examples/)** - 10 detailed examples covering all use cases

### Example Application

See a complete working example:
- **[Example App](./apps/example-app/)** - Working implementation with file upload/download

## 🛠️ Local Development

This section is for contributors working on the package itself.

### Setup

```bash
# Clone repository
git clone https://github.com/ack-solutions/nest-file-storage.git
cd nest-file-storage

# Install dependencies
pnpm install

# Build package
pnpm -C packages/nest-file-storage build
```

### Project Structure

```
nest-file-storage/
├── packages/
│   └── nest-file-storage/          # 📦 Main package
│       ├── src/                    # Source code
│       │   ├── lib/
│       │   │   ├── storage/        # Storage implementations
│       │   │   ├── interceptor/    # File upload interceptor
│       │   │   ├── file-storage.service.ts
│       │   │   ├── nest-file-storage.module.ts
│       │   │   └── types.ts
│       │   └── index.ts
│       ├── dist/                   # Compiled output
│       ├── examples/               # 10 example files
│       └── README.md               # Package documentation
├── apps/
│   └── example-app/                # 🧪 Example application
│       └── src/                    # Working example
├── scripts/
│   └── publish.js                  # Publishing script
└── package.json                    # Root workspace
```

### Development Workflow

```bash
# Build package
pnpm -C packages/nest-file-storage build

# Run example app (if implemented)
cd apps/example-app
pnpm start:dev

# Make changes and test
pnpm -C packages/nest-file-storage build
```

### Watch Mode (Multi-Terminal)

For active development, run these in separate terminals:

```bash
# Terminal 1: Build watch
pnpm -C packages/nest-file-storage build --watch

# Terminal 2: App development
pnpm -C apps/example-app start:dev
```

### Publishing

```bash
# Interactive version bump and publish
npm run publish

# The script will:
# 1. Ask for version type (patch/minor/major)
# 2. Build package
# 3. Update version
# 4. Publish to npm
```

## 🧪 Testing

```bash
# Package tests
pnpm -C packages/nest-file-storage test

# Example app tests
pnpm -C apps/example-app test
```

## 🎯 Use Cases

- **User Avatars** - Upload and manage user profile pictures
- **Document Management** - Handle document uploads and downloads
- **Image Gallery** - Store and serve images
- **File Sharing** - Build file sharing features
- **Media Storage** - Store videos, audio, and other media
- **Backup Systems** - Store backups across different providers

## 🤝 Contributing

Contributions are welcome!

**Quick steps:**
1. Fork the repo
2. Create a branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Build and test (`pnpm -C packages/nest-file-storage build`)
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](./packages/nest-file-storage/LICENSE)

## 🔗 Links

- **[NPM Package](https://www.npmjs.com/package/@ackplus/nest-file-storage)**
- **[GitHub Repository](https://github.com/ack-solutions/nest-file-storage)**
- **[Full Documentation](./packages/nest-file-storage/README.md)**
- **[Issue Tracker](https://github.com/ack-solutions/nest-file-storage/issues)**

## 🌟 Features by Storage Provider

### Local Storage
- ✅ File upload/download
- ✅ File deletion
- ✅ File copying
- ✅ Get file path
- ✅ Get public URL

### AWS S3
- ✅ File upload/download
- ✅ File deletion
- ✅ File copying
- ✅ Get public URL
- ✅ Generate signed URLs
- ✅ CloudFront integration

### Azure Blob Storage
- ✅ File upload/download
- ✅ File deletion
- ✅ File copying
- ✅ Get public URL
- ✅ Container management

---

Made with ❤️ for the NestJS community
