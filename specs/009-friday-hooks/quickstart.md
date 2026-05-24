# Quickstart: Friday Hooks

**Branch**: `009-friday-hooks`

---

## Prerequisites

- `agent-friday init` completed (vault and key exist)
- `agent-friday configure --integration <tool>` run for your agent tool
- `agent-friday start` running

---

## Claude Code

After `agent-friday configure --integration claude`, Friday's behavioral layer is injected into `~/.claude/CLAUDE.md`. Verify with:

```bash
grep -n "agent-friday" ~/.claude/CLAUDE.md
```

You should see the `<!-- agent-friday:start -->` and `<!-- agent-friday:end -->` markers with Friday's AGENTS.md content between them.

Open a new Claude Code session. Make a decision during the session — Friday's criteria are now active via the host agent's context. An approval prompt will surface when a noteworthy moment is detected.

To update after a Friday upgrade:

```bash
agent-friday configure --integration claude
```

Configure is idempotent — it replaces the marked section in place.

---

## Cursor

Cursor has no user-global rules mechanism. Friday's behavioral layer is activated per project by running configure from the project root.

```bash
cd /path/to/your/project
agent-friday configure --integration cursor
```

This injects Friday's behavioral layer as a bounded section into the project's `./AGENTS.md`. If no `AGENTS.md` exists, one is created. Existing project content outside the markers is preserved.

To verify:

```bash
grep -n "agent-friday" AGENTS.md
# <!-- agent-friday:start -->  (line N)
# <!-- agent-friday:end -->    (line M)
```

Configure is idempotent — re-running replaces the section in place. Run it again after upgrading `agent-friday` to pick up updated behavioral layer content.

The MCP integration (vault tools) is fully active regardless — `memory_append`, `memory_query`, `memory_amend`, `memory_redact`, and `memory_recent` are available in any Cursor session where the daemon is running.

---

## Reviewing Recent Memories

```
/friday-review
```

Lists recent vault entries with timestamps. Type `more` to page through. Use `/friday-amend <id>` or `/friday-forget <id>` to correct entries.

---

## Removing Friday Behavior

```bash
agent-friday configure --integration claude --remove
```

Removes the injected section from `~/.claude/CLAUDE.md`. The vault and key are unaffected.
