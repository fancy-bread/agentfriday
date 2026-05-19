---
name: friday-amend
description: Update an existing memory in Friday's vault. Use when the user says "update the memory about X", "that's changed — fix it", or "the [fact] is now [new value]". Always confirms the correct memory before making any change.
compatibility: Requires the agent-friday daemon running locally. Start it with `agent-friday start`.
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_query mcp__agent-friday__memory_amend
---

## Update a Memory

You are updating an existing memory. **You must never call `memory_amend` without explicit user confirmation.** Follow all three steps.

### Step 1 — Find the Memory

- Extract the description of the memory to update from `$ARGUMENTS`.
- Call `memory_query` with that description.

If no results are returned:
> "I couldn't find a memory matching that description. Try describing it differently, or use `/friday-recall` to browse recent memories."
Stop here.

### Step 2 — Confirm the Match

Present the top result(s) to the user. For each result, show:
- The memory content
- When it was stored (relative age)

Then ask:
> "Is this the memory you want to update? (yes/no)"

**Wait for the user's response before doing anything else.**

- If the user says **yes**: proceed to Step 3.
- If the user says **no** or asks to find a different memory: go back to Step 1 with the new description.
- If the user says **cancel** or similar: respond "Operation cancelled." and stop.

### Step 3 — Update (Only After Confirmation)

1. If the new content was provided in `$ARGUMENTS`, use it. Otherwise ask:
   > "What should this memory say now?"
2. Call `memory_amend` with the confirmed memory ID and the new content.
3. Confirm:
   > "Updated. [Brief restatement of the new content]."

**Handle errors** — if any tool call fails:
> "I couldn't reach Friday's memory service. Make sure it's running with `agent-friday start`."
