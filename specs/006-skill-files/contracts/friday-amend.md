# Contract: friday-amend

**Directory**: `skills/friday-amend/SKILL.md`  
**Command**: `/friday-amend`  
**Phase**: 1 | **Feature**: 006-skill-files

## Frontmatter

```yaml
name: friday-amend
description: Update an existing memory in Friday's vault. Use when the user says "update the memory about X", "that's changed — fix it", or "the [fact] is now [new value]". Always confirms the match before making any change.
compatibility: Requires agent-friday daemon running locally (agent-friday start)
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_query mcp__agent-friday__memory_amend
```

## Prompt Contract — Query-Confirm-Act

The body MUST implement the three-step sequence:

### Step 1 — Query
- Extract the description of the memory to update from `$ARGUMENTS`.
- Call `memory_query` with that description.
- If no results: "I couldn't find a memory matching that description. Try describing
  it differently, or use `/friday-recall` to browse recent memories."

### Step 2 — Confirm
- Present the top result(s) (content + age).
- Ask: "Is this the memory you want to update? (yes/no)"
- **Do not proceed until the user explicitly confirms.**
- If the user says no or describes a different memory: loop back to Step 1.

### Step 3 — Act (only on confirmation)
- Extract the new content from the user's instruction.
- If new content was not provided in the original command, ask: "What should this
  memory say now?"
- Call `memory_amend` with the confirmed ID and new content.
- Confirm: "Updated. [Brief restatement of new content]."

## Acceptance Tests

1. `/friday-amend "deployment region is now ap-southeast-1"` → queries, shows match,
   waits for yes/no, then calls `memory_amend` only on yes
2. User says no → no change made, "Operation cancelled."
3. No matching memory → prompts user to describe differently
4. Daemon not running → actionable error
