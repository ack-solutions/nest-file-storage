import type { Request } from 'express';

/**
 * Computes a path segment from the uploaded file (and request). Used for `fileName`
 * and `fileDist`. May be async (e.g. to look something up per request).
 */
export type FileKeyResolver = (file: Express.Multer.File, req?: Request) => string | Promise<string>;

/** Default key-generation hooks a driver can carry; overridable per upload route. */
export interface KeyOptions {
    /** Returns the final filename segment of the key (e.g. `uuid-photo.png`). */
    fileName?: FileKeyResolver;
    /** Returns the directory/path prefix of the key (e.g. `2026/06/12`). Relative. */
    fileDist?: FileKeyResolver;
    /** Static key prefix prepended to every key (e.g. `tenant-42`). */
    prefix?: string;
}

/** Options shared by every built-in driver factory. */
export interface DriverOptions extends KeyOptions {}

/** Extra metadata passed to {@link StorageDriver.putFile}. */
export interface PutFileMeta {
    /** Content type stored with the object (S3 `ContentType`, Azure blob content type). */
    contentType?: string;
    /** Provider-specific extras merged into the native put call. */
    [key: string]: unknown;
}

/** Options for {@link StorageDriver.getSignedUrl}. */
export interface SignedUrlOptions {
    /** Expiry in seconds. */
    expiresIn?: number;
    /** Provider-specific extras merged into the native call. */
    [key: string]: unknown;
}

/**
 * Canonical metadata for a stored file, returned by `putFile` / `copyFile`.
 * This is the one file-state shape the library guarantees across all providers.
 */
export interface UploadedFile {
    /** Storage key/path — the value you persist (e.g. in your DB). */
    key: string;
    /** Public URL for the file. For local storage this requires static serving. */
    url: string;
    /** Original client-provided filename. */
    originalName: string;
    /** Final filename segment of the key. */
    fileName: string;
    /** Size in bytes. */
    size: number;
    /** MIME type, when known. */
    mimetype?: string;
    /** Form field the file arrived on (upload flow only). */
    fieldName?: string;
    /** Provider-native full path/identifier (local absolute path; cloud key). */
    fullPath: string;
    /** Transfer encoding (upload flow only). */
    encoding?: string;
    /** Raw bytes, when the provider returns them. */
    buffer?: Buffer;
}

/**
 * The storage contract every backend implements. Pure storage operations only — no
 * Multer coupling. The shared {@link DriverMulterEngine} adapts any driver for uploads,
 * so a custom driver works in both the interceptor and the service with no extra code.
 */
export interface StorageDriver {
    /** Optional default key-generation hooks used by the upload engine when a route doesn't override them. */
    readonly keyDefaults?: KeyOptions;

    /** Upload `content` to `key` and return canonical metadata. */
    putFile(content: Buffer, key: string, meta?: PutFileMeta): Promise<UploadedFile>;

    /** Read the full contents of `key`. */
    getFile(key: string): Promise<Buffer>;

    /** Delete `key`. Must reject if the delete fails. */
    deleteFile(key: string): Promise<void>;

    /** Server-side copy from `sourceKey` to `destKey`. */
    copyFile(sourceKey: string, destKey: string): Promise<UploadedFile>;

    /** Public URL for `key`. */
    getUrl(key: string): string | Promise<string>;

    /** Time-limited signed URL (S3/Azure). Not all drivers implement this. */
    getSignedUrl?(key: string, options?: SignedUrlOptions): Promise<string>;

    /** Absolute filesystem path for `key` (local driver only). */
    path?(key: string): string | Promise<string>;
}

/**
 * A lazily-instantiated driver. Built-in helpers (`localDriver`/`s3Driver`/`azureDriver`)
 * and `defineDriver` all return one. The registry calls it once and caches the instance.
 */
export type DriverFactory = () => StorageDriver | Promise<StorageDriver>;
