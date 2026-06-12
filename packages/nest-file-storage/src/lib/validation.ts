import { BadRequestException } from '@nestjs/common';
import type { Options as MulterOptions } from 'multer';
import { extname } from 'path';

/**
 * Declarative upload validation. Set defaults at the module level and override per route.
 * `maxSize`/`maxFiles` become Multer limits; `allowedMimeTypes`/`allowedExtensions` become
 * a generated file filter that throws a typed 400 before your handler runs.
 */
export interface UploadValidation {
    /** Maximum size per file, in bytes. */
    maxSize?: number;
    /** Allowed MIME types. Supports exact (`image/png`) and wildcard (`image/*`). */
    allowedMimeTypes?: string[];
    /** Allowed file extensions, with or without a leading dot. Case-insensitive. */
    allowedExtensions?: string[];
    /** Maximum number of files accepted in one request. */
    maxFiles?: number;
    /** Escape hatch: a raw Multer `fileFilter`, run after the built-in checks pass. */
    fileFilter?: MulterOptions['fileFilter'];
}

/** Thrown when a file exceeds `validation.maxSize` (or Multer's `LIMIT_FILE_SIZE`). */
export class FileTooLargeException extends BadRequestException {
    constructor(maxSize?: number) {
        super(
            maxSize
                ? `File exceeds the maximum allowed size of ${formatBytes(maxSize)}.`
                : 'File exceeds the maximum allowed size.',
        );
    }
}

/** Thrown when a file's MIME type or extension is not allowed. */
export class InvalidFileTypeException extends BadRequestException {
    constructor(received: string, allowed: string[]) {
        super(`File type "${received}" is not allowed. Allowed: ${allowed.join(', ')}.`);
    }
}

/** Thrown when more files are uploaded than `validation.maxFiles` (or Multer's `LIMIT_FILE_COUNT`). */
export class TooManyFilesException extends BadRequestException {
    constructor(maxFiles?: number) {
        super(
            maxFiles
                ? `Too many files. A maximum of ${maxFiles} file(s) is allowed.`
                : 'Too many files uploaded.',
        );
    }
}

/** Merge a base validation config with a per-route override (override wins per key). */
export function mergeValidation(
    base?: UploadValidation,
    override?: UploadValidation,
): UploadValidation {
    return { ...(base ?? {}), ...(override ?? {}) };
}

/** Translate validation into Multer `limits` (omitting unset keys). */
export function toMulterLimits(validation?: UploadValidation): MulterOptions['limits'] | undefined {
    if (!validation) return undefined;
    const limits: NonNullable<MulterOptions['limits']> = {};
    if (validation.maxSize != null) limits.fileSize = validation.maxSize;
    if (validation.maxFiles != null) limits.files = validation.maxFiles;
    return Object.keys(limits).length > 0 ? limits : undefined;
}

/** True if `mime` matches any pattern, where a pattern may be exact or a `type/*` wildcard. */
function matchesMime(mime: string, patterns: string[]): boolean {
    const value = (mime || '').toLowerCase();
    return patterns.some((pattern) => {
        const p = pattern.toLowerCase().trim();
        if (p === '*' || p === '*/*') return true;
        if (p.endsWith('/*')) return value.startsWith(p.slice(0, -1)); // 'image/' prefix
        return value === p;
    });
}

/** Normalize an extension list to lowercase, dot-prefixed entries. */
function normalizeExtensions(extensions: string[]): string[] {
    return extensions.map((ext) => {
        const e = ext.toLowerCase().trim();
        return e.startsWith('.') ? e : `.${e}`;
    });
}

/**
 * Build a Multer `fileFilter` from validation rules. Rejects disallowed MIME types and
 * extensions with typed exceptions, then delegates to a user-supplied `fileFilter` if present.
 * Returns `undefined` when there is nothing to check.
 */
export function buildFileFilter(validation?: UploadValidation): MulterOptions['fileFilter'] | undefined {
    if (!validation) return undefined;
    const { allowedMimeTypes, allowedExtensions, fileFilter } = validation;
    if (!allowedMimeTypes?.length && !allowedExtensions?.length && !fileFilter) {
        return undefined;
    }
    const normalizedExtensions = allowedExtensions?.length ? normalizeExtensions(allowedExtensions) : undefined;

    return (req, file, cb) => {
        if (allowedMimeTypes?.length && !matchesMime(file.mimetype, allowedMimeTypes)) {
            return cb(new InvalidFileTypeException(file.mimetype, allowedMimeTypes));
        }
        if (normalizedExtensions) {
            const ext = extname(file.originalname).toLowerCase();
            if (!normalizedExtensions.includes(ext)) {
                return cb(new InvalidFileTypeException(ext || file.originalname, normalizedExtensions));
            }
        }
        if (fileFilter) {
            return fileFilter(req, file, cb);
        }
        cb(null, true);
    };
}

/** Human-readable byte size for error messages. */
export function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let value = bytes / 1024;
    let unit = 0;
    while (value >= 1024 && unit < units.length - 1) {
        value /= 1024;
        unit += 1;
    }
    return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[unit]}`;
}
