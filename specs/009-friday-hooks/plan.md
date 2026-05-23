# Implementation Plan: Friday Hooks — Behavioral Layer

**Branch**: `009-friday-hooks` | **Date**: 2026-05-23 | **Spec**: [spec.md](spec.md)

## Summary

Deliver Friday's behavioral layer (judgment criteria + approval interaction pattern) to host agents via AGENTS.md, installed at `~/.agent-friday/AGENTS.md`. For Claude Code, `agent-friday configure` injects the content into `~/.claude/CLAUDE.md` as an idempotent bounded section. For Cursor, configure confirms the canonical file is in place and documents manual project-level setup (no user-global mechanism exists in Cursor v1). A new `memory_recent` MCP tool and `friday-review` skill complete the capture-review-correct loop.

## Technical Context

**Language/Version**: TypeScript 6.x / Node.js 24 LTS  
**Primary Dependencies**: `@modelcontextprotocol/sdk`, `@signalapp/better-sqlite3` (SQLCipher), `libsodium-wrappers`, `commander` — all existing; no new packages  
**Storage**: SQLCipher via `SqliteVault` — read-only addition (`memory_recent`); schema unchanged  
**Testing**: Integration tests against real SQLCipher; no vault mocks (constitution requirement)  
**Target Platform**: macOS primary; Linux secondary  
**Project Type**: CLI tool + MCP server + static content (AGENTS.md)  
**Performance Goals**: `memory_recent` returns in under 2 seconds for vaults up to 1,000 entries  
**Constraints**: No new npm packages; no schema changes; no key material touched  
**Scale/Scope**: Single-user local vault; up to 1,000 entries for review pagination

## Constitution Check

*GATE: Must pass before implementation begins.*

- [x] **Principle I (append-only)**: `memory_recent` is read-only. No INSERT, UPDATE, or DELETE. PASS.
- [x] **Principle II (encrypt before write)**: `memory_recent` decrypts content inside MCP process after read. No plaintext stored. PASS.
- [x] **Principle III (keys never leave device)**: No key material handled by this feature. PASS.
- [x] **Principle IV (interface over implementation)**: `memory_recent` MUST be added to the `MemoryVault` interface before `SqliteVault` implements it. Implementation task is blocked on interface addition. PASS with enforcement.
- [x] **Principle V (spec before code)**: Spec exists at `specs/009-friday-hooks/spec.md`. PASS.

No violations. No complexity tracking required.

## Project Structure

### Documentation (this feature)

```text
specs/009-friday-hooks/
├── plan.md              ← this file
├── research.md          ← Phase 0 complete
├── data-model.md        ← Phase 1 complete
├── quickstart.md        ← Phase 1 complete
├── contracts/
│   ├── memory-recent.md ← Phase 1 complete
│   └── friday-review.md ← Phase 1 complete
└── tasks.md             ← Phase 2 (/speckit-tasks)
```

### Source Code

```text
src/
├── vault/
│   ├── MemoryVault.ts          ← add listRecent() to interface
│   └── SqliteVault.ts          ← implement listRecent()
├── mcp/
│   └── tools/
│       └── memory-recent.ts    ← new MCP tool handler
├── cli/
│   └── configure.ts            ← add AGENTS.md injection (claude) + canonical install (cursor)
└── assets/
    └── agents.md               ← Friday behavioral layer (authored content)

skills/
└── friday-review/
    └── SKILL.md                ← new skill

~/.agent-friday/
└── AGENTS.md                   ← installed by configure (runtime artifact, not source)
```

**Structure Decision**: Single-project layout extending existing source tree. No new directories at the root level. `assets/agents.md` is the source-controlled template; `~/.agent-friday/AGENTS.md` is the installed runtime copy.

## Implementation Phases

### Phase A: Interface + Vault (unblocks everything downstream)

1. Add `listRecent(limit: number, offset: number): Promise<RecentResult>` to `MemoryVault` interface
2. Add `RecentEntry` and `RecentResult` types to the interface module
3. Implement `listRecent` in `SqliteVault` — SELECT with `superseded_by IS NULL AND redacted_at IS NULL`, ORDER BY `created_at DESC`, LIMIT/OFFSET
4. Integration test: pagination, superseded exclusion, redacted exclusion, empty vault

### Phase B: MCP Tool

1. Author `src/mcp/tools/memory-recent.ts` — input validation, call `vault.listRecent()`, return `RecentResult`
2. Register `memory_recent` tool in the MCP server
3. End-to-end test: tool call against running server instance

### Phase C: AGENTS.md Content

1. Author `src/assets/agents.md` — role declaration, judgment criteria, approval pattern, tool bindings
2. Manual review: does the content correctly encode all spec requirements (FR-003, FR-004)?

### Phase D: Configure Command — Claude Integration

1. Update `src/cli/configure.ts` — claude handler reads `src/assets/agents.md`, wraps in idempotency markers, appends to (or updates in) `~/.claude/CLAUDE.md`
2. Add `--remove` flag: strips the marked section from `~/.claude/CLAUDE.md`
3. Integration test: inject, re-inject (idempotent), remove

### Phase E: Configure Command — Cursor Integration

1. Update `src/cli/configure.ts` — cursor handler copies `src/assets/agents.md` to `~/.agent-friday/AGENTS.md` and prints manual setup instructions
2. Integration test: file written to canonical path; output message correct

### Phase F: friday-review Skill

1. Author `skills/friday-review/SKILL.md` per `contracts/friday-review.md`
2. Install via `agent-friday configure` (same path as existing skills — 008)

## Key Dependencies

- Phase B depends on Phase A (interface must exist before MCP tool)
- Phase D and E depend on Phase C (AGENTS.md content must be authored first)
- Phase F is independent of A–E (skill file only; references tool by name)
- All phases are independent of each other otherwise — can be parallelised within those constraints
