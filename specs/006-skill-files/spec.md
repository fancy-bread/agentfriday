# Feature Specification: Skill Files

**Feature Branch**: `006-skill-files`
**Created**: 2026-05-18
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Store a Memory via Agent Command (Priority: P1)

A user is working in their AI tool and says "remember that our deployment region is
ap-southeast-2." Their agent responds by storing that fact in Friday's memory vault.
The next time the user asks about deployment configuration, the agent can surface this
without being told again. The user gave one instruction; the memory persists across
sessions.

**Why this priority**: Without the ability to store memories on command, the service
has no content. This is the entry point for everything else.

**Independent Test**: Invoke the note command with a content string. Confirm the agent
calls the store operation and reports back a confirmation that the memory was saved.
Confirm the stored memory is retrievable in a subsequent recall.

**Acceptance Scenarios**:

1. **Given** a running memory service, **When** the user invokes the note command
   with content, **Then** the agent stores the memory and confirms it was saved.
2. **Given** a stored memory, **When** the user invokes recall in a new session,
   **Then** the previously stored memory is surfaced.
3. **Given** the note command is invoked with no content, **Then** the agent prompts
   the user for what to remember rather than failing silently.

---

### User Story 2 — Recall Relevant Memories in an Agent Session (Priority: P1)

A user starts a session on a new task. Their agent invokes the recall command with
context from the current conversation. Relevant memories from past sessions appear —
project decisions, preferences, prior work — without the user having to re-explain
them. The agent's responses are informed by this context from the start.

**Why this priority**: Recall is the primary value delivered. Without it, stored
memories have no effect on agent behaviour.

**Independent Test**: Store several entries across topics. Invoke recall with a
context string that relates to one topic. Confirm the relevant entries appear in the
response. Confirm unrelated entries do not dominate the results.

**Acceptance Scenarios**:

1. **Given** entries in the vault, **When** recall is invoked with a context string,
   **Then** the agent returns a formatted list of relevant memories.
2. **Given** no relevant memories exist, **When** recall is invoked, **Then** the
   agent reports "no relevant memories found" — it does not fail or return noise.
3. **Given** the recall command is invoked, **When** the agent surfaces memories,
   **Then** each result includes enough context for the user to understand what was
   stored (content and approximate age).

---

### User Story 3 — Update an Outdated Memory (Priority: P2)

A user knows a stored memory is stale. They invoke the amend command and describe
which memory to update. The agent finds the most relevant match, shows it to the user
("Found: [summary] — is this the one?"), and waits for confirmation before making any
change. Only after the user confirms does the agent update the memory. The original
is preserved in the ledger but no longer appears in recall.

**Why this priority**: Memories become stale. Without amendment, agents accumulate
incorrect context. The confirmation step is essential because memory IDs are
invisible to users — the agent must identify the right entry before acting.

**Independent Test**: Store a memory. Invoke the amend command describing the memory's
content. Confirm the agent surfaces the match and pauses for confirmation. After
confirming, verify the updated content is returned by recall and the original is not.

**Acceptance Scenarios**:

1. **Given** an existing memory, **When** the user invokes amend with a description,
   **Then** the agent queries the vault, surfaces the closest match(es), and asks for
   confirmation before changing anything.
2. **Given** the user confirms the match, **When** the agent proceeds, **Then** the
   new content is stored and the original no longer appears in recall results.
3. **Given** the user declines confirmation, **Then** no change is made and the
   agent reports that the operation was cancelled.
4. **Given** no matching memory is found, **Then** the agent reports this and asks
   the user to describe the memory differently.

---

### User Story 4 — Forget a Memory (Priority: P2)

A user wants to remove a memory — it may be sensitive, outdated, or simply no longer
relevant. They invoke the forget command and describe the memory. The agent finds the
most relevant match, shows it to the user for confirmation, and only then marks it as
forgotten. The memory no longer appears in any future recall. The ledger record is
preserved; only the recall visibility is removed.

**Why this priority**: The right to remove memories is a core product promise.
Users must be able to control what persists. The confirmation step is required
because the operation is permanent — a wrong deletion cannot be undone via recall.

**Independent Test**: Store a memory. Invoke the forget command. Confirm the agent
surfaces the match and waits for confirmation. After confirming, verify the memory
never appears in subsequent recall results.

**Acceptance Scenarios**:

1. **Given** an existing memory, **When** the user invokes forget with a description,
   **Then** the agent queries the vault, surfaces the match(es), and asks for
   confirmation before proceeding.
2. **Given** the user confirms, **Then** the memory is marked forgotten and absent
   from all future recall results.
3. **Given** the user declines, **Then** no change is made.
4. **Given** an optional reason is provided, **Then** it is accepted and stored with
   the forgotten record without affecting the user flow.

---

### Edge Cases

- What if the memory service is not running when a command is invoked? The agent
  must surface a clear, actionable error — not an opaque failure.
- What if the amend or forget query matches multiple entries with similar relevance?
  The agent should show the top matches and ask the user which one to act on.
- What if recall is invoked with no context at all? Return the most recently stored
  entries as a fallback.
- What if a note command is invoked and the vault write fails? The agent must report
  the failure — never silently drop content the user explicitly asked to remember.

---

## Requirements

### Functional Requirements

- **FR-001**: The note command MUST accept content and store it as a memory. It MUST
  confirm success or report failure to the user.
- **FR-002**: The recall command MUST accept a context description and return a
  formatted list of relevant memories from the vault.
- **FR-003**: The recall command MUST handle an empty vault gracefully — returning a
  "no memories found" response rather than an error.
- **FR-004**: The amend command MUST implement a query-confirm-act sequence: query
  the vault for matches, surface results, wait for user confirmation, then update.
- **FR-005**: The amend command MUST NOT modify any memory without explicit user
  confirmation in the same interaction.
- **FR-006**: The forget command MUST implement a query-confirm-act sequence: query
  the vault for matches, surface results, wait for user confirmation, then mark
  forgotten.
- **FR-007**: The forget command MUST NOT remove any memory without explicit user
  confirmation in the same interaction.
- **FR-008**: All four commands MUST be invokable by the agent independently —
  including recall, which the agent may call autonomously at the start of a session.
- **FR-009**: All four commands MUST surface a clear, actionable message when the
  memory service is unavailable.
- **FR-010**: The recall command output MUST include, for each result: the content
  summary and approximate age (time since stored).

### Key Entities

- **Note Command**: The user-facing skill that maps to storing a new memory. Accepts
  content from the user's instruction or the current conversation context.
- **Recall Command**: The user-facing skill that maps to querying the vault. Accepts
  a context description; returns a formatted list of relevant entries.
- **Amend Command**: The user-facing skill that updates an existing memory. Implements
  query-confirm-act to identify the target entry before any change.
- **Forget Command**: The user-facing skill that removes a memory from recall.
  Implements query-confirm-act to identify the target entry before any change.
- **Query-Confirm-Act Pattern**: A three-step interaction for destructive commands:
  (1) query the vault for matches, (2) surface results and ask for confirmation,
  (3) act only after explicit confirmation.

## Success Criteria

- **SC-001**: All four commands complete their primary flow successfully in 100% of
  test scenarios when the memory service is available.
- **SC-002**: The amend and forget commands never modify or remove a memory without
  user confirmation — confirmed in 100% of test scenarios.
- **SC-003**: The recall command surfaces the most semantically relevant memory in
  the top result in 95% of test scenarios with at least 5 stored entries.
- **SC-004**: All four commands produce a clear, readable response within the agent's
  context — no raw identifiers, no technical error codes surfaced to the user.
- **SC-005**: All four command descriptions are clear enough that a first-time user
  can invoke them correctly without reading documentation.

## Assumptions

- The memory service daemon (004-mcp-server) is already running and accessible when
  the commands are invoked. Service startup is not part of this spec.
- Skill installation into the user's tool path is handled by 007-packaging. This
  spec covers the command behaviour only.
- Commands may be invoked by the agent autonomously (e.g., recall at session start)
  or by explicit user instruction. Both modes must be supported.
- The four command names are fixed: `friday-note`, `friday-recall`, `friday-amend`,
  `friday-forget`. Aliases or alternative names are out of scope.
- A `limit` on recall results is applied internally; the user does not configure it.
  A sensible default (10 results) is used.
- The confirmation step in amend and forget is a single-turn interaction — the user
  responds in the same conversation turn, not via a separate command.
