# Quickstart: Multi-Integration Support

**Feature**: 008-multi-integration | **Date**: 2026-05-21

## First-Time Setup

```bash
# Step 1: create vault and key (unchanged)
npx agent-friday init

# Step 2: connect to your AI tool(s)
npx agent-friday configure --integration claude
npx agent-friday configure --integration cursor
```

Step 2 can be run for one or both tools. Order doesn't matter. Re-running is safe.

## Verify

```bash
agent-friday status
```

Expected output when both integrations are configured:

```
Agent Friday
────────────────────────────────────────────────────────────
Key          ✓  abc1:def2:3456  (Software key (file-protected))
Vault        ✓  ~/.agent-friday/vault.db
Skills       ✓  ~/.agents/skills/ (4 installed)
MCP (Claude) ✓  registered
MCP (Cursor) ✓  registered
```

## Add a New Tool Later

```bash
# Already have Friday set up for Claude Code, adding Cursor:
agent-friday configure --integration cursor
```

Skills are already at the shared path — configure just registers the MCP service.

## Fallback: Manual MCP Registration

If the integration tooling is unavailable, `configure` prints the snippet:

```
⚠ Could not register automatically. Add this to ~/.cursor/mcp.json:

{
  "mcpServers": {
    "agent-friday": {
      "command": "npx",
      "args": ["agent-friday", "start"]
    }
  }
}
```

## Adding a New Integration (Contributor Guide)

1. Create `src/integration/<name>.ts` implementing `IntegrationConfig`
2. Add `<name>: <name>Integration` to `INTEGRATIONS` in `src/integration/registry.ts`
3. No changes to `configure.ts`, `status.ts`, or any other file required

## Migration from 007

If you previously ran `agent-friday init --integration claude`, re-run:

```bash
agent-friday configure --integration claude
```

This moves skills from `~/.claude/skills/` to `~/.agents/skills/` and updates the
MCP registration.
