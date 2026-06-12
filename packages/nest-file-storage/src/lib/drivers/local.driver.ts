import * as fs from 'fs';
import { dirname, join, normalize, sep } from 'path';

import type { LocalDriverOptions } from '../types';
import type { KeyOptions, PutFileMeta, StorageDriver, UploadedFile } from './driver.interface';

/**
 * Local-filesystem storage driver. Keys are URL-style (forward slashes); they are mapped to
 * OS-specific paths under `rootPath`. `getUrl()` returns `baseUrl/key` — it does not serve files
 * by itself (add static serving, e.g. `@nestjs/serve-static`, for browser access).
 */
export class LocalDriver implements StorageDriver {
    readonly keyDefaults: KeyOptions;
    private readonly rootPath: string;
    private readonly baseUrl: string;

    constructor(options: LocalDriverOptions) {
        this.rootPath = normalize(options.rootPath || join(process.cwd(), 'public'));
        this.baseUrl = options.baseUrl ?? '';
        this.keyDefaults = { fileName: options.fileName, fileDist: options.fileDist, prefix: options.prefix };

        if (!fs.existsSync(this.rootPath)) {
            fs.mkdirSync(this.rootPath, { recursive: true });
        }
    }

    /** Map a URL-style key to an absolute OS path under rootPath. */
    private fullPathFor(key: string): string {
        const osPath = key.split('/').filter((part) => part.length > 0).join(sep);
        return join(this.rootPath, osPath);
    }

    getUrl(key: string): string {
        if (!key) return '';
        if (key.startsWith('http')) return key;
        const base = stripSlash(this.baseUrl);
        const cleanKey = key.replace(/^\/+/, '');
        return base ? `${base}/${cleanKey}` : cleanKey;
    }

    async putFile(content: Buffer, key: string, _meta: PutFileMeta = {}): Promise<UploadedFile> {
        const filePath = this.fullPathFor(key);
        await fs.promises.mkdir(dirname(filePath), { recursive: true });
        await fs.promises.writeFile(filePath, content);

        const fileName = key.split('/').pop() || key;
        return {
            originalName: fileName,
            fileName,
            size: content.length,
            key,
            url: this.getUrl(key),
            fullPath: filePath,
        };
    }

    async getFile(key: string): Promise<Buffer> {
        return fs.promises.readFile(this.fullPathFor(key));
    }

    async deleteFile(key: string): Promise<void> {
        await fs.promises.unlink(this.fullPathFor(key));
    }

    async copyFile(sourceKey: string, destKey: string): Promise<UploadedFile> {
        const src = this.fullPathFor(sourceKey);
        const dest = this.fullPathFor(destKey);
        await fs.promises.mkdir(dirname(dest), { recursive: true });
        await fs.promises.copyFile(src, dest);

        const stats = await fs.promises.stat(dest);
        const fileName = destKey.split('/').pop() || destKey;
        return {
            originalName: fileName,
            fileName,
            size: stats.size,
            key: destKey,
            url: this.getUrl(destKey),
            fullPath: dest,
        };
    }

    path(key: string): string {
        if (!key) return '';
        return this.fullPathFor(key);
    }
}

function stripSlash(value: string): string {
    return value.replace(/\/+$/, '');
}
