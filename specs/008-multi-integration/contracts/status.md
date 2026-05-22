# Contract: `status` Command (Updated)

**File**: `src/cli/status.ts` (updated)
**Phase**: 1 | **Feature**: 008-multi-integration

## Output Format

```
Agent Friday
────────────────────────────────────────────────────────────
Key          ✓  abc1:def2:... (Software key)
Vault        ✓  ~/.agent-friday/vault.db
Skills       ✓  ~/.agents/skills/ (4 installed)
MCP (Claude) ✓  registered
MCP (Cursor) ✗  not registered  →  run: agent-friday configure --integration cursor
```

## Changes from 007

| Row | 007 | 008 |
|-----|-----|-----|
| Skills | `~/.claude/skills/ (4 installed)` | `~/.agents/skills/ (4 installed)` |
| MCP | Single row (`claude mcp list`) | One row per integration in registry |

## Skills Row

- Path: `~/.agents/skills/`
- Check: all 4 `friday-*/SKILL.md` exist at that path
- Unhealthy hint: `→  run: agent-friday configure --integration <tool>`

## MCP Rows

One row per entry in `INTEGRATIONS` registry. Always shown (not only when configured).

| State | Display |
|-------|---------|
| `true` | `✓  registered` |
| `false` | `✗  not registered  →  run: agent-friday configure --integration <name>` |
| `'unknown'` | `?  unknown (integration tooling not found)` |

## Source Changes

- Replace `CLAUDE_SKILLS_DIR` with `AGENTS_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills')`
- Remove single `checkMcpRegistered()` call; loop over `INTEGRATIONS`, call each
  `integration.checkMcpRegistered()`, build one row per integration
- `process.exitCode` remains affected only by key accessibility (unchanged)
