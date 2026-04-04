/**
 * Multi-Repository Support (IF-04)
 *
 * Hub-and-spoke governance across multiple repositories with
 * shared policies, per-repo overrides, and unified health metrics.
 *
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RepoConfig {
  id: string;
  name: string;
  path: string;
  standingOrderOverrides: Record<string, "enforce" | "monitor" | "disabled">;
  brainNamespace: string;
  policyOverrides: Record<string, unknown>;
}

export interface HubConfig {
  sharedStandingOrders: string[];
  sharedPolicies: Record<string, unknown>;
  repos: RepoConfig[];
}

export interface MultiRepoHealthReport {
  timestamp: string;
  repos: RepoHealth[];
  aggregateHealth: "healthy" | "degraded" | "unhealthy";
  crossRepoIssues: string[];
}

export interface RepoHealth {
  repoId: string;
  name: string;
  health: "healthy" | "degraded" | "unhealthy";
  hookCount: number;
  coveragePercent: number;
  lastActivity: string;
}

// ---------------------------------------------------------------------------
// Multi-Repo Manager
// ---------------------------------------------------------------------------

export class MultiRepoManager {
  private hub: HubConfig;

  constructor(sharedStandingOrders: string[] = [], sharedPolicies: Record<string, unknown> = {}) {
    this.hub = { sharedStandingOrders, sharedPolicies, repos: [] };
  }

  addRepo(config: RepoConfig): void {
    this.hub.repos.push(config);
  }

  removeRepo(repoId: string): boolean {
    const idx = this.hub.repos.findIndex((r) => r.id === repoId);
    if (idx === -1) return false;
    this.hub.repos.splice(idx, 1);
    return true;
  }

  getRepo(repoId: string): RepoConfig | undefined {
    return this.hub.repos.find((r) => r.id === repoId);
  }

  getEffectivePolicy(repoId: string): Record<string, unknown> {
    const repo = this.getRepo(repoId);
    return { ...this.hub.sharedPolicies, ...(repo?.policyOverrides ?? {}) };
  }

  getEffectiveStandingOrders(repoId: string): Record<string, string> {
    const repo = this.getRepo(repoId);
    const effective: Record<string, string> = {};
    for (const so of this.hub.sharedStandingOrders) {
      effective[so] = "enforce";
    }
    if (repo) {
      for (const [so, mode] of Object.entries(repo.standingOrderOverrides)) {
        effective[so] = mode;
      }
    }
    return effective;
  }

  computeHealth(repoHealthData: RepoHealth[]): MultiRepoHealthReport {
    const unhealthyCount = repoHealthData.filter((r) => r.health === "unhealthy").length;
    const degradedCount = repoHealthData.filter((r) => r.health === "degraded").length;

    let aggregateHealth: MultiRepoHealthReport["aggregateHealth"];
    if (unhealthyCount > 0) aggregateHealth = "unhealthy";
    else if (degradedCount > repoHealthData.length / 3) aggregateHealth = "degraded";
    else aggregateHealth = "healthy";

    const crossRepoIssues: string[] = [];
    const coverages = repoHealthData.map((r) => r.coveragePercent);
    if (coverages.length > 1) {
      const maxGap = Math.max(...coverages) - Math.min(...coverages);
      if (maxGap > 30) {
        crossRepoIssues.push(`Coverage gap of ${maxGap}% between repos`);
      }
    }

    return {
      timestamp: new Date().toISOString(),
      repos: repoHealthData,
      aggregateHealth,
      crossRepoIssues,
    };
  }

  getRepoCount(): number {
    return this.hub.repos.length;
  }
}
