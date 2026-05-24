# Data Model: Friday Hooks

**Branch**: `009-friday-hooks` | **Phase**: 1

---

## Existing Vault Schema (unchanged)

The vault schema introduced in `003-sqlite-vault` is not modified by this feature. All reads go through the existing `entries` table.

---

## New: `memory_recent` Query

**Purpose**: Paginated reverse-chronological listing of vault entries.  
**Interface method**: `MemoryVault.listRecent(limit: number, offset: number): Promise<RecentEntry[]>`

### `RecentEntry` type

| Field       | Type     | Source                   | Notes                                  |
|-------------|----------|--------------------------|----------------------------------------|
| `id`        | `string` | `entries.id`             | UUID; used as reference for amend/forget |
| `timestamp` | `string` | `entries.created_at`     | ISO 8601; formatted for display        |
| `content`   | `string` | `entries.content` (decrypted) | Plaintext; decrypted in MCP process only |

### SQL pattern (SqliteVault implementation)

```sql
SELECT id, created_at, content
FROM entries
WHERE superseded_by IS NULL
  AND redacted_at IS NULL
ORDER BY created_at DESC
LIMIT ? OFFSET ?;
```

Superseded and redacted entries are excluded — `friday-review` shows the current state of the vault, not the full chain history.

### Count query (for pagination total)

```sql
SELECT COUNT(*) AS total
FROM entries
WHERE superseded_by IS NULL
  AND redacted_at IS NULL;
```

---

## `memory_recent` MCP Tool Contract

**Tool name**: `memory_recent`  
**Transport**: stdio (existing MCP server — no new process)

### Input schema

```json
{
  "type": "object",
  "properties": {
    "limit":  { "type": "integer", "minimum": 1, "maximum": 50, "default": 10 },
    "offset": { "type": "integer", "minimum": 0, "default": 0 }
  }
}
```

### Output schema

```json
{
  "type": "object",
  "properties": {
    "entries": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id":        { "type": "string" },
          "timestamp": { "type": "string", "format": "date-time" },
          "content":   { "type": "string" }
        },
        "required": ["id", "timestamp", "content"]
      }
    },
    "total":  { "type": "integer" },
    "limit":  { "type": "integer" },
    "offset": { "type": "integer" }
  },
  "required": ["entries", "total", "limit", "offset"]
}
```

---

## `~/.agent-friday/AGENTS.md` — Content Structure

**Purpose**: Delivers Friday's behavioral layer to host agents via each tool's native context mechanism.

### Fields

| Field              | Description                                                        |
|--------------------|--------------------------------------------------------------------|
| Role declaration   | Who Friday is and what its job is in this session                  |
| Judgment criteria  | What qualifies as a noteworthy moment (decisions, constraints, resolved ambiguities, changed assumptions) |
| Exclusion criteria | What is NOT noteworthy (remarks, questions, status updates)        |
| Approval pattern   | Exact prompt format: "Should I remember: [content]? Yes / No / Edit" |
| Tool bindings      | `memory_append` for writes; `memory_recent` for review             |
| Duplicate guard    | Do not re-prompt for content substantially identical to a recent entry |

### Idempotency markers (Claude Code injection only)

When injected into `~/.claude/CLAUDE.md`, the content is wrapped:

```
<!-- agent-friday:start -->
<!-- agent-friday:version:1 -->
[AGENTS.md content]
<!-- agent-friday:end -->
```

The version comment allows the configure command to detect stale injections and update them.
