# Data Model: Skill Files

**Phase**: 1 | **Feature**: 006-skill-files | **Date**: 2026-05-18

## Overview

No persistent entities. Skill files are static documents. The data that flows
through them is owned by the vault (004 + 003). This document captures the
structural shape of each skill file and the data each command exchanges with
the daemon.

---

## Skill Directory Structure

Each skill follows the [Agent Skills specification](https://agentskills.io/specification):
a directory named after the command containing a `SKILL.md` file.

```
friday-note/
└── SKILL.md
```

**`SKILL.md` Frontmatter** (YAML):

| Field | Required | Value for Friday skills |
|-------|----------|------------------------|
| `name` | Yes | Directory name: `friday-note`, `friday-recall`, etc. |
| `description` | Yes | What the skill does and when to invoke it (≤1024 chars) |
| `compatibility` | No | `Requires agent-friday daemon running locally` |
| `metadata` | No | `author: fancy-bread` |
| `allowed-tools` | No | Space-separated MCP tool names (experimental) |

**Body** (markdown):

Prompt instructions for the agent. Contains tool call sequences, confirmation
logic, and output formatting guidance.

---

## Command Data Flows

### `friday-note`

| Direction | Data |
|-----------|------|
| Input | `content: string` — the text to remember (from user's instruction or current context) |
| Tool call | `memory_append({ content })` |
| Output | Confirmation: "Stored: [brief summary of content]" or error message |

### `friday-recall`

| Direction | Data |
|-----------|------|
| Input | `context: string` — what the user wants to recall (from current conversation) |
| Tool call | `memory_query({ context, limit: 10 })` |
| Output | Numbered list of results with content + relative age, or "No relevant memories found" |

### `friday-amend`

| Direction | Data |
|-----------|------|
| Input | User's description of which memory to change + new content |
| Tool call 1 | `memory_query({ context: <user description> })` |
| Intermediate | Surface top match(es) to user; wait for confirmation |
| Tool call 2 | `memory_amend({ id: <confirmed id>, content: <new content> })` — only on confirm |
| Output | "Updated: [new content summary]" or "Cancelled" |

### `friday-forget`

| Direction | Data |
|-----------|------|
| Input | User's description of which memory to remove |
| Tool call 1 | `memory_query({ context: <user description> })` |
| Intermediate | Surface top match(es) to user; wait for confirmation |
| Tool call 2 | `memory_redact({ id: <confirmed id> })` — only on confirm |
| Output | "Forgotten." or "Cancelled" |
