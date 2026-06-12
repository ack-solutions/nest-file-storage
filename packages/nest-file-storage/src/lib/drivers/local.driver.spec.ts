import * as fs from 'fs';
import * as os from 'os';
import { join } from 'path';
import { LocalDriver } from './local.driver';

describe('LocalDriver', () => {
  let root: string;
  let driver: LocalDriver;

  beforeEach(() => {
    root = fs.mkdtempSync(join(os.tmpdir(), 'nfs-local-'));
    driver = new LocalDriver({ rootPath: root, baseUrl: 'http://localhost/files' });
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('putFile writes nested directories and returns metadata', async () => {
    const res = await driver.putFile(Buffer.from('hello'), 'a/b/c.txt');
    expect(res.key).toBe('a/b/c.txt');
    expect(res.size).toBe(5);
    expect(res.fileName).toBe('c.txt');
    expect(res.url).toBe('http://localhost/files/a/b/c.txt');
    expect(fs.readFileSync(join(root, 'a', 'b', 'c.txt')).toString()).toBe('hello');
  });

  it('getFile reads the content back', async () => {
    await driver.putFile(Buffer.from('xy'), 'k.txt');
    expect((await driver.getFile('k.txt')).toString()).toBe('xy');
  });

  it('deleteFile removes the file', async () => {
    await driver.putFile(Buffer.from('x'), 'k.txt');
    await driver.deleteFile('k.txt');
    await expect(driver.getFile('k.txt')).rejects.toThrow();
  });

  it('copyFile duplicates content to a new key', async () => {
    await driver.putFile(Buffer.from('dup'), 'src.txt');
    const res = await driver.copyFile('src.txt', 'nested/dst.txt');
    expect(res.key).toBe('nested/dst.txt');
    expect((await driver.getFile('nested/dst.txt')).toString()).toBe('dup');
  });

  it('getUrl joins baseUrl and key, and passes through http/empty', () => {
    expect(driver.getUrl('a/b.txt')).toBe('http://localhost/files/a/b.txt');
    expect(driver.getUrl('http://x/y')).toBe('http://x/y');
    expect(driver.getUrl('')).toBe('');
  });

  it('path returns the absolute filesystem path for a key', () => {
    expect(driver.path('a/b.txt')).toBe(join(root, 'a', 'b.txt'));
  });

  it('exposes keyDefaults from options', () => {
    const d = new LocalDriver({ rootPath: root, baseUrl: 'http://x', prefix: 'p' });
    expect(d.keyDefaults?.prefix).toBe('p');
  });
});
