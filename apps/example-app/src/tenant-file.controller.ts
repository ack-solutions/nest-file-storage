import { Body, Controller, Get, Headers, Param, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiHeader, ApiResponse } from '@nestjs/swagger';
import { FileStorageInterceptor, FileStorageService } from '@ackplus/nest-file-storage';

/**
 * Multi-tenant demo. The module's `tenant` config (in app.module.ts) resolves the tenant from the
 * `x-tenant-id` header (or `?tenant=`) and routes storage automatically — the upload route below is
 * a plain `FileStorageInterceptor('file')` with no tenant-specific code.
 *
 * Try it:
 *   - `x-tenant-id: acme`   -> shared `local` driver, keys under `tenants/acme/...`
 *   - `x-tenant-id: globex` -> dedicated driver, files under `./uploads-globex`
 *   - no header             -> falls back to the default driver
 */
@ApiTags('tenant-files')
@Controller('tenant/files')
export class TenantFileController {
  constructor(private readonly fileStorage: FileStorageService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file for the current tenant (set x-tenant-id header)' })
  @ApiHeader({ name: 'x-tenant-id', required: false, description: "e.g. 'acme' (shared) or 'globex' (dedicated)" })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'File uploaded to the tenant storage' })
  @UseInterceptors(FileStorageInterceptor('file', { mapToRequestBody: (file) => file }))
  upload(@Body() body: any, @Headers('x-tenant-id') tenantId?: string) {
    return {
      message: 'File uploaded for tenant',
      tenant: tenantId ?? '(default)',
      file: body.file,
    };
  }

  @Get('url/*path')
  @ApiOperation({ summary: "Get a tenant file's URL via programmatic tenant access (cached driver)" })
  @ApiHeader({ name: 'x-tenant-id', required: false })
  async url(@Param('path') path: string | string[], @Headers('x-tenant-id') tenantId?: string) {
    const key = Array.isArray(path) ? path.join('/') : path;
    const driver = tenantId
      ? (await this.fileStorage.getTenantDriver(tenantId)).driver
      : await this.fileStorage.getDriver();
    return { tenant: tenantId ?? '(default)', key, url: await driver.getUrl(key) };
  }
}
