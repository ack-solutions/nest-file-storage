import { BadRequestException } from '@nestjs/common';
import type { Request } from 'express';

import type { DriverFactory, StorageDriver } from './drivers/driver.interface';
import type { TenantDriverSpec, TenantOptions } from './tenant/tenant.types';
import type { FileStorageModuleOptions } from './types';
import type { UploadValidation } from './validation';

/** A driver plus the key prefix to apply for this resolution (tenant isolation), if any. */
export interface ResolvedDriver {
    driver: StorageDriver;
    prefix?: string;
}

interface TenantCacheEntry extends ResolvedDriver {
    expiresAt?: number;
}

const DEFAULT_TENANT_CACHE_MAX = 100;

/**
 * Owns the named drivers and resolves them on demand. Driver instances are built once and cached
 * (fixing the v1 per-request SDK-client churn and Map leak). Also owns multi-tenant resolution with
 * a per-tenant driver cache. Both the interceptor and the service resolve through this one registry,
 * so custom and tenant drivers behave identically everywhere.
 */
export class DriverRegistry {
    private readonly factories: Record<string, DriverFactory>;
    private readonly defaultName: string;
    private readonly tenant?: TenantOptions;
    private readonly validation?: UploadValidation;
    private readonly instanceCache = new Map<string, StorageDriver>();
    private readonly tenantCache = new Map<string, TenantCacheEntry>();
    private readonly tenantCacheMax: number;
    private readonly tenantTtlMs?: number;

    constructor(options: FileStorageModuleOptions) {
        this.factories = { ...options.drivers };
        this.defaultName = options.default;
        this.tenant = options.tenant;
        this.validation = options.validation;
        this.tenantCacheMax = options.tenant?.cache?.max ?? DEFAULT_TENANT_CACHE_MAX;
        this.tenantTtlMs = options.tenant?.cache?.ttlMs;

        if (!this.factories[this.defaultName]) {
            const available = Object.keys(this.factories).join(', ') || '(none)';
            throw new Error(
                `Default storage driver "${this.defaultName}" is not registered. Registered drivers: ${available}.`,
            );
        }
    }

    get defaultDriverName(): string {
        return this.defaultName;
    }

    /** Module-level default validation, merged with per-route validation by the interceptor. */
    get defaultValidation(): UploadValidation | undefined {
        return this.validation;
    }

    hasTenantResolution(): boolean {
        return !!this.tenant;
    }

    /** Resolve a driver by name (the default when omitted), caching the built instance. */
    async get(name?: string): Promise<StorageDriver> {
        const key = name ?? this.defaultName;
        const cached = this.instanceCache.get(key);
        if (cached) return cached;

        const factory = this.factories[key];
        if (!factory) {
            const available = Object.keys(this.factories).join(', ') || '(none)';
            throw new Error(`Unknown storage driver "${key}". Registered drivers: ${available}.`);
        }
        const driver = await factory();
        this.instanceCache.set(key, driver);
        return driver;
    }

    /** Register (or replace) a named driver at runtime; clears any cached instance for that name. */
    registerDriver(name: string, factory: DriverFactory): void {
        this.factories[name] = factory;
        this.instanceCache.delete(name);
    }

    /** Whether a driver name is registered. */
    has(name: string): boolean {
        return !!this.factories[name];
    }

    /** Drop a cached driver instance (e.g. after rotating credentials). */
    invalidate(name: string): void {
        this.instanceCache.delete(name);
    }

    /** Drop a cached tenant driver (e.g. after a tenant changes its storage settings). */
    invalidateTenant(tenantId: string): void {
        this.tenantCache.delete(tenantId);
    }

    /** Resolve a tenant id to a driver (+ prefix), caching the result by tenant id. */
    async getTenantDriver(tenantId: string): Promise<ResolvedDriver> {
        if (!this.tenant) {
            throw new Error('No tenant resolution is configured. Set `tenant` in the module options.');
        }
        const cached = this.tenantCache.get(tenantId);
        if (cached && (cached.expiresAt == null || cached.expiresAt > Date.now())) {
            // Bump LRU recency.
            this.tenantCache.delete(tenantId);
            this.tenantCache.set(tenantId, cached);
            return { driver: cached.driver, prefix: cached.prefix };
        }
        const spec = await this.tenant.driver(tenantId);
        const resolved = await this.resolveSpec(spec);
        this.storeTenant(tenantId, resolved);
        return resolved;
    }

    /**
     * Resolve the driver for a request. Precedence: an explicit route driver →
     * tenant resolution (when configured and not opted out) → the default driver.
     */
    async resolveForRequest(
        req: Request,
        opts: { driver?: string | ((req: Request) => string); tenant?: false },
    ): Promise<ResolvedDriver> {
        if (opts.driver) {
            const name = typeof opts.driver === 'function' ? opts.driver(req) : opts.driver;
            return { driver: await this.get(name) };
        }

        if (this.tenant && opts.tenant !== false) {
            const tenantId = await this.tenant.resolve(req);
            if (tenantId != null && tenantId !== '') {
                return this.getTenantDriver(tenantId);
            }
            if ((this.tenant.fallback ?? 'default') === 'error') {
                throw new BadRequestException('Unable to determine the storage tenant for this request.');
            }
        }

        return { driver: await this.get() };
    }

    private async resolveSpec(spec: TenantDriverSpec): Promise<ResolvedDriver> {
        if (typeof spec === 'string') {
            return { driver: await this.get(spec) };
        }
        if ('use' in spec) {
            return { driver: await this.get(spec.use), prefix: spec.prefix };
        }
        return { driver: await spec.factory(), prefix: spec.prefix };
    }

    private storeTenant(tenantId: string, resolved: ResolvedDriver): void {
        const entry: TenantCacheEntry = {
            ...resolved,
            expiresAt: this.tenantTtlMs ? Date.now() + this.tenantTtlMs : undefined,
        };
        this.tenantCache.set(tenantId, entry);
        while (this.tenantCache.size > this.tenantCacheMax) {
            const oldest = this.tenantCache.keys().next().value;
            if (oldest === undefined) break;
            this.tenantCache.delete(oldest);
        }
    }
}
