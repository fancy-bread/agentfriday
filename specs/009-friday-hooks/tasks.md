# Tasks: Friday Hooks — Behavioral Layer

**Input**: Design documents from `specs/009-friday-hooks/`
**Branch**: `009-friday-hooks`

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: User story this task belongs to (US1, US2, US3)

---

## Phase 1: Foundational (Blocking Prerequisite)

**Purpose**: Add `listRecent` to the `MemoryVault` interface and implement it in `SqliteVault`. This is the only shared prerequisite — it unblocks Phase 3 (US2) without blocking Phases 2 or 4.

**⚠️ CRITICAL**: US2 MCP work cannot begin until this phase is complete. US1 and US3 can proceed in parallel.

- [ ] T001 Add `RecentEntry`, `RecentResult` types and `listRecent(limit: number, offset: number): Promise<RecentResult>` to `src/vault/MemoryVault.ts`
- [ ] T002 Implement `listRecent` in `src/vault/SqliteVault.ts` — SELECT with `superseded_by IS NULL AND redacted_at IS NULL`, ORDER BY `created_at DESC`, LIMIT/OFFSET; count query for total
- [ ] T003 Integration test for `listRecent` in `tests/integration/` — covers: pagination (limit/offset), superseded exclusion, redacted exclusion, empty vault returns `{ entries: [], total: 0 }`

**Checkpoint**: `MemoryVault` interface extended; `SqliteVault` implements `listRecent`; integration tests pass against real SQLCipher

---

## Phase 2: User Story 1 — Host Agent Behavioral Layer / Claude Code (Priority: P1) 🎯 MVP

**Goal**: Friday's judgment criteria and approval pattern are active in every Claude Code session after `agent-friday configure --integration claude`.

**Independent Test**: Run `agent-friday configure --integration claude`. Open a new Claude Code session. Make an explicit decision. Confirm the approval prompt surfaces. Confirm vault entry is written on Yes. Confirm nothing is written on No.

- [ ] T004 [US1] Author `src/assets/agents.md` — role declaration, judgment criteria (decisions / constraints / resolved ambiguities / changed assumptions), exclusion criteria (remarks / questions / status updates), approval pattern ("Should I remember: [content]? Yes / No / Edit"), tool bindings (`memory_append`, `memory_recent`)
- [ ] T005 [US1] Update `src/cli/configure.ts` claude handler: read `src/assets/agents.md`, wrap content in idempotency markers (`<!-- agent-friday:start -->` / `<!-- agent-friday:version:1 -->` / `<!-- agent-friday:end -->`), append to or replace marked section in `~/.claude/CLAUDE.md`
- [ ] T006 [US1] Add `--remove` flag to configure claude handler: strip bounded section from `~/.claude/CLAUDE.md` leaving surrounding content intact
- [ ] T007 [US1] Integration test in `tests/integration/` — first inject: markers + content written to `~/.claude/CLAUDE.md`; re-inject: section replaced not duplicated; remove: section stripped cleanly

**Checkpoint**: US1 fully functional — Claude Code sessions have Friday behavior active after configure

---

## Phase 3: User Story 3 — Cursor Integration (Priority: P1)

**Goal**: `agent-friday configure --integration cursor` installs `~/.agent-friday/AGENTS.md` (canonical path) and prints actionable manual project-level setup instructions.

**Independent Test**: Run `agent-friday configure --integration cursor`. Confirm `~/.agent-friday/AGENTS.md` exists with correct content. Confirm output message includes manual setup instructions for Cursor project-level rules.

- [ ] T008 [P] [US3] Update `src/cli/configure.ts` cursor handler: copy `src/assets/agents.md` to `~/.agent-friday/AGENTS.md`; print manual setup instructions directing user to copy to `.cursor/rules/` or project AGENTS.md
- [ ] T009 [US3] Integration test in `tests/integration/` — canonical file written at `~/.agent-friday/AGENTS.md`; content matches source; output message contains correct instructions

**Checkpoint**: US3 complete — both Claude Code and Cursor integrations handled by configure; canonical AGENTS.md in place

---

## Phase 4: User Story 2 — Friday Review (Priority: P2)

**Goal**: `/friday-review` lists recent vault entries with timestamps for audit; user can page through and invoke `friday-amend` / `friday-forget` to correct entries.

**Independent Test**: With several vault entries stored, run `/friday-review`. Confirm entries appear in reverse-chronological order with timestamps and IDs. Type `more`. Confirm next page loads. Run `/friday-amend <id>` on a listed entry.

**Prerequisite**: T001–T003 (Foundational) must be complete.

- [ ] T010 [P] [US2] Author `src/mcp/tools/memory-recent.ts` — input validation (limit 1–50, offset ≥ 0), call `vault.listRecent()`, return `RecentResult`; handle empty vault and tool errors
- [ ] T011 [US2] Register `memory_recent` tool in MCP server (`src/mcp/server.ts` or equivalent tool registry) — depends on T010
- [ ] T012 [US2] End-to-end test in `tests/integration/` — `memory_recent` tool call against running server: pagination, empty vault, out-of-range limit returns tool error
- [ ] T013 [P] [US2] Author `skills/friday-review/SKILL.md` per `specs/009-friday-hooks/contracts/friday-review.md` — role, steps (call `memory_recent`, display list, pagination, correction prompt), error handling
- [ ] T014 [US2] Update configure handlers (claude + cursor) in `src/cli/configure.ts` to install `friday-review` skill alongside existing skills — no new command required

**Checkpoint**: US2 complete — full capture-review-correct loop functional: Friday proposes → user approves → user reviews → user amends

---

## Phase 5: Polish & Cross-Cutting Concerns

- [ ] T015 [P] Update `CLAUDE.md` Active Technologies section: add `src/assets/agents.md` (static content, no runtime deps) for 009-friday-hooks
- [ ] T016 Run quickstart.md validation — smoke test Claude Code injection path end-to-end; confirm removal is clean; confirm Cursor canonical file path

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Independent of Phase 1 — can start immediately in parallel with Phase 1
- **US3 (Phase 3)**: Depends on T004 (AGENTS.md content authored in US1) — start after T004
- **US2 (Phase 4)**: Depends on Phase 1 complete (T001–T003) — start after Foundational checkpoint
- **Polish (Phase 5)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: No dependency on other stories — start immediately
- **US3 (P1)**: Depends on T004 only (shared AGENTS.md content) — can start as soon as AGENTS.md is authored
- **US2 (P2)**: Depends on Foundational phase — independent of US1 and US3 otherwise

### Parallel Opportunities

- T001–T003 (Foundational) run sequentially (T002 depends on T001; T003 depends on T002)
- T004–T007 (US1) and T001–T003 (Foundational) can run in parallel — different files
- T008 can start as soon as T004 is complete
- T010 and T013 are parallel — different files (MCP tool vs skill file)
- T011 depends on T010; T012 depends on T011

---

## Parallel Example: US1 + Foundational

```
# These can run simultaneously (different files):
Agent A: T001 → T002 → T003   (MemoryVault interface + SqliteVault + tests)
Agent B: T004 → T005 → T006 → T007   (AGENTS.md content + configure.ts + tests)
```

---

## Implementation Strategy

### MVP First (US1 Only — 4 tasks)

1. T004 — Author AGENTS.md content
2. T005 — Configure claude handler (inject)
3. T006 — Configure claude handler (remove)
4. T007 — Integration test
5. **STOP and VALIDATE**: Open Claude Code session, make a decision, confirm approval prompt

### Incremental Delivery

1. Foundational (T001–T003) + US1 (T004–T007) in parallel → validate behavioral layer in Claude Code
2. US3 (T008–T009) → validate Cursor canonical install
3. US2 (T010–T014) → validate review loop end-to-end
4. Polish (T015–T016)

---

## Summary

| Phase | Tasks | Story | Notes |
|-------|-------|-------|-------|
| Foundational | T001–T003 | — | Blocks US2 only; run in parallel with US1 |
| US1 | T004–T007 | US1 | MVP — AGENTS.md + Claude Code hook |
| US3 | T008–T009 | US3 | Cursor hook; depends on T004 |
| US2 | T010–T014 | US2 | Review loop; depends on Foundational |
| Polish | T015–T016 | — | — |

**Total**: 16 tasks | **MVP**: 4 tasks (US1 only) | **Parallel opportunities**: Foundational ∥ US1
