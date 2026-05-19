# Implementation Plan: Skill Files

**Branch**: `006-skill-files` | **Date**: 2026-05-18 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/006-skill-files/spec.md`

## Summary

Four markdown skill files — `friday-note`, `friday-recall`, `friday-amend`,
`friday-forget` — that expose the memory service to any compatible agent tool
as natural slash commands. Each file is a YAML-frontmatter + markdown prompt document.
No TypeScript, no runtime dependencies, no tests in the traditional sense. The
deliverable is four files in `skills/` that ship with the package and are installed
into the user's agent tool skill path by `007-packaging`.

## Technical Context

**Language/Version**: Markdown + YAML (no runtime language; no Node.js required for
the skill files themselves)  
**Primary Dependencies**: None — skill files are static documents read by the agent
tool at invocation time  
**Storage**: N/A — skill files delegate all vault operations to the running
MCP daemon via tool calls  
**Testing**: Manual validation against a running daemon; no automated unit tests
(content correctness verified by running the commands end-to-end)  
**Target Platform**: Claude Code (`~/.claude/skills/`) primary; format is compatible
with any agent tool that supports the Claude Code skill convention  
**Project Type**: Content delivery — four static markdown files  
**Performance Goals**: Commands invoke the daemon and return a response within the
agent's normal tool-call latency; no additional overhead from the skill files  
**Constraints**: The query-confirm-act pattern (amend, forget) must be implemented
entirely in the prompt body — no custom code, no multi-step state machine. The agent
(Claude) implements it through reasoning.  
**Scale/Scope**: Four files, one per command. Each file is independent.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I — Append-Only Ledger**: Skill files do not access the vault
  directly. `friday-note` calls `memory_append` (INSERT only). `friday-amend` calls
  `memory_amend` (INSERT only, new row). `friday-forget` calls `memory_redact`
  (INSERT only). No DELETE or UPDATE is possible through the skill interface. ✅ PASS
- [x] **Principle II — Encrypt Before Write**: The skills call MCP tools which route
  through the daemon. Encryption happens in the daemon before any write reaches the
  vault. Skill files never touch plaintext at the storage boundary. ✅ PASS
- [x] **Principle III — Keys Never Leave the Device**: Skill files call MCP tools.
  No key material is accessible at the skill layer. Keys remain in the daemon process.
  ✅ PASS
- [x] **Principle IV — Interface Over Implementation**: Skills call the four tool
  names defined in 004-mcp-server (`memory_append`, `memory_query`, `memory_amend`,
  `memory_redact`). They invoke the `MemoryVault` interface, not `SqliteVault`
  directly. ✅ PASS
- [x] **Principle V — Spec Before Code**: `specs/006-skill-files/spec.md` exists
  and passed quality validation. ✅ PASS

## Project Structure

### Documentation (this feature)

```text
specs/006-skill-files/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   ├── friday-note.md
│   ├── friday-recall.md
│   ├── friday-amend.md
│   └── friday-forget.md
└── tasks.md             # Phase 2 output (/speckit-tasks — not created here)
```

### Source Code (repository root)

```text
skills/
├── friday-note/
│   └── SKILL.md         ← /friday-note slash command
├── friday-recall/
│   └── SKILL.md         ← /friday-recall slash command
├── friday-amend/
│   └── SKILL.md         ← /friday-amend slash command
└── friday-forget/
    └── SKILL.md         ← /friday-forget slash command
```

**Structure Decision**: New top-level `skills/` directory following the Agent Skills
specification (https://agentskills.io/specification). Each skill is a directory
containing a `SKILL.md` file; the directory name matches the `name` field. Shipped
with the package and installed into the user's agent skill path by `007-packaging`.
No changes to `src/` — skill files are pure content.
