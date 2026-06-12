import type { Request } from 'express';

import type { MaybePromise } from './tenant.types';

/** A function that extracts a tenant id from a request (or `undefined` if none). */
export type TenantResolveFn = (req: Request) => MaybePromise<string | undefined>;

function getByPath(obj: unknown, path: string): unknown {
    return path.split('.').reduce<unknown>((acc, key) => {
        if (acc == null || typeof acc !== 'object') return undefined;
        return (acc as Record<string, unknown>)[key];
    }, obj);
}

/**
 * Composable tenant-id resolvers for the common strategies. The library performs no authentication —
 * these only read an already-trusted value off the request (set by your auth guard/middleware).
 * Combine several with `tenantFrom.first(...)`, or write your own `(req) => id`.
 */
export const tenantFrom = {
    /** Read from `req.user` (populated by your auth guard). `path` defaults to `'tenantId'`. */
    jwt(path = 'tenantId'): TenantResolveFn {
        return (req) => {
            const user = (req as Request & { user?: unknown }).user;
            const value = user != null ? getByPath(user, path) : undefined;
            return value != null ? String(value) : undefined;
        };
    },

    /** Read from a request header (e.g. `X-Tenant-Id`). */
    header(name: string): TenantResolveFn {
        const lower = name.toLowerCase();
        return (req) => {
            const value = req.headers?.[lower];
            const single = Array.isArray(value) ? value[0] : value;
            return single ? String(single) : undefined;
        };
    },

    /**
     * Read from the host's subdomain. With `rootDomain`, strips it and returns the first remaining
     * label (`acme.app.com` + rootDomain `app.com` → `acme`). Without it, returns the first label
     * when the host has at least three parts. `www` (or any `ignore` entry) yields `undefined`.
     */
    subdomain(options: { rootDomain?: string; ignore?: string[] } = {}): TenantResolveFn {
        const ignore = new Set((options.ignore ?? ['www']).map((s) => s.toLowerCase()));
        return (req) => {
            const host = String(req.headers?.host ?? '').split(':')[0].toLowerCase();
            if (!host) return undefined;

            if (options.rootDomain) {
                const root = options.rootDomain.toLowerCase();
                if (host === root || !host.endsWith(`.${root}`)) return undefined;
                const sub = host.slice(0, -(root.length + 1)).split('.')[0];
                return sub && !ignore.has(sub) ? sub : undefined;
            }

            const parts = host.split('.');
            if (parts.length < 3) return undefined;
            const sub = parts[0];
            return sub && !ignore.has(sub) ? sub : undefined;
        };
    },

    /** Read from a route param (e.g. `/t/:tenantId`). */
    param(name: string): TenantResolveFn {
        return (req) => {
            const value = (req.params as Record<string, unknown> | undefined)?.[name];
            return value != null ? String(value) : undefined;
        };
    },

    /** Read from a query parameter (e.g. `?tenant=acme`). */
    query(name: string): TenantResolveFn {
        return (req) => {
            const value = (req.query as Record<string, unknown> | undefined)?.[name];
            const single = Array.isArray(value) ? value[0] : value;
            return single != null ? String(single) : undefined;
        };
    },

    /** Try each resolver in order; return the first tenant id found. */
    first(...resolvers: TenantResolveFn[]): TenantResolveFn {
        return async (req) => {
            for (const resolve of resolvers) {
                const value = await resolve(req);
                if (value != null && value !== '') return value;
            }
            return undefined;
        };
    },
};
