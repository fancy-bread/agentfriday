# Research: Friday Hooks — Behavioral Layer

**Branch**: `009-friday-hooks` | **Phase**: 0

---

## Decision 1: Hook mechanism — both integrations

**Decision**: Both `configure --integration claude` and `configure --integration cursor` inject Friday's behavioral layer as a bounded, idempotent section into `./AGENTS.md` at the current project root. Identical mechanism for both tools. Friday is per-project opt-in — not active unless the user has explicitly run configure in that project.

**Rationale**: Claude Code's `~/.claude/CLAUDE.md` global injection was the original approach, but it creates an opt-out model (active everywhere until `--remove` is run). An opt-in model — where Friday is active only in projects the user has explicitly enabled — is preferable. Since Cursor has no user-global mechanism, using per-project `./AGENTS.md` for both tools gives consistent behaviour and eliminates tool-specific injection paths. The AGENTS.md format (https://agents.md/) is the established cross-tool standard for project-level agent instructions.

**Mechanism**: The configure command reads `src/assets/agents.md`, wraps the content in idempotency markers, and appends (or updates) the section in `./AGENTS.md`:

```
<!-- agent-friday:start -->
<!-- agent-friday:version:1 -->
[Friday behavioral layer content]
<!-- agent-friday:end -->
```

Re-running configure replaces content between the markers. Removal is manual (user deletes the bounded section) — no `--remove` flag.

**Alternatives considered**:
- Global `~/.claude/CLAUDE.md` injection for Claude Code — user-global opt-out model; rejected in favour of per-project opt-in
- Symlink `./AGENTS.md -> ~/.agent-friday/AGENTS.md` — clobbers existing project AGENTS.md; not viable
- Copy content per project from a canonical path — updates don't propagate; requires re-run after upgrades

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

**Decision**: `src/assets/agents.md` is the source-controlled template for Friday's behavioral layer. It encodes: (1) Friday's role, (2) judgment criteria, (3) the approval interaction pattern, (4) the vault tool bindings. Content follows the AGENTS.md open format (https://agents.md/).

**Rationale**: Keeping content in a source-controlled template means all integrations inject from the same source. Re-running configure after an upgrade picks up the latest content automatically.

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
