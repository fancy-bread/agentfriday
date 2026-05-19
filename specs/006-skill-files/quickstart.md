# Quickstart: Skill Files

**Feature**: 006-skill-files | **Date**: 2026-05-18

## Prerequisites

- Agent Friday daemon running: `agent-friday start`
- Skills installed into your agent tool's skill path (handled by `007-packaging`)

## Using the Skills

### Store a Memory — `/friday-note`

```
/friday-note our API rate limit is 100 req/min per client
```

Or without an argument — the agent extracts context from the current conversation:

```
/friday-note
```

Expected: "Got it — I'll remember that the API rate limit is 100 req/min per client."

---

### Recall Relevant Memories — `/friday-recall`

```
/friday-recall AWS deployment configuration
```

Expected output:

```
Here's what I remember about AWS deployment:

1. Deployment region is ap-southeast-2 (3 days ago)
2. ECS cluster uses Fargate, not EC2 (1 week ago)
3. Staging and production share the same VPC (5 days ago)
```

The agent can also invoke this autonomously at the start of a session to prime
its context.

---

### Update a Memory — `/friday-amend`

```
/friday-amend the deployment region has moved to ap-southeast-1
```

The agent will:
1. Find the closest matching memory and show it to you
2. Ask "Is this the memory you want to update? (yes/no)"
3. Only update after you confirm

---

### Forget a Memory — `/friday-forget`

```
/friday-forget the old staging database URL
```

The agent will:
1. Find the closest matching memory and show it to you
2. Ask "Is this the memory you want me to forget? (yes/no)"
3. Only remove it after you confirm

---

## Skill Directory Structure

```
skills/
├── friday-note/
│   └── SKILL.md
├── friday-recall/
│   └── SKILL.md
├── friday-amend/
│   └── SKILL.md
└── friday-forget/
    └── SKILL.md
```

Each `SKILL.md` follows the [Agent Skills specification](https://agentskills.io/specification):
YAML frontmatter with `name`, `description`, `compatibility`, `metadata`, and
`allowed-tools`; followed by prompt instructions in the markdown body.

## Validation

```bash
# Validate skill format (requires skills-ref CLI)
skills-ref validate ./skills/friday-note
skills-ref validate ./skills/friday-recall
skills-ref validate ./skills/friday-amend
skills-ref validate ./skills/friday-forget
```

## Manual End-to-End Test

```bash
# 1. Start the daemon
agent-friday start &

# 2. Note a memory (via MCP Inspector or Claude Code)
# /friday-note "preferred AWS region is ap-southeast-2"

# 3. Recall it
# /friday-recall "AWS region"
# Expected: the stored memory appears in results

# 4. Amend it
# /friday-amend "region changed to ap-southeast-1"
# Expected: confirmation prompt, then update on yes

# 5. Forget it
# /friday-forget "AWS region"
# Expected: confirmation prompt, then removal on yes

# 6. Recall again
# /friday-recall "AWS region"
# Expected: "No relevant memories found"
```
