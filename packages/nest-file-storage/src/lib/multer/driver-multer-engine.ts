import concat from 'concat-stream';
import type { Request } from 'express';
import { MulterError, StorageEngine } from 'multer';
import { v4 as uuidv4 } from 'uuid';

import type { FileKeyResolver, StorageDriver, UploadedFile } from '../drivers/driver.interface';

/** Per-request key-generation overrides handed to the engine by the interceptor. */
export interface EngineKeyOptions {
    fileName?: FileKeyResolver;
    fileDist?: FileKeyResolver;
    prefix?: string;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

/** Default directory: `YYYY/MM/DD` (relative, consistent across all providers). */
function defaultDist(): string {
    const d = new Date();
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())}`;
}

/** Default filename: `uuid-originalname`. */
function defaultName(file: Express.Multer.File): string {
    return `${uuidv4()}-${file.originalname}`;
}

/**
 * Join key segments into a clean, forward-slash storage key. Drops empty segments and any
 * leading/trailing or duplicate slashes, and normalizes backslashes (Windows-safe).
 */
export function joinKey(...parts: Array<string | undefined>): string {
    return parts
        .filter((p): p is string => !!p && p.length > 0)
        .join('/')
        .replace(/\\/g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '');
}

/**
 * A single Multer `StorageEngine` that adapts ANY {@link StorageDriver} for uploads. It owns the
 * stream→buffer→`putFile` flow and key generation once, so every driver (built-in or custom)
 * gets identical upload behavior. Key generation precedence: per-route options → the driver's
 * `keyDefaults` → built-in defaults.
 */
export class DriverMulterEngine implements StorageEngine {
    constructor(
        private readonly driver: StorageDriver,
        private readonly options: EngineKeyOptions = {},
    ) {}

    _handleFile(
        req: Request,
        file: Express.Multer.File,
        cb: (error?: unknown, info?: Partial<Express.Multer.File>) => void,
    ): void {
        const defaults = this.driver.keyDefaults ?? {};
        const nameFn = this.options.fileName ?? defaults.fileName;
        const distFn = this.options.fileDist ?? defaults.fileDist;
        const prefix = this.options.prefix ?? defaults.prefix;

        let aborted = false;
        const fail = (err: unknown) => {
            if (aborted) return;
            aborted = true;
            cb(err);
        };

        // Multer/busboy truncates the stream and emits 'limit' when fileSize is exceeded.
        // Abort before we persist a partial file; the interceptor maps this to FileTooLargeException.
        file.stream.on('limit', () => fail(new MulterError('LIMIT_FILE_SIZE', file.fieldname)));
        file.stream.on('error', (err) => fail(err));

        file.stream.pipe(
            concat({ encoding: 'buffer' }, (buffer: Buffer) => {
                if (aborted) return;
                void (async () => {
                    try {
                        const dist = distFn ? await distFn(file, req) : defaultDist();
                        const name = nameFn ? await nameFn(file, req) : defaultName(file);
                        const key = joinKey(prefix, dist, name);

                        const uploaded = await this.driver.putFile(buffer, key, {
                            contentType: file.mimetype,
                        });

                        if (aborted) return;

                        const info: UploadedFile = {
                            ...uploaded,
                            fieldName: file.fieldname,
                            originalName: file.originalname,
                            mimetype: file.mimetype,
                            encoding: file.encoding,
                        };
                        cb(null, info as unknown as Partial<Express.Multer.File>);
                    } catch (err) {
                        fail(err);
                    }
                })();
            }),
        );
    }

    _removeFile(
        _req: Request,
        file: Express.Multer.File & { key?: string },
        cb: (error: Error | null) => void,
    ): void {
        // Multer hands back the info object we returned from _handleFile (which includes `key`).
        // Reading `key` here is the fix for the v1 local-storage `file.path` bug.
        const key = file.key;
        if (!key) {
            cb(null);
            return;
        }
        Promise.resolve(this.driver.deleteFile(key))
            .then(() => cb(null))
            .catch((err) => cb(err as Error));
    }
}
