# Contract: friday-note

**Directory**: `skills/friday-note/SKILL.md`  
**Command**: `/friday-note`  
**Phase**: 1 | **Feature**: 006-skill-files

## Frontmatter

```yaml
name: friday-note
description: Store a memory in Friday's encrypted vault for future sessions. Use when the user says "remember this", "note that", "save this for later", or wants to persist any context, decision, or fact across sessions.
compatibility: Requires agent-friday daemon running locally (agent-friday start)
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_append
```

## Prompt Contract

The body MUST instruct the agent to:

1. **Identify content**: Use `$ARGUMENTS` if provided; otherwise extract the most
   noteworthy fact or decision from the current conversation context.
2. **Validate**: If no content can be identified, ask "What should I remember?"
   Do not store a blank entry.
3. **Call**: `memory_append` with the content string.
4. **Confirm**: On success, acknowledge in plain language: "Got it — I'll remember
   that [brief restatement of content]."
5. **Handle error**: If the call fails, say "I couldn't reach Friday's memory
   service. Make sure it's running with `agent-friday start`."

## Acceptance Tests

1. `/friday-note "API rate limit is 100 req/min"` → calls `memory_append`, confirms
2. `/friday-note` with no argument → extracts context or asks user what to remember
3. Daemon not running → surfaces actionable error
