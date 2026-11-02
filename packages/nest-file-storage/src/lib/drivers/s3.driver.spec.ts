import * as sdk from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { S3Driver, type S3DriverDeps } from './s3.driver';

// Real SDK + presigner: signing is offline, so no network or credentials are needed.
const makeDriver = () =>
  new S3Driver({ sdk, getSignedUrl } as unknown as S3DriverDeps, {
    bucket: 'my-bucket',
    region: 'us-east-1',
    accessKeyId: 'AKIDEXAMPLE',
    secretAccessKey: 'secret',
    prefix: 'my-app',
  });

describe('S3Driver signed URLs', () => {
  it('getSignedUploadUrl presigns a PUT for exactly the given key', async () => {
    const url = new URL(await makeDriver().getSignedUploadUrl('my-app/photos/a.jpg', { expiresIn: 300 }));
    expect(url.pathname).toBe('/my-app/photos/a.jpg');
    expect(url.searchParams.get('X-Amz-Expires')).toBe('300');
    expect(url.searchParams.get('x-id')).toBe('PutObject');
    // No default checksum of an empty body — S3 would reject the client's real upload with it.
    expect(url.searchParams.has('x-amz-checksum-crc32')).toBe(false);
    expect(url.searchParams.has('x-amz-sdk-checksum-algorithm')).toBe(false);
  });

  it('signs contentType and contentLength as headers the client must send', async () => {
    const url = new URL(
      await makeDriver().getSignedUploadUrl('a.pdf', { contentType: 'application/pdf', contentLength: 1234 }),
    );
    const signed = url.searchParams.get('X-Amz-SignedHeaders')!.split(';');
    expect(signed).toEqual(expect.arrayContaining(['content-type', 'content-length']));
  });

  it('rejects an empty key', async () => {
    await expect(makeDriver().getSignedUploadUrl('')).rejects.toThrow(/Key is required/);
  });

  it('getSignedUrl still presigns a GET', async () => {
    const url = new URL(await makeDriver().getSignedUrl('a.jpg'));
    expect(url.searchParams.get('x-id')).toBe('GetObject');
  });
});
