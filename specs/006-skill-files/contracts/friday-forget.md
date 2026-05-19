# Contract: friday-forget

**Directory**: `skills/friday-forget/SKILL.md`  
**Command**: `/friday-forget`  
**Phase**: 1 | **Feature**: 006-skill-files

## Frontmatter

```yaml
name: friday-forget
description: Remove a memory from Friday's vault so it no longer appears in recall. Use when the user says "forget that", "remove the memory about X", or "that's no longer relevant". Always confirms the match before making any change.
compatibility: Requires agent-friday daemon running locally (agent-friday start)
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_query mcp__agent-friday__memory_redact
```

## Prompt Contract — Query-Confirm-Act

The body MUST implement the three-step sequence:

### Step 1 — Query
- Extract the description of the memory to remove from `$ARGUMENTS`.
- Call `memory_query` with that description.
- If no results: "I couldn't find a memory matching that description. Try describing
  it differently, or use `/friday-recall` to browse recent memories."

### Step 2 — Confirm
- Present the top result(s) (content + age).
- Ask: "Is this the memory you want me to forget? (yes/no)"
- **Do not proceed until the user explicitly confirms.**
- Emphasise: this memory will no longer appear in future recall.
- If the user says no: "Operation cancelled. The memory is unchanged."

### Step 3 — Act (only on confirmation)
- Call `memory_redact` with the confirmed ID.
- Confirm: "Done. I'll no longer surface that memory."

## Acceptance Tests

1. `/friday-forget "old deployment region"` → queries, shows match, waits for yes/no,
   calls `memory_redact` only on yes
2. User says no → no change, "Operation cancelled."
3. No matching memory → prompts user to describe differently
4. After forget, `/friday-recall` with same context does not return the entry
5. Daemon not running → actionable error
