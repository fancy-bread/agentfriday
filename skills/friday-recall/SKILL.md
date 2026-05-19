---
name: friday-recall
description: Retrieve relevant memories from Friday's vault to inform the current session. Use at the start of a work session, or when the user asks "what did I tell you about X", "do you remember", or "what's our approach to Y".
compatibility: Requires the agent-friday daemon running locally. Start it with `agent-friday start`.
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_query
---

## Recall Relevant Memories

You are retrieving memories from Friday's vault to provide context for the current session.

### Steps

1. **Identify the context.**
   - If `$ARGUMENTS` is non-empty, use it as the query context.
   - If no argument was given, derive a context string from the current conversation — the topic, task, or project being discussed.

2. **Call `memory_query`** with the context string. Use the default limit (10 results).

3. **Format the response.**

   If results are returned:
   ```
   Here's what I remember about [topic]:

   1. [Memory content] ([relative age, e.g. "2 days ago"])
   2. [Memory content] ([relative age])
   3. [Memory content] ([relative age])
   ```
   Express age in human-readable relative terms ("3 days ago", "1 week ago", "2 hours ago").

   If no results are returned:
   > "No relevant memories found. Use `/friday-note` to start building context."

4. **Handle errors** — if the tool call fails, respond:
   > "I couldn't reach Friday's memory service. Make sure it's running with `agent-friday start`."
