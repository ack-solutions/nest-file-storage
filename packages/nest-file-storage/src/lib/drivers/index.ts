import type { AzureDriverOptions, LocalDriverOptions, S3DriverOptions } from '../types';
import type { AzureDriverDeps } from './azure.driver';
import type { DriverFactory, StorageDriver } from './driver.interface';
import type { S3DriverDeps } from './s3.driver';

export type { StorageDriver, DriverFactory, DriverOptions, KeyOptions, PutFileMeta, SignedUrlOptions, FileKeyResolver, UploadedFile } from './driver.interface';

/** Built-in local-filesystem driver. */
export function localDriver(options: LocalDriverOptions): DriverFactory {
    return async () => {
        const { LocalDriver } = await import('./local.driver.js');
        return new LocalDriver(options);
    };
}

/**
 * Built-in AWS S3 (and S3-compatible) driver. Requires the optional peer packages
 * `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, loaded lazily on first use.
 */
export function s3Driver(options: S3DriverOptions): DriverFactory {
    return async () => {
        const onMissing = (): never => {
            throw new Error(
                'The S3 driver requires "@aws-sdk/client-s3" and "@aws-sdk/s3-request-presigner". ' +
                    'Install them: npm i @aws-sdk/client-s3 @aws-sdk/s3-request-presigner',
            );
        };
        const sdk = await import('@aws-sdk/client-s3').catch(onMissing);
        const presigner = await import('@aws-sdk/s3-request-presigner').catch(onMissing);
        const { S3Driver } = await import('./s3.driver.js');
        // Cast bridges the ESM-flavored dynamic import to the import-type-d deps (dual-package types).
        const deps = { sdk, getSignedUrl: presigner.getSignedUrl } as unknown as S3DriverDeps;
        return new S3Driver(deps, options);
    };
}

/**
 * Built-in Azure Blob Storage driver. Requires the optional peer package `@azure/storage-blob`,
 * loaded lazily on first use.
 */
export function azureDriver(options: AzureDriverOptions): DriverFactory {
    return async () => {
        const sdk = await import('@azure/storage-blob').catch((): never => {
            throw new Error(
                'The Azure driver requires "@azure/storage-blob". Install it: npm i @azure/storage-blob',
            );
        });
        const { AzureDriver } = await import('./azure.driver.js');
        // Cast bridges the ESM-flavored dynamic import to the import-type-d deps (dual-package types).
        const deps = { sdk } as unknown as AzureDriverDeps;
        return new AzureDriver(deps, options);
    };
}

/**
 * Register a custom storage driver. Pass a class implementing {@link StorageDriver} and its
 * constructor options; the result plugs into `drivers` and works in both the interceptor and the
 * service. For async setup, pass a plain `() => Promise<StorageDriver>` factory instead.
 *
 * @example
 * drivers: { gcs: defineDriver(GcsDriver, { bucket: 'my-bucket' }) }
 */
export function defineDriver<T extends StorageDriver, O = void>(
    DriverClass: new (options: O) => T,
    options?: O,
): DriverFactory {
    return () => new DriverClass(options as O);
}
