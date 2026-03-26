/**
 * MCP Server Trust Decay (M-11)
 *
 * Tracks trust levels for connected MCP servers with automatic decay
 * on missed verification windows.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ServerTrust {
  serverId: string;
  trustLevel: number;
  lastVerified: number;
  verificationCadence: number;
  frozen: boolean;
  frozenReason?: string;
  decayRate: number;
}

// ---------------------------------------------------------------------------
// McpTrustDecay
// ---------------------------------------------------------------------------

export class McpTrustDecay {
  private servers: Map<string, ServerTrust> = new Map();

  constructor() {}

  registerServer(serverId: string, initialTrust: number = 100): ServerTrust {
    const trust: ServerTrust = {
      serverId,
      trustLevel: initialTrust,
      lastVerified: Date.now(),
      verificationCadence: 86_400_000, // 24h
      frozen: false,
      decayRate: 5,
    };
    this.servers.set(serverId, trust);
    return { ...trust };
  }

  verify(serverId: string): ServerTrust {
    const trust = this.servers.get(serverId);
    if (!trust) throw new Error(`Server ${serverId} not registered`);
    if (!trust.frozen) {
      trust.trustLevel = 100;
    }
    trust.lastVerified = Date.now();
    return { ...trust };
  }

  freezeTrust(serverId: string, reason: string): ServerTrust {
    const trust = this.servers.get(serverId);
    if (!trust) throw new Error(`Server ${serverId} not registered`);
    trust.frozen = true;
    trust.frozenReason = reason;
    return { ...trust };
  }

  unfreezeTrust(serverId: string): ServerTrust {
    const trust = this.servers.get(serverId);
    if (!trust) throw new Error(`Server ${serverId} not registered`);
    trust.frozen = false;
    trust.frozenReason = undefined;
    return { ...trust };
  }

  applyDecay(): ServerTrust[] {
    const now = Date.now();
    const decayed: ServerTrust[] = [];
    for (const trust of this.servers.values()) {
      if (trust.frozen) continue;
      const elapsed = now - trust.lastVerified;
      if (elapsed > trust.verificationCadence) {
        const missedWindows = Math.floor(elapsed / trust.verificationCadence);
        const decay = missedWindows * trust.decayRate;
        trust.trustLevel = Math.max(0, trust.trustLevel - decay);
        decayed.push({ ...trust });
      }
    }
    return decayed;
  }

  getTrust(serverId: string): ServerTrust | undefined {
    const trust = this.servers.get(serverId);
    return trust ? { ...trust } : undefined;
  }

  getAllTrust(): ServerTrust[] {
    return Array.from(this.servers.values()).map((t) => ({ ...t }));
  }

  isTrusted(serverId: string, minTrust: number = 50): boolean {
    const trust = this.servers.get(serverId);
    if (!trust) return false;
    return trust.trustLevel >= minTrust;
  }
}
