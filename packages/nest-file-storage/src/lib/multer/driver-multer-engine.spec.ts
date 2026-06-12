import { Readable } from 'stream';
import type { StorageDriver, UploadedFile } from '../drivers/driver.interface';
import { DriverMulterEngine, joinKey } from './driver-multer-engine';

describe('joinKey', () => {
  it('joins segments with forward slashes', () => {
    expect(joinKey('a', 'b', 'c')).toBe('a/b/c');
  });
  it('drops empty/undefined segments', () => {
    expect(joinKey('', 'b', undefined, 'c')).toBe('b/c');
  });
  it('collapses duplicate slashes and trims edges', () => {
    expect(joinKey('/a/', 'b//c/')).toBe('a/b/c');
  });
  it('normalizes backslashes', () => {
    expect(joinKey('a\\b', 'c')).toBe('a/b/c');
  });
});

function fakeDriver() {
  const puts: Array<{ key: string; content: Buffer }> = [];
  const driver: StorageDriver = {
    async putFile(content, key): Promise<UploadedFile> {
      puts.push({ key, content });
      return { key, url: `x://${key}`, originalName: key, fileName: key, size: content.length, fullPath: key };
    },
    async getFile() {
      return Buffer.alloc(0);
    },
    async deleteFile() {},
    async copyFile(_s, dest): Promise<UploadedFile> {
      return { key: dest, url: '', originalName: dest, fileName: dest, size: 0, fullPath: dest };
    },
    getUrl(key) {
      return `x://${key}`;
    },
  };
  return { driver, puts };
}

const fakeFile = (content: string) =>
  ({
    fieldname: 'file',
    originalname: 'photo.png',
    mimetype: 'image/png',
    encoding: '7bit',
    stream: Readable.from([Buffer.from(content)]),
  }) as unknown as Express.Multer.File;

describe('DriverMulterEngine', () => {
  it('builds the key from prefix/fileDist/fileName and calls putFile', async () => {
    const { driver, puts } = fakeDriver();
    const engine = new DriverMulterEngine(driver, {
      prefix: 'pfx',
      fileDist: () => 'sub',
      fileName: () => 'name.png',
    });

    const info = await new Promise<UploadedFile>((resolve, reject) =>
      engine._handleFile({} as never, fakeFile('hello'), (err, i) =>
        err ? reject(err) : resolve(i as unknown as UploadedFile),
      ),
    );

    expect(puts).toHaveLength(1);
    expect(puts[0].key).toBe('pfx/sub/name.png');
    expect(info.key).toBe('pfx/sub/name.png');
    expect(info.size).toBe(5);
    expect(info.fieldName).toBe('file');
    expect(info.originalName).toBe('photo.png');
  });

  it('falls back to the driver keyDefaults', async () => {
    const { driver, puts } = fakeDriver();
    (driver as { keyDefaults?: unknown }).keyDefaults = { fileDist: () => 'd', fileName: () => 'n.txt' };
    const engine = new DriverMulterEngine(driver);

    await new Promise<void>((resolve, reject) =>
      engine._handleFile({} as never, fakeFile('hi'), (err) => (err ? reject(err) : resolve())),
    );
    expect(puts[0].key).toBe('d/n.txt');
  });

  it('_removeFile deletes using the stored info key', async () => {
    const { driver } = fakeDriver();
    const del = jest.spyOn(driver, 'deleteFile');
    const engine = new DriverMulterEngine(driver);

    await new Promise<void>((resolve, reject) =>
      engine._removeFile({} as never, { key: 'a/b.txt' } as never, (err) => (err ? reject(err) : resolve())),
    );
    expect(del).toHaveBeenCalledWith('a/b.txt');
  });
});
