# 🚀 Quick Start Guide

## Setup and Run the Example App

### 1. Install Dependencies

From the **root directory**:

```bash
pnpm install
```

This will install dependencies for both the package and the example app.

### 2. Build the Package

```bash
cd packages/nest-file-storage
pnpm build
```

Or from the root:

```bash
pnpm -C packages/nest-file-storage build
```

### 3. Run the Example App

```bash
cd apps/example-app
pnpm start:dev
```

Or from the root:

```bash
pnpm -C apps/example-app start:dev
```

### 4. Access the Application

- **Application**: http://localhost:3000
- **Swagger API Docs**: http://localhost:3000/api
- **Health Check**: http://localhost:3000/health

## 🧪 Testing the API

### Using Swagger UI (Recommended)

1. Open http://localhost:3000/api in your browser
2. Click on any endpoint (e.g., `POST /files/upload`)
3. Click **"Try it out"**
4. Select a file to upload
5. Click **"Execute"**
6. View the response with file details

### Using cURL

**Upload a file:**
```bash
curl -X POST http://localhost:3000/files/upload \
  -F "file=@/path/to/your/file.jpg" \
  | jq
```

**Upload an image:**
```bash
curl -X POST http://localhost:3000/files/upload-image \
  -F "image=@/path/to/image.png" \
  | jq
```

**Download a file:**
```bash
curl -X GET "http://localhost:3000/files/download/images/image-1733568123456.png" \
  --output downloaded.png
```

**Get file URL:**
```bash
curl -X GET "http://localhost:3000/files/url/images/image-1733568123456.png" \
  | jq
```

**Delete a file:**
```bash
curl -X DELETE "http://localhost:3000/files/images/image-1733568123456.png" \
  | jq
```

## 📁 Where Files are Stored

By default, uploaded files are stored in:

```
apps/example-app/uploads/
├── images/           # Images uploaded via /files/upload-image
├── documents/        # Documents uploaded via /files/upload-document
└── [YYYY]/[MM]/[DD]/ # Files from other endpoints organized by date
```

## ⚙️ Configuration

The example app is configured in `apps/example-app/src/app.module.ts`:

```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: {
    rootPath: './uploads',
    baseUrl: 'http://localhost:3000/uploads',
  },
})
```

### Change Storage Provider

**For AWS S3:**

1. Install AWS SDK:
```bash
cd apps/example-app
pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

2. Update `app.module.ts`:
```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.S3,
  s3Config: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_BUCKET,
  },
})
```

3. Add environment variables to `.env`:
```env
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_REGION=us-east-1
AWS_BUCKET=your-bucket-name
```

**For Azure Blob Storage:**

1. Install Azure SDK:
```bash
cd apps/example-app
pnpm add @azure/storage-blob
```

2. Update `app.module.ts`:
```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.AZURE,
  azureConfig: {
    account: process.env.AZURE_STORAGE_ACCOUNT,
    accountKey: process.env.AZURE_STORAGE_KEY,
    container: process.env.AZURE_CONTAINER || 'uploads',
  },
})
```

## 🐛 Troubleshooting

### Error: Cannot find module '@nestjs/swagger'

**Solution:** Run `pnpm install` from the example-app directory or from root:
```bash
pnpm install
```

### Error: Module '"@ackplus/nest-file-storage"' has no exported member

**Solution:** Build the package first:
```bash
pnpm -C packages/nest-file-storage build
```

### Port 3000 already in use

**Solution:** Change the port in `apps/example-app/src/main.ts`:
```typescript
const port = process.env.PORT ?? 3001;
```

### Uploads directory permission denied

**Solution:** Create the directory manually:
```bash
cd apps/example-app
mkdir -p uploads
chmod 755 uploads
```

## 📚 Next Steps

- **[Complete Documentation](../../packages/nest-file-storage/README.md)** - Full API reference
- **[Examples](../../packages/nest-file-storage/examples/)** - 10 detailed examples
- **[Example App README](../../apps/example-app/README.md)** - More details about the example app

## ✅ Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] Package built (`pnpm -C packages/nest-file-storage build`)
- [ ] Example app running (`pnpm -C apps/example-app start:dev`)
- [ ] Swagger UI accessible (http://localhost:3000/api)
- [ ] Successfully uploaded a file
- [ ] Successfully downloaded a file

## 🎉 You're Ready!

Your file storage API is now running! Visit http://localhost:3000/api to explore all available endpoints.

