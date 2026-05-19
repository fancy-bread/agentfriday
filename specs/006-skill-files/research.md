# Research: Skill Files

**Phase**: 0 | **Feature**: 006-skill-files | **Date**: 2026-05-18

## Decision 1: Skill Format — Agent Skills Specification (agentskills.io)

**Decision**: Follow the [Agent Skills specification](https://agentskills.io/specification).
Each skill is a **directory** whose name matches the command name. Inside is a
`SKILL.md` file with YAML frontmatter + markdown body.

**Directory structure**:
```
skills/
├── friday-note/
│   └── SKILL.md
├── friday-recall/
│   └── SKILL.md
├── friday-amend/
│   └── SKILL.md
└── friday-forget/
    └── SKILL.md
```

**Frontmatter fields** (from spec):

| Field | Required | Notes |
|-------|----------|-------|
| `name` | Yes | Matches directory name; lowercase, hyphens only |
| `description` | Yes | What the skill does and when to use it (≤1024 chars) |
| `compatibility` | No | Environment requirements |
| `metadata` | No | Arbitrary key-value pairs |
| `allowed-tools` | No | Pre-approved tools (experimental) |

**Example**:
```yaml
---
name: friday-note
description: Store a memory in Friday's encrypted vault for future sessions. Use when the user says "remember", "note this", or wants to persist context across sessions.
compatibility: Requires agent-friday daemon running locally (agent-friday start)
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_append
---
```

**Rationale**: The agentskills.io spec is the emerging standard for cross-tool skill
portability. Using this format means Friday skills work in any compliant agent tool,
not just Claude Code. The directory structure also allows future expansion (adding
`references/` or `scripts/` subdirectories) without breaking existing installs.

**Alternatives considered**:
- Single `.md` files (Claude Code-specific format with `user-invocable: true`):
  Works today but is Claude Code-proprietary. Not compatible with other agent tools.
- JSON-based configuration: No precedent in the spec; breaks portability.

---

## Decision 2: Query-Confirm-Act — Implemented Entirely in the Prompt Body

**Decision**: The query-confirm-act pattern for `friday-amend` and `friday-forget`
is implemented as prompt instructions — no external state machine, no multi-turn
state tracking beyond what Claude handles natively.

**Implementation structure in the prompt**:

```
Step 1 — Query:
  Call memory_query with the user's description of the memory.
  If no results: inform the user and stop.

Step 2 — Confirm:
  Present the top result(s) to the user (content summary + age).
  Ask: "Is this the memory you want to [amend/forget]? (yes/no)"
  Wait for the user's response.

Step 3 — Act (only on confirmation):
  If yes: call memory_amend / memory_redact with the matched ID.
  If no: inform the user the operation was cancelled.
```

**Rationale**: Claude handles multi-turn reasoning within a single invocation.
The prompt can instruct Claude to pause and surface results before acting. No
custom state management code is required. This is how all complex Claude Code
skills work — the prompt drives the flow.

**Alternatives considered**:
- Two separate commands (`friday-find` + `friday-amend`): requires the user to
  manually chain commands; worse UX, breaks the atomic nature of the operation.
- Automatic without confirmation: violates FR-005 and FR-007 (must not act without
  confirmation).

---

## Decision 3: Source Directory — `skills/` at Repository Root

**Decision**: Skill files live in `skills/` at the repository root. This directory
is the deliverable for 007-packaging, which copies files into the user's skill path.

**Rationale**: Separates skill content from `src/` (runtime TypeScript) and
`specs/` (planning). Clean intent — `skills/` is the content that users install.

**Install path** (handled by 007-packaging, not this spec):
- Claude Code: `~/.claude/skills/friday-*.md`

---

## Decision 4: Prompt Language — Direct Imperative Instructions

**Decision**: Prompt bodies use direct imperative language ("Call `memory_query`",
"Present the results", "Do not call the tool until the user confirms"). No
system-prompt style framing.

**Rationale**: Claude Code skill prompts are injected directly into the agent's
context when the command is invoked. They read as task instructions, not as
persona definitions. Direct imperatives are the most reliable prompt pattern for
tool-calling skills.

---

## Decision 5: Recall Output Format — Numbered List with Age

**Decision**: `friday-recall` formats results as a numbered list. Each entry shows:
(1) the content and (2) when it was stored, expressed as relative time ("3 days ago",
"2 hours ago").

**Rationale**: Relative time is more readable than timestamps. Numbered list allows
the user to reference entries ("use #2") in follow-up amend/forget operations.

**Example output**:

```
Here are the most relevant memories:

1. Deployment region is AWS ap-southeast-2 (3 days ago)
2. Daily standups at 9am (1 week ago)
3. Auth middleware uses PKCE, not client_credentials (5 days ago)
```

---

## Decision 6: Error Surface — Human-Readable, Actionable

**Decision**: When a tool call fails (daemon not running, vault error), the skill
prompt instructs Claude to surface: what failed, why (in plain terms), and what to
do next ("Run `agent-friday start` to start the memory service").

**Rationale**: FR-009 requires actionable errors. Raw tool-call errors from the MCP
layer are opaque. The prompt must instruct Claude to interpret and restate them in
user-facing language.
