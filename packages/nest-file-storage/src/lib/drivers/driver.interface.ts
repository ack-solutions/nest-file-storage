import type { Request } from 'express';

/**
 * Computes a path segment from the uploaded file (and request). Used for `fileName`
 * and `fileDist`. May be async (e.g. to look something up per request).
 */
export type FileKeyResolver = (file: Express.Multer.File, req?: Request) => string | Promise<string>;

/**
 * Default key-generation hooks a driver can carry for uploads. Keys are built as
 * `prefix / tenantPrefix / routePrefix / fileDist / fileName`.
 */
export interface KeyOptions {
    /** Returns the final filename segment of the key (e.g. `uuid-photo.png`). A route's `fileName` replaces it. */
    fileName?: FileKeyResolver;
    /** Returns the directory segment of the key (e.g. `2026/06/12`). Relative. A route's `fileDist` replaces it. */
    fileDist?: FileKeyResolver;
    /**
     * Base path for every upload through this driver (e.g. `my-app` to keep one app's files in its own
     * folder of a shared bucket). Tenant and route prefixes nest inside it — it is never replaced.
     *
     * Applied by the upload engine (the interceptor) only. The direct driver/service methods
     * (`putFile`, `getFile`, `getSignedUploadUrl`, …) take a **full** key and use it exactly as given —
     * that is what lets keys stored from uploads be read back unchanged. To build a new key laid out
     * like an upload, use `resolveKey(driver, …)` or `FileStorageService.resolveKey(…)`.
     */
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

/** Options for {@link StorageDriver.getSignedUploadUrl}. */
export interface SignedUploadUrlOptions {
    /** Expiry in seconds. Default: 3600 (Azure); the presigner's default (900) on S3. */
    expiresIn?: number;
    /**
     * Content type the client must upload with. On S3 it is signed, so the PUT must send the same
     * `Content-Type` header. Azure SAS cannot pin it; the client sets `x-ms-blob-content-type`.
     */
    contentType?: string;
    /** Exact size in bytes the client must upload (S3 only — signed as `Content-Length`). */
    contentLength?: number;
    /** Provider-specific extras merged into the native call (S3 `PutObjectCommand` input, Azure SAS values). */
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
    /**
     * Optional default key-generation hooks used by the upload engine: `fileName` / `fileDist` apply
     * when a route doesn't set its own; `prefix` is always the base path (route/tenant prefixes nest inside).
     */
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

    /** Time-limited signed download (GET) URL (S3/Azure). Not all drivers implement this. */
    getSignedUrl?(key: string, options?: SignedUrlOptions): Promise<string>;

    /**
     * Time-limited signed upload URL, so a client can upload straight to storage without the bytes
     * passing through the server (S3: presigned `PUT`; Azure: SAS with create/write permission — the
     * client must send `x-ms-blob-type: BlockBlob`). Not all drivers implement this.
     */
    getSignedUploadUrl?(key: string, options?: SignedUploadUrlOptions): Promise<string>;

    /** Absolute filesystem path for `key` (local driver only). */
    path?(key: string): string | Promise<string>;
}

/**
 * A lazily-instantiated driver. Built-in helpers (`localDriver`/`s3Driver`/`azureDriver`)
 * and `defineDriver` all return one. The registry calls it once and caches the instance.
 */
export type DriverFactory = () => StorageDriver | Promise<StorageDriver>;
