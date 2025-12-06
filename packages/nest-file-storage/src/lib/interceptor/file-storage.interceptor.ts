import { NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Request } from 'express';
import multer from 'multer';

import { FileStorageService } from '../file-storage.service';
import { StorageFactory } from '../storage.factory';
import { FileStorageEnum, StorageOptions, FileStorageConfigOptions, UploadedFile } from '../types';


export type FileUploadConfig = {
    type: 'single' | 'array' | 'fields';
    fieldName?: string;
    maxCount?: number;
    fields?: { name: string; maxCount?: number }[];
};

export type FileStorageInterceptorOptions = {
    fileName?: (file: any, req?: Request) => string;
    fileDist?: (file: any, req?: Request) => string;
    prefix?: string;
    storageType?: FileStorageEnum;
    storageOptions?: StorageOptions;

    // File mapping callback - user defines what to return (defaults to file.key)
    mapToRequestBody?: (file: any, fieldName: string, req?: Request) => any;
};

// Helper function to map file object
function mapFileObject(file: any) {
    return {
        fieldName: file.fieldname,
        originalName: file.originalname,
        fileName: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        key: (file as any).key,
        path: (file as any).path,
        url: (file as any).url,
        encoding: file.encoding,
        fullPath: (file as any).fullPath
    } as unknown as UploadedFile;
}

// Helper function to apply file mapping with callback
function applyFileKeyMapping(
    request: Request,
    fileConfig: FileUploadConfig,
    interceptorOptions?: FileStorageInterceptorOptions
): void {
    // Default callback returns the file key
    const mapCallback = interceptorOptions?.mapToRequestBody || ((file: any) => {
        // For arrays, return array of keys
        if (Array.isArray(file)) {
            return file.map(f => f.key);
        }
        // For single file, return the key
        return file.key;
    });

    if (fileConfig.type === 'single') {
        const file = request.file;
        if (file) {
            const fieldName = fileConfig.fieldName || 'file';
            const mappedFile = mapFileObject(file);
            request.body[fieldName] = mapCallback(mappedFile, fieldName, request);
        }
    } else if (fileConfig.type === 'array') {
        const files = request.files as Express.Multer.File[];
        if (files && files.length > 0) {
            const fieldName = fileConfig.fieldName || 'files';
            const mappedFiles = files.map(file => mapFileObject(file));
            request.body[fieldName] = mapCallback(mappedFiles, fieldName, request);
        }
    } else if (fileConfig.type === 'fields') {
        const files = request.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
            Object.keys(files).forEach(fieldName => {
                const mappedFiles = files[fieldName].map(file => mapFileObject(file));
                request.body[fieldName] = mapCallback(mappedFiles, fieldName, request);
            });
        }
    }
}

/**
 * Function-based interceptor that accepts storage options dynamically.
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
            const request = context.switchToHttp().getRequest();
            const response = context.switchToHttp().getResponse();

            // Determine storage type - handle both config approaches
            let storageType: FileStorageEnum;
            let storageConfig: any;

            if ('storage' in options) {
                // Configuration-based approach
                const configOptions = options as FileStorageConfigOptions;
                storageType = interceptorOptions?.storageType ?? configOptions.storage;
                storageConfig = (configOptions as any)[`${storageType}Config`];
            } else {
                // Class factory approach - default to LOCAL
                storageType = interceptorOptions?.storageType ?? FileStorageEnum.LOCAL;
                storageConfig = {};
            }

            const storageOptions = {
                ...storageConfig,
                ...(interceptorOptions?.storageOptions || {}),
                fileName: interceptorOptions?.fileName || storageConfig?.fileName,
                fileDist: (file: any, req: any) => {
                    if (interceptorOptions?.fileDist) {
                        return interceptorOptions.fileDist(file, req);
                    }
                    return storageConfig?.fileDist?.(file, req);
                },
                prefix: interceptorOptions?.prefix || storageConfig?.prefix,
            };

            // Create storage instance dynamically
            const storage = await StorageFactory.createStorage(storageType, storageOptions);
            const multerInstance = multer({ storage });

            // Multer setup based on fileConfig
            let multerMiddleware;
            switch (fileConfig.type) {
                case 'single':
                    if (!fileConfig.fieldName) {
                        throw new Error('fieldName is required for single file upload.');
                    }
                    multerMiddleware = multerInstance.single(fileConfig.fieldName);
                    break;
                case 'array':
                    if (!fileConfig.fieldName) {
                        throw new Error('fieldName is required for multiple file upload.');
                    }
                    multerMiddleware = multerInstance.array(fileConfig.fieldName, fileConfig.maxCount);
                    break;
                case 'fields':
                    if (!fileConfig.fields || !Array.isArray(fileConfig.fields)) {
                        throw new Error('fields array is required for multiple fields file upload.');
                    }
                    multerMiddleware = multerInstance.fields(fileConfig.fields);
                    break;
                default:
                    throw new Error('Invalid file upload type. Use "single", "array", or "fields".');
            }

            // Execute Multer middleware
            await new Promise((resolve, reject) => {
                multerMiddleware(request, response, (err) => (err ? reject(err) : resolve(true)));
            });

            // Apply file key mapping after multer processing
            applyFileKeyMapping(request, fileConfig, interceptorOptions);

            return next.handle();
        }
    };
}
