# Tasks: Friday Hooks — Behavioral Layer

**Input**: Design documents from `specs/009-friday-hooks/`
**Branch**: `009-friday-hooks`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Add `listRecent` to the `MemoryVault` interface and implement it in `SqliteVault`. Unblocks Phase 3 (US2) only — Phases 2 and 4 can start immediately in parallel.

**⚠️ CRITICAL**: US2 MCP work cannot begin until this phase is complete.

- [x] T001 Add `RecentEntry`, `RecentResult` types and `listRecent(limit: number, offset: number): Promise<RecentResult>` to `src/vault/MemoryVault.ts`
- [x] T002 Implement `listRecent` in `src/vault/SqliteVault.ts` — SELECT with `superseded_by IS NULL AND redacted_at IS NULL`, ORDER BY `created_at DESC`, LIMIT/OFFSET; count query for total
- [x] T003 Integration test for `listRecent` in `tests/integration/` — covers: pagination (limit/offset), superseded exclusion, redacted exclusion, empty vault returns `{ entries: [], total: 0 }`

**Checkpoint**: `MemoryVault` interface extended; `SqliteVault` implements `listRecent`; integration tests pass against real SQLCipher

---

## Phase 2: User Story 1 + 3 — AGENTS.md Content + Configure Injection (Priority: P1) 🎯 MVP

**Goal**: `agent-friday configure --integration <tool>` injects Friday's behavioral layer into `./AGENTS.md` at the project root. Both Claude Code and Cursor use identical mechanism. Friday is active only in projects where the user has explicitly run configure — per-project opt-in.

**Independent Test**: From a project root, run `agent-friday configure --integration claude`. Confirm Friday section appended to `./AGENTS.md` between markers; existing content preserved. Re-run — section replaced not duplicated. Repeat with `--integration cursor` — confirm identical result. Open a session, make a decision, confirm approval prompt surfaces.

- [x] T004 [US1] Author `src/assets/agents.md` — role declaration, judgment criteria (decisions / constraints / resolved ambiguities / changed assumptions), exclusion criteria (remarks / questions / status updates), approval pattern ("Should I remember: [content]? Yes / No / Edit"), tool bindings (`memory_append`, `memory_recent`)
- [x] T005 [US1] Implement shared inject utility in `src/cli/configure.ts`: read `src/assets/agents.md`, wrap in idempotency markers (`<!-- agent-friday:start -->` / `<!-- agent-friday:version:1 -->` / `<!-- agent-friday:end -->`), append to or replace marked section in `./AGENTS.md` at CWD (create file if absent) — depends on T004
- [x] T006 [US3] Wire both claude and cursor handlers in `src/cli/configure.ts` to call the shared inject utility — no tool-specific injection logic; integration-specific behaviour limited to skill installation path
- [x] T007 [US1] Integration test in `tests/integration/` — existing `./AGENTS.md`: Friday section appended, prior content preserved; no `./AGENTS.md`: file created with Friday section only; re-run: section replaced not duplicated

**Checkpoint**: US1 + US3 fully functional — any project using Claude Code or Cursor has Friday behavior after `agent-friday configure`

---

## Phase 3: User Story 2 — Friday Review (Priority: P2)

**Goal**: `/friday-review` lists recent vault entries with timestamps for audit; user can page through and invoke `friday-amend` / `friday-forget` to correct entries.

**Independent Test**: With several vault entries stored, run `/friday-review`. Confirm entries appear in reverse-chronological order with timestamps and IDs. Type `more`. Confirm next page loads. Run `/friday-amend <id>` on a listed entry.

**Prerequisite**: T001–T003 (Foundational) must be complete.

- [x] T008 [P] [US2] Author `src/mcp/tools/memory-recent.ts` — input validation (limit 1–50, offset ≥ 0), call `vault.listRecent()`, return `RecentResult`; handle empty vault and tool errors
- [x] T009 [US2] Register `memory_recent` tool in MCP server (`src/mcp/server.ts` or equivalent tool registry) — depends on T008
- [x] T010 [US2] End-to-end test in `tests/integration/` — `memory_recent` tool call against running server: pagination, empty vault, out-of-range limit returns tool error; verify response time for 1,000-entry vault meets SC-004 (under 2 seconds)
- [x] T011 [P] [US2] Author `skills/friday-review/SKILL.md` per `specs/009-friday-hooks/contracts/friday-review.md` — role, steps (call `memory_recent`, display list, pagination, correction prompt), error handling
- [x] T012 [US2] Update configure handlers (claude + cursor) in `src/cli/configure.ts` to install `friday-review` skill alongside existing skills — no new command required

**Checkpoint**: US2 complete — full capture-review-correct loop functional: Friday proposes → user approves → user reviews → user amends

---

## Phase 4: Polish & Cross-Cutting Concerns

- [x] T013 [P] Update `CLAUDE.md` Active Technologies section: add `src/assets/agents.md` (static content, no runtime deps) for 009-friday-hooks
- [ ] T014 Run quickstart.md validation — smoke test per-project injection for both integrations; confirm both produce identical `./AGENTS.md` output; confirm Cursor and Claude Code sessions both surface approval prompt

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1+US3 (Phase 2)**: Independent of Phase 1 — start immediately in parallel with Phase 1
- **US2 (Phase 3)**: Depends on Phase 1 complete (T001–T003)
- **Polish (Phase 4)**: Depends on all prior phases complete

### Task Dependencies

- T002 depends on T001; T003 depends on T002
- T005 depends on T004; T006 depends on T005; T007 depends on T006
- T009 depends on T008; T010 depends on T009
- T008 and T011 are parallel (different files)

### Parallel Opportunities

- T001–T003 (Foundational) and T004–T007 (US1+US3) run in parallel — no shared files
- T008 and T011 run in parallel within Phase 3

---

## Parallel Example: Phase 1 + Phase 2

```
# These can run simultaneously:
Agent A: T001 → T002 → T003   (MemoryVault interface + SqliteVault + tests)
Agent B: T004 → T005 → T006 → T007   (AGENTS.md content + configure.ts + tests)
```

---

## Implementation Strategy

### MVP First (US1+US3 — 4 tasks)

1. T004 — Author AGENTS.md content
2. T005 — Shared inject utility
3. T006 — Wire both handlers
4. T007 — Integration test
5. **STOP and VALIDATE**: Run configure from a project, open session, confirm approval prompt

### Incremental Delivery

1. Foundational (T001–T003) + US1+US3 (T004–T007) in parallel → validate behavioral layer in both tools
2. US2 (T008–T012) → validate review loop end-to-end
3. Polish (T013–T014)

---

## Summary

| Phase | Tasks | Story | Notes |
|-------|-------|-------|-------|
| Foundational | T001–T003 | — | Blocks US2 only; run in parallel with Phase 2 |
| US1+US3 | T004–T007 | US1, US3 | MVP — identical mechanism for both tools |
| US2 | T008–T012 | US2 | Review loop; depends on Foundational |
| Polish | T013–T014 | — | — |

**Total**: 14 tasks | **MVP**: 4 tasks (US1+US3) | **Parallel opportunities**: Phase 1 ∥ Phase 2
