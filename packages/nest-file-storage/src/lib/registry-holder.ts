import { Logger } from '@nestjs/common';

import type { DriverRegistry } from './driver-registry';

let current: DriverRegistry | undefined;
const logger = new Logger('NestFileStorage');

/**
 * Module-scoped bridge between Nest's DI container and the plain-function `FileStorageInterceptor`
 * (and the deprecated static `FileStorageService` API). The module sets the registry here during
 * DI init; the interceptor reads it per request. Process-global: if the module is initialized more
 * than once, the most recent configuration wins.
 */
export const FileStorageRegistryHolder = {
    set(registry: DriverRegistry): void {
        if (current && current !== registry) {
            logger.warn(
                'NestFileStorageModule was initialized more than once in this process; the most ' +
                    'recent configuration is now active for interceptor uploads and the static API.',
            );
        }
        current = registry;
    },

    get(): DriverRegistry {
        if (!current) {
            throw new Error(
                'NestFileStorageModule is not initialized. Import NestFileStorageModule.forRoot() or ' +
                    'forRootAsync() before using FileStorageInterceptor or the static FileStorageService API.',
            );
        }
        return current;
    },

    /** Test helper: clear the active registry. */
    reset(): void {
        current = undefined;
    },
};
