import { ModuleMetadata, Type } from '@nestjs/common';
import type { Request } from 'express';

import type { DriverFactory, DriverOptions, StorageDriver } from './drivers/driver.interface';
import type { TenantOptions } from './tenant/tenant.types';
import type { UploadValidation } from './validation';

/** @deprecated Renamed to {@link StorageDriver}. */
export type Storage = StorageDriver;

// Re-export the canonical contracts so `import { ... } from '@ackplus/nest-file-storage'` keeps working.
export type {
    StorageDriver,
    DriverFactory,
    DriverOptions,
    KeyOptions,
    FileKeyResolver,
    PutFileMeta,
    SignedUrlOptions,
    UploadedFile,
} from './drivers/driver.interface';
export type { TenantOptions, TenantDriverSpec, TenantCacheOptions, MaybePromise } from './tenant/tenant.types';

// ---------------------------------------------------------------------------
// Built-in driver option types (consumed by localDriver/s3Driver/azureDriver)
// ---------------------------------------------------------------------------

/** Options for the built-in local-filesystem driver. */
export interface LocalDriverOptions extends DriverOptions {
    /** Directory files are written under. */
    rootPath: string;
    /** URL prefix used by `getUrl()`. Does not serve files by itself — add static serving. */
    baseUrl: string;
}

/** Options for the built-in AWS S3 (and S3-compatible) driver. */
export interface S3DriverOptions extends DriverOptions {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    /** Custom S3-compatible endpoint (MinIO, R2, Spaces, …). */
    endpoint?: string;
    /** CDN/public URL prefix used by `getUrl()` (e.g. a CloudFront domain). */
    cloudFrontUrl?: string;
    /** Extra options forwarded verbatim to the AWS S3 client constructor. */
    clientOptions?: Record<string, unknown>;
}

/** Options for the built-in Azure Blob Storage driver. */
export interface AzureDriverOptions extends DriverOptions {
    account: string;
    accountKey: string;
    container: string;
    /** CDN/public URL prefix used by `getSignedUrl()` (replaces the v1 `AZURE_CDN_DOMAIN_NAME` env var). */
    cdnUrl?: string;
}

// ---------------------------------------------------------------------------
// v2 module options
// ---------------------------------------------------------------------------

/**
 * Options for `NestFileStorageModule.forRoot()`. Register one or more named drivers and pick a
 * default; optionally add module-wide validation and multi-tenant resolution.
 */
export interface FileStorageModuleOptions {
    /** Name of the driver used when a route/call doesn't name one. Must be a key in `drivers`. */
    default: string;
    /**
     * Named storage drivers. Use the built-in helpers (`localDriver`/`s3Driver`/`azureDriver`)
     * or register a custom one with `defineDriver(MyDriverClass, opts)`.
     */
    drivers: Record<string, DriverFactory>;
    /** Default upload validation applied to every route (overridable per route). */
    validation?: UploadValidation;
    /** Optional multi-tenant / dynamic per-request storage resolution. */
    tenant?: TenantOptions;
}

/** Factory that produces module options, for `forRootAsync({ useClass | useExisting })`. */
export interface FileStorageOptionsFactory {
    /** May return the v2 options, or a v1 config (translated by the compat shim, same as `forRoot()`). */
    createFileStorageOptions(): Promise<FileStorageModuleOptionsInput> | FileStorageModuleOptionsInput;
}

/** Async configuration for `NestFileStorageModule.forRootAsync()`. */
export interface FileStorageAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /** Reuse an existing provider that implements {@link FileStorageOptionsFactory}. */
    useExisting?: Type<FileStorageOptionsFactory>;
    /** Instantiate a class that implements {@link FileStorageOptionsFactory}. */
    useClass?: Type<FileStorageOptionsFactory>;
    /**
     * Build options from injected dependencies (the common case for DB/config-driven setups).
     * May return the v2 options, or a v1 config (translated by the compat shim, same as `forRoot()`).
     */
    useFactory?: (...args: any[]) => Promise<FileStorageModuleOptionsInput> | FileStorageModuleOptionsInput;
    /** Providers to inject into `useFactory`. */
    inject?: any[];
}

/**
 * Accepted by `forRoot()`, `forRootAsync({ useFactory })`, and `FileStorageOptionsFactory`:
 * the v2 options, or a v1 config (translated by the compat shim).
 */
export type FileStorageModuleOptionsInput = FileStorageModuleOptions | V1FileStorageModuleOptions;

// ===========================================================================
// Deprecated v1 surface — kept so existing imports/configs keep type-checking
// and booting. Translated to v2 at runtime by the module's compat shim.
// Removed in v3.
// ===========================================================================

/** @deprecated Use named drivers in `FileStorageModuleOptions.drivers`. */
export enum FileStorageEnum {
    LOCAL = 'local',
    S3 = 's3',
    AZURE = 'azure',
}

/** @deprecated v1 common file options. Use {@link DriverOptions} (note: `transformUploadedFileObject` removed). */
export interface FileStorageOptions {
    prefix?: string;
    fileName?: (file: any, req: Request) => string;
    fileDist?: (file: any, req: Request) => string;
    /** @deprecated Shape upload results with the interceptor's `mapToRequestBody` instead. */
    transformUploadedFileObject?: (file: any) => any;
}

/** @deprecated Use {@link S3DriverOptions}. */
export interface S3StorageOptions extends FileStorageOptions {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
    cloudFrontUrl?: string;
}

/** @deprecated Use {@link LocalDriverOptions}. */
export interface LocalStorageOptions extends FileStorageOptions {
    rootPath: string;
    baseUrl: string;
}

/** @deprecated Use {@link AzureDriverOptions}. */
export interface AzureStorageOptions extends FileStorageOptions {
    account: string;
    accountKey: string;
    container: string;
}

/** @deprecated */
export type StorageOptions = S3StorageOptions | AzureStorageOptions | LocalStorageOptions;

/** @deprecated v1 discriminated-union config. Translated to v2 `{ default, drivers }` by the compat shim. */
export type V1FileStorageModuleOptions =
    | { storage: FileStorageEnum.LOCAL; localConfig: LocalStorageOptions }
    | { storage: FileStorageEnum.S3; s3Config: S3StorageOptions }
    | { storage: FileStorageEnum.AZURE; azureConfig: AzureStorageOptions };

/** @deprecated Old name for {@link V1FileStorageModuleOptions}. */
export type FileStorageConfigOptions = V1FileStorageModuleOptions;

/**
 * @deprecated The v1 `storageFactory` approach is removed in v2 — it never worked with the
 * interceptor. Register custom storage with `drivers: { name: defineDriver(MyDriverClass, opts) }`.
 */
export interface FileStorageClassOptions {
    storageFactory: () => Promise<new (...args: any[]) => unknown> | (new (...args: any[]) => unknown);
    options?: any;
}
