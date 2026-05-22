# Data Model: Multi-Integration Support

**Phase**: 1 | **Feature**: 008-multi-integration | **Date**: 2026-05-21

## Overview

No new persistent entities. The key in-process types are the integration registry
interface and the configure result shape.

---

## `IntegrationConfig`

Defined in `src/integration/registry.ts`. Each integration implements this interface.

| Field / Method | Type | Description |
|----------------|------|-------------|
| `name` | `string` | Integration identifier (`"claude"`, `"cursor"`) |
| `displayName` | `string` | Human-readable name for output (`"Claude Code"`, `"Cursor"`) |
| `installSkills(agentsSkillsDir)` | `Promise<void>` | Copies skill files to shared path |
| `registerMcp()` | `Promise<{ method, snippet? }>` | Registers MCP server for this tool |
| `checkMcpRegistered()` | `Promise<boolean \| 'unknown'>` | Checks registration state |

---

## `ConfigureResult`

Returned by `runConfigure()` in `src/cli/configure.ts`.

| Field | Type | Description |
|-------|------|-------------|
| `integration` | `string` | Name of the configured integration |
| `skillsInstalled` | `boolean` | Skills successfully copied to shared path |
| `mcpMethod` | `'cli' \| 'file' \| 'manual'` | How MCP was registered |
| `mcpSnippet` | `string \| undefined` | Manual config snippet if needed |

---

## `StatusResult` (updated)

Extended from 007. New fields added.

| Field | Type | Description |
|-------|------|-------------|
| *(existing fields)* | | key, vault, fingerprint, storageType |
| `skillsInstalled` | `boolean` | All 4 skills at `~/.agents/skills/` |
| `mcp` | `Record<string, boolean \| 'unknown'>` | Per-integration MCP state |

---

## Cursor MCP Config Shape

The JSON written to and read from `~/.cursor/mcp.json`:

```typescript
interface CursorMcpConfig {
  mcpServers?: Record<string, {
    command: string;
    args: string[];
  }>;
}
```

The `agent-friday` entry is always:
```json
{ "command": "npx", "args": ["agent-friday", "start"] }
```

---

## Integration Registry (constants)

```typescript
// src/integration/registry.ts
export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  claude: claudeIntegration,   // from src/integration/claude.ts
  cursor: cursorIntegration,   // from src/integration/cursor.ts
};
```

Supported names (for `configure --integration <name>` validation):
- `claude`
- `cursor`
