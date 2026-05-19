---
name: friday-note
description: Store a memory in Friday's encrypted vault for future sessions. Use when the user says "remember this", "note that", "save this for later", or wants to persist any fact, decision, or context across sessions.
compatibility: Requires the agent-friday daemon running locally. Start it with `agent-friday start`.
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_append
---

## Store a Memory

You are saving something to Friday's memory vault so it can be recalled in future sessions.

### Steps

1. **Identify what to remember.**
   - If `$ARGUMENTS` is non-empty, use it as the content.
   - If no argument was given, extract the most noteworthy fact, decision, or piece of context from the current conversation.
   - If nothing specific can be identified, ask the user: "What would you like me to remember?"
   - Do not store a blank or generic entry.

2. **Call `memory_append`** with the identified content string.

3. **Confirm success** in plain language:
   > "Got it — I'll remember that [brief restatement of what was stored]."

4. **Handle errors** — if the tool call fails, respond:
   > "I couldn't reach Friday's memory service. Make sure it's running with `agent-friday start`."
   Do not retry silently. Surface the problem immediately.
