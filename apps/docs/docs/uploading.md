---
id: uploading
title: Uploading in controllers
sidebar_position: 7
---

# Uploading in controllers

`FileStorageInterceptor(field, options?)` accepts `multipart/form-data`, stores the file(s), and writes the result into `request.body`.

## Upload modes

```ts
// Single file (field name 'file')
@UseInterceptors(FileStorageInterceptor('file'))
upload(@Body() body: { file: string }) {}

// Multiple files in one field
@UseInterceptors(FileStorageInterceptor({ type: 'array', fieldName: 'photos', maxCount: 5 }))
uploadMany(@Body() body: { photos: string[] }) {}

// Multiple named fields
@UseInterceptors(FileStorageInterceptor({
  type: 'fields',
  fields: [{ name: 'avatar', maxCount: 1 }, { name: 'docs', maxCount: 10 }],
}))
uploadFields(@Body() body: { avatar: string[]; docs: string[] }) {}
```

| Mode | Accepted field(s) | Default `body` value |
| --- | --- | --- |
| `'file'` (string) | `file` | `body.file: string` |
| `{ type: 'array' }` | repeated `photos` or `photos[0]`, `photos[1]`, … | `body.photos: string[]` |
| `{ type: 'fields' }` | each named field | `body[field]: string[]` |

:::note
In `fields` mode every field is mapped to an array, even with `maxCount: 1`. Your DTO should match — `string` for single, `string[]` for array/fields.
:::

## Control the stored key

```ts
import { extname } from 'path';

FileStorageInterceptor('avatar', {
  fileDist: (_file, req) => `users/${req.user.id}/avatars`, // folder (relative)
  fileName: (file) => `${Date.now()}${extname(file.originalname)}`, // last segment
  prefix: 'public', // optional static prefix
});
// -> public/users/42/avatars/1713876155123.png
```

The final key is `joinKey(prefix, fileDist, fileName)`. Defaults: `fileDist` = `YYYY/MM/DD`, `fileName` = `uuid-originalname`. Both callbacks can be async.

## Choose the driver per route

```ts
FileStorageInterceptor('file', { driver: 's3' });                   // by name
FileStorageInterceptor('file', { driver: (req) => req.user.plan }); // dynamically
FileStorageInterceptor('file', { tenant: false });                  // opt out of tenant routing
```

Precedence: an explicit `driver` wins, then [tenant resolution](./multi-tenant), then the module `default`.

## Map the result into the body

By default the interceptor writes the storage **key**. Customize with `mapToRequestBody`:

```ts
FileStorageInterceptor('document', {
  mapToRequestBody: (file) => ({ key: file.key, url: file.url, size: file.size }),
});
// body.document === { key, url, size }
```

Set `overwriteBodyField: false` to keep an existing body value (e.g. a JSON field with the same name on a PATCH).

## Post-upload hook

Run cross-field checks or side effects after files are stored and before your handler:

```ts
FileStorageInterceptor({ type: 'fields', fields: [{ name: 'images', maxCount: 10 }] }, {
  afterUpload: (req) => {
    const files = req.files as Record<string, Express.Multer.File[]>;
    if ((files?.images?.length ?? 0) < 2) {
      throw new BadRequestException('At least 2 images are required.');
    }
  },
});
```
