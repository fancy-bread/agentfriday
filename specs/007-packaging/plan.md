# Implementation Plan: Packaging & CLI

**Branch**: `007-packaging` | **Date**: 2026-05-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/007-packaging/spec.md`

## Summary

Fix the build output path so `npx agent-friday` works, add `--integration claude`
to `init` (installs skills + registers MCP), extend `status` to show integration
health, and configure `package.json` for npm publication. No new vault, MCP, or
skill-file logic — this epic wires existing 001–006 deliverables into a shippable
package.

## Technical Context

**Language/Version**: TypeScript 6.x / Node.js 24 LTS  
**Primary Dependencies**: `child_process` (built-in — for `claude mcp add`);
`fs/promises` (built-in — for skill file copying); no new packages  
**Storage**: N/A — no vault changes  
**Testing**: Vitest; integration tests for `runInit` with `--integration` option  
**Target Platform**: macOS (primary); Linux (secondary)  
**Project Type**: CLI tool / npm package distribution  
**Performance Goals**: `init --integration claude` completes in under 30 seconds
including skill install and MCP registration  
**Constraints**: Skill path resolution must work both in development (repo root)
and when installed via `npx` (inside `node_modules/agent-friday/`)  
**Scale/Scope**: Single-user, local machine, Claude Code integration only

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I — Append-Only Ledger**: No vault operations added or changed.
  ✅ PASS
- [x] **Principle II — Encrypt Before Write**: No writes to vault in this feature.
  ✅ PASS
- [x] **Principle III — Keys Never Leave the Device**: `runInit()` generates the
  key locally (unchanged). The `--integration` flag adds skill installation and
  MCP registration — neither step handles, logs, or transmits key material.
  `claude mcp add` registers a launch command, not credentials. ✅ PASS
- [x] **Principle IV — Interface Over Implementation**: No changes to `MemoryVault`
  interface or `SqliteVault`. CLI commands are callers, not vault implementors.
  ✅ PASS
- [x] **Principle V — Spec Before Code**: `specs/007-packaging/spec.md` exists
  and passed quality validation. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/007-packaging/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── init.md
│   └── status.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
tsconfig.build.json          ← New: src-only build (rootDir: "src", no test types)
package.json                 ← Updated: files, prepare/build scripts
src/
├── integration/
│   └── claude.ts            ← New: installSkills(), registerMcp(), checkSkills(), checkMcp()
├── cli/
│   ├── init.ts              ← Updated: runInit() accepts { integration?: string }
│   ├── status.ts            ← Updated: shows skill + MCP registration health
│   └── index.ts             ← Updated: init command gains --integration option
```

**Structure Decision**: New `src/integration/` module keeps Claude-specific logic
isolated from core CLI commands. `status.ts` calls into it for health checks. `init.ts`
calls it for setup. The module boundary makes adding Cursor or other integrations
in v2 straightforward — one new file, minimal changes to callers.
