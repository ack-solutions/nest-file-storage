# ✅ Complete Setup Instructions

## Final Steps to Get Everything Running

### 1. Install Dependencies
```bash
# From the root directory
pnpm install
```

This will install all dependencies including the newly added `@types/express`.

### 2. Build the Package
```bash
# From root
pnpm build

# Or if the above doesn't work, build the package directly:
pnpm -C packages/nest-file-storage build
```

### 3. Run the Example App
```bash
# From root
pnpm -C apps/example-app start:dev

# Or navigate to the app directory:
cd apps/example-app
pnpm start:dev
```

### 4. Access the Application

Once running, you'll see:
```
🚀 Application is running on: http://localhost:3000
📚 Swagger documentation: http://localhost:3000/api
```

Visit: **http://localhost:3000/api** to test the API!

---

## 🎯 What's Been Fixed

### Package (`packages/nest-file-storage/`)
- ✅ Fixed TypeScript imports in `storage.factory.ts` (added `.js` extensions)
- ✅ Added `@types/express` to devDependencies
- ✅ Removed all unnecessary test/seeder packages
- ✅ Updated README with file storage documentation
- ✅ Created 10 comprehensive examples

### Example App (`apps/example-app/`)
- ✅ Removed all old seeder/factory/entity files
- ✅ Added Swagger integration
- ✅ Created complete file management API
- ✅ Added 10 REST endpoints for file operations
- ✅ Added comprehensive documentation

---

## 📚 Available Endpoints

Once running, these endpoints are available:

### Health Check
- `GET /` - Welcome message
- `GET /health` - Health check

### File Management
- `POST /files/upload` - Upload single file
- `POST /files/upload-multiple` - Upload multiple files (max 10)
- `POST /files/upload-image` - Upload image with validation (JPEG, PNG, GIF, WebP)
- `POST /files/upload-document` - Upload document
- `GET /files/download/:key` - Download a file
- `GET /files/url/:key` - Get public URL
- `GET /files/signed-url/:key` - Get signed URL (S3 only)
- `DELETE /files/:key` - Delete a file
- `POST /files/copy` - Copy a file

All endpoints are fully documented in Swagger!

---

## 🧪 Testing the API

### Method 1: Swagger UI (Easiest)
1. Open http://localhost:3000/api
2. Click any endpoint
3. Click "Try it out"
4. Upload a file or enter parameters
5. Click "Execute"
6. See the response!

### Method 2: cURL
```bash
# Upload a file
curl -X POST http://localhost:3000/files/upload \
  -F "file=@/path/to/file.jpg"

# Upload an image
curl -X POST http://localhost:3000/files/upload-image \
  -F "image=@/path/to/image.png"

# Get file URL
curl http://localhost:3000/files/url/images/image-123.png
```

---

## 📁 File Storage Location

Files are stored in `apps/example-app/uploads/`:
```
uploads/
├── images/          # From /files/upload-image
├── documents/       # From /files/upload-document
└── YYYY/MM/DD/     # From /files/upload (organized by date)
```

---

## ⚙️ Configuration

Default configuration (Local Storage):
```typescript
NestFileStorageModule.forRoot({
  storage: FileStorageEnum.LOCAL,
  localConfig: {
    rootPath: './uploads',
    baseUrl: 'http://localhost:3000/uploads',
  },
})
```

To use AWS S3 or Azure, see the examples in:
- `packages/nest-file-storage/examples/2-s3-storage.example.ts`
- `packages/nest-file-storage/examples/3-azure-storage.example.ts`

---

## 🐛 Troubleshooting

### Build Error: Cannot find module 'express'
**Solution:** Run `pnpm install` to install `@types/express`

### Module has no exported member
**Solution:** Build the package: `pnpm -C packages/nest-file-storage build`

### Port 3000 already in use
**Solution:** Kill the process or change port in `apps/example-app/src/main.ts`

### Cannot find module '@nestjs/swagger'
**Solution:** Run `pnpm install` from root

---

## 📖 Documentation

- **[Root README](./README.md)** - Project overview
- **[Package README](./packages/nest-file-storage/README.md)** - Complete API documentation
- **[Example App README](./apps/example-app/README.md)** - Example app details
- **[Examples Directory](./packages/nest-file-storage/examples/)** - 10 detailed examples
- **[Quick Start](./QUICK_START.md)** - Quick reference guide

---

## ✅ Checklist

- [ ] Run `pnpm install`
- [ ] Run `pnpm build`
- [ ] Run `pnpm -C apps/example-app start:dev`
- [ ] Open http://localhost:3000/api
- [ ] Test uploading a file
- [ ] Test downloading a file

---

## 🎉 You're All Set!

Everything is configured and ready to run. Just execute the commands above and start testing!

For questions or issues, check:
- Swagger documentation at http://localhost:3000/api
- Example files in `packages/nest-file-storage/examples/`
- GitHub issues: https://github.com/ack-solutions/nest-file-storage/issues

