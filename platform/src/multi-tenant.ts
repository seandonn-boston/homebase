/**
 * Multi-Tenant Support (GP-03)
 *
 * Tenant isolation for policies, audit trails, and Brain namespaces.
 * Supports shared global policies that cannot be overridden.
 */

export interface Tenant {
  id: string;
  name: string;
  createdAt: number;
  config: TenantConfig;
}

export interface TenantConfig {
  brainNamespace: string;
  policyOverrides: Record<string, unknown>;
  auditRetentionDays: number;
  maxAgents: number;
}

export interface GlobalPolicy {
  id: string;
  name: string;
  rule: string;
  enforceAcrossTenants: boolean;
}

export class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private globalPolicies: GlobalPolicy[] = [];

  createTenant(id: string, name: string, config?: Partial<TenantConfig>): Tenant {
    if (this.tenants.has(id)) throw new Error(`Tenant ${id} already exists`);
    const tenant: Tenant = {
      id,
      name,
      createdAt: Date.now(),
      config: {
        brainNamespace: `brain_${id}`,
        policyOverrides: {},
        auditRetentionDays: 90,
        maxAgents: 50,
        ...config,
      },
    };
    this.tenants.set(id, tenant);
    return tenant;
  }

  getTenant(id: string): Tenant | undefined {
    return this.tenants.get(id);
  }

  listTenants(): Tenant[] {
    return Array.from(this.tenants.values());
  }

  addGlobalPolicy(policy: GlobalPolicy): void {
    this.globalPolicies.push(policy);
  }

  getEffectivePolicies(tenantId: string): GlobalPolicy[] {
    const tenant = this.tenants.get(tenantId);
    const global = this.globalPolicies.filter((p) => p.enforceAcrossTenants);
    if (!tenant) return global;
    return global;
  }

  getBrainNamespace(tenantId: string): string {
    const tenant = this.tenants.get(tenantId);
    return tenant?.config.brainNamespace ?? `brain_${tenantId}`;
  }
}
