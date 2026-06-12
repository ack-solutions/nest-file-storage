import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';

import { FILE_STORAGE_OPTIONS, FILE_STORAGE_REGISTRY } from './constants';
import { DriverRegistry } from './driver-registry';
import { azureDriver, localDriver, s3Driver } from './drivers';
import { FileStorageService } from './file-storage.service';
import { FileStorageRegistryHolder } from './registry-holder';
import {
    AzureDriverOptions,
    FileStorageAsyncOptions,
    FileStorageEnum,
    FileStorageModuleOptions,
    FileStorageModuleOptionsInput,
    FileStorageOptionsFactory,
    LocalDriverOptions,
    S3DriverOptions,
    V1FileStorageModuleOptions,
} from './types';

const logger = new Logger('NestFileStorage');

@Module({})
export class NestFileStorageModule {
    /**
     * Register storage synchronously. Accepts the v2 `{ default, drivers, validation?, tenant? }`
     * options, or a deprecated v1 `{ storage, *Config }` config (auto-translated with a warning).
     */
    static forRoot(options: FileStorageModuleOptionsInput): DynamicModule {
        const optionsProvider: Provider = {
            provide: FILE_STORAGE_OPTIONS,
            useValue: normalizeOptions(options),
        };
        return this.build([optionsProvider]);
    }

    /** Register storage asynchronously (the common path for DB/config-driven and multi-tenant setups). */
    static forRootAsync(options: FileStorageAsyncOptions): DynamicModule {
        return this.build(this.createAsyncProviders(options), options.imports);
    }

    private static build(optionProviders: Provider[], imports: DynamicModule['imports'] = []): DynamicModule {
        const registryProvider: Provider = {
            provide: FILE_STORAGE_REGISTRY,
            useFactory: (opts: FileStorageModuleOptions) => {
                const registry = new DriverRegistry(opts);
                FileStorageRegistryHolder.set(registry);
                return registry;
            },
            inject: [FILE_STORAGE_OPTIONS],
        };

        return {
            module: NestFileStorageModule,
            global: true,
            imports,
            providers: [...optionProviders, registryProvider, FileStorageService],
            exports: [FileStorageService, FILE_STORAGE_REGISTRY, FILE_STORAGE_OPTIONS],
        };
    }

    private static createAsyncProviders(options: FileStorageAsyncOptions): Provider[] {
        if (options.useFactory) {
            return [
                {
                    provide: FILE_STORAGE_OPTIONS,
                    useFactory: async (...args: unknown[]) =>
                        normalizeOptions(await options.useFactory!(...args)),
                    inject: options.inject || [],
                },
            ];
        }

        const optionsProvider: Provider = {
            provide: FILE_STORAGE_OPTIONS,
            useFactory: async (factory: FileStorageOptionsFactory) =>
                normalizeOptions(await factory.createFileStorageOptions()),
            inject: [options.useExisting || options.useClass!],
        };

        if (options.useClass) {
            return [optionsProvider, { provide: options.useClass, useClass: options.useClass }];
        }
        return [optionsProvider];
    }
}

/** Pass v2 options through unchanged; translate a deprecated v1 config to v2. */
function normalizeOptions(input: FileStorageModuleOptionsInput): FileStorageModuleOptions {
    if (input && typeof input === 'object' && 'storage' in input) {
        return translateV1Options(input as V1FileStorageModuleOptions);
    }
    return input as FileStorageModuleOptions;
}

function translateV1Options(v1: V1FileStorageModuleOptions): FileStorageModuleOptions {
    logger.warn(
        'Received a deprecated v1 configuration ({ storage, *Config }). It was translated to the v2 ' +
            '{ default, drivers } shape automatically. Please migrate (see MIGRATION.md); the v1 shape is removed in v3.',
    );

    switch (v1.storage) {
        case FileStorageEnum.S3: {
            warnTransform(v1.s3Config);
            return {
                default: 's3',
                drivers: { s3: s3Driver(stripTransform(v1.s3Config) as S3DriverOptions) },
            };
        }
        case FileStorageEnum.AZURE: {
            warnTransform(v1.azureConfig);
            return {
                default: 'azure',
                drivers: { azure: azureDriver(stripTransform(v1.azureConfig) as AzureDriverOptions) },
            };
        }
        case FileStorageEnum.LOCAL:
        default: {
            warnTransform(v1.localConfig);
            return {
                default: 'local',
                drivers: { local: localDriver(stripTransform(v1.localConfig) as LocalDriverOptions) },
            };
        }
    }
}

function stripTransform<T extends { transformUploadedFileObject?: unknown }>(config: T): Omit<T, 'transformUploadedFileObject'> {
    const { transformUploadedFileObject, ...rest } = config;
    return rest;
}

function warnTransform(config: { transformUploadedFileObject?: unknown }): void {
    if (config?.transformUploadedFileObject) {
        logger.warn(
            '`transformUploadedFileObject` was removed in v2 and is ignored. Shape upload results with ' +
                "the interceptor's `mapToRequestBody` instead.",
        );
    }
}
