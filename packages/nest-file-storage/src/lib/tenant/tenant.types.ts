import type { Request } from 'express';
import type { DriverFactory } from '../drivers/driver.interface';

export type MaybePromise<T> = T | Promise<T>;

/**
 * Describes how a single tenant's files are stored. Returned by {@link TenantOptions.driver}.
 *
 * - `string` — the name of a registered (shared) driver, no per-tenant prefix.
 * - `{ use, prefix }` — a shared registered driver plus a per-tenant key prefix (folder isolation).
 * - `{ factory, prefix }` — a dedicated driver built just for this tenant (bucket/account isolation).
 */
export type TenantDriverSpec =
    | string
    | { use: string; prefix?: string }
    | { factory: DriverFactory; prefix?: string };

/** Per-tenant driver cache controls. Caching is on by default. */
export interface TenantCacheOptions {
    /** Time-to-live in milliseconds before a tenant's resolved driver is rebuilt. Default: no expiry. */
    ttlMs?: number;
    /** Maximum number of tenant drivers kept in memory (LRU eviction). Default: 100. */
    max?: number;
}

/**
 * Optional multi-tenant / dynamic per-request storage resolution. When set, the interceptor
 * resolves the tenant from each request and routes the upload to that tenant's storage.
 * The library performs no authentication — your guard/middleware authenticates and exposes
 * the tenant on the request; these hooks only read it.
 */
export interface TenantOptions {
    /** Extract the tenant id from the request. Return `undefined` when there is no tenant. */
    resolve: (req: Request) => MaybePromise<string | undefined>;

    /**
     * Resolve a tenant id to a storage spec (e.g. a DB lookup). The returned driver is cached
     * by tenant id, so this runs once per tenant until the cache expires or is invalidated.
     */
    driver: (tenantId: string) => MaybePromise<TenantDriverSpec>;

    /** Driver-instance cache controls. */
    cache?: TenantCacheOptions;

    /**
     * Behavior when no tenant id resolves on a request that requires tenant storage.
     * `'default'` falls back to the module's default driver; `'error'` throws a 400.
     * Default: `'default'`.
     */
    fallback?: 'default' | 'error';
}
