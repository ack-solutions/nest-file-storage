import concat from 'concat-stream';
import * as fs from 'fs';
import moment from 'moment';
import { StorageEngine } from 'multer';
import { dirname, join, normalize, sep } from 'path';
import { v4 as uuidv4 } from 'uuid';

import { LocalStorageOptions, Storage, UploadedFile } from '../types';


export class LocalStorage implements StorageEngine, Storage {

    private rootPath: string;
    private fileNameFunction: (file: Express.Multer.File, req?: any) => string | Promise<string>;
    private fileDistFunction: (file: Express.Multer.File, req?: any) => string | Promise<string>;

    /**
     * Convert OS-specific file path to URL-friendly key
     * This ensures keys are consistent across all platforms
     * Windows: C:\uploads\2024\01\file.jpg -> 2024/01/file.jpg
     * Unix: /uploads/2024/01/file.jpg -> 2024/01/file.jpg
     */
    private pathToUrl(filePath: string): string {
        if (!filePath) return '';

        // Remove rootPath if present
        let relativePath = filePath;
        if (filePath.startsWith(this.rootPath)) {
            relativePath = filePath.substring(this.rootPath.length);
        }

        // Convert backslashes to forward slashes and remove leading slash
        return relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    }

    /**
     * Convert URL-friendly key to OS-specific file path
     * This converts stored keys back to valid file system paths
     * 2024/01/file.jpg -> Windows: 2024\01\file.jpg, Unix: 2024/01/file.jpg
     */
    private urlToPath(urlKey: string): string {
        if (!urlKey) return '';

        // Split by forward slashes and rejoin with OS-specific separator
        const parts = urlKey.split('/').filter(part => part.length > 0);
        return parts.join(sep);
    }

    /**
     * Get full file system path from URL-friendly key
     */
    private getFullPath(urlKey: string): string {
        const osPath = this.urlToPath(urlKey);
        return join(this.rootPath, osPath);
    }

    constructor(private options: LocalStorageOptions) {
        // Normalize path for the current OS
        this.rootPath = normalize(options.rootPath || join(process.cwd(), 'public'));

        this.fileNameFunction = options.fileName || ((file, _req) => {
            return `${uuidv4()}-${file.originalname}`;
        });

        this.fileDistFunction = options.fileDist || ((_file, _req) => {
            return join(this.rootPath, moment().format('YYYY'), moment().format('MM'), moment().format('DD'));
        });


        // Ensure the rootPath directory exists
        if (!fs.existsSync(this.rootPath)) {
            fs.mkdirSync(this.rootPath, { recursive: true });
        }
    }

    _handleFile(
        req: any,
        file: Express.Multer.File,
        cb: (error?: any, info?: any) => void,
    ): void {
        const run = async () => {
            try {
                const dist = await this.fileDistFunction(file, req);
                const fileName = await this.fileNameFunction(file, req);

                const filePath = join(dist, fileName);
                // Convert to URL-friendly key for storage
                const urlKey = this.pathToUrl(filePath);

                file.stream.pipe(concat({ encoding: 'buffer' }, (buffer) => {
                    void (async () => {
                        try {
                            const uploadedFile = await this.putFile(buffer, urlKey);

                            const fileInfo: UploadedFile = {
                                ...uploadedFile,
                                fieldName: file.fieldname,
                                originalName: file.originalname,
                                mimetype: file.mimetype,
                            };
                            let transformData = fileInfo;

                            if (this.options?.transformUploadedFileObject) {
                                transformData = await this.options.transformUploadedFileObject(fileInfo);
                            }
                            cb(null, transformData);
                        } catch (error) {
                            cb(error);
                        }
                    })();
                }));
            } catch (error) {
                console.error('error', error);
                cb(error);
            }
        };

        run().catch(cb);
    }

    _removeFile(
        _req: any,
        file: any,
        cb: (error: Error | null) => void,
    ) {
        const filePath = file.path;

        fs.unlink(filePath, (err) => {
            if (err) {
                cb(err);
            } else {
                cb(null);
            }
        });
    }

    getUrl(urlKey: string): string {
        if (urlKey && urlKey.startsWith('http')) {
            return urlKey;
        }
        if (!urlKey) {
            return '';
        }

        // Key is already in URL format (forward slashes)
        // Ensure baseUrl doesn't end with slash and key doesn't start with slash
        const baseUrl = this.options.baseUrl.replace(/\/$/, '');
        const cleanKey = urlKey.replace(/^\//, '');

        return `${baseUrl}/${cleanKey}`;
    }

    async getFile(urlKey: string): Promise<Buffer> {
        // Convert URL key to OS-specific path
        const fullPath = this.getFullPath(urlKey);
        return fs.promises.readFile(fullPath);
    }

    async deleteFile(urlKey: string): Promise<void> {
        // Convert URL key to OS-specific path
        const fullPath = this.getFullPath(urlKey);
        return fs.promises.unlink(fullPath);
    }

    async putFile(
        fileContent: Buffer,
        urlKey: string,
        options?: any,
    ): Promise<UploadedFile> {
        return new Promise((putFileResolve, reject) => {
            // Convert URL key to OS-specific path
            const filePath = this.getFullPath(urlKey);

            const directoryPath = dirname(filePath);

            // Create the directory if it doesn't exist
            fs.mkdirSync(directoryPath, { recursive: true });

            fs.writeFile(filePath, fileContent, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stats = fs.statSync(filePath);
                const fileName = urlKey.split('/').pop() || urlKey;

                const fileInfo: UploadedFile = {
                    originalName: fileName,
                    size: stats.size,
                    fileName: fileName,
                    key: urlKey,
                    url: this.getUrl(urlKey),
                    fullPath: filePath,
                    ...options,
                };
                putFileResolve(fileInfo);
            });
        });
    }


    path(urlKey: string): string {
        if (!urlKey) {
            return '';
        }
        // Convert URL key to full OS-specific path
        return this.getFullPath(urlKey);
    }

    async copyFile(oldUrlKey: string, newUrlKey: string): Promise<UploadedFile> {
        return new Promise((resolve, reject) => {
            // Convert URL keys to OS-specific paths
            const oldPath = this.getFullPath(oldUrlKey);
            const newPath = this.getFullPath(newUrlKey);

            const directoryPath = dirname(newPath);
            fs.mkdirSync(directoryPath, { recursive: true });

            fs.copyFile(oldPath, newPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }

                const stats = fs.statSync(newPath);
                const fileName = newUrlKey.split('/').pop() || newUrlKey;

                const fileInfo: UploadedFile = {
                    originalName: fileName,
                    size: stats.size,
                    fileName: fileName,
                    key: newUrlKey,
                    fullPath: newPath,
                    url: this.getUrl(newUrlKey),
                };
                resolve(fileInfo);
            });
        });
    }


}
