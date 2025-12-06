import { ModuleMetadata, Type } from '@nestjs/common';
import { Request } from 'express';


export enum FileStorageEnum {
    LOCAL = 'local',
    S3 = 's3',
    AZURE = 'azure',
}

export interface FileStorageOptions {
    prefix?: string;
    fileName?: (file: any, req: Request) => string; // Custom file key
    fileDist?: (file: any, req: Request) => string; // Custom file dist
    transformUploadedFileObject?: (file: any) => any;
}

export interface S3StorageOptions extends FileStorageOptions {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
    cloudFrontUrl?: string;
}

export interface LocalStorageOptions extends FileStorageOptions {
    rootPath: string;
    baseUrl: string;
}

export interface AzureStorageOptions extends FileStorageOptions {
    account: string;
    accountKey: string;
    container: string;
}

export type StorageOptions = S3StorageOptions | AzureStorageOptions | LocalStorageOptions;

// Define discriminated union types - Configuration-based approach
export type FileStorageConfigOptions =
    | { storage: FileStorageEnum.LOCAL; localConfig: LocalStorageOptions; }
    | { storage: FileStorageEnum.S3; s3Config: S3StorageOptions; }
    | { storage: FileStorageEnum.AZURE; azureConfig: AzureStorageOptions; };

// Class factory approach - for direct storage instance usage
export interface FileStorageClassOptions {
    storageFactory: () => Promise<new (...args: any[]) => Storage> | (new (...args: any[]) => Storage);
    options?: any;
}

// Combined module options
export type FileStorageModuleOptions = FileStorageConfigOptions | FileStorageClassOptions;


export interface FileStorageAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
    /**
     * The `useExisting` syntax allows you to create aliases for existing providers.
     */
    useExisting?: Type<FileStorageOptionsFactory>;
    /**
     * The `useClass` syntax allows you to dynamically determine a class
     * that a token should resolve to.
     */
    useClass?: Type<FileStorageOptionsFactory>;
    /**
     * The `useFactory` syntax allows for creating providers dynamically.
     */
    useFactory?: (...args: any[]) => Promise<FileStorageModuleOptions> | FileStorageModuleOptions;
    /**
     * Optional list of providers to be injected into the context of the Factory function.
     */
    inject?: any[];
}

export interface FileStorageOptionsFactory {
    createFileStorageOptions(): Promise<FileStorageModuleOptions> | FileStorageModuleOptions;
}


export interface UploadedFile {
    fieldName?: string;
    fieldname?: string;
    fileName: string;
    originalName: string; // original file name
    size: number; // files in bytes
    mimetype?: string;
    buffer?: Buffer;
    key: string; // path of the file in storage
    url: string; // file public url
    fullPath: string; // Full path of the file
    encoding?: string;
}

export interface Storage {
    getFile(key: string): Promise<Buffer> | Buffer;
    deleteFile(key: string): Promise<void> | void;
    putFile(fileContent: Buffer, key: string): Promise<UploadedFile> | UploadedFile;
    path?(filePath: string): Promise<string> | string;
    getUrl(key: string): Promise<string> | string;
    getSignedUrl?(key: string, options: any): Promise<string> | string;
    copyFile(oldKey: string, newKey: string): Promise<UploadedFile>
}
