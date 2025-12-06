# Examples

This directory contains comprehensive examples demonstrating various features and use cases of `@ackplus/nest-file-storage`.

## 📚 Available Examples

### Getting Started

1. **[Basic Local Storage](./1-basic-local-storage.example.ts)**
   - Setting up local file storage
   - Basic configuration
   - Perfect for development

2. **[AWS S3 Storage](./2-s3-storage.example.ts)**
   - Configure AWS S3
   - Async configuration with ConfigService
   - Environment variables setup

3. **[Azure Blob Storage](./3-azure-storage.example.ts)**
   - Configure Azure Blob Storage
   - Connection string setup
   - Container management

### Core Features

4. **[File Upload Controller](./4-upload-controller.example.ts)**
   - Single file upload
   - Multiple files upload
   - Multiple fields upload
   - File validation
   - Custom file mapping

5. **[Custom Configuration](./5-custom-configuration.example.ts)**
   - Custom file naming
   - Custom directory structure
   - File transformations
   - Organized file storage

6. **[File Service](./6-file-service.example.ts)**
   - File operations (get, delete, copy)
   - Upload from local filesystem
   - Get public URLs
   - Generate signed URLs (S3)
   - Batch operations

### Real-World Use Cases

7. **[User Avatar Upload](./7-user-avatar.example.ts)**
   - Complete avatar upload feature
   - File validation
   - Old file cleanup
   - Database integration

8. **[Document Management System](./8-document-management.example.ts)**
   - Upload/download documents
   - Document listing
   - File copying
   - Signed URLs for secure access

9. **[Dynamic Storage Selection](./9-dynamic-storage.example.ts)**
   - Switch storage per request
   - Storage selection by file size
   - Storage selection by file type
   - Storage selection by user plan

10. **[Testing](./10-testing.example.ts)**
    - E2E testing examples
    - Unit testing
    - Mock storage implementation
    - Test setup and cleanup

## 🚀 How to Use These Examples

### 1. Copy Example Code

Simply copy the relevant example code to your project:

```bash
# Copy specific example
cp examples/1-basic-local-storage.example.ts src/config/storage.config.ts
```

### 2. Modify for Your Needs

Each example is well-documented with comments explaining:
- What the code does
- Configuration options
- Environment variables needed
- Expected behavior

### 3. Run Your Application

```bash
npm run start:dev
```

## 💡 Tips

- **Start Simple**: Begin with Example 1 (Local Storage) for development
- **Environment Variables**: Use Example 2 or 3 for production with proper secrets management
- **Validation**: See Example 4 for file type and size validation
- **Custom Logic**: Examples 5-9 show advanced customization options
- **Testing**: Example 10 provides complete testing setup

## 📖 More Resources

- **[Main Documentation](../README.md)** - Complete feature guide
- **[GitHub Issues](https://github.com/ack-solutions/nest-file-storage/issues)** - Report issues or request features
- **[NPM Package](https://www.npmjs.com/package/@ackplus/nest-file-storage)** - Published package

## 🤝 Contributing

Found a bug in an example? Want to add a new example? PRs are welcome!

1. Add your example file: `[number]-[name].example.ts`
2. Add it to this README
3. Submit a PR

---

**Need help?** Open an issue on [GitHub](https://github.com/ack-solutions/nest-file-storage/issues)

