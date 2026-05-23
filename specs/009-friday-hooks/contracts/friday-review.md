# Contract: friday-review Skill

**Feature**: 009-friday-hooks  
**Directory**: `skills/friday-review/SKILL.md`  
**Command**: `/friday-review`

---

## Frontmatter

```yaml
name: friday-review
description: >
  Review recent memories in Friday's encrypted vault. Use when the user wants to
  audit what has been stored, check recent entries, or prepare to amend or forget
  a memory.
compatibility: Requires the agent-friday daemon running locally. Start it with `agent-friday start`.
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_recent
```

## Prompt Contract

The skill MUST instruct the agent to:

1. **Call `memory_recent`** with `limit: 10, offset: 0` (default first page).

2. **Handle empty vault**: If `total === 0`, respond: "No memories stored yet." Stop.

3. **Display results** in a readable list. Each entry shows:
   - Index (1-based within page)
   - Timestamp (human-readable: e.g. "2026-05-23 14:32")
   - Content excerpt (first 120 characters; truncate with "…" if longer)
   - Entry ID (shown in small/muted style for reference)

4. **Show pagination summary**: e.g., "Showing 1–10 of 23 entries."

5. **Offer next page** if more entries exist: "Type `more` to see the next page."
   On `more`, call `memory_recent` with incremented offset and display the next page.

6. **Correction prompt**: After displaying results, show:
   > "To correct an entry: `/friday-amend <id>` to update, `/friday-forget <id>` to remove."

7. **Handle errors**: If `memory_recent` fails, respond:
   > "I couldn't reach Friday's memory service. Make sure it's running with `agent-friday start`."

## Display Format (reference)

```
## Recent Memories (1–10 of 23)

1. 2026-05-23 14:32 — Decided to use append-only semantics for tamper-evidence…
   id: 42da08bc-ac91-48da-8294-7d95ba53a97a

2. 2026-05-23 11:15 — SQLCipher chosen over Realm; no cloud dependency required…
   id: 7f3c1e22-bb44-4d90-a831-5a9d7c8e1f00

…

Showing 1–10 of 23 entries. Type `more` for the next page.

To correct an entry: `/friday-amend <id>` to update, `/friday-forget <id>` to remove.
```

## Acceptance Tests

1. Vault with 3 entries → lists all 3 with timestamps and IDs; no pagination offered
2. Vault with 15 entries → lists first 10; shows "1–10 of 15"; offers `more`
3. User types `more` → lists entries 11–15; shows "11–15 of 15"; no further pagination
4. Empty vault → "No memories stored yet."
5. Daemon not running → surfaces actionable error
