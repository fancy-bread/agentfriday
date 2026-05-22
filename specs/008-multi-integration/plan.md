# Implementation Plan: Multi-Integration Support

**Branch**: `008-multi-integration` | **Date**: 2026-05-21 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/008-multi-integration/spec.md`

## Summary

Introduce `agent-friday configure --integration <tool>` as a new top-level command
that installs skills to `~/.agents/skills/` and registers the MCP server for a
specific agent tool. Remove `--integration` from `init`. Add Cursor as the second
integration (file-based MCP config). Refactor the integration module into a registry
so new integrations are additive. Update `status` to show the shared skills path and
one MCP row per known integration.

## Technical Context

**Language/Version**: TypeScript 6.x / Node.js 24 LTS  
**Primary Dependencies**: `fs/promises` (built-in — for Cursor MCP JSON read/write);
`child_process` (built-in — retained for `claude mcp add`); no new packages  
**Storage**: N/A — no vault changes  
**Testing**: Vitest; unit tests for Cursor JSON merge logic; integration tests for
`runConfigure` with temp dirs  
**Target Platform**: macOS (primary); Linux (secondary)  
**Project Type**: CLI extension — new command, refactored integration layer  
**Performance Goals**: `configure --integration cursor` completes in under 30 seconds  
**Constraints**: Cursor MCP config (`~/.cursor/mcp.json`) must be JSON-merged, not
overwritten. Malformed JSON must not be silently destroyed.  
**Scale/Scope**: Two integrations (Claude Code, Cursor); registry pattern supports N.

## Constitution Check

- [x] **Principle I — Append-Only Ledger**: No vault operations. ✅ PASS
- [x] **Principle II — Encrypt Before Write**: No vault writes. ✅ PASS
- [x] **Principle III — Keys Never Leave the Device**: No key material involved.
  `configure` reads the key only to confirm it exists (via `backend.exists()`).
  ✅ PASS
- [x] **Principle IV — Interface Over Implementation**: No `MemoryVault` or
  `SqliteVault` changes. ✅ PASS
- [x] **Principle V — Spec Before Code**: `specs/008-multi-integration/spec.md`
  exists and passed quality validation. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/008-multi-integration/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── configure.md
│   └── status.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
src/
├── integration/
│   ├── registry.ts      ← New: IntegrationConfig interface + registry map
│   ├── claude.ts        ← Updated: skill path → ~/.agents/skills/; registered in registry
│   └── cursor.ts        ← New: Cursor MCP JSON read/merge/write + check
├── cli/
│   ├── configure.ts     ← New: runConfigure({ integration: string }): Promise<void>
│   ├── init.ts          ← Updated: remove --integration flag and integration imports
│   ├── status.ts        ← Updated: ~/.agents/skills/ path; per-integration MCP rows
│   └── index.ts         ← Updated: add configure command; remove --integration from init
```

**Structure Decision**: `src/integration/registry.ts` defines the `IntegrationConfig`
interface and the registry map (`{ claude: claudeIntegration, cursor: cursorIntegration }`).
`configure.ts` looks up the integration by name and calls its methods. Adding a new
integration means adding one file and one entry in the registry — nothing else changes.
