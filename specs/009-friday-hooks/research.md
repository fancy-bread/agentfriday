# Research: Friday Hooks — Behavioral Layer

**Branch**: `009-friday-hooks` | **Phase**: 0

---

## Decision 1: Claude Code hook mechanism

**Decision**: `agent-friday configure --integration claude` injects Friday's behavioral layer as a bounded, marked section directly into `~/.claude/CLAUDE.md`.

**Rationale**: Claude Code has no import or include syntax in CLAUDE.md. External file references in CLAUDE.md are documentation conventions only — the agent does not automatically load referenced files. The only reliable user-global mechanism is writing content directly into `~/.claude/CLAUDE.md`.

**Mechanism**: The configure command reads `~/.agent-friday/AGENTS.md`, wraps the content in idempotency markers, and appends (or updates) the section in `~/.claude/CLAUDE.md`:

```
<!-- agent-friday:start -->
[Friday AGENTS.md content]
<!-- agent-friday:end -->
```

Re-running configure replaces content between the markers. Removing the integration removes the section entirely.

**Alternatives considered**:
- Symlink `~/.agent-friday/AGENTS.md` into `~/.claude/` — Claude Code does not auto-load files in that directory beyond `CLAUDE.md` itself
- Copy `AGENTS.md` to `~/.claude/AGENTS.md` — not auto-discovered
- Reference via markdown link in CLAUDE.md — links are not processed; content is not loaded

---

## Decision 2: Cursor hook mechanism

**Decision**: Cursor has no user-global rules mechanism. For v1, `configure --integration cursor` installs `~/.agent-friday/AGENTS.md` (canonical) but does not inject it into Cursor automatically. Cursor support is documented as requiring manual project-level setup.

**Rationale**: Investigation of Cursor's configuration found no `userRules`, `globalRules`, or equivalent field. Rules live at `~/.cursor/projects/<project-hash>/rules/` (project-scoped) or as `.cursorules` at project root. There is no path that applies to all Cursor sessions regardless of project.

**v1 behaviour**: `configure --integration cursor` confirms the canonical AGENTS.md is in place and prints instructions for manual project-level setup. The MCP integration (from 008) remains unchanged and fully functional.

**v2 candidate**: If Cursor ships a user-global rules mechanism, the `cursor` integration handler adds an injection step — no spec change required, additive only.

**Alternatives considered**:
- Write to every Cursor project directory — fragile, does not scale, breaks on new projects
- Embed Friday behavior entirely in the MCP server — the MCP server is tool-agnostic infrastructure; behavioral guidance belongs in the agent layer, not the vault layer

---

## Decision 3: AGENTS.md content structure

**Decision**: `~/.agent-friday/AGENTS.md` is the single authored source of Friday's behavioral layer. It encodes: (1) Friday's role, (2) judgment criteria, (3) the approval interaction pattern, (4) the vault tool bindings. Content follows the AGENTS.md open format (https://agents.md/).

**Rationale**: Keeping content in one canonical file means all integrations benefit from updates to Friday's behavior without re-running configure — for Claude Code, configure injects a fresh copy; for Cursor, the canonical file is always current for manual project setup.

**Structure**:
```markdown
## Friday — Memory Assistant

You have access to a local encrypted memory vault via the Friday MCP tools.
Apply the following judgment criteria and interaction pattern in every session.

### What to Remember
[judgment criteria]

### Approval Pattern
[interaction pattern]

### Vault Tools
[tool bindings]
```

---

## Decision 4: `memory_recent` MCP tool

**Decision**: New read-only MCP tool `memory_recent` added to the vault server. Input: `{ limit?: number, offset?: number }`. Output: `{ entries: [{ id, timestamp, content }], total }`. Implemented as a `SELECT … ORDER BY created_at DESC LIMIT ? OFFSET ?` query through the `MemoryVault` interface.

**Rationale**: `friday-review` needs a paginated recency query. Existing `memory_query` is semantic/vector search — not suitable for chronological listing. A dedicated tool keeps concerns clean and the interface explicit.

**Constraint**: `memory_recent` MUST be added to the `MemoryVault` interface (Principle IV). `SqliteVault` implements it. Content is decrypted inside the MCP server process before being returned to the caller (Principle II). No plaintext touches storage.
