<!--
Sync Impact Report
==================
Version change:    N/A → 1.0.0 (initial adoption)
Added sections:    Core Principles (I–V), Storage Properties, Development Workflow, Governance
Removed sections:  N/A (initial)
Templates:
  ✅ plan-template.md  — Constitution Check gates identified (see below)
  ✅ spec-template.md  — No updates required; template is constitution-agnostic
  ✅ tasks-template.md — No updates required; template is constitution-agnostic
Deferred TODOs:    None — all placeholders resolved
-->

# Agent Friday Constitution

## Core Principles

### I. Append-Only Ledger

All vault operations MUST use INSERT only. No UPDATE, no DELETE, ever. Amend and
redact actions append new entries that reference the prior entry by ID; the chain
is never broken. This invariant is enforced at the `MemoryVault` interface level —
implementations MUST NOT expose any operation that truncates or destroys chain history.

**Rationale:** The immutability chain is the tamper-evidence guarantee. A vault that
allows deletion cannot prove its history is intact.

### II. Encrypt Before Write

Plaintext MUST never touch storage. Every entry MUST be encrypted inside the MCP
server process before any write reaches the vault. Decryption happens after read,
inside the MCP server process only. The storage backend — including the SQLCipher
layer — MUST never receive or store plaintext content.

**Rationale:** Defense in depth. SQLCipher provides database-level encryption;
payload-level encryption (XSalsa20-Poly1305) ensures the storage backend cannot
read content even with the database key.

### III. Keys Never Leave the Device

Key material MUST NOT be sent to any network endpoint, written to any log, or stored
in any file outside the macOS Keychain (or the software fallback at
`~/.agent-friday/keys/` with permissions 0600). Key generation is explicit — the
`init` command only, never silently on `start`. If a vault exists but no key is
found, the daemon MUST abort and direct the user to `init`; it MUST NOT generate a
replacement key.

**Rationale:** Key custody is the product's entire trust story. A key that can leave
the device is a key that can be stolen.

### IV. Interface Over Implementation

All vault operations MUST go through the `MemoryVault` TypeScript interface.
`SqliteVault` is the v1 implementation. The interface MUST NOT leak implementation
details — no SQLite types, no Keychain types in the public contract. Every future
vault backend (e.g., `ImmutableMemoryVault`) MUST implement the same interface
without requiring changes to callers.

**Rationale:** The v2 path (cloud-backed vault, cross-device sync) depends on this
seam being clean. Coupling callers to SqliteVault forces rewrites.

### V. Spec Before Code

Implementation MUST NOT begin without a spec in `specs/[###-feature-name]/spec.md`.
Each spec is a contract; the implementation fulfills it. The PRD and TDD in
`specs/000-agent-friday-core/` are the north star. `ROADMAP.md` defines sequencing
and epic dependencies.

**Rationale:** Code without a spec is hard to review, hard to test, and hard to
replace. Contracts first.

## Storage Properties

Every `MemoryVault` implementation MUST satisfy both properties:

- **Tamper-evidence** — the append-only signed chain makes silent modification
  detectable. Entries reference their predecessor by hash; any alteration breaks
  the chain. (Enforced by Principle I.)
- **Encryption** — payload content is unreadable without the user's key, including
  to the storage backend itself. (Enforced by Principle II.)

A backend satisfying tamper-evidence only (e.g., an audit/compliance log) does not
meet the standard. Both properties are required in every implementation.

## Development Workflow

The following are mandatory, not advisory:

- Integration tests MUST hit real SQLCipher. No mocking the vault.
- Encryption round-trips MUST be tested with known ciphertext vectors.
- The append-only invariant MUST have a dedicated test suite. No test may pass by
  calling DELETE, UPDATE, or any destructive operation.
- MCP tool contracts MUST be tested end-to-end against a running server instance.
- The `init` command MUST be tested to confirm it aborts when a key already exists.
- Chain integrity verification MUST be included in daemon startup tests.

## Governance

This constitution supersedes all other guidance when conflicts arise. Amendments
require:

1. A version increment per semantic versioning:
   - **MAJOR** — principle removal, redefinition, or backward-incompatible governance change
   - **MINOR** — new principle or section added, or material expansion of existing guidance
   - **PATCH** — clarification, wording, or non-semantic refinement
2. A Sync Impact Report comment prepended to this file documenting the change.
3. Review of all active spec work against the amended constitution before proceeding.

The five core principles are non-negotiable for v1. Any proposal to relax them
requires explicit justification against the trust model and a MAJOR version bump.

---

**Constitution Check gates** (for use in `plan-template.md`):

- [ ] Does this feature touch vault operations? → Verify Principle I (append-only)
- [ ] Does this feature write to storage? → Verify Principle II (encrypt before write)
- [ ] Does this feature handle key material? → Verify Principle III (keys never leave device)
- [ ] Does this feature add or change a vault operation? → Verify Principle IV (interface contract)
- [ ] Does a spec exist before any implementation begins? → Verify Principle V

---

**Version**: 1.0.0 | **Ratified**: 2026-05-17 | **Last Amended**: 2026-05-17
