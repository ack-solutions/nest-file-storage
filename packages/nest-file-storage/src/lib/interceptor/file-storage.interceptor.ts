import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request, RequestHandler, Response } from 'express';
import multer from 'multer';

import { FileStorageService } from '../file-storage.service';
import { StorageFactory } from '../storage.factory';
import { FileStorageEnum, StorageOptions, FileStorageConfigOptions, UploadedFile, LocalStorageOptions, S3StorageOptions, AzureStorageOptions } from '../types';

/** Multer file after our storage engine has added key, url, fullPath */
export type MulterFileWithStorageMeta = Express.Multer.File & Partial<Pick<UploadedFile, 'key' | 'url' | 'fullPath'>>;

/**
 * Configures which form field(s) the interceptor accepts. Pass as first argument to
 * `FileStorageInterceptor`, or as a string for single-file (e.g. `'file'` → `{ type: 'single', fieldName: 'file' }`).
 */
export type FileUploadConfig = {
    /** `'single'` = one file, `'array'` = multiple files (same field), `'fields'` = multiple named fields */
    type: 'single' | 'array' | 'fields';
    /** Form field name (required for single and array). */
    fieldName?: string;
    /** Max number of files for array uploads. Default 10. */
    maxCount?: number;
    /** For type `'fields'`: list of field names and optional maxCount per field. */
    fields?: { name: string; maxCount?: number }[];
};

/**
 * Options for the file storage interceptor. Pass as the second argument to
 * `FileStorageInterceptor(fieldConfig, interceptorOptions)`.
 *
 * @example
 * // Use default storage from module config, single file as 'file'
 * FileStorageInterceptor('file')
 *
 * @example
 * // Override storage to S3 for this route, custom path and body mapping
 * FileStorageInterceptor('avatar', {
 *   storageType: FileStorageEnum.S3,
 *   storageOptions: { bucket: 'my-bucket', ... },
 *   fileDist: () => 'users/avatars',
 *   mapToRequestBody: (f) => ({ key: f.key, url: f.url })
 * })
 */
export type FileStorageInterceptorOptions = {
    /**
     * Custom file name in storage (key). Called per file before upload.
     * Return the path/filename you want (e.g. with extension). Overrides module/storage config.
     *
     * @example
     * fileName: (file, req) => `${req.user?.id}-${Date.now()}-${file.originalname}`
     */
    fileName?: (file: Express.Multer.File, req?: Request) => string;

    /**
     * Custom directory/path prefix for this file in storage. Called per file before upload.
     * Return the folder path (e.g. 'uploads/2024/01'). Overrides module/storage config.
     *
     * @example
     * fileDist: (file, req) => `products/${req.body?.productId ?? 'draft'}`
     */
    fileDist?: (file: Express.Multer.File, req?: Request) => string;

    /**
     * Optional prefix applied to the storage path (e.g. 'public/' or 'temp/').
     * Merged with storage config. Useful to scope uploads per route.
     */
    prefix?: string;

    /**
     * Override the storage backend for this route. If not set, uses the module's default storage.
     * Use with `storageOptions` when the module is configured for a different storage (e.g. LOCAL)
     * but this route should use S3 or Azure.
     *
     * @example
     * storageType: FileStorageEnum.S3
     */
    storageType?: FileStorageEnum;

    /**
     * Storage credentials/config for this route. Required when using `storageType` override
     * with a different backend than the module default (e.g. S3 bucket, Azure container).
     * Merged with module config when storage type matches.
     *
     * @example
     * storageOptions: { bucket: 'uploads', region: 'us-east-1', ... }
     */
    storageOptions?: StorageOptions;

    /**
     * Define what is written to `request.body[fieldName]` after upload. Default: single file → `file.key`, array → `file[].key`.
     * Return any value (string, object, array). Can be async.
     *
     * @example
     * // Put only the URL in body
     * mapToRequestBody: (file) => (Array.isArray(file) ? file.map(f => f.url) : file.url)
     *
     * @example
     * // Put full metadata object
     * mapToRequestBody: (file) => Array.isArray(file) ? file : { key: file.key, url: file.url, size: file.size }
     */
    mapToRequestBody?: (file: UploadedFile | UploadedFile[], fieldName: string, req?: Request) => unknown | Promise<unknown>;

    /**
     * When `false`, do not overwrite `request.body[fieldName]` if it is already set (e.g. JSON body or PATCH update).
     * Use when the client may send the same field name as JSON and you want to keep it unless no value was sent.
     *
     * @default true (always overwrite with uploaded file result)
     *
     * @example
     * overwriteBodyField: false  // Keep existing body.files when already present
     */
    overwriteBodyField?: boolean;

    /**
     * Provide multer options per request: `limits` (e.g. fileSize) and/or `fileFilter`.
     * Called before multer runs. Use for dynamic limits or MIME/extension checks.
     *
     * @example
     * multerOptions: (req, fileConfig) => ({
     *   limits: { fileSize: 5 * 1024 * 1024 },
     *   fileFilter: (_, file, cb) => cb(null, /^image\//.test(file.mimetype))
     * })
     */
    multerOptions?: (req: Request, fileConfig: FileUploadConfig) => {
        limits?: multer.Options['limits'];
        fileFilter?: multer.Options['fileFilter'];
    };

    /**
     * Run validation or side effects after multer has parsed files and before the route handler.
     * Use for cross-field checks (e.g. total file count), business rules, or throwing to reject the request.
     * Can be async.
     *
     * @example
     * afterUpload: (req, fileConfig) => {
     *   const count = Array.isArray(req.files) ? req.files.length : 0;
     *   if (count > 10) throw new BadRequestException('Max 10 files');
     * }
     */
    afterUpload?: (req: Request, fileConfig: FileUploadConfig) => void | Promise<void>;
};

function getStorageConfig(storageType: FileStorageEnum, options: FileStorageConfigOptions): StorageOptions {
    switch (storageType) {
        case FileStorageEnum.LOCAL:
            return (options as { localConfig: LocalStorageOptions }).localConfig as StorageOptions;
        case FileStorageEnum.S3:
            return (options as { s3Config: S3StorageOptions }).s3Config as StorageOptions;
        case FileStorageEnum.AZURE:
            return (options as { azureConfig: AzureStorageOptions }).azureConfig as StorageOptions;
    }
}

/**
 * Maps Multer file to UploadedFile. Accepts Express.Multer.File so call sites
 * (request.file, request.files) type-check without casts. Storage engines add
 * key/url/fullPath at runtime; we read them optionally.
 */
function mapFileObject(file: Express.Multer.File): UploadedFile {
    const withMeta = file as MulterFileWithStorageMeta & Partial<UploadedFile> & {
        filename?: string;
        originalName?: string;
    };
    const fileName = withMeta.filename ?? withMeta.fileName ?? file.originalname;
    const originalName = file.originalname ?? withMeta.originalName ?? fileName;
    const fullPath = withMeta.fullPath ?? file.path ?? withMeta.key ?? '';

    return {
        fieldName: file.fieldname,
        originalName,
        fileName,
        mimetype: file.mimetype,
        size: file.size,
        key: withMeta.key ?? '',
        url: withMeta.url ?? '',
        encoding: file.encoding,
        fullPath,
    } as UploadedFile;
}

/**
 * Collect array files from request.files when using multer.fields() for bracket notation.
 * Supports both request.files['productImages'] and request.files['productImages[0]'], etc.
 */
function collectArrayFiles(
    files: { [fieldname: string]: Express.Multer.File[] },
    fieldName: string
): Express.Multer.File[] {
    const direct = files[fieldName];
    if (direct && direct.length > 0) {
        return direct;
    }
    const collected: Express.Multer.File[] = [];
    let i = 0;
    let key = `${fieldName}[${i}]`;
    while (files[key] && files[key].length > 0) {
        collected.push(files[key][0]);
        i += 1;
        key = `${fieldName}[${i}]`;
    }
    return collected;
}

function shouldSetBodyField(
    request: Request,
    fieldName: string,
    overwriteBodyField: boolean
): boolean {
    if (overwriteBodyField) return true;
    return request.body[fieldName] === undefined;
}

async function applyFileKeyMapping(
    request: Request,
    fileConfig: FileUploadConfig,
    interceptorOptions?: FileStorageInterceptorOptions
): Promise<void> {
    const overwrite = interceptorOptions?.overwriteBodyField !== false;
    const mapCallback: (file: UploadedFile | UploadedFile[], fieldName: string, req?: Request) => unknown =
        interceptorOptions?.mapToRequestBody ?? 
        ((file: UploadedFile | UploadedFile[]) => {
            if (Array.isArray(file)) {
                return file.map((f) => f.key);
            }
            return file.key;
        });

    if (fileConfig.type === 'single') {
        const file = request.file;
        if (file) {
            const fieldName = fileConfig.fieldName || 'file';
            if (!shouldSetBodyField(request, fieldName, overwrite)) return;
            const mappedFile = mapFileObject(file);
            request.body[fieldName] = await mapCallback(mappedFile, fieldName, request);
        }
    } else if (fileConfig.type === 'array') {
        const fieldName = fileConfig.fieldName || 'files';
        let files: Express.Multer.File[];
        if (Array.isArray(request.files)) {
            files = request.files;
        } else if (request.files && typeof request.files === 'object') {
            files = collectArrayFiles(request.files as { [fieldname: string]: Express.Multer.File[] }, fieldName);
        } else {
            files = [];
        }
        if (files.length > 0 && shouldSetBodyField(request, fieldName, overwrite)) {
            const mappedFiles = files.map(f => mapFileObject(f));
            request.body[fieldName] = await mapCallback(mappedFiles, fieldName, request);
        }
    } else if (fileConfig.type === 'fields') {
        const files = request.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
            for (let index = 0; index < Object.keys(files).length; index++) {
                const fieldName = Object.keys(files)[index];
                if (!shouldSetBodyField(request, fieldName, overwrite)) continue;
                const mappedFiles = files[fieldName].map(f => mapFileObject(f));
                request.body[fieldName] = await mapCallback(mappedFiles, fieldName, request);
            }
        }
    }
}

/**
 * NestJS interceptor that parses multipart file uploads and uploads them to the configured
 * storage (local, S3, or Azure). Populates `request.body[fieldName]` with the result (e.g. key/url).
 *
 * @param fileConfig - Which form field(s) to accept: a string (single file, e.g. `'file'`), or
 * a config object for single/array/fields. See `FileUploadConfig`.
 * @param interceptorOptions - Optional overrides (storage, path, mapping, limits, etc.). See `FileStorageInterceptorOptions`.
 * @returns NestInterceptor to use with `@UseInterceptors(FileStorageInterceptor('file', { ... }))`
 *
 * @example
 * // Controller: single file as 'file', use module default storage
 * @Post('upload')
 * @UseInterceptors(FileStorageInterceptor('file'))
 * upload(@Body() body: { file: string }) { return { key: body.file }; }
 *
 * @example
 * // Multiple files, max 5, custom path and body shape
 * @UseInterceptors(FileStorageInterceptor(
 *   { type: 'array', fieldName: 'images', maxCount: 5 },
 *   { fileDist: () => 'gallery', mapToRequestBody: (files) => files.map(f => f.key) }
 * ))
 */
export function FileStorageInterceptor(
    fileConfig: FileUploadConfig | string,
    interceptorOptions?: FileStorageInterceptorOptions,
): NestInterceptor {
    if (typeof fileConfig === 'string') {
        fileConfig = {
            type: 'single',
            fieldName: fileConfig,
        };
    }

    return {
        async intercept(context: ExecutionContext, next: CallHandler) {
            const options = FileStorageService.getOptions();
            const request = context.switchToHttp().getRequest<Request>();
            const response = context.switchToHttp().getResponse<Response>();

            let storageType: FileStorageEnum;
            let storageConfig: StorageOptions;

            if ('storage' in options) {
                storageType = interceptorOptions?.storageType ?? options.storage;
                storageConfig = getStorageConfig(storageType, options);
            } else {
                storageType = interceptorOptions?.storageType ?? FileStorageEnum.LOCAL;
                storageConfig = {} as StorageOptions;
            }

            const storageOptions: StorageOptions = {
                ...storageConfig,
                ...(interceptorOptions?.storageOptions ?? {}),
                fileName: interceptorOptions?.fileName ?? storageConfig?.fileName,
                fileDist: (file: Express.Multer.File, req: Request): string => {
                    return (
                        interceptorOptions?.fileDist?.(file, req) ??
                        storageConfig?.fileDist?.(file, req) ??
                        ''
                    );
                },
                prefix: interceptorOptions?.prefix ?? storageConfig?.prefix,
            };

            const storage = await StorageFactory.createStorage(storageType, storageOptions);
            // const multerInstance = multer({ storage });

            const extra = interceptorOptions?.multerOptions?.(request, fileConfig);

            const multerInstance = multer({
                storage,
                ...(extra?.limits ? { limits: extra.limits } : {}),
                ...(extra?.fileFilter ? { fileFilter: extra.fileFilter } : {}),
            });

            let multerMiddleware: RequestHandler;
            switch (fileConfig.type) {
                case 'single':
                    if (!fileConfig.fieldName) {
                        throw new Error('fieldName is required for single file upload.');
                    }
                    multerMiddleware = multerInstance.single(fileConfig.fieldName);
                    break;
                case 'array': {
                    if (!fileConfig.fieldName) {
                        throw new Error('fieldName is required for multiple file upload.');
                    }
                    const maxCount = fileConfig.maxCount ?? 10;
                    const baseName = fileConfig.fieldName;
                    // Accept both "productImages" (repeated) and "productImages[0]", "productImages[1]", ...
                    const fields: { name: string; maxCount: number }[] = [
                        { name: baseName, maxCount },
                        ...Array.from({ length: maxCount }, (_, i) => ({ name: `${baseName}[${i}]`, maxCount: 1 })),
                    ];
                    multerMiddleware = multerInstance.fields(fields);
                    break;
                }
                case 'fields':
                    if (!fileConfig.fields || !Array.isArray(fileConfig.fields)) {
                        throw new Error('fields array is required for multiple fields file upload.');
                    }
                    multerMiddleware = multerInstance.fields(fileConfig.fields);
                    break;
                default:
                    throw new Error('Invalid file upload type. Use "single", "array", or "fields".');
            }

            await new Promise<void>((resolve, reject) => {
                multerMiddleware(request, response, (err: unknown) => {
                    if (err) {
                        // Preserve original error object if possible (MulterError, BadRequestException, etc.)
                        if (err instanceof Error) return reject(err);

                        // fallback: convert to Error
                        return reject(new Error(typeof err === 'string' ? err : JSON.stringify(err)));
                    }
                    resolve();
                });
            });

            if (interceptorOptions?.afterUpload) {
                await interceptorOptions.afterUpload(request, fileConfig);
            }

            // Apply file key mapping after multer processing
            await applyFileKeyMapping(request, fileConfig, interceptorOptions);

            return next.handle();
        }
    };
}
