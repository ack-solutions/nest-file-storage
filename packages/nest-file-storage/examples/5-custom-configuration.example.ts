/**
 * Example 5: Custom Key Generation
 *
 * Set default fileName/fileDist on the driver so every upload is organized the same way.
 * Per-route overrides (on the interceptor) still take precedence.
 */

import { Module } from '@nestjs/common';
import { NestFileStorageModule, localDriver } from '@ackplus/nest-file-storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      default: 'local',
      drivers: {
        local: localDriver({
          rootPath: './uploads',
          baseUrl: 'http://localhost:3000/uploads',

          // Default filename: uuid-originalname.ext
          fileName: (file) => {
            const ext = path.extname(file.originalname);
            const name = path.basename(file.originalname, ext);
            return `${uuidv4()}-${name}${ext}`;
          },

          // Default directory (relative): <type>/year/month/day
          fileDist: (file) => {
            const d = new Date();
            const type = file.mimetype?.startsWith('image/') ? 'images' : 'documents';
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return path.posix.join(type, String(d.getFullYear()), mm, dd);
          },
        }),
      },
    }),
  ],
})
export class AppModule {}

/**
 * Resulting keys:
 *   images/2026/06/12/<uuid>-photo.jpg
 *   documents/2026/06/12/<uuid>-report.pdf
 *
 * Note (v2): the v1 `transformUploadedFileObject` hook is removed. To reshape what lands in
 * the controller body, use the interceptor's `mapToRequestBody`:
 *
 *   FileStorageInterceptor('file', {
 *     mapToRequestBody: (file) => ({ key: file.key, url: file.url, size: file.size }),
 *   })
 */
