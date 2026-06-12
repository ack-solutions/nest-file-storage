import type * as S3Sdk from '@aws-sdk/client-s3';
import type { getSignedUrl as GetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { basename } from 'path';

import type { S3DriverOptions } from '../types';
import type { KeyOptions, PutFileMeta, SignedUrlOptions, StorageDriver, UploadedFile } from './driver.interface';
import { streamToBuffer, stripTrailingSlash } from './driver.util';

/** Runtime SDK pieces injected by the `s3Driver` factory, so this module never statically requires the SDK. */
export interface S3DriverDeps {
    sdk: typeof S3Sdk;
    getSignedUrl: typeof GetSignedUrl;
}

/** AWS S3 (and S3-compatible) storage driver. */
export class S3Driver implements StorageDriver {
    readonly keyDefaults: KeyOptions;
    private readonly client: S3Sdk.S3;
    private readonly bucket: string;

    constructor(
        private readonly deps: S3DriverDeps,
        private readonly options: S3DriverOptions,
    ) {
        this.bucket = options.bucket;
        this.keyDefaults = { fileName: options.fileName, fileDist: options.fileDist, prefix: options.prefix };

        // Pass ONLY S3-client-relevant options (v1 spread the whole options object, incl. functions).
        this.client = new deps.sdk.S3({
            region: options.region,
            ...(options.endpoint ? { endpoint: options.endpoint } : {}),
            credentials: {
                accessKeyId: options.accessKeyId,
                secretAccessKey: options.secretAccessKey,
            },
            ...(options.clientOptions ?? {}),
        });
    }

    getUrl(key: string): string {
        if (!key) return '';
        if (this.options.cloudFrontUrl) {
            return `${stripTrailingSlash(this.options.cloudFrontUrl)}/${key}`;
        }
        return `https://${this.bucket}.s3.amazonaws.com/${key}`;
    }

    async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
        if (!key) return '';
        const { expiresIn, ...commandOverrides } = options;
        const command = new this.deps.sdk.GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
            ...commandOverrides,
        });
        // expiresIn is the presigner's option (3rd arg) — NOT a GetObjectCommand field (the v1 bug).
        return this.deps.getSignedUrl(
            this.client as never,
            command,
            expiresIn != null ? { expiresIn } : {},
        );
    }

    async getFile(key: string): Promise<Buffer> {
        if (!key) throw new Error('Key is required to fetch the file from S3.');
        const data = await this.client.send(
            new this.deps.sdk.GetObjectCommand({ Bucket: this.bucket, Key: key }),
        );
        const body = data.Body as
            | (NodeJS.ReadableStream & { transformToByteArray?: () => Promise<Uint8Array> })
            | undefined;
        if (!body) throw new Error('Empty response received from S3.');
        if (typeof body.transformToByteArray === 'function') {
            return Buffer.from(await body.transformToByteArray());
        }
        return streamToBuffer(body);
    }

    async putFile(content: Buffer, key: string, meta: PutFileMeta = {}): Promise<UploadedFile> {
        const fileName = basename(key);
        const safeAscii = fileName.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
        const encodedFileName = encodeURIComponent(fileName);
        const { contentType, ...extra } = meta;

        await this.client.send(
            new this.deps.sdk.PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: content,
                ...(contentType ? { ContentType: contentType } : {}),
                ContentDisposition: `inline; filename="${safeAscii}"; filename*=UTF-8''${encodedFileName}`,
                ...(extra as Record<string, unknown>),
            }),
        );

        // No HeadObject round-trip — the uploaded buffer length is the size.
        return {
            originalName: fileName,
            fileName,
            size: content.length,
            key,
            fullPath: key,
            url: this.getUrl(key),
        };
    }

    async deleteFile(key: string): Promise<void> {
        if (!key) throw new Error('File key is required for deletion.');
        await this.client.send(
            new this.deps.sdk.DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
        );
    }

    async copyFile(sourceKey: string, destKey: string): Promise<UploadedFile> {
        await this.client.send(
            new this.deps.sdk.CopyObjectCommand({
                Bucket: this.bucket,
                CopySource: `/${this.bucket}/${sourceKey}`,
                Key: destKey,
            }),
        );
        const head = await this.client.send(
            new this.deps.sdk.HeadObjectCommand({ Bucket: this.bucket, Key: destKey }),
        );
        return {
            originalName: basename(destKey),
            fileName: basename(destKey),
            size: head.ContentLength ?? 0,
            key: destKey,
            fullPath: destKey,
            url: this.getUrl(destKey),
        };
    }
}
