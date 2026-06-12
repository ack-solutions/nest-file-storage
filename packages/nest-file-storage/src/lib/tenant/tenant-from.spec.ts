import type { Request } from 'express';
import { tenantFrom } from './tenant-from';

const req = (over: Partial<Record<string, unknown>> = {}) =>
  ({ headers: {}, params: {}, query: {}, ...over }) as unknown as Request;

describe('tenantFrom', () => {
  it('jwt reads req.user at the given path', async () => {
    expect(await tenantFrom.jwt()(req({ user: { tenantId: 'acme' } }))).toBe('acme');
    expect(await tenantFrom.jwt('org.id')(req({ user: { org: { id: 7 } } }))).toBe('7');
    expect(await tenantFrom.jwt()(req())).toBeUndefined();
  });

  it('header reads case-insensitively', async () => {
    expect(await tenantFrom.header('x-tenant-id')(req({ headers: { 'x-tenant-id': 'acme' } }))).toBe('acme');
    expect(await tenantFrom.header('X-Tenant-Id')(req({ headers: { 'x-tenant-id': 'acme' } }))).toBe('acme');
    expect(await tenantFrom.header('x-tenant-id')(req())).toBeUndefined();
  });

  it('subdomain parses the host', async () => {
    expect(await tenantFrom.subdomain()(req({ headers: { host: 'acme.app.com' } }))).toBe('acme');
    expect(await tenantFrom.subdomain()(req({ headers: { host: 'app.com' } }))).toBeUndefined();
    expect(await tenantFrom.subdomain()(req({ headers: { host: 'www.app.com' } }))).toBeUndefined();
    expect(await tenantFrom.subdomain({ rootDomain: 'app.com' })(req({ headers: { host: 'acme.app.com' } }))).toBe('acme');
    expect(await tenantFrom.subdomain({ rootDomain: 'app.com' })(req({ headers: { host: 'app.com' } }))).toBeUndefined();
  });

  it('param and query', async () => {
    expect(await tenantFrom.param('tenantId')(req({ params: { tenantId: 'acme' } }))).toBe('acme');
    expect(await tenantFrom.query('tenant')(req({ query: { tenant: 'acme' } }))).toBe('acme');
  });

  it('first returns the first match', async () => {
    const resolve = tenantFrom.first(tenantFrom.header('x-tenant-id'), tenantFrom.query('tenant'));
    expect(await resolve(req({ query: { tenant: 'q' } }))).toBe('q');
    expect(await resolve(req({ headers: { 'x-tenant-id': 'h' }, query: { tenant: 'q' } }))).toBe('h');
    expect(await resolve(req())).toBeUndefined();
  });
});
