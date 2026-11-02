import { DriverRegistry } from './driver-registry';
import type { StorageDriver, UploadedFile } from './drivers/driver.interface';
import { FileStorageService } from './file-storage.service';
import { resolveKey } from './multer/driver-multer-engine';

function makeDriver(extra: Partial<StorageDriver> = {}): StorageDriver {
  return {
    keyDefaults: { prefix: 'my-app' },
    async putFile(content, key): Promise<UploadedFile> {
      return { key, url: key, originalName: key, fileName: key, size: content.length, fullPath: key };
    },
    async getFile() {
      return Buffer.alloc(0);
    },
    async deleteFile() {},
    async copyFile(_s, dest): Promise<UploadedFile> {
      return { key: dest, url: '', originalName: dest, fileName: dest, size: 0, fullPath: dest };
    },
    getUrl(key) {
      return `url://${key}`;
    },
    ...extra,
  };
}

const makeService = (driver: StorageDriver) =>
  new FileStorageService(new DriverRegistry({ default: 'main', drivers: { main: () => driver, bare: () => makeDriver({ keyDefaults: undefined }) } }));

describe('resolveKey', () => {
  it('prepends the driver prefix, like uploads', () => {
    expect(resolveKey(makeDriver(), 'tenants/acme', 'a.pdf')).toBe('my-app/tenants/acme/a.pdf');
  });

  it('is a plain join when the driver has no prefix', () => {
    expect(resolveKey({}, '/reports/', 'a.pdf')).toBe('reports/a.pdf');
  });
});

describe('FileStorageService', () => {
  it('resolveKey uses the default driver, or a named one', async () => {
    const service = makeService(makeDriver());
    expect(await service.resolveKey('reports/a.pdf')).toBe('my-app/reports/a.pdf');
    expect(await service.resolveKey('reports/a.pdf', 'bare')).toBe('reports/a.pdf');
  });

  it('direct methods use the key exactly as given (stored keys are already full)', async () => {
    const service = makeService(makeDriver());
    const res = await service.putFile(Buffer.from('x'), 'my-app/a.txt');
    expect(res.key).toBe('my-app/a.txt');
  });

  it('getSignedUploadUrl passes the key and options to the driver', async () => {
    const getSignedUploadUrl = jest.fn(async (key: string) => `signed://${key}`);
    const service = makeService(makeDriver({ getSignedUploadUrl }));
    const opts = { expiresIn: 60, contentType: 'image/png' };
    expect(await service.getSignedUploadUrl('my-app/a.png', opts)).toBe('signed://my-app/a.png');
    expect(getSignedUploadUrl).toHaveBeenCalledWith('my-app/a.png', opts);
  });

  it('getSignedUploadUrl throws when the driver cannot sign uploads', async () => {
    await expect(makeService(makeDriver()).getSignedUploadUrl('a.png')).rejects.toThrow(/does not support signed upload URLs/);
  });
});
