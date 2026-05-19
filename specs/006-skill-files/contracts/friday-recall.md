# Contract: friday-recall

**Directory**: `skills/friday-recall/SKILL.md`  
**Command**: `/friday-recall`  
**Phase**: 1 | **Feature**: 006-skill-files

## Frontmatter

```yaml
name: friday-recall
description: Retrieve relevant memories from Friday's vault to inform the current session. Use at the start of a work session, or when the user asks "what did I tell you about X", "do you remember", or "what's our approach to Y".
compatibility: Requires agent-friday daemon running locally (agent-friday start)
metadata:
  author: fancy-bread
allowed-tools: mcp__agent-friday__memory_query
```

## Prompt Contract

The body MUST instruct the agent to:

1. **Identify context**: Use `$ARGUMENTS` if provided; otherwise derive a context
   string from the current conversation (topic, project, task).
2. **Call**: `memory_query` with the context string and default limit (10).
3. **Format output** on success:
   - If results exist: numbered list, each entry showing content + relative age
     ("3 days ago", "2 hours ago").
   - If no results: "No relevant memories found. Use `/friday-note` to start
     building context."
4. **Handle error**: If the call fails, surface an actionable message about the
   daemon not being reachable.

## Output Format

```
Here's what I remember about [topic]:

1. [Memory content] (2 days ago)
2. [Memory content] (1 week ago)
3. [Memory content] (3 hours ago)
```

## Acceptance Tests

1. `/friday-recall "AWS deployment"` with matching entries → returns numbered list
2. `/friday-recall` with no argument → derives context from conversation
3. Empty vault → returns "No relevant memories found" with `/friday-note` hint
4. Daemon not running → surfaces actionable error
