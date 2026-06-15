import type { DynamicModule, Provider } from '@nestjs/common';

import { FILE_STORAGE_OPTIONS } from './constants';
import { localDriver } from './drivers';
import { NestFileStorageModule } from './nest-file-storage.module';
import {
  FileStorageAsyncOptions,
  FileStorageEnum,
  FileStorageModuleOptions,
  FileStorageModuleOptionsInput,
  FileStorageOptionsFactory,
  V1FileStorageModuleOptions,
} from './types';

// A v1 config typed as the deprecated union — the async option factories must accept this shape,
// mirroring `forRoot()`. If the async return types are ever narrowed back to the v2-only
// `FileStorageModuleOptions`, the typed assignments below stop compiling and ts-jest fails the run.
const v1Local: V1FileStorageModuleOptions = {
  storage: FileStorageEnum.LOCAL,
  localConfig: { rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' },
};

const v2Local: FileStorageModuleOptions = {
  default: 'local',
  drivers: { local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }) },
};

/** Pull the FILE_STORAGE_OPTIONS factory provider out of a DynamicModule and run its factory. */
function optionFactory(mod: DynamicModule): (...args: unknown[]) => Promise<FileStorageModuleOptions> {
  const provider = (mod.providers ?? []).find(
    (p): p is Extract<Provider, { provide: unknown }> =>
      typeof p === 'object' && p !== null && 'provide' in p && p.provide === FILE_STORAGE_OPTIONS,
  );
  const factory = (provider as { useFactory?: (...args: unknown[]) => Promise<FileStorageModuleOptions> })?.useFactory;
  if (!factory) throw new Error('FILE_STORAGE_OPTIONS factory provider not found');
  return factory;
}

describe('NestFileStorageModule.forRootAsync', () => {
  it('translates a v1 config returned from useFactory to the v2 shape', async () => {
    const asyncOptions: FileStorageAsyncOptions = { useFactory: () => v1Local };
    const opts = await optionFactory(NestFileStorageModule.forRootAsync(asyncOptions))();
    expect(opts.default).toBe('local');
    expect(typeof opts.drivers.local).toBe('function');
  });

  it('passes a v2 config returned from useFactory through unchanged', async () => {
    const asyncOptions: FileStorageAsyncOptions = { useFactory: () => v2Local };
    const opts = await optionFactory(NestFileStorageModule.forRootAsync(asyncOptions))();
    expect(opts).toBe(v2Local);
  });

  it('translates a v1 config returned from a useClass options factory', async () => {
    class ConfigFactory implements FileStorageOptionsFactory {
      createFileStorageOptions(): FileStorageModuleOptionsInput {
        return v1Local;
      }
    }
    const opts = await optionFactory(NestFileStorageModule.forRootAsync({ useClass: ConfigFactory }))(
      new ConfigFactory(),
    );
    expect(opts.default).toBe('local');
    expect(typeof opts.drivers.local).toBe('function');
  });
});
