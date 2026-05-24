# Quickstart: Friday Hooks

**Branch**: `009-friday-hooks`

---

## Prerequisites

- `agent-friday init` completed (vault and key exist)
- `agent-friday start` running

---

## Activating Friday in a Project

Friday is per-project opt-in. Run configure from the root of any project where you want Friday active:

```bash
cd /path/to/your/project
agent-friday configure --integration claude   # for Claude Code
agent-friday configure --integration cursor   # for Cursor
```

Both commands inject Friday's behavioral layer as a bounded section into `./AGENTS.md` at the project root. If no `AGENTS.md` exists, one is created. Existing content is preserved.

To verify:

```bash
grep -n "agent-friday" AGENTS.md
# <!-- agent-friday:start -->  (line N)
# <!-- agent-friday:end -->    (line M)
```

Configure is idempotent — re-running replaces the section in place. Re-run after upgrading `agent-friday` to pick up updated behavioral layer content.

Open a session in that project. Make an explicit decision. The approval prompt will surface when a noteworthy moment is detected:

> Should I remember: [brief restatement]? Yes / No / Edit

---

## Removing Friday from a Project

Delete the bounded section from `./AGENTS.md` manually:

```bash
# Remove lines from <!-- agent-friday:start --> to <!-- agent-friday:end --> inclusive
```

The vault, key, and MCP tools are unaffected.

---

## Reviewing Recent Memories

```
/friday-review
```

Lists recent vault entries with timestamps. Type `more` to page through. Use `/friday-amend <id>` or `/friday-forget <id>` to correct entries.
