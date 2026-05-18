# CLAUDE.md — agentfriday (Agent Friday)

Development space for **Agent Friday** — a local memory service for AI agents, implemented as a local MCP server with `/friday-*` skill commands.

Global context and preferences: `~/.claude/CLAUDE.md`  
Product spec: `specs/000-agent-friday-core/prd.md`

---

## What We Are Building

A local MCP daemon (TypeScript) that gives any MCP-compatible AI client (Claude Code, Claude Desktop, Cursor) access to a private, encrypted, append-only memory vault. Exposed to agents as `/friday-*` skill commands.

v1 target: `npx agent-friday` installs and runs a local MCP server backed by SQLCipher. No cloud. No vendor-managed keys — the user's key is generated locally on `init` and never leaves the device. No runtime dependencies beyond Node.

---

## Stack

| Layer | Choice |
|-------|--------|
| Runtime | Node.js / TypeScript |
| MCP | `@modelcontextprotocol/sdk` |
| Storage | `@signalapp/better-sqlite3` (SQLCipher) + `sqlite-vec` |
| Encryption | `libsodium-wrappers` |
| Key custody | macOS Keychain / Secure Enclave |

---

## Invariants — Never Violate

1. **Append-only.** No DELETE in vault operations. Supersede and redact append new entries; the chain is never broken. This is enforced at the `MemoryVault` interface level.
2. **Encrypt before write.** Plaintext never touches storage. Encryption and decryption happen inside the MCP server process only.
3. **Keys never leave the device.** No design that sends key material to a network endpoint, a log, or a file outside the keychain. Key custody is the product's entire trust story.
4. **Interface over implementation.** All vault operations go through `MemoryVault`. SqliteVault is the v1 implementation. The interface must not leak implementation details.

---

## Workflow

Spec-first. No implementation without a spec in `specs/[###-feature-name]/`. The PRD and TDD are the north star; each spec is a contract the implementation fulfills. See `ROADMAP.md` for sequencing.

```
specs/
  000-agent-friday-core/ ← PRD and TDD
  001-vault-interface/   ← MemoryVault + KeyManager interfaces (contracts only)
  002-key-custody/       ← init command, Secure Enclave binding, KeyManager impl
  003-sqlite-vault/      ← SqliteVault implementation (SQLCipher + schema)
  004-mcp-server/        ← MCP daemon, four tool contracts, stdio transport
  005-semantic-index/    ← Embedding model, sqlite-vec ANN search
  006-skill-files/       ← friday-*.md skill files, query-confirm-act pattern
  007-packaging/         ← npx distribution, CLI commands (init, status, start)
```

---

## Test Philosophy

- Integration tests hit real SQLCipher. No mocking the vault.
- Encryption round-trips are tested with known ciphertext vectors.
- The append-only invariant has a dedicated test suite — no test passes by calling DELETE.
- MCP tool contracts are tested end-to-end against a running server instance.

---

## Out of Scope Until v2

- Cross-device sync
- Web/mobile UI
- Key escrow / recovery
- Anything requiring a cloud service

## Active Technologies
- TypeScript 5.x / Node.js 24 LTS + None — interface definitions have no runtime dependencies (001-vault-interface)
- N/A (interface only; implementation in `003-sqlite-vault`) (001-vault-interface)
- TypeScript 5.x / Node.js 24 LTS + `libsodium-wrappers`, `@types/libsodium-wrappers`, `node-keytar`, `commander` (002-key-custody)
- macOS Keychain under `io.agentfriday.vault` (primary); `~/.agent-friday/keys/` at 0600 (fallback) (002-key-custody)

## Recent Changes
- 001-vault-interface: Added TypeScript 5.x / Node.js 24 LTS + None — interface definitions have no runtime dependencies
