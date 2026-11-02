import { Inject, Injectable } from '@nestjs/common';

import { FILE_STORAGE_REGISTRY } from './constants';
import type { DriverRegistry, ResolvedDriver } from './driver-registry';
import type {
    PutFileMeta,
    SignedUploadUrlOptions,
    SignedUrlOptions,
    StorageDriver,
    UploadedFile,
} from './drivers/driver.interface';
import { resolveKey } from './multer/driver-multer-engine';
import { FileStorageRegistryHolder } from './registry-holder';

/**
 * Injectable entry point for working with storage programmatically. Resolve a driver by name,
 * resolve a tenant's driver, or use the convenience methods that delegate to the default driver.
 *
 * @example
 * constructor(private readonly fileStorage: FileStorageService) {}
 * const driver = await this.fileStorage.getDriver();        // default
 * const { driver } = await this.fileStorage.getTenantDriver('acme');
 */
@Injectable()
export class FileStorageService {
    constructor(@Inject(FILE_STORAGE_REGISTRY) private readonly registry: DriverRegistry) {}

    /** The underlying registry (advanced: `registerDriver`, `invalidate`, `invalidateTenant`). */
    getRegistry(): DriverRegistry {
        return this.registry;
    }

    /** Resolve a driver by name (the default driver when omitted). */
    getDriver(name?: string): Promise<StorageDriver> {
        return this.registry.get(name);
    }

    /** Resolve a tenant's driver (+ key prefix), using the per-tenant cache. */
    getTenantDriver(tenantId: string): Promise<ResolvedDriver> {
        return this.registry.getTenantDriver(tenantId);
    }

    /**
     * Build a full key for a driver (the default when `driverName` is omitted) the way uploads do:
     * the driver's `prefix` first, then `key`. The direct methods below take full keys and use them
     * exactly as given, so pass new keys through this; keys stored from uploads are already full.
     *
     * @example
     * await this.fileStorage.putFile(buf, await this.fileStorage.resolveKey('reports/q3.pdf'));
     */
    async resolveKey(key: string, driverName?: string): Promise<string> {
        return resolveKey(await this.getDriver(driverName), key);
    }

    async putFile(content: Buffer, key: string, meta?: PutFileMeta): Promise<UploadedFile> {
        return (await this.getDriver()).putFile(content, key, meta);
    }

    async getFile(key: string): Promise<Buffer> {
        return (await this.getDriver()).getFile(key);
    }

    async deleteFile(key: string): Promise<void> {
        return (await this.getDriver()).deleteFile(key);
    }

    async copyFile(sourceKey: string, destKey: string): Promise<UploadedFile> {
        return (await this.getDriver()).copyFile(sourceKey, destKey);
    }

    async getUrl(key: string): Promise<string> {
        return (await this.getDriver()).getUrl(key);
    }

    async getSignedUrl(key: string, options?: SignedUrlOptions): Promise<string> {
        const driver = await this.getDriver();
        return driver.getSignedUrl ? driver.getSignedUrl(key, options) : driver.getUrl(key);
    }

    /**
     * Signed upload URL on the default driver (S3 presigned `PUT`, Azure SAS). Unlike
     * `getSignedUrl` there is no fallback: throws when the driver can't sign uploads (e.g. local).
     */
    async getSignedUploadUrl(key: string, options?: SignedUploadUrlOptions): Promise<string> {
        const driver = await this.getDriver();
        if (!driver.getSignedUploadUrl) {
            throw new Error('The default storage driver does not support signed upload URLs.');
        }
        return driver.getSignedUploadUrl(key, options);
    }

    /**
     * @deprecated Inject `FileStorageService` and use `getDriver()` / `getTenantDriver()`. Resolves
     * the active driver via the module-scoped registry holder. Kept for v1 compatibility; removed in v3.
     */
    static async getStorage(name?: string): Promise<StorageDriver> {
        return FileStorageRegistryHolder.get().get(name);
    }

    /** @deprecated v1 plumbing. Options now flow through DI; this is a no-op. Removed in v3. */
    static setOptions(_options: unknown): void {
        /* no-op */
    }

    /** @deprecated v1 plumbing. Options are no longer stored statically. Removed in v3. */
    static getOptions(): undefined {
        return undefined;
    }
}
