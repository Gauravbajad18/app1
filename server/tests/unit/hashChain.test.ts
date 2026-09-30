import { describe, it, expect } from "vitest";
import {
  HashChainService,
  GENESIS_PREV_HASH,
  StoredAuditLog,
  canonicalJsonStringify
} from "../../src/services/audit/hashChain";

describe("Tamper-Evident Hash Chain Cryptographic Verification", () => {
  it("generates deterministic canonical JSON regardless of object key ordering", () => {
    const objA = { z: 1, a: 2, m: { nestedB: "test", nestedA: true } };
    const objB = { a: 2, m: { nestedA: true, nestedB: "test" }, z: 1 };

    expect(canonicalJsonStringify(objA)).toEqual(canonicalJsonStringify(objB));
  });

  it("verifies an intact audit log chain", () => {
    const orgId = "org-test-uuid";
    const entries: StoredAuditLog[] = [];
    let prevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < 5; i++) {
      const logData = {
        organization_id: orgId,
        actor_user_id: "user-test-uuid",
        action: `ACTION_${i}`,
        resource_type: "resource",
        resource_id: `res-${i}`,
        metadata: { index: i },
        ip: "127.0.0.1",
        user_agent: "test-agent",
        created_at: new Date(1700000000000 + i * 1000).toISOString()
      };

      const entryHash = HashChainService.computeEntryHash(prevHash, logData);
      const stored: StoredAuditLog = {
        id: `log-${i}`,
        ...logData,
        prev_hash: prevHash,
        entry_hash: entryHash
      };

      entries.push(stored);
      prevHash = entryHash;
    }

    const verification = HashChainService.verifyChain(entries);
    expect(verification.is_valid).toBe(true);
    expect(verification.total_verified).toBe(5);
  });

  it("detects tampered content in audit entry and identifies broken link index", () => {
    const orgId = "org-test-uuid";
    const entries: StoredAuditLog[] = [];
    let prevHash = GENESIS_PREV_HASH;

    for (let i = 0; i < 4; i++) {
      const logData = {
        organization_id: orgId,
        actor_user_id: "user-test-uuid",
        action: `ACTION_${i}`,
        resource_type: "resource",
        resource_id: `res-${i}`,
        metadata: { index: i },
        ip: "127.0.0.1",
        user_agent: "test-agent",
        created_at: new Date(1700000000000 + i * 1000).toISOString()
      };

      const entryHash = HashChainService.computeEntryHash(prevHash, logData);
      const stored: StoredAuditLog = {
        id: `log-${i}`,
        ...logData,
        prev_hash: prevHash,
        entry_hash: entryHash
      };

      entries.push(stored);
      prevHash = entryHash;
    }

    // Maliciously tamper with index 2's action
    entries[2].action = "MALICIOUSLY_ALTERED_ACTION";

    const verification = HashChainService.verifyChain(entries);
    expect(verification.is_valid).toBe(false);
    expect(verification.broken_index).toBe(2);
    expect(verification.details).toContain("Tampered content");
  });
});
