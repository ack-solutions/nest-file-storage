/** DI token holding the resolved {@link FileStorageModuleOptions}. */
export const FILE_STORAGE_OPTIONS = Symbol('FILE_STORAGE_OPTIONS');

/** DI token holding the {@link DriverRegistry} instance. */
export const FILE_STORAGE_REGISTRY = Symbol('FILE_STORAGE_REGISTRY');

/**
 * @deprecated v1 string token. Inject {@link FILE_STORAGE_OPTIONS} instead. Kept so any external
 * code referencing the old token keeps resolving. Removed in v3.
 */
export const FILE_STORAGE_OPTIONS_LEGACY = 'FileStorageOptions';
