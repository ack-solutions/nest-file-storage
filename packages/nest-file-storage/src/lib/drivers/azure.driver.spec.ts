import * as sdk from '@azure/storage-blob';

import { AzureDriver, type AzureDriverDeps } from './azure.driver';

const makeDriver = (cdnUrl?: string) =>
  new AzureDriver({ sdk } as unknown as AzureDriverDeps, {
    account: 'myaccount',
    // Any base64 value works: SAS signing is offline.
    accountKey: Buffer.from('test-key').toString('base64'),
    container: 'files',
    cdnUrl,
  });

describe('AzureDriver signed URLs', () => {
  it('getSignedUploadUrl returns a create/write SAS on the blob endpoint', async () => {
    const url = new URL(await makeDriver().getSignedUploadUrl('my-app/a.jpg', { expiresIn: 600 }));
    expect(url.origin).toBe('https://myaccount.blob.core.windows.net');
    expect(url.pathname).toBe('/files/my-app/a.jpg');
    expect(url.searchParams.get('sp')).toBe('cw');
    expect(url.searchParams.get('sig')).toBeTruthy();
  });

  it('never uses the CDN for uploads', async () => {
    const url = await makeDriver('https://cdn.example.com').getSignedUploadUrl('a.jpg');
    expect(url.startsWith('https://myaccount.blob.core.windows.net/files/a.jpg?')).toBe(true);
  });

  it('getSignedUrl still returns a read-only SAS', async () => {
    const url = new URL(await makeDriver().getSignedUrl('a.jpg'));
    expect(url.searchParams.get('sp')).toBe('r');
  });
});
