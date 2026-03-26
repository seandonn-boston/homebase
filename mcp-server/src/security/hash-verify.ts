/**
 * Binary Hash Verifier (M-13)
 *
 * Registers and verifies SHA-256 hashes for MCP server binaries.
 * Zero external dependencies — Node.js built-ins only.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HashEntry {
  serverId: string;
  hash: string;
  registeredAt: number;
}

// ---------------------------------------------------------------------------
// BinaryHashVerifier
// ---------------------------------------------------------------------------

export class BinaryHashVerifier {
  private registry: Map<string, HashEntry> = new Map();

  constructor() {}

  registerHash(serverId: string, hash: string): void {
    this.registry.set(serverId, {
      serverId,
      hash,
      registeredAt: Date.now(),
    });
  }

  verify(serverId: string, currentHash: string): { valid: boolean; reason?: string } {
    const entry = this.registry.get(serverId);
    if (!entry) {
      return { valid: false, reason: "Server not registered" };
    }
    if (entry.hash !== currentHash) {
      return { valid: false, reason: "Hash mismatch — binary may have been tampered with" };
    }
    return { valid: true };
  }

  revokeServer(serverId: string): void {
    this.registry.delete(serverId);
  }

  getRegisteredServers(): { serverId: string; hash: string; registeredAt: number }[] {
    return Array.from(this.registry.values()).map((e) => ({ ...e }));
  }
}
