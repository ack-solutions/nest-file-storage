import { DriverRegistry } from './driver-registry';
import type { StorageDriver, UploadedFile } from './drivers/driver.interface';
import type { FileStorageModuleOptions } from './types';

function makeDriver(tag: string): StorageDriver {
  return {
    async putFile(content, key): Promise<UploadedFile> {
      return { key, url: `${tag}://${key}`, originalName: key, fileName: key, size: content.length, fullPath: key };
    },
    async getFile() {
      return Buffer.alloc(0);
    },
    async deleteFile() {},
    async copyFile(_s, dest): Promise<UploadedFile> {
      return { key: dest, url: '', originalName: dest, fileName: dest, size: 0, fullPath: dest };
    },
    getUrl(key) {
      return `${tag}://${key}`;
    },
  };
}

const opts = (over: Partial<FileStorageModuleOptions> = {}): FileStorageModuleOptions => ({
  default: 'local',
  drivers: { local: () => makeDriver('local'), s3: () => makeDriver('s3') },
  ...over,
});

describe('DriverRegistry', () => {
  it('throws if the default driver is not registered', () => {
    expect(() => new DriverRegistry({ default: 'nope', drivers: {} })).toThrow(/not registered/);
  });

  it('caches the built driver instance', async () => {
    let built = 0;
    const reg = new DriverRegistry(opts({ drivers: { local: () => { built++; return makeDriver('local'); } } }));
    const a = await reg.get();
    const b = await reg.get('local');
    expect(a).toBe(b);
    expect(built).toBe(1);
  });

  it('throws a helpful error for an unknown driver', async () => {
    const reg = new DriverRegistry(opts());
    await expect(reg.get('nope')).rejects.toThrow(/Unknown storage driver "nope"/);
  });

  it('registerDriver adds at runtime; invalidate drops the cached instance', async () => {
    let built = 0;
    const reg = new DriverRegistry(opts());
    reg.registerDriver('mem', () => { built++; return makeDriver('mem'); });
    const a = await reg.get('mem');
    expect(built).toBe(1);
    reg.invalidate('mem');
    const b = await reg.get('mem');
    expect(built).toBe(2);
    expect(a).not.toBe(b);
  });

  describe('tenant resolution', () => {
    it('resolves a string spec to a registered driver', async () => {
      const reg = new DriverRegistry(opts({ tenant: { resolve: () => 't', driver: () => 's3' } }));
      const { driver, prefix } = await reg.getTenantDriver('t');
      expect(prefix).toBeUndefined();
      expect(driver.getUrl('k')).toBe('s3://k');
    });

    it('resolves a shared driver + prefix', async () => {
      const reg = new DriverRegistry(opts({ tenant: { resolve: () => 't', driver: () => ({ use: 'local', prefix: 'tenants/t' }) } }));
      const { driver, prefix } = await reg.getTenantDriver('t');
      expect(prefix).toBe('tenants/t');
      expect(driver.getUrl('k')).toBe('local://k');
    });

    it('resolves a dedicated factory and caches it per tenant', async () => {
      let built = 0;
      const reg = new DriverRegistry(opts({ tenant: { resolve: () => 't', driver: () => ({ factory: () => { built++; return makeDriver('ded'); } }) } }));
      const a = await reg.getTenantDriver('t');
      const b = await reg.getTenantDriver('t');
      expect(built).toBe(1);
      expect(a.driver).toBe(b.driver);
    });

    it('invalidateTenant forces a rebuild', async () => {
      let built = 0;
      const reg = new DriverRegistry(opts({ tenant: { resolve: () => 't', driver: () => ({ factory: () => { built++; return makeDriver('ded'); } }) } }));
      await reg.getTenantDriver('t');
      reg.invalidateTenant('t');
      await reg.getTenantDriver('t');
      expect(built).toBe(2);
    });

    it('resolveForRequest precedence: explicit driver > tenant > default', async () => {
      const reg = new DriverRegistry(
        opts({ tenant: { resolve: (r: { tenantId?: string }) => r.tenantId, driver: () => ({ use: 'local', prefix: 'p' }) } }),
      );
      const explicit = await reg.resolveForRequest({ tenantId: 't' } as never, { driver: 's3' });
      expect(explicit.driver.getUrl('k')).toBe('s3://k');

      const tenant = await reg.resolveForRequest({ tenantId: 't' } as never, {});
      expect(tenant.prefix).toBe('p');

      const fallback = await reg.resolveForRequest({} as never, {});
      expect(fallback.driver.getUrl('k')).toBe('local://k');
    });

    it('supports a function driver selector', async () => {
      const reg = new DriverRegistry(opts());
      const r = await reg.resolveForRequest({} as never, { driver: () => 's3' });
      expect(r.driver.getUrl('k')).toBe('s3://k');
    });

    it('fallback "error" throws when no tenant id resolves', async () => {
      const reg = new DriverRegistry(opts({ tenant: { resolve: () => undefined, driver: () => 'local', fallback: 'error' } }));
      await expect(reg.resolveForRequest({} as never, {})).rejects.toThrow();
    });

    it('tenant:false skips tenant resolution', async () => {
      const reg = new DriverRegistry(opts({ tenant: { resolve: () => 't', driver: () => ({ use: 's3' }) } }));
      const r = await reg.resolveForRequest({} as never, { tenant: false });
      expect(r.driver.getUrl('k')).toBe('local://k');
    });
  });
});
