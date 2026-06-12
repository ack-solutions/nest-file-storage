/**
 * Example 12: Multi-Tenant Storage
 *
 * Route each upload to the right tenant's storage. "globex" gets a dedicated bucket; every other
 * tenant shares one driver with a per-tenant key prefix. The tenant's driver is cached, so the DB
 * lookup + client construction happen once per tenant — not per request.
 */

import { Controller, Post, Body, UseInterceptors, Injectable, Module } from '@nestjs/common';
import {
  NestFileStorageModule,
  FileStorageInterceptor,
  FileStorageService,
  localDriver,
  s3Driver,
  tenantFrom,
} from '@ackplus/nest-file-storage';

// Your per-tenant storage config source (e.g. a database table).
@Injectable()
export class TenantStorageService {
  async find(tenantId: string): Promise<{ dedicated: boolean; bucket?: string; region?: string; key?: string; secret?: string } | null> {
    void tenantId;
    return null; // look up the tenant's storage config
  }
}

@Module({
  providers: [TenantStorageService],
  imports: [
    NestFileStorageModule.forRootAsync({
      inject: [TenantStorageService],
      useFactory: (tenants: TenantStorageService) => ({
        default: 'local',
        drivers: {
          local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
        },
        tenant: {
          // 1) Identify the tenant — try JWT, then subdomain, then a header.
          resolve: tenantFrom.first(
            tenantFrom.jwt('tenantId'),
            tenantFrom.subdomain(),
            tenantFrom.header('x-tenant-id'),
          ),
          // 2) Resolve a tenant -> storage. Cached by tenant id.
          driver: async (tenantId) => {
            const cfg = await tenants.find(tenantId);
            if (cfg?.dedicated) {
              return {
                factory: s3Driver({
                  bucket: cfg.bucket!, region: cfg.region!,
                  accessKeyId: cfg.key!, secretAccessKey: cfg.secret!,
                }),
              };
            }
            return { use: 'local', prefix: `tenants/${tenantId}` };
          },
          cache: { ttlMs: 10 * 60_000, max: 500 },
          fallback: 'default', // no tenant -> default driver ('error' -> 400)
        },
      }),
    }),
  ],
})
export class AppModule {}

@Controller('files')
export class TenantUploadController {
  constructor(private readonly fileStorage: FileStorageService) {}

  // No tenant-specific code — the interceptor routes to the tenant's storage automatically.
  @Post('upload')
  @UseInterceptors(FileStorageInterceptor('file', { mapToRequestBody: (file) => file }))
  upload(@Body() body: any) {
    return { message: 'Uploaded to the tenant storage', file: body.file };
  }
}

// Programmatic access outside a request (jobs, URL generation):
@Injectable()
export class TenantReportService {
  constructor(private readonly fileStorage: FileStorageService) {}

  async urlFor(tenantId: string, key: string) {
    const { driver } = await this.fileStorage.getTenantDriver(tenantId);
    return driver.getUrl(key);
  }

  // When a tenant changes its storage settings, drop the cached driver:
  invalidate(tenantId: string) {
    this.fileStorage.getRegistry().invalidateTenant(tenantId);
  }
}
