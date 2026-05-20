# Contract: `status` Command (Updated)

**File**: `src/cli/status.ts` (updated)  
**Phase**: 1 | **Feature**: 007-packaging

## CLI Signature

```
agent-friday status
```

## Output Format

Four rows, each with an indicator (✓ / ✗ / ?) and an actionable message when unhealthy:

```
Key        ✓  abc1:def2:3456 (software)
Vault      ✓  ~/.agent-friday/vault.db
Skills     ✓  ~/.claude/skills/ (4 installed)
MCP        ✓  agent-friday registered with Claude Code
```

### Unhealthy examples

```
Key        ✗  not found  →  run: agent-friday init --integration claude
Vault      ✗  not found  →  run: agent-friday init --integration claude
Skills     ✗  not installed  →  run: agent-friday init --integration claude
MCP        ✗  not registered  →  run: agent-friday init --integration claude
MCP        ?  unknown (claude CLI not found)
```

## Row Definitions

| Row | Check | Healthy when |
|-----|-------|-------------|
| Key | `SoftwareKeyManager.exists()` | Key file exists at expected path |
| Vault | `fs.access(DEFAULT_DB_PATH)` | vault.db exists |
| Skills | All 4 `~/.claude/skills/friday-*/SKILL.md` exist | 4 skill files present |
| MCP | `claude mcp list` output contains `agent-friday` | Server registered |

## Exit Code

- `process.exitCode = 1` if key is not accessible (existing behaviour, preserved)
- Skills and MCP rows do not affect exit code — they are informational

## Source Changes

`src/cli/status.ts`:
- Import `checkIntegrationStatus` from `../integration/claude.js`
- Call it and append the two new rows to the existing output table

## Test Contract

`tests/integration/status.test.ts` MUST verify (using temp dirs and stubs):
1. All-healthy output contains 4 rows all showing ✓
2. Missing skills shows ✗ with actionable message
3. `claude` CLI not available shows `?` for MCP row, not ✗
