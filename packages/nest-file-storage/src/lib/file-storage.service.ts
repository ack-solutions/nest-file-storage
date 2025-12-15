import { StorageFactory } from './storage.factory';
import { FileStorageEnum, FileStorageModuleOptions, FileStorageConfigOptions, FileStorageClassOptions } from './types';


export class FileStorageService {

    private static options: FileStorageModuleOptions; // ✅ Static global property

    static setOptions(options: FileStorageModuleOptions) {
        FileStorageService.options = options;
    }

    static getOptions(): FileStorageModuleOptions {
        return FileStorageService.options;
    }

    static async getStorage(storageType?: FileStorageEnum) {
        const options = this.getOptions();

        // Check if it's a class factory approach
        if ('storageFactory' in options) {
            const classOptions = options as FileStorageClassOptions;
            const StorageClass = await classOptions.storageFactory();
            return new StorageClass(classOptions.options);
        }

        // Configuration-based approach
        const configOptions = options as FileStorageConfigOptions;
        if (!storageType) {
            storageType = configOptions.storage;
        }
        const config = (configOptions as any)[`${storageType}Config`];
        return await StorageFactory.createStorage(storageType, config);
    }

}
