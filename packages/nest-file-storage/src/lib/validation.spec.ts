import {
  buildFileFilter,
  FileTooLargeException,
  formatBytes,
  InvalidFileTypeException,
  mergeValidation,
  toMulterLimits,
  TooManyFilesException,
} from './validation';

const file = (mimetype: string, originalname = 'photo.png') =>
  ({ mimetype, originalname }) as Express.Multer.File;

const run = (filter: NonNullable<ReturnType<typeof buildFileFilter>>, f: Express.Multer.File) =>
  new Promise<{ err: unknown; accept?: boolean }>((resolve) =>
    filter({} as never, f, (err: unknown, accept?: boolean) => resolve({ err, accept })),
  );

describe('mergeValidation', () => {
  it('overrides per key, keeping base values', () => {
    expect(mergeValidation({ maxSize: 10, maxFiles: 5 }, { maxSize: 20 })).toEqual({ maxSize: 20, maxFiles: 5 });
    expect(mergeValidation(undefined, { maxSize: 1 })).toEqual({ maxSize: 1 });
    expect(mergeValidation({ maxSize: 1 }, undefined)).toEqual({ maxSize: 1 });
  });
});

describe('toMulterLimits', () => {
  it('maps fields and omits unset ones', () => {
    expect(toMulterLimits({ maxSize: 100, maxFiles: 3 })).toEqual({ fileSize: 100, files: 3 });
    expect(toMulterLimits({ maxSize: 100 })).toEqual({ fileSize: 100 });
    expect(toMulterLimits({})).toBeUndefined();
    expect(toMulterLimits(undefined)).toBeUndefined();
  });
});

describe('formatBytes', () => {
  it('formats human-readable sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(5 * 1024 * 1024)).toBe('5 MB');
  });
});

describe('buildFileFilter', () => {
  it('returns undefined when there is nothing to check', () => {
    expect(buildFileFilter(undefined)).toBeUndefined();
    expect(buildFileFilter({ maxSize: 5 })).toBeUndefined();
  });

  it('accepts an allowed mime type', async () => {
    const filter = buildFileFilter({ allowedMimeTypes: ['image/png'] })!;
    expect(await run(filter, file('image/png'))).toEqual({ err: null, accept: true });
  });

  it('supports wildcard mime types', async () => {
    const filter = buildFileFilter({ allowedMimeTypes: ['image/*'] })!;
    expect((await run(filter, file('image/jpeg'))).accept).toBe(true);
    expect((await run(filter, file('video/mp4'))).err).toBeInstanceOf(InvalidFileTypeException);
  });

  it('rejects a disallowed mime type with a typed error', async () => {
    const filter = buildFileFilter({ allowedMimeTypes: ['image/png'] })!;
    expect((await run(filter, file('text/plain'))).err).toBeInstanceOf(InvalidFileTypeException);
  });

  it('checks extensions case-insensitively', async () => {
    const filter = buildFileFilter({ allowedExtensions: ['png'] })!;
    expect((await run(filter, file('image/png', 'PHOTO.PNG'))).accept).toBe(true);
    expect((await run(filter, file('image/png', 'doc.pdf'))).err).toBeInstanceOf(InvalidFileTypeException);
  });

  it('delegates to a user fileFilter after built-in checks', async () => {
    const userFilter = jest.fn((_req, _file, cb: (e: unknown, ok?: boolean) => void) => cb(null, true));
    const filter = buildFileFilter({ allowedMimeTypes: ['image/png'], fileFilter: userFilter as never })!;
    await run(filter, file('image/png'));
    expect(userFilter).toHaveBeenCalledTimes(1);
  });
});

describe('exceptions', () => {
  it('are HTTP 400', () => {
    expect(new FileTooLargeException(100).getStatus()).toBe(400);
    expect(new TooManyFilesException(2).getStatus()).toBe(400);
    expect(new InvalidFileTypeException('text/plain', ['image/png']).getStatus()).toBe(400);
  });
});
