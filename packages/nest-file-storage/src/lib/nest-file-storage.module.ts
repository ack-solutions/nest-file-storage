import { Module, DynamicModule, Provider } from '@nestjs/common';

import { FILE_STORAGE_OPTIONS } from './constants';
import { FileStorageService } from './file-storage.service';
import { FileStorageAsyncOptions, FileStorageModuleOptions, FileStorageOptionsFactory } from './types';


@Module({})
export class NestFileStorageModule {

    static forRoot(options: FileStorageModuleOptions): DynamicModule {
        return {
            module: NestFileStorageModule,
            providers: [
                {
                    provide: FILE_STORAGE_OPTIONS,
                    useFactory: async () => {
                        FileStorageService.setOptions(options); // ✅ Store globally
                        return options;
                    },
                    inject: [],
                },
                FileStorageService,
            ],
            exports: [],
        };
    }

    static forRootAsync(options: FileStorageAsyncOptions): DynamicModule {
        const asyncProviders: Provider[] = this.createAsyncProviders(options);

        return {
            module: NestFileStorageModule,
            imports: options.imports || [],
            providers: [...asyncProviders, FileStorageService],
            exports: [],
        };
    }

    private static createAsyncProviders(options: FileStorageAsyncOptions): Provider[] {
        if (options.useExisting || options.useFactory) {
            return [this.createAsyncOptionsProvider(options)];
        }

        return [
            this.createAsyncOptionsProvider(options),
            {
                provide: options.useClass!,
                useClass: options.useClass!,
            },
        ];
    }

    private static createAsyncOptionsProvider(options: FileStorageAsyncOptions): Provider {
        if (options.useFactory) {
            return {
                provide: FILE_STORAGE_OPTIONS,
                useFactory: async (...args: any[]) => {
                    const fileStorageOptions = await options.useFactory!(...args);
                    FileStorageService.setOptions(fileStorageOptions);
                    return fileStorageOptions;
                },
                inject: options.inject || [],
            };
        }

        return {
            provide: FILE_STORAGE_OPTIONS,
            useFactory: async (optionsFactory: FileStorageOptionsFactory) => {
                const fileStorageOptions = await optionsFactory.createFileStorageOptions();
                FileStorageService.setOptions(fileStorageOptions);
                return fileStorageOptions;
            },
            inject: [options.useExisting || options.useClass!],
        };
    }

}
