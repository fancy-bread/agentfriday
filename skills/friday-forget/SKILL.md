---
name: friday-forget
description: Remove a memory from Friday's vault so it no longer appears in recall. Use when the user says "forget that", "remove the memory about X", or "that's no longer relevant". Always confirms the correct memory before making any change.
compatibility: Requires the agent-friday daemon running locally. Start it with `agent-friday start`.
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_query mcp__agent-friday__memory_redact
---

## Forget a Memory

You are permanently removing a memory from recall. **You must never call `memory_redact` without explicit user confirmation.** Follow all three steps.

### Step 1 — Find the Memory

- Extract the description of the memory to remove from `$ARGUMENTS`.
- Call `memory_query` with that description.

If no results are returned:
> "I couldn't find a memory matching that description. Try describing it differently, or use `/friday-recall` to browse recent memories."
Stop here.

### Step 2 — Confirm the Match

Present the top result(s) to the user. For each result, show:
- The memory content
- When it was stored (relative age)

Then ask:
> "Is this the memory you want me to forget? Once forgotten, it won't appear in future recall. (yes/no)"

**Wait for the user's response before doing anything else.**

- If the user says **yes**: proceed to Step 3.
- If the user says **no** or describes a different memory: go back to Step 1 with the new description.
- If the user says **cancel** or similar: respond "Operation cancelled. The memory is unchanged." and stop.

### Step 3 — Forget (Only After Confirmation)

1. Call `memory_redact` with the confirmed memory ID.
2. Confirm:
   > "Done. I'll no longer surface that memory."

**Handle errors** — if any tool call fails:
> "I couldn't reach Friday's memory service. Make sure it's running with `agent-friday start`."
