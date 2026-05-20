# Data Model: Packaging & CLI

**Phase**: 1 | **Feature**: 007-packaging | **Date**: 2026-05-19

## Overview

No new persistent entities. This feature adds configuration and runtime detection
logic. The key in-process types are the integration config and the status report shape.

---

## `IntegrationConfig`

Resolved at runtime from the `--integration <tool>` flag.

| Field | Type | Value for `claude` |
|-------|------|--------------------|
| `name` | `string` | `"claude"` |
| `skillsDir` | `string` | `~/.claude/skills/` |
| `registerCommand` | `string` | `claude mcp add agent-friday -- npx agent-friday start` |
| `listCommand` | `string` | `claude mcp list` |

Only one integration is supported in v1. The shape exists to make v2 additions
(Cursor, etc.) additive — new entry in a registry, no callers change.

---

## `IntegrationStatus`

Returned by `checkIntegrationStatus(name: string)` in `src/integration/claude.ts`.

| Field | Type | Meaning |
|-------|------|---------|
| `skillsInstalled` | `boolean` | All 4 Friday skill directories present in skills path |
| `mcpRegistered` | `boolean \| 'unknown'` | MCP server registered; `'unknown'` if CLI not available |
| `skillsPath` | `string` | Resolved path used for skills (for display in status) |

---

## `InitOptions` (updated)

Extended in `src/cli/init.ts`:

| Field | Type | Default |
|-------|------|---------|
| `vaultPath` | `string \| undefined` | `DEFAULT_DB_PATH` |
| `integration` | `string \| undefined` | `undefined` (vault only) |

---

## Skill Names (fixed set)

The four skills installed by `installSkills()`:

```
friday-note
friday-recall
friday-amend
friday-forget
```

Each maps to a directory under `<packageRoot>/skills/<name>/` containing `SKILL.md`.
