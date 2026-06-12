---
id: multi-tenant
title: Multi-tenant storage
sidebar_position: 6
---

# Multi-tenant storage

Route each upload to the right storage based on the request — a different **folder per tenant** in one bucket, a **dedicated bucket per tenant**, or a mix. Controllers need no tenant-specific code.

:::note The library does not authenticate
Your guard/middleware identifies the tenant (JWT, subdomain, header, …) and exposes it on the request. The `tenant.resolve` hook only **reads** that already-trusted value.
:::

## Configure

```ts
import { NestFileStorageModule, localDriver, s3Driver, tenantFrom } from '@ackplus/nest-file-storage';

NestFileStorageModule.forRootAsync({
  inject: [TenantStorageService],
  useFactory: (tenants: TenantStorageService) => ({
    default: 'local',
    drivers: {
      local: localDriver({ rootPath: './uploads', baseUrl: 'http://localhost:3000/uploads' }),
    },
    tenant: {
      // 1) Identify the tenant — try several strategies in order.
      resolve: tenantFrom.first(
        tenantFrom.jwt('tenantId'),      // req.user.tenantId (after your auth guard)
        tenantFrom.subdomain(),          // acme.app.com -> 'acme'
        tenantFrom.header('x-tenant-id'),
      ),
      // 2) Resolve a tenant -> storage (e.g. a DB lookup). Cached by tenant id.
      driver: async (tenantId) => {
        const cfg = await tenants.find(tenantId);
        if (cfg?.dedicated) {
          return { factory: s3Driver({ bucket: cfg.bucket, region: cfg.region,
            accessKeyId: cfg.key, secretAccessKey: cfg.secret }) };  // dedicated bucket
        }
        return { use: 'local', prefix: `tenants/${tenantId}` };       // shared + folder
      },
      cache: { ttlMs: 10 * 60_000, max: 500 },
      fallback: 'default', // no tenant on the request -> default driver ('error' -> 400)
    },
  }),
});
```

## Upload — no special controller code

The interceptor resolves the tenant and routes the upload automatically:

```ts
@Post('upload')
@UseInterceptors(FileStorageInterceptor('file'))
upload(@Body() body: { file: string }) {
  return { key: body.file };
}
```

## What `tenant.driver(tenantId)` returns

| Return | Meaning | Isolation |
| --- | --- | --- |
| `'local'` | a registered driver, no prefix | none |
| `{ use: 'local', prefix: 'tenants/acme' }` | a shared driver + per-tenant key prefix | folder |
| `{ factory: s3Driver({...}), prefix? }` | a dedicated driver built for this tenant | bucket/account |

This is how "mix of both" works: return a prefix spec for small tenants and a dedicated `factory` for enterprise tenants — decided per tenant from your database row.

## Caching

The **resolved driver is cached by tenant id**, so `tenant.driver(tenantId)` (and its DB lookup + any SDK-client construction) runs **once per tenant**, not per request.

- `cache.ttlMs` — rebuild after this long (default: no expiry).
- `cache.max` — max tenants kept in memory, LRU-evicted (default: 100).

When a tenant changes its storage settings, drop its cached driver:

```ts
this.fileStorage.getRegistry().invalidateTenant('acme');
```

## Programmatic access

Outside a request (background jobs, URL generation), resolve a tenant's driver via the same cache:

```ts
const { driver, prefix } = await this.fileStorage.getTenantDriver('acme');
const url = await driver.getUrl(existingKey);
// to build a NEW key with the tenant's prefix:
const key = [prefix, '2026/06', 'report.pdf'].filter(Boolean).join('/');
await driver.putFile(buffer, key);
```

## Identifying the tenant — `tenantFrom`

Composable resolvers for the common strategies; combine with `first(...)` or write your own `(req) => id`.

```ts
tenantFrom.jwt('tenantId')                       // req.user.tenantId
tenantFrom.header('x-tenant-id')                 // a request header
tenantFrom.subdomain({ rootDomain: 'app.com' })  // acme.app.com -> 'acme'
tenantFrom.param('tenantId')                     // /t/:tenantId
tenantFrom.query('tenant')                       // ?tenant=acme
tenantFrom.first(a, b, c)                         // first match wins
```

## Opting a route out

```ts
@UseInterceptors(FileStorageInterceptor('file', { tenant: false })) // use the default driver
// or force a specific driver, bypassing tenant resolution:
@UseInterceptors(FileStorageInterceptor('file', { driver: 's3' }))
```
