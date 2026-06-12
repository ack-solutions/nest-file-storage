import { Module } from '@nestjs/common';
import { NestFileStorageModule, localDriver, tenantFrom } from '@ackplus/nest-file-storage';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { FileController } from './file.controller';
import { TenantFileController } from './tenant-file.controller';

@Module({
  imports: [
    // v2 configuration: named drivers + a default, module-wide validation, and a multi-tenant demo.
    NestFileStorageModule.forRoot({
      default: 'local',
      drivers: {
        local: localDriver({
          rootPath: join(process.cwd(), 'uploads'),
          baseUrl: 'http://localhost:3000/uploads',
        }),
        // Add s3 / azure / custom drivers here and select them per route with `driver: 'name'`.
      },

      // Default validation for every upload route (each route can override).
      validation: {
        maxSize: 10 * 1024 * 1024, // 10 MB
      },

      // Multi-tenant demo: resolve the tenant from `x-tenant-id` (or `?tenant=`), then route storage.
      // "globex" gets a DEDICATED folder/driver; every other tenant SHARES `local` with a key prefix.
      tenant: {
        resolve: tenantFrom.first(tenantFrom.header('x-tenant-id'), tenantFrom.query('tenant')),
        driver: (tenantId) => {
          if (tenantId === 'globex') {
            console.log(`[tenant] building dedicated driver for "${tenantId}" (runs once, then cached)`);
            return {
              factory: localDriver({
                rootPath: join(process.cwd(), 'uploads-globex'),
                baseUrl: 'http://localhost:3000/uploads-globex',
              }),
            };
          }
          console.log(`[tenant] resolving shared driver + prefix for "${tenantId}" (runs once, then cached)`);
          return { use: 'local', prefix: `tenants/${tenantId}` };
        },
        fallback: 'default',
      },
    }),
  ],
  controllers: [AppController, FileController, TenantFileController],
  providers: [AppService],
})
export class AppModule {}
