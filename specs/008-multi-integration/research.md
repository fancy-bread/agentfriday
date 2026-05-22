# Research: Multi-Integration Support

**Phase**: 0 | **Feature**: 008-multi-integration | **Date**: 2026-05-21

## Decision 1: Cursor MCP Configuration Path

**Decision**: `~/.cursor/mcp.json` (global user config).

**Rationale**: Cursor reads its global MCP server list from `~/.cursor/mcp.json`.
This is the equivalent of Claude Code's global MCP settings. Project-level config
(`.cursor/mcp.json`) is not targeted here — `configure` is a user-level operation.

**Format** (same structure as Claude Code's MCP config):
```json
{
  "mcpServers": {
    "agent-friday": {
      "command": "npx",
      "args": ["agent-friday", "start"]
    }
  }
}
```

**Alternatives considered**:
- Project-level `.cursor/mcp.json`: requires knowing which project to configure.
  User-level is the correct target for a personal tool.

---

## Decision 2: Cursor MCP Registration — File Merge (Not CLI)

**Decision**: Read `~/.cursor/mcp.json`, merge the `agent-friday` entry, write back.
No Cursor CLI equivalent of `claude mcp add` exists.

**Merge strategy**:
1. If file absent: create with `{ "mcpServers": { "agent-friday": {...} } }`
2. If file exists and valid JSON: parse, set `mcpServers["agent-friday"]`, write back
3. If file exists and malformed JSON: return `{ method: 'manual', snippet }` — never
   overwrite a corrupted file

**Idempotency**: Overwriting the `agent-friday` key is safe — same command, same
args each time.

**Alternatives considered**:
- Overwrite the whole file: destroys other MCP server entries the user may have.
  Rejected — merge only.

---

## Decision 3: Shared Skill Path — `~/.agents/skills/`

**Decision**: All integrations install skills to `~/.agents/skills/`. The
`AGENTS_SKILLS_DIR` constant replaces `CLAUDE_SKILLS_DIR` throughout.

**Rationale**: `~/.agents/skills/` is the Agent Skills specification standard path,
read by all compliant tools (Cursor confirmed; Claude Code follows the same spec).
Tool-specific paths (`.claude/skills/`, `.cursor/skills/`) are tool implementations
of the same standard — we target the standard, not the implementations.

**Change from 007**: `src/integration/claude.ts` currently uses `~/.claude/skills/`.
This is updated to `~/.agents/skills/`. `status.ts` likewise updated.

---

## Decision 4: Integration Registry Pattern

**Decision**: `src/integration/registry.ts` exports an `IntegrationConfig` interface
and a registry object mapping integration names to implementations.

```typescript
export interface IntegrationConfig {
  name: string;
  displayName: string;
  installSkills(agentsSkillsDir: string): Promise<void>;
  registerMcp(): Promise<{ method: 'cli' | 'file' | 'manual'; snippet?: string }>;
  checkMcpRegistered(): Promise<boolean | 'unknown'>;
}

export const INTEGRATIONS: Record<string, IntegrationConfig> = {
  claude: claudeIntegration,
  cursor: cursorIntegration,
};
```

`runConfigure(name)` calls `INTEGRATIONS[name]` — one lookup, no `if/else` chains.
New integrations: add one file + one registry entry.

**`installSkills` on IntegrationConfig**: All implementations call the same shared
`installSkills(skillsSourceDir, agentsSkillsDir)` from the existing module. The
interface method is a thin wrapper that resolves the paths. This keeps skill
installation identical across integrations.

---

## Decision 5: `configure` Command — Guards and Errors

**Decision**: `runConfigure` checks for vault + key existence before proceeding. If
either is missing, it exits with a clear message: "Run `agent-friday init` first."

**Rationale**: `configure` is an additive operation on top of an existing
installation. Operating without a vault is meaningless — the MCP server won't start.

**Unknown integration name**: Exit immediately with a list of valid names.

---

## Decision 6: `status` — Always Show All Known Integrations

**Decision**: `runStatus` always checks and displays MCP registration for all
integrations in the registry. Skills row uses `~/.agents/skills/`.

**Rationale**: The output is a health dashboard, not a log of what was configured.
Showing all known integrations gives the user a complete picture and makes it obvious
when they haven't configured a tool they expected to work.

**MCP row format per integration**:
```
MCP (Claude)   ✓  registered
MCP (Cursor)   ✗  not registered  →  run: agent-friday configure --integration cursor
```

---

## Decision 7: `init` — Remove `--integration`, Add Tip

**Decision**: `init` no longer accepts `--integration`. After successful vault + key
creation, it prints: "Run `agent-friday configure --integration <tool>` to connect
Friday to your AI tool."

**Breaking change from 007**: Users who relied on `init --integration claude` need
to run `configure --integration claude` instead. The tip makes this discoverable.
