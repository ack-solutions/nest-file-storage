---
id: validation
title: Validation & limits
sidebar_position: 8
---

# Validation & limits

Declare limits as **data** — at the module level (applies to every route) and/or per route (merged over the module default). Rejections throw typed `400`s before your handler runs.

```ts
// module-wide default
NestFileStorageModule.forRoot({
  default: 'local',
  drivers: { /* ... */ },
  validation: { maxSize: 10 * 1024 * 1024 }, // 10 MB everywhere
});
```

```ts
// per route (merged over the module default)
FileStorageInterceptor('image', {
  validation: {
    maxSize: 5 * 1024 * 1024,                                 // bytes
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/*'], // wildcards supported
    allowedExtensions: ['.jpg', '.png'],                      // case-insensitive
    maxFiles: 10,                                             // total files per request
    fileFilter: (req, file, cb) => cb(null, true),           // escape hatch (runs last)
  },
});
```

## What each rule does

| Rule | Becomes | Throws on violation |
| --- | --- | --- |
| `maxSize` | Multer `limits.fileSize` | `FileTooLargeException` |
| `maxFiles` | Multer `limits.files` | `TooManyFilesException` |
| `allowedMimeTypes` / `allowedExtensions` | a generated `fileFilter` | `InvalidFileTypeException` |

All three exceptions extend `BadRequestException`, so they surface as standard `400` responses with a clear message:

```json
{ "message": "File type \"text/plain\" is not allowed. Allowed: image/jpeg, image/png.", "error": "Bad Request", "statusCode": 400 }
```

```json
{ "message": "File exceeds the maximum allowed size of 5 MB.", "error": "Bad Request", "statusCode": 400 }
```

## MIME wildcards & extensions

- `allowedMimeTypes` matches exact (`image/png`) or wildcard (`image/*`, `*/*`).
- `allowedExtensions` is case-insensitive and accepts entries with or without a leading dot (`png` or `.png`).

## Cross-field rules

For rules that depend on multiple files/fields together, use [`afterUpload`](./uploading#post-upload-hook) — e.g. "at least 2 images", "a cover is required when gallery is present".

:::tip Don't validate inside `fileName`
In v1 it was common to throw from `fileName()`. Use declarative `validation` instead — it runs at the right time (size is enforced during streaming) and returns typed errors.
:::
