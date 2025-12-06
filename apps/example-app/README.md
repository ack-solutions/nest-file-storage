# File Storage Example App

A complete example application demonstrating the usage of `@ackplus/nest-file-storage` with Swagger API documentation.

## 🚀 Features

- ✅ File upload (single and multiple)
- ✅ Image upload with validation
- ✅ Document upload
- ✅ File download
- ✅ File deletion
- ✅ File copying
- ✅ Get file URLs
- ✅ Get signed URLs (for S3)
- ✅ Swagger API documentation
- ✅ Health check endpoint

## 📦 Installation

```bash
# From the example-app directory
pnpm install

# Or from the root directory
pnpm install
```

## 🏃 Running the App

```bash
# Development mode
pnpm start:dev

# Production mode
pnpm build
pnpm start:prod
```

The application will start on `http://localhost:3000`

## 📚 Swagger Documentation

Once the app is running, visit:

**http://localhost:3000/api**

The Swagger UI provides:
- Interactive API documentation
- Try-it-out feature for testing endpoints
- Request/response schemas
- Example values

## 🎯 Available Endpoints

### Health Check

- `GET /` - Welcome message
- `GET /health` - Health check

### File Operations

- `POST /files/upload` - Upload a single file
- `POST /files/upload-multiple` - Upload multiple files (max 10)
- `POST /files/upload-image` - Upload an image with validation
- `POST /files/upload-document` - Upload a document
- `GET /files/download/:key` - Download a file
- `GET /files/url/:key` - Get public URL for a file
- `GET /files/signed-url/:key` - Get signed URL (S3 only)
- `DELETE /files/:key` - Delete a file
- `POST /files/copy` - Copy a file

## 🧪 Testing the API

### Using Swagger UI

1. Open http://localhost:3000/api
2. Click on any endpoint
3. Click "Try it out"
4. Fill in the required parameters
5. Click "Execute"

### Using cURL

**Upload a file:**
```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@/path/to/your/file.jpg"
```

**Upload multiple files:**
```bash
curl -X POST http://localhost:3000/files/upload-multiple \
  -F "files=@/path/to/file1.jpg" \
  -F "files=@/path/to/file2.jpg"
```

**Upload an image:**
```bash
curl -X POST http://localhost:3000/files/upload-image \
  -F "image=@/path/to/image.jpg"
```

**Download a file:**
```bash
curl -X GET http://localhost:3000/files/download/images/image-123456.jpg \
  --output downloaded-file.jpg
```

**Get file URL:**
```bash
curl -X GET http://localhost:3000/files/url/images/image-123456.jpg
```

**Delete a file:**
```bash
curl -X DELETE http://localhost:3000/files/images/image-123456.jpg
```

**Copy a file:**
```bash
curl -X POST http://localhost:3000/files/copy \
  -H "Content-Type: application/json" \
  -d '{
    "sourceKey": "images/image-123456.jpg",
    "targetKey": "images/image-123456-copy.jpg"
  }'
```

### Using Postman

1. Import the API from Swagger: http://localhost:3000/api-json
2. Or manually create requests using the endpoints above

## ⚙️ Configuration

The app uses **Local Storage** by default. Files are stored in the `./uploads` directory.

### Changing Storage Provider

Edit `src/app.module.ts`:

**For AWS S3:**
```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.S3,
  s3Config: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET,
  },
})
```

**For Azure Blob Storage:**
```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.AZURE,
  azureConfig: {
    account: process.env.AZURE_STORAGE_ACCOUNT,
    accountKey: process.env.AZURE_STORAGE_KEY,
    container: process.env.AZURE_CONTAINER,
  },
})
```

## 📁 Project Structure

```
example-app/
├── src/
│   ├── app.controller.ts       # Health check endpoints
│   ├── app.service.ts          # Application service
│   ├── app.module.ts           # Main module with storage config
│   ├── file.controller.ts      # File upload/management endpoints
│   └── main.ts                 # App bootstrap with Swagger
├── uploads/                    # Local file storage (auto-created)
├── package.json
└── README.md
```

## 🔍 Key Features Demonstrated

### 1. Single File Upload
- Basic file upload
- Returns file key and URL

### 2. Multiple Files Upload
- Upload up to 10 files at once
- Returns array of file information

### 3. Image Upload with Validation
- File type validation (JPEG, PNG, GIF, WebP)
- File size validation (max 5MB)
- Custom file naming
- Organized in `images/` directory

### 4. Document Upload
- Custom file naming with timestamp
- Organized in `documents/` directory

### 5. File Download
- Stream file to client
- Proper content headers

### 6. File Management
- Get public URLs
- Get signed URLs (S3)
- Delete files
- Copy files

## 🧪 Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Test coverage
pnpm test:cov
```

## 🐛 Troubleshooting

### Port Already in Use

Change the port in `src/main.ts`:
```typescript
await app.listen(3001); // Use different port
```

### Upload Directory Not Created

The app automatically creates the `uploads` directory. If you have permission issues:
```bash
mkdir uploads
chmod 755 uploads
```

### Swagger Not Loading

Make sure `@nestjs/swagger` is installed:
```bash
pnpm add @nestjs/swagger
```

## 📖 Learn More

- **[Package Documentation](../../packages/nest-file-storage/README.md)** - Complete guide
- **[Examples](../../packages/nest-file-storage/examples/)** - More examples
- **[NestJS Documentation](https://docs.nestjs.com/)** - NestJS framework
- **[Swagger Documentation](https://swagger.io/docs/)** - API documentation

## 🤝 Contributing

This example app is part of the `@ackplus/nest-file-storage` project. Contributions are welcome!

## 📄 License

MIT
