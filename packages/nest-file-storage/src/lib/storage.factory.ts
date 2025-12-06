import { AzureStorageOptions, FileStorageEnum, LocalStorageOptions, S3StorageOptions, StorageOptions } from './types';
import { StorageEngine } from 'multer';
import { Storage } from './types';

export class StorageFactory {
    private static storageInstances = new Map<string, StorageEngine & Storage>();

    static async createStorage(storageType: FileStorageEnum, options: StorageOptions): Promise<StorageEngine & Storage> {
        const cacheKey = `${storageType}-${JSON.stringify(options)}`;

        // if (this.storageInstances.has(cacheKey)) {
        //     return this.storageInstances.get(cacheKey)!;
        // }

        let storageInstance: StorageEngine & Storage;

        switch (storageType) {
            case FileStorageEnum.LOCAL:
                const { LocalStorage } = await import('./storage/local.storage.js');
                storageInstance = new LocalStorage(options as LocalStorageOptions);
                break;

            case FileStorageEnum.AZURE:
                try {
                    const { AzureStorage } = await import('./storage/azure.storage.js');
                    storageInstance = new AzureStorage(options as AzureStorageOptions);
                } catch (error) {
                    throw new Error(
                        'Azure Storage SDK (@azure/storage-blob) is required when using AzureStorage. ' +
                        'Please install it: npm install @azure/storage-blob'
                    );
                }
                break;

            case FileStorageEnum.S3:
                try {
                    const { S3Storage } = await import('./storage/s3.storage.js');
                    storageInstance = new S3Storage(options as S3StorageOptions);
                } catch (error) {
                    throw new Error(
                        'AWS SDK (@aws-sdk/client-s3 and @aws-sdk/s3-request-presigner) is required when using S3Storage. ' +
                        'Please install them: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner'
                    );
                }
                break;

            default:
                throw new Error(`Unsupported storage type: ${storageType}`);
        }

        this.storageInstances.set(cacheKey, storageInstance);
        return storageInstance;
    }

    static clearCache() {
        this.storageInstances.clear();
    }
}
