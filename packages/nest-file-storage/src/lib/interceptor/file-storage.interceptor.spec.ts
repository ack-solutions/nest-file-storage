import type { Request } from 'express';

import { applyFileKeyMapping, FileUploadConfig } from './file-storage.interceptor';

/** Minimal stand-in for a parsed Multer file carrying our engine's metadata. */
function fakeFile(over: Record<string, unknown> = {}): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'photo.png',
    encoding: '7bit',
    mimetype: 'image/png',
    size: 1234,
    key: 'uploads/2026/06/15/uuid-photo.png',
    url: 'http://localhost/uploads/2026/06/15/uuid-photo.png',
    fullPath: 'uploads/2026/06/15/uuid-photo.png',
    ...over,
  } as unknown as Express.Multer.File;
}

function reqWith(over: Record<string, unknown> = {}): Request {
  return { body: {}, ...over } as unknown as Request;
}

const single: FileUploadConfig = { type: 'single', fieldName: 'file' };
const array: FileUploadConfig = { type: 'array', fieldName: 'files' };

describe('applyFileKeyMapping', () => {
  describe('single file', () => {
    it('writes the key to body[field] when writeToBody is true', async () => {
      const req = reqWith({ file: fakeFile() });
      await applyFileKeyMapping(req, single, undefined, true);
      expect(req.body.file).toBe('uploads/2026/06/15/uuid-photo.png');
    });

    // The regression guard: under a global forbidNonWhitelisted ValidationPipe, an undeclared
    // `file` property would 400. With writeToBody off the body must stay clean.
    it('leaves body untouched when writeToBody is false', async () => {
      const req = reqWith({ file: fakeFile() });
      await applyFileKeyMapping(req, single, undefined, false);
      expect('file' in req.body).toBe(false);
      expect(req.body).toEqual({});
    });

    it('applies a custom mapToRequestBody when writing', async () => {
      const req = reqWith({ file: fakeFile() });
      await applyFileKeyMapping(
        req,
        single,
        { mapToRequestBody: (f) => (Array.isArray(f) ? f.map((x) => x.key) : { key: f.key, size: f.size }) },
        true,
      );
      expect(req.body.file).toEqual({ key: 'uploads/2026/06/15/uuid-photo.png', size: 1234 });
    });

    it('does not run the custom mapper when writeToBody is false', async () => {
      const mapper = jest.fn();
      const req = reqWith({ file: fakeFile() });
      await applyFileKeyMapping(req, single, { mapToRequestBody: mapper }, false);
      expect(mapper).not.toHaveBeenCalled();
      expect('file' in req.body).toBe(false);
    });

    it('overwriteBodyField:false keeps an existing body value', async () => {
      const req = reqWith({ file: fakeFile(), body: { file: 'preset' } });
      await applyFileKeyMapping(req, single, { overwriteBodyField: false }, true);
      expect(req.body.file).toBe('preset');
    });
  });

  describe('array upload', () => {
    it('writes the keys array when writeToBody is true', async () => {
      const req = reqWith({
        files: [fakeFile({ fieldname: 'files', key: 'a' }), fakeFile({ fieldname: 'files', key: 'b' })],
      });
      await applyFileKeyMapping(req, array, undefined, true);
      expect(req.body.files).toEqual(['a', 'b']);
    });

    it('leaves body untouched when writeToBody is false', async () => {
      const req = reqWith({ files: [fakeFile({ fieldname: 'files', key: 'a' })] });
      await applyFileKeyMapping(req, array, undefined, false);
      expect('files' in req.body).toBe(false);
    });
  });
});
