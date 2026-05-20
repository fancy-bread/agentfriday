# Quickstart: Packaging & CLI

**Feature**: 007-packaging | **Date**: 2026-05-19

## First-Run Setup (Claude Code)

```bash
# Option A: via npx (no global install)
npx agent-friday init --integration claude

# Option B: global install first
npm install -g agent-friday
agent-friday init --integration claude
```

Expected output:

```
✓ Keypair generated
  Fingerprint: abc1:def2:3456
  Location: ~/.agent-friday/keys/keypair

✓ Vault initialised
  Location: ~/.agent-friday/vault.db

✓ Skills installed
  Location: ~/.claude/skills/ (4 skills)

✓ Memory service registered with Claude Code
```

After this, open Claude Code. `/friday-note` should be available immediately.

## Verify Installation

```bash
agent-friday status
```

Expected (all healthy):

```
Key        ✓  abc1:def2:3456 (software)
Vault      ✓  ~/.agent-friday/vault.db
Skills     ✓  ~/.claude/skills/ (4 installed)
MCP        ✓  agent-friday registered with Claude Code
```

## Start the Daemon Manually

```bash
agent-friday start
```

Claude Code auto-starts the daemon when you use a `/friday-*` command (via MCP
server config). Manual start is available for testing or non-Claude Code usage.

## Fallback: Manual MCP Registration

If `claude` CLI is not on PATH, `init --integration claude` will print:

```
⚠ Claude CLI not found. Add this to your Claude Code settings manually:

{
  "mcpServers": {
    "agent-friday": {
      "command": "npx",
      "args": ["agent-friday", "start"]
    }
  }
}

Settings file: ~/.claude.json
```

## Re-run Setup (Already Initialised)

Running `init --integration claude` again is safe:
- Keypair is preserved (not regenerated)
- Skill files are updated (overwritten with package version)
- MCP registration is updated

## Build

```bash
npm run build           # compile src/ → dist/
npm run typecheck       # type-check src/ + tests/ (no output)
npm test                # run all test suites
```

## Publish

```bash
npm publish             # runs "prepare" (build) first automatically
```

The published package includes `dist/` and `skills/` only.
