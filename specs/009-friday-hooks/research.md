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

**Decision**: Cursor has no user-global rules mechanism. `configure --integration cursor` (run from a project root) injects Friday's content as a bounded, idempotent section into the project's `./AGENTS.md` — the same marker pattern used for Claude Code's `~/.claude/CLAUDE.md` injection. If no `./AGENTS.md` exists, one is created. Developer runs configure once per project where Friday is needed.

**Rationale**: Injecting into the existing `./AGENTS.md` coexists with project-specific guidance without overwriting it. The shared marker pattern keeps both integration handlers consistent — one inject/update/remove utility, two target files. The committed Friday section is team-useful (any team member with the daemon running gets Friday behavior), not user-private.

**v2 candidate**: If Cursor ships a user-global rules mechanism, the cursor handler adds a global injection step alongside or replacing the per-project approach.

**Alternatives considered**:
- Symlink `./AGENTS.md -> ~/.agent-friday/AGENTS.md` — clobbers existing project AGENTS.md; not viable
- Copy content per project — updates don't propagate without re-running configure after upgrades
- Write to every Cursor project directory automatically — configure has no knowledge of all user projects

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
