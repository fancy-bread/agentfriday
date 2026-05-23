# Feature Specification: Friday Hooks — Behavioral Layer

**Feature Branch**: `009-friday-hooks`
**Created**: 2026-05-23
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Host Agent Applies Friday Behavior and Captures a Noteworthy Moment (Priority: P1)

A developer is mid-session working with any supported agent tool. The host agent has been configured with Friday's behavioral layer and natively applies its judgment criteria as part of normal conversation processing. When a notable decision is made, the host agent surfaces an approval prompt: "Should I remember: [brief restatement]? Yes / No / Edit." The developer approves and the entry is stored in the vault. No separate process, no background watcher — the agent the developer is already talking to acts as Friday.

**Why this priority**: This is the core value proposition. Without embedded capture, Friday requires the user to recognise and trigger every note — the same problem it exists to solve. The AGENTS.md delivery model makes this lightweight: no extra token pass, no surveillance feel.

**Independent Test**: In a session where a decision is made (e.g., "we're using append-only semantics to preserve audit integrity"), the host agent surfaces an approval prompt before the conversation moves on. User selects Yes. Entry appears in vault.

**Acceptance Scenarios**:

1. **Given** a session where an explicit decision is stated, **When** the host agent identifies it as noteworthy per Friday's criteria, **Then** it prompts "Should I remember: [restatement]? Yes / No / Edit" before the conversation moves on.
2. **Given** an approval prompt is shown, **When** the user selects Yes, **Then** the agent calls `memory_append` with the identified content and confirms: "Got it — noted."
3. **Given** an approval prompt is shown, **When** the user selects No, **Then** the entry is discarded silently — no vault write, no follow-up.
4. **Given** an approval prompt is shown, **When** the user selects Edit and provides revised content, **Then** the agent calls `memory_append` with the revised content and confirms.
5. **Given** a casual remark, question, or status update is made, **When** the agent evaluates it, **Then** no approval prompt is shown — Friday's criteria exclude non-noteworthy exchanges.

---

### User Story 2 — Friday Review: Audit Recent Memories (Priority: P2)

A developer runs `/friday-review` and sees a paginated list of recent vault entries — each showing a timestamp and a brief excerpt. They can scan the list and decide whether any entries need amendment or removal using the existing `friday-amend` and `friday-forget` flows.

**Why this priority**: Embedded capture without an audit trail erodes trust. Users need to see what has been stored and correct it without friction.

**Independent Test**: After several sessions where Friday behavior has stored entries, run `/friday-review`. Confirm entries are listed in reverse-chronological order with timestamps. Select an entry and invoke `friday-amend` to correct it.

**Acceptance Scenarios**:

1. **Given** one or more vault entries exist, **When** the user runs `/friday-review`, **Then** entries are shown in reverse-chronological order, each with a timestamp and a content excerpt.
2. **Given** more entries exist than fit on one page, **When** the first page is shown, **Then** the user is offered a way to page through remaining entries.
3. **Given** no entries exist, **When** `/friday-review` is run, **Then** the agent responds: "No memories stored yet."
4. **Given** a review listing is shown, **When** the user identifies an entry to correct, **Then** they can invoke `/friday-amend` or `/friday-forget` directly using the entry's identifier.

---

### User Story 3 — Friday Behavior is Available in Any AGENTS.md-Compatible Tool (Priority: P1)

A developer uses both Claude Code and Cursor. After running `agent-friday configure --integration <tool>` for each, Friday's behavioral layer is active in both. No tool-specific code, no separate agent process, no Claude-specific configuration beyond what AGENTS.md already provides to any compliant tool.

**Why this priority**: The multi-integration architecture from 008 is the product's portability promise. A behavioral layer that only works in one tool violates that promise. AGENTS.md is the cross-tool standard that makes this portable by default.

**Independent Test**: Run `agent-friday configure --integration cursor`. Open a Cursor session. Make a decision. Confirm the approval prompt surfaces through Cursor's native agent interface with no additional setup.

**Acceptance Scenarios**:

1. **Given** Friday is configured for Cursor, **When** a noteworthy moment occurs in a Cursor session, **Then** Cursor's host agent surfaces an approval prompt using Friday's criteria.
2. **Given** Friday is configured for Claude Code, **When** a noteworthy moment occurs in a Claude Code session, **Then** Claude Code's host agent surfaces an approval prompt using Friday's criteria.
3. **Given** the Friday AGENTS.md is installed, **When** any AGENTS.md-compatible tool loads it, **Then** Friday behavior is active with no tool-specific code paths required.

---

### Edge Cases

- What if the user ignores an approval prompt and continues the conversation? The agent treats non-response as No — no entry is written, no re-prompt.
- What if the same content has already been stored in a recent entry? The agent suppresses the duplicate prompt — do not surface an approval for content already captured.
- What if `memory_append` fails (daemon not running)? The agent surfaces the error: "I couldn't reach Friday's memory service. Make sure it's running with `agent-friday start`." Entry is not silently lost.
- What if `memory_recent` returns no results for `/friday-review`? Respond with "No memories stored yet." — not an error.
- What if the user selects Edit but provides empty content? The agent re-prompts once: "What should the memory say?" If still empty, discard silently.
- What if an AGENTS.md-compatible tool does not support the `memory_append` MCP tool? The approval prompt will surface but the write will fail — the error message directs the user to verify their MCP configuration.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Friday's behavioral layer MUST be delivered as an AGENTS.md file stored at `~/.agent-friday/AGENTS.md` — Friday's canonical home directory, established in prior specs.
- **FR-002**: `agent-friday configure --integration <tool>` MUST hook each supported tool to load `~/.agent-friday/AGENTS.md` using that tool's native user-level configuration mechanism. No project-level file is created; the hook is user-global.
- **FR-003**: The AGENTS.md MUST encode Friday's judgment criteria: noteworthy moments are explicit decisions, non-obvious constraints, resolved ambiguities, and changed assumptions. Not noteworthy: casual remarks, questions, status updates.
- **FR-004**: The AGENTS.md MUST encode the approval interaction pattern: before writing any vault entry, the host agent MUST surface "Should I remember: [brief restatement of content]? Yes / No / Edit."
- **FR-005**: On Yes, the host agent MUST call `memory_append` with the identified content and confirm in plain language.
- **FR-006**: On No, the host agent MUST discard the proposed entry silently — no vault write, no follow-up.
- **FR-007**: On Edit, the host agent MUST accept revised content from the user and call `memory_append` with the revised content.
- **FR-008**: The host agent MUST NOT prompt for approval of casual remarks, questions, or status updates.
- **FR-009**: The host agent MUST NOT re-prompt for content that is substantially identical to a recently stored entry.
- **FR-010**: A new `memory_recent` MCP tool MUST be added to the vault server. It MUST return entries in reverse-chronological order, support a configurable page size, and include entry ID, timestamp, and content for each result.
- **FR-011**: A `friday-review` skill MUST be authored. It MUST call `memory_recent`, display results with timestamps and content excerpts, support pagination, and direct the user to `friday-amend` or `friday-forget` for corrections.

### Key Entities

- **Friday Behavioral Layer**: The AGENTS.md file that encodes Friday's judgment criteria and approval interaction pattern. Installed by `agent-friday configure`; read natively by any AGENTS.md-compatible tool.
- **Approval Prompt**: The one-line interaction the host agent surfaces before writing a vault entry. Three options: Yes (append), No (discard), Edit (revise then append).
- **Noteworthy Moment**: A session event that meets Friday's judgment criteria: an explicit decision, a non-obvious constraint, a resolved ambiguity, or a changed assumption.
- **`memory_recent` Tool**: A new MCP tool on the vault server. Returns the N most recent vault entries in reverse-chronological order, each with ID, timestamp, and content.
- **`friday-review` Skill**: A new skill file that invokes `memory_recent` and presents results for user audit, bridging into the existing amend/forget correction flow.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In a session containing at least one explicit decision, the host agent surfaces an approval prompt for it before the conversation moves more than two turns past the decision point, in 100% of test scenarios.
- **SC-002**: The host agent does not surface an approval prompt for casual remarks, questions, or status updates in 100% of test scenarios.
- **SC-003**: Friday behavior is active in both Claude Code and Cursor after running `agent-friday configure` for each — no additional setup required.
- **SC-004**: `/friday-review` returns results within 2 seconds for vaults with up to 1,000 entries.
- **SC-005**: No vault entry is written without explicit user approval — zero unauthorised writes in all test scenarios.
- **SC-006**: The full capture-review-correct loop (agent proposes → user approves → user reviews → user amends) completes without leaving the agent session.

## Assumptions

- The vault server process is already running when Friday's behavioral layer is active. Daemon lifecycle management is handled by existing `agent-friday start` / `agent-friday status` commands.
- `~/.agent-friday/AGENTS.md` is the single canonical location for Friday's behavioral layer. Each tool's configure hook loads from this path via that tool's native user-level mechanism — Claude Code via `~/.claude/CLAUDE.md` reference, Cursor via its user rules configuration. The exact hook mechanism per tool is a planning-phase detail.
- AGENTS.md as a format is supported by Claude Code and Cursor. The convention is defined at https://agents.md/. Tools that do not support AGENTS.md or an equivalent user-level instruction file are out of scope for v1.
- The `memory_recent` tool is the only new MCP tool required. Existing `memory_append`, `memory_query`, `memory_amend`, and `memory_redact` tools are unchanged.
- Judgment criteria are encoded in the AGENTS.md, not in vault business logic. The vault remains criteria-agnostic.
- The existing `friday-amend`, `friday-forget`, `friday-note`, and `friday-recall` skills are unchanged. The behavioral layer and review flow complement them; they do not replace them.
