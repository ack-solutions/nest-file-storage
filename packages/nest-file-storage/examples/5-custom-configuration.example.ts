/**
 * Example 5: Custom Configuration
 * 
 * This example shows advanced configuration options including custom file naming,
 * directory structure, and file transformations.
 */

import { Module } from '@nestjs/common';
import { NestFileStorageModule, FileStorageEnum } from '@ackplus/nest-file-storage';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

@Module({
  imports: [
    NestFileStorageModule.forRoot({
      storage: FileStorageEnum.LOCAL,
      localConfig: {
        rootPath: './uploads',
        baseUrl: 'http://localhost:3000/uploads',
        
        // Custom file naming function
        fileName: (file, req) => {
          // Generate unique filename: uuid-originalname.ext
          const uuid = uuidv4();
          const ext = path.extname(file.originalname);
          const name = path.basename(file.originalname, ext);
          return `${uuid}-${name}${ext}`;
        },
        
        // Custom directory structure: year/month/day
        fileDist: (file, req) => {
          const date = new Date();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          // Optional: organize by file type
          const isImage = file.mimetype?.startsWith('image/');
          const type = isImage ? 'images' : 'documents';
          
          return path.join(type, String(year), month, day);
        },
        
        // Transform uploaded file object (return only necessary fields)
        transformUploadedFileObject: (file) => {
          return {
            key: file.key,
            url: file.url,
            size: file.size,
            mimetype: file.mimetype,
            originalName: file.originalName,
          };
        },
      },
    }),
  ],
})
export class AppModule {}

/**
 * Result directory structure:
 * uploads/
 *   ├── images/
 *   │   └── 2024/
 *   │       └── 01/
 *   │           └── 15/
 *   │               ├── uuid1-photo1.jpg
 *   │               └── uuid2-photo2.png
 *   └── documents/
 *       └── 2024/
 *           └── 01/
 *               └── 15/
 *                   └── uuid3-document.pdf
 */

