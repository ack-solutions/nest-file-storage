import { BadRequestException, CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Request, RequestHandler, Response } from 'express';
import multer, { MulterError } from 'multer';

import type { UploadedFile } from '../drivers/driver.interface';
import { DriverMulterEngine, joinKey } from '../multer/driver-multer-engine';
import { FileStorageRegistryHolder } from '../registry-holder';
import { buildFileFilter, FileTooLargeException, mergeValidation, toMulterLimits, TooManyFilesException, UploadValidation } from '../validation';

/** Multer file after our storage engine has attached key/url/fullPath. */
export type MulterFileWithStorageMeta = Express.Multer.File & Partial<Pick<UploadedFile, 'key' | 'url' | 'fullPath'>>;

/**
 * Configures which form field(s) the interceptor accepts. Pass as the first argument to
 * `FileStorageInterceptor`, or a plain string for single-file (e.g. `'file'`).
 */
export type FileUploadConfig = {
    /** `'single'` = one file, `'array'` = multiple files (same field), `'fields'` = multiple named fields. */
    type: 'single' | 'array' | 'fields';
    /** Form field name (required for single and array). */
    fieldName?: string;
    /** Max number of files for array uploads. Default 10. */
    maxCount?: number;
    /** For `'fields'`: the named fields and optional per-field maxCount. */
    fields?: { name: string; maxCount?: number }[];
};

/**
 * Per-route options for the interceptor.
 *
 * @example
 * // Default driver, validate size + type
 * FileStorageInterceptor('avatar', {
 *   validation: { maxSize: 5 * 1024 * 1024, allowedMimeTypes: ['image/*'] },
 *   fileDist: (_f, req) => `users/${req.user.id}`,
 * })
 *
 * @example
 * // Force a specific registered driver for this route
 * FileStorageInterceptor('file', { driver: 's3' })
 */
export type FileStorageInterceptorOptions = {
    /**
     * Storage driver for this route. A registered driver name, or a function of the request
     * (e.g. pick by user plan). Overrides tenant resolution and the module default.
     */
    driver?: string | ((req: Request) => string);

    /** Custom filename segment (the last path segment of the key). Overrides driver defaults. */
    fileName?: (file: Express.Multer.File, req?: Request) => string | Promise<string>;

    /** Custom directory/path prefix (relative). Overrides driver defaults. */
    fileDist?: (file: Express.Multer.File, req?: Request) => string | Promise<string>;

    /** Static key prefix for this route. Combined with any tenant prefix. */
    prefix?: string;

    /** Declarative validation for this route, merged over the module-level defaults. */
    validation?: UploadValidation;

    /**
     * Define what is written to `request.body[fieldName]` after upload.
     * Default: single → `file.key`, array → `file[].key`.
     */
    mapToRequestBody?: (file: UploadedFile | UploadedFile[], fieldName: string, req?: Request) => unknown | Promise<unknown>;

    /** When `false`, don't overwrite `request.body[fieldName]` if it already has a value. Default `true`. */
    overwriteBodyField?: boolean;

    /** Run after multer parses files and before the route handler (cross-field checks, side effects). */
    afterUpload?: (req: Request, fileConfig: FileUploadConfig) => void | Promise<void>;

    /** Set to `false` to skip tenant resolution for this route (use the default driver instead). */
    tenant?: false;
};

/** Map a parsed Multer file (with our engine's metadata) to the canonical UploadedFile shape. */
function mapFileObject(file: Express.Multer.File): UploadedFile {
    const withMeta = file as MulterFileWithStorageMeta &
        Partial<UploadedFile> & { filename?: string; originalName?: string; path?: string };
    const fileName = withMeta.fileName ?? withMeta.filename ?? file.originalname;
    const originalName = file.originalname ?? withMeta.originalName ?? fileName;
    const fullPath = withMeta.fullPath ?? withMeta.path ?? withMeta.key ?? '';

    return {
        key: withMeta.key ?? '',
        url: withMeta.url ?? '',
        originalName,
        fileName,
        size: file.size,
        mimetype: file.mimetype,
        fieldName: file.fieldname,
        fullPath,
        encoding: file.encoding,
    };
}

/**
 * Collect array files from request.files when multer.fields() is used for bracket notation.
 * Supports both `files` (repeated) and `files[0]`, `files[1]`, ...
 */
function collectArrayFiles(
    files: { [fieldname: string]: Express.Multer.File[] },
    fieldName: string,
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

function shouldSetBodyField(request: Request, fieldName: string, overwriteBodyField: boolean): boolean {
    if (overwriteBodyField) return true;
    return request.body[fieldName] === undefined;
}

async function applyFileKeyMapping(
    request: Request,
    fileConfig: FileUploadConfig,
    interceptorOptions?: FileStorageInterceptorOptions,
): Promise<void> {
    const overwrite = interceptorOptions?.overwriteBodyField !== false;
    const mapCallback: (file: UploadedFile | UploadedFile[], fieldName: string, req?: Request) => unknown =
        interceptorOptions?.mapToRequestBody ??
        ((file: UploadedFile | UploadedFile[]) =>
            Array.isArray(file) ? file.map((f) => f.key) : file.key);

    if (fileConfig.type === 'single') {
        const file = request.file;
        if (file) {
            const fieldName = fileConfig.fieldName || 'file';
            if (!shouldSetBodyField(request, fieldName, overwrite)) return;
            request.body[fieldName] = await mapCallback(mapFileObject(file), fieldName, request);
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
            request.body[fieldName] = await mapCallback(files.map(mapFileObject), fieldName, request);
        }
    } else if (fileConfig.type === 'fields') {
        const files = request.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
            for (const fieldName of Object.keys(files)) {
                if (!shouldSetBodyField(request, fieldName, overwrite)) continue;
                request.body[fieldName] = await mapCallback(files[fieldName].map(mapFileObject), fieldName, request);
            }
        }
    }
}

/** Build the multer middleware for the requested upload shape. */
function buildMulterMiddleware(upload: multer.Multer, fileConfig: FileUploadConfig): RequestHandler {
    switch (fileConfig.type) {
        case 'single':
            if (!fileConfig.fieldName) throw new Error('fieldName is required for single file upload.');
            return upload.single(fileConfig.fieldName);
        case 'array': {
            if (!fileConfig.fieldName) throw new Error('fieldName is required for array file upload.');
            const maxCount = fileConfig.maxCount ?? 10;
            const baseName = fileConfig.fieldName;
            // Accept both "files" (repeated) and "files[0]", "files[1]", ...
            const fields = [
                { name: baseName, maxCount },
                ...Array.from({ length: maxCount }, (_, i) => ({ name: `${baseName}[${i}]`, maxCount: 1 })),
            ];
            return upload.fields(fields);
        }
        case 'fields':
            if (!fileConfig.fields || !Array.isArray(fileConfig.fields)) {
                throw new Error('fields array is required for multiple fields file upload.');
            }
            return upload.fields(fileConfig.fields);
        default:
            throw new Error('Invalid file upload type. Use "single", "array", or "fields".');
    }
}

/** Translate raw multer limit errors into typed, 400-mapped exceptions. */
function normalizeUploadError(err: unknown, validation?: UploadValidation): unknown {
    if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') return new FileTooLargeException(validation?.maxSize);
        if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_PART_COUNT') {
            return new TooManyFilesException(validation?.maxFiles);
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return new BadRequestException(`Unexpected file field "${err.field ?? ''}".`);
        }
    }
    return err;
}

/**
 * NestJS interceptor that parses multipart uploads and stores them via the configured storage
 * (built-in local/s3/azure, a custom driver, or a tenant's driver). Writes the result into
 * `request.body[fieldName]` (key by default; customize with `mapToRequestBody`).
 *
 * @param fileConfig - Which field(s) to accept: a string for single file, or a {@link FileUploadConfig}.
 * @param interceptorOptions - Per-route overrides (driver, naming, validation, mapping). See {@link FileStorageInterceptorOptions}.
 *
 * @example
 * @Post('upload')
 * @UseInterceptors(FileStorageInterceptor('file'))
 * upload(@Body() body: { file: string }) { return { key: body.file }; }
 */
export function FileStorageInterceptor(
    fileConfig: FileUploadConfig | string,
    interceptorOptions?: FileStorageInterceptorOptions,
): NestInterceptor {
    const config: FileUploadConfig =
        typeof fileConfig === 'string' ? { type: 'single', fieldName: fileConfig } : fileConfig;

    return {
        async intercept(context: ExecutionContext, next: CallHandler) {
            const request = context.switchToHttp().getRequest<Request>();
            const response = context.switchToHttp().getResponse<Response>();
            const registry = FileStorageRegistryHolder.get();

            const { driver, prefix: tenantPrefix } = await registry.resolveForRequest(request, {
                driver: interceptorOptions?.driver,
                tenant: interceptorOptions?.tenant,
            });

            const validation = mergeValidation(registry.defaultValidation, interceptorOptions?.validation);
            const prefix = joinKey(tenantPrefix, interceptorOptions?.prefix) || undefined;

            const engine = new DriverMulterEngine(driver, {
                fileName: interceptorOptions?.fileName,
                fileDist: interceptorOptions?.fileDist,
                prefix,
            });

            const upload = multer({
                storage: engine,
                ...(toMulterLimits(validation) ? { limits: toMulterLimits(validation) } : {}),
                ...(buildFileFilter(validation) ? { fileFilter: buildFileFilter(validation) } : {}),
            });

            const middleware = buildMulterMiddleware(upload, config);

            await new Promise<void>((resolve, reject) => {
                middleware(request, response, (err: unknown) => {
                    if (!err) return resolve();
                    const mapped = normalizeUploadError(err, validation);
                    if (mapped instanceof Error) return reject(mapped);
                    return reject(new Error(typeof mapped === 'string' ? mapped : JSON.stringify(mapped)));
                });
            });

            if (interceptorOptions?.afterUpload) {
                await interceptorOptions.afterUpload(request, config);
            }

            await applyFileKeyMapping(request, config, interceptorOptions);

            return next.handle();
        },
    };
}
