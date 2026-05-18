# Agent Friday — Roadmap

**Target:** MVP — a working local memory service a technical user can install and use in Claude Code or Cursor on a Friday night.

Specs are the unit of work. Each spec folder contains a `spec.md` (contract), `plan.md` (approach), and `tasks.md` (implementation checklist). No code is written without a spec.

---

## MVP Epics

| # | Epic | Spec | Depends on |
|---|------|------|------------|
| 1 | Vault interface | `001-vault-interface` | — |
| 2 | Key custody | `002-key-custody` | 001 |
| 3 | SqliteVault | `003-sqlite-vault` | 001, 002 |
| 4 | MCP server | `004-mcp-server` | 001, 003 |
| 5 | Semantic index | `005-semantic-index` | 003 |
| 6 | Skill files | `006-skill-files` | 004 |
| 7 | Packaging & CLI | `007-packaging` | 002, 004, 005, 006 |

---

## Epic Summaries

### 001 — Vault interface
Lock the `MemoryVault` TypeScript interface and its invariants. Everything else implements or depends on this contract. Includes the `KeyManager` interface. No implementation — types and contracts only.

### 002 — Key custody
`init` command: key generation, Secure Enclave binding on M-series, Keychain storage under `io.agentfriday.vault`. `SoftwareKeyManager` fallback for non-macOS. Key material never touches disk outside the Keychain.

### 003 — SqliteVault
v1 `MemoryVault` implementation: SQLCipher database via `@signalapp/better-sqlite3`, schema migrations, append-only INSERT enforcement, redaction query filter, chain integrity verification. No embedding logic here — that's 005.

### 004 — MCP server
Local daemon over stdio. Wires the four MCP tool contracts (`memory_append`, `memory_query`, `memory_amend`, `memory_redact`) to the `MemoryVault` interface. Handles encrypt-before-write and decrypt-after-read. `start` command entry point.

### 005 — Semantic index
Embedding generation via Ollama + `nomic-embed-text`. Zero-vector fallback when Ollama is unavailable. Re-indexing path for entries stored without embeddings.

> **Constraint from 003**: `@signalapp/better-sqlite3` compiles SQLite without
> `SQLITE_ENABLE_LOAD_EXTENSION` — sqlite-vec cannot be loaded as a SQLite extension.
> This spec must choose an alternative vector search approach. Leading options:
> - **A) Cosine similarity in TypeScript** — fetch entries, compute similarity in
>   application code over stored embedding blobs. No extension, no extra file.
> - **B) Separate vector index file** — hnswlib or usearch alongside `vault.db`.
>   Vectors are not sensitive (per TDD) and can live unencrypted.
> Option A is simpler; Option B scales better. Decision belongs in this spec.

### 006 — Skill files
The four `friday-*.md` skill files: `friday-note`, `friday-recall`, `friday-amend`, `friday-forget`. Includes query-confirm-act pattern for amend and forget. Installed into the user's skill path by the packaging step.

### 007 — Packaging & CLI
`npx agent-friday` distribution. `init`, `status`, and `start` commands. Skill file installation into `~/.claude/skills/` (and tool-specific paths). MCP server registration instructions.

---

## v2 (post-MVP, reference only)

- Public MCP surface + API key authentication
- `ImmutableMemoryVault` — cloud-backed, tamper-evident + encrypted, cross-device sync
- Key recovery for non-technical users
- Facets — structured pre-filter attributes alongside vector search
