import type * as AzureSdk from '@azure/storage-blob';
import { basename } from 'path';

import type { AzureDriverOptions } from '../types';
import type { KeyOptions, PutFileMeta, SignedUrlOptions, StorageDriver, UploadedFile } from './driver.interface';
import { streamToBuffer, stripTrailingSlash } from './driver.util';

/** Runtime SDK injected by the `azureDriver` factory, so this module never statically requires the SDK. */
export interface AzureDriverDeps {
    sdk: typeof AzureSdk;
}

/** Azure Blob Storage driver. */
export class AzureDriver implements StorageDriver {
    readonly keyDefaults: KeyOptions;
    private readonly serviceClient: AzureSdk.BlobServiceClient;
    private readonly credential: AzureSdk.StorageSharedKeyCredential;
    private readonly container: string;

    constructor(
        private readonly deps: AzureDriverDeps,
        private readonly options: AzureDriverOptions,
    ) {
        this.container = options.container;
        this.keyDefaults = { fileName: options.fileName, fileDist: options.fileDist, prefix: options.prefix };

        this.credential = new deps.sdk.StorageSharedKeyCredential(options.account, options.accountKey);
        this.serviceClient = new deps.sdk.BlobServiceClient(
            `https://${options.account}.blob.core.windows.net`,
            this.credential,
        );
    }

    getUrl(key: string): string {
        if (!key) return '';
        return `https://${this.options.account}.blob.core.windows.net/${this.container}/${key}`;
    }

    async getSignedUrl(key: string, options: SignedUrlOptions = {}): Promise<string> {
        if (!key) return '';
        // Prefer a configured CDN over a SAS URL (replaces the v1 AZURE_CDN_DOMAIN_NAME env var).
        if (this.options.cdnUrl) {
            return `${stripTrailingSlash(this.options.cdnUrl)}/${key}`;
        }

        const { expiresIn, ...rest } = options;
        const blobClient = this.serviceClient.getContainerClient(this.container).getBlobClient(key);
        const startsOn = new Date();
        const expiresOn = new Date(startsOn.getTime() + (expiresIn ?? 3600) * 1000);

        const sasToken = this.deps.sdk
            .generateBlobSASQueryParameters(
                {
                    containerName: this.container,
                    blobName: key,
                    permissions: this.deps.sdk.BlobSASPermissions.parse('r'),
                    protocol: this.deps.sdk.SASProtocol.Https,
                    startsOn,
                    expiresOn,
                    ...(rest as object),
                },
                this.credential,
            )
            .toString();

        return `${blobClient.url}?${sasToken}`;
    }

    async getFile(key: string): Promise<Buffer> {
        const blobClient = this.serviceClient.getContainerClient(this.container).getBlobClient(key);
        const download = await blobClient.download();
        const body = download.readableStreamBody;
        if (!body) throw new Error(`Empty response received from Azure for "${key}".`);
        return streamToBuffer(body);
    }

    async putFile(content: Buffer, key: string, meta: PutFileMeta = {}): Promise<UploadedFile> {
        const blockBlob = this.serviceClient.getContainerClient(this.container).getBlockBlobClient(key);
        await blockBlob.uploadData(
            content,
            meta.contentType ? { blobHTTPHeaders: { blobContentType: meta.contentType } } : undefined,
        );

        return {
            originalName: basename(key),
            fileName: basename(key),
            size: content.length,
            key,
            fullPath: key,
            url: this.getUrl(key),
        };
    }

    async deleteFile(key: string): Promise<void> {
        // v1 swallowed errors here; rethrow so callers learn about failures.
        const blobClient = this.serviceClient.getContainerClient(this.container).getBlobClient(key);
        await blobClient.delete();
    }

    async copyFile(sourceKey: string, destKey: string): Promise<UploadedFile> {
        const containerClient = this.serviceClient.getContainerClient(this.container);
        const source = containerClient.getBlobClient(sourceKey);
        const dest = containerClient.getBlobClient(destKey);

        const poller = await dest.beginCopyFromURL(source.url);
        await poller.pollUntilDone();
        const properties = await dest.getProperties();

        return {
            originalName: basename(destKey),
            fileName: basename(destKey),
            size: properties.contentLength ?? 0,
            key: destKey,
            fullPath: destKey,
            url: this.getUrl(destKey),
        };
    }
}
