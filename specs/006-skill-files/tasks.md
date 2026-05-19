# Tasks: Skill Files

**Input**: Design documents from `specs/006-skill-files/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different directories, no dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- All four skills are independent — T002–T005 can run in parallel after T001

---

## Phase 1: Setup

**Purpose**: Create the `skills/` directory tree

- [ ] T001 Create `skills/friday-note/`, `skills/friday-recall/`, `skills/friday-amend/`, and `skills/friday-forget/` directories at repository root (`mkdir -p skills/friday-note skills/friday-recall skills/friday-amend skills/friday-forget`)

---

## Phase 2: Foundational

No blocking prerequisites — all four skill files are independent content. Proceed directly to user story phases after T001.

---

## Phase 3: User Story 1 — Store a Memory via Agent Command (Priority: P1)

**Goal**: A working `/friday-note` skill that accepts content and stores it via `memory_append`

**Independent Test**: Invoke `/friday-note "test content"` against a running daemon; confirm the agent calls `memory_append` and reports a confirmation

### Implementation for User Story 1

- [ ] T002 [P] [US1] Create `skills/friday-note/SKILL.md` — frontmatter: `name: friday-note`, description, `compatibility: Requires agent-friday daemon running locally (agent-friday start)`, `metadata: {author: fancy-bread}`, `allowed-tools: mcp__agent-friday__memory_append`; body: instructions to (1) use $ARGUMENTS or extract context if absent, (2) call `memory_append`, (3) confirm with "Got it — I'll remember that [summary]", (4) surface actionable error if daemon unreachable. See `specs/006-skill-files/contracts/friday-note.md` for full contract.

**Checkpoint**: `skills/friday-note/SKILL.md` exists and passes `skills-ref validate skills/friday-note` (if CLI available)

---

## Phase 4: User Story 2 — Recall Relevant Memories (Priority: P1)

**Goal**: A working `/friday-recall` skill that queries the vault and returns a formatted numbered list

**Independent Test**: Invoke `/friday-recall "topic"` against a vault with stored entries; confirm results are returned as a numbered list with content and relative age

### Implementation for User Story 2

- [ ] T003 [P] [US2] Create `skills/friday-recall/SKILL.md` — frontmatter: `name: friday-recall`, description (include "use at the start of a session" and "when the user asks what did I tell you about X"), `compatibility`, `metadata`, `allowed-tools: mcp__agent-friday__memory_query`; body: (1) use $ARGUMENTS or derive context from conversation, (2) call `memory_query` with limit 10, (3) format as numbered list with content + relative age, (4) return "No relevant memories found. Use `/friday-note` to start building context." on empty results. See `specs/006-skill-files/contracts/friday-recall.md`.

**Checkpoint**: `skills/friday-recall/SKILL.md` exists; empty vault returns "No relevant memories found" message

---

## Phase 5: User Story 3 — Update an Outdated Memory (Priority: P2)

**Goal**: A working `/friday-amend` skill implementing query-confirm-act — never updates without explicit user confirmation

**Independent Test**: Invoke `/friday-amend` with a description; confirm the agent surfaces the match and pauses before calling `memory_amend`; confirm no update on "no" response

### Implementation for User Story 3

- [ ] T004 [P] [US3] Create `skills/friday-amend/SKILL.md` — frontmatter: `name: friday-amend`, description (include "always confirms the match before making any change"), `compatibility`, `metadata`, `allowed-tools: mcp__agent-friday__memory_query mcp__agent-friday__memory_amend`; body: implement 3-step sequence — Step 1: call `memory_query` with description from $ARGUMENTS; Step 2: present top match(es) with content+age and ask "Is this the memory you want to update? (yes/no)" — DO NOT proceed without confirmation; Step 3: only on "yes", call `memory_amend` with confirmed id and new content, confirm "Updated.". See `specs/006-skill-files/contracts/friday-amend.md`.

**Checkpoint**: Skill body contains explicit "do not call memory_amend without confirmation" instruction; query-confirm-act steps are clearly separated

---

## Phase 6: User Story 4 — Forget a Memory (Priority: P2)

**Goal**: A working `/friday-forget` skill implementing query-confirm-act — never removes without explicit user confirmation

**Independent Test**: Invoke `/friday-forget` with a description; confirm the agent surfaces the match and pauses; confirm entry absent from recall after "yes" confirmation

### Implementation for User Story 4

- [ ] T005 [P] [US4] Create `skills/friday-forget/SKILL.md` — frontmatter: `name: friday-forget`, description (include "always confirms the match before making any change"), `compatibility`, `metadata`, `allowed-tools: mcp__agent-friday__memory_query mcp__agent-friday__memory_redact`; body: implement 3-step sequence — Step 1: call `memory_query` with description from $ARGUMENTS; Step 2: present top match(es) with content+age and ask "Is this the memory you want me to forget? (yes/no)" — emphasise this cannot be undone from recall — DO NOT proceed without confirmation; Step 3: only on "yes", call `memory_redact` with confirmed id, confirm "Done. I'll no longer surface that memory.". See `specs/006-skill-files/contracts/friday-forget.md`.

**Checkpoint**: Skill body contains explicit "do not call memory_redact without confirmation" instruction; irreversibility is communicated to user in Step 2

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validate all four skills meet the Agent Skills specification

- [ ] T006 [P] Validate frontmatter for all four skills: name matches directory, description ≤1024 chars, no uppercase or consecutive hyphens in name — run `skills-ref validate skills/friday-note skills/friday-recall skills/friday-amend skills/friday-forget` if `skills-ref` CLI is available; otherwise manually verify each SKILL.md frontmatter
- [ ] T007 Run end-to-end validation per `specs/006-skill-files/quickstart.md`: start daemon, invoke note → recall → amend (confirm yes) → forget (confirm yes) → recall (entry absent)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 — no dependencies
- **US1–US4 (Phases 3–6)**: All require T001 (directory must exist); otherwise independent
- **Polish (Phase 7)**: Requires T002–T005 complete

### User Story Dependencies

All four skills are independent — US1 through US4 can be worked in parallel after T001 completes.

### Parallel Opportunities

T002, T003, T004, T005 — all target different directories. Run together after T001.

---

## Parallel Example

```
# After T001 completes:
Task T002: Create skills/friday-note/SKILL.md
Task T003: Create skills/friday-recall/SKILL.md
Task T004: Create skills/friday-amend/SKILL.md
Task T005: Create skills/friday-forget/SKILL.md
```

---

## Implementation Strategy

### MVP (US1 + US2 — P1 skills only)

1. T001: Create directories
2. T002: friday-note (parallel with T003)
3. T003: friday-recall (parallel with T002)
4. **STOP and VALIDATE**: note a memory, recall it; confirm the core loop works

### Full Delivery

5. T004: friday-amend
6. T005: friday-forget
7. T006–T007: Polish and E2E validation
