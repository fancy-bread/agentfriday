# Contract: memory_recent MCP Tool

**Feature**: 009-friday-hooks  
**Tool name**: `memory_recent`  
**Server**: agent-friday MCP daemon (stdio transport — existing process)

---

## Purpose

Returns the N most recent non-superseded, non-redacted vault entries in reverse-chronological order. Used by the `friday-review` skill to present an auditable listing of recent memories.

## Interface Addition

`memory_recent` MUST be added to the `MemoryVault` TypeScript interface before `SqliteVault` implements it (Principle IV).

```typescript
listRecent(limit: number, offset: number): Promise<RecentResult>;
```

```typescript
interface RecentEntry {
  id: string;
  timestamp: string;   // ISO 8601
  content: string;     // decrypted plaintext
}

interface RecentResult {
  entries: RecentEntry[];
  total: number;
  limit: number;
  offset: number;
}
```

## Input

| Parameter | Type    | Required | Default | Constraints       |
|-----------|---------|----------|---------|-------------------|
| `limit`   | integer | No       | 10      | 1–50 inclusive    |
| `offset`  | integer | No       | 0       | ≥ 0               |

## Output

| Field     | Type             | Description                                      |
|-----------|------------------|--------------------------------------------------|
| `entries` | `RecentEntry[]`  | Page of entries, reverse-chronological           |
| `total`   | integer          | Count of all non-superseded, non-redacted entries |
| `limit`   | integer          | Echo of the requested limit                      |
| `offset`  | integer          | Echo of the requested offset                     |

## Invariants

- Only returns entries where `superseded_by IS NULL` and `redacted_at IS NULL`
- Content is decrypted inside the MCP server process before being placed in the response — plaintext never touches storage (Principle II)
- This tool is read-only — it MUST NOT write, update, or delete any vault record (Principle I)

## Error Cases

| Condition             | Response                                      |
|-----------------------|-----------------------------------------------|
| Vault locked / daemon not running | MCP transport error — caller surfaces actionable message |
| `limit` out of range  | Tool error: "limit must be between 1 and 50"  |
| `offset` negative     | Tool error: "offset must be 0 or greater"     |
| Empty vault           | Success — `entries: [], total: 0`             |

## Acceptance Tests

1. Vault with 3 entries → `memory_recent({})` returns all 3, reverse-chronological, decrypted
2. Vault with 15 entries, `limit: 5, offset: 0` → returns entries 1–5 (newest first), `total: 15`
3. Vault with 15 entries, `limit: 5, offset: 10` → returns entries 11–15, `total: 15`
4. Superseded entry exists → NOT included in results
5. Redacted entry exists → NOT included in results
6. Empty vault → `{ entries: [], total: 0, limit: 10, offset: 0 }`
