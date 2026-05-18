# Feature Specification: Vault Interface

**Feature Branch**: `001-vault-interface`
**Created**: 2026-05-17
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Store a Memory Entry (Priority: P1)

A caller submits a piece of content to the vault. The vault encrypts it, appends it
to the ledger, and returns a unique identifier the caller can reference later.

**Why this priority**: The append operation is the foundation. No other operation is
meaningful without entries in the vault. Everything downstream depends on this
working correctly.

**Independent Test**: A caller can store a content string and receive a non-empty
identifier. A subsequent read of the ledger confirms the entry exists and the
payload is not stored as plaintext.

**Acceptance Scenarios**:

1. **Given** a running vault with a valid key, **When** a caller submits a non-empty
   content string, **Then** the vault returns a unique identifier and the entry is
   persisted to the ledger.
2. **Given** a running vault, **When** a caller submits content, **Then** the stored
   payload is unreadable without the encryption key (no plaintext at rest).
3. **Given** two successive append calls, **When** the ledger is inspected, **Then**
   each entry references its predecessor by hash, forming an unbroken chain.

---

### User Story 2 — Query Memories by Context (Priority: P1)

A caller provides a natural-language context string. The vault returns the most
semantically relevant active entries, excluding anything redacted.

**Why this priority**: Retrieval is the primary value delivered to agents. Without
useful recall, stored memories have no effect on agent behaviour.

**Independent Test**: A caller stores several entries with distinct content, then
queries with a context string closely related to one of them. The most relevant
entry appears in the results; redacted entries do not appear.

**Acceptance Scenarios**:

1. **Given** entries in the vault, **When** a caller queries with a relevant context
   string, **Then** the most semantically similar active entries are returned,
   decrypted, in ranked order.
2. **Given** an entry that has been redacted, **When** a caller queries, **Then**
   the redacted entry does not appear in results regardless of semantic similarity.
3. **Given** no entries in the vault, **When** a caller queries, **Then** an empty
   result set is returned without error.

---

### User Story 3 — Amend an Outdated Memory (Priority: P2)

A caller identifies an entry that is no longer accurate and submits replacement
content. The vault appends the amended entry to the ledger, linking it to the
original. The original is preserved but excluded from future query results.

**Why this priority**: Memories become stale. Without amendment, the vault
accumulates incorrect context that degrades agent behaviour over time.

**Independent Test**: A caller stores an entry, then amends it with new content.
A subsequent query returns the amended content, not the original. Inspecting the
ledger confirms both entries exist and the amended entry references the original
by ID.

**Acceptance Scenarios**:

1. **Given** an existing entry, **When** a caller amends it with new content, **Then**
   the vault returns a new identifier and the original entry is superseded.
2. **Given** an amended entry, **When** a caller queries, **Then** the new content
   appears and the original content does not.
3. **Given** an amend request for an unknown identifier, **When** the vault processes
   it, **Then** the vault returns an error and no orphaned entry is created.

---

### User Story 4 — Redact a Memory (Priority: P2)

A caller identifies an entry that should be forgotten. The vault appends a redaction
record to the ledger, linking it to the original. The original entry is excluded
from all future query results while the ledger chain remains intact.

**Why this priority**: Users must be able to remove sensitive or incorrect memories.
The right to be forgotten is a core product promise and a legal requirement.

**Independent Test**: A caller stores an entry, then redacts it. A subsequent query
does not return the entry. Inspecting the ledger confirms the original entry and the
redaction record both exist — nothing was deleted.

**Acceptance Scenarios**:

1. **Given** an existing entry, **When** a caller redacts it, **Then** the vault
   appends a redaction record and returns a new identifier.
2. **Given** a redacted entry, **When** a caller queries with any context, **Then**
   the redacted entry never appears in results.
3. **Given** a redact request for an unknown identifier, **When** the vault processes
   it, **Then** the vault returns an error and no orphaned record is created.
4. **Given** a redacted entry, **When** the ledger is inspected, **Then** both the
   original entry and the redaction record are present — no data has been deleted.

---

### Edge Cases

- What happens when content is empty? The vault must reject empty content with an
  error; it must not store a blank entry.
- What happens when the encryption key is unavailable at write time? The vault must
  abort the write and return an error; it must not store plaintext as a fallback.
- What happens when the ledger chain cannot be verified at startup? The vault must
  refuse to accept new writes until integrity is confirmed or the issue is resolved.
- What happens when two callers append concurrently? Each entry must receive a
  unique identifier; no entries may be silently dropped or merged.

## Requirements

### Functional Requirements

- **FR-001**: The vault MUST accept a content string and return a unique entry
  identifier on successful append.
- **FR-002**: The vault MUST store all content in encrypted form; plaintext MUST
  never be written to the underlying store.
- **FR-003**: The vault MUST maintain an append-only ledger; no entry may be
  deleted or modified after it is written.
- **FR-004**: Every entry MUST reference its predecessor by a cryptographic hash,
  forming a tamper-evident chain.
- **FR-005**: The vault MUST return semantically relevant active entries in response
  to a free-text context query.
- **FR-006**: Query results MUST exclude all entries that have been redacted or that
  have been superseded by an amend record.
- **FR-007**: An amend operation MUST append a new entry linked to the original and
  return a new identifier; the original entry MUST be preserved in the ledger.
- **FR-008**: A redact operation MUST append a redaction record linked to the
  original and return a new identifier; the original entry MUST be preserved in
  the ledger.
- **FR-009**: The vault MUST return a clear error when asked to amend or redact an
  identifier that does not exist.
- **FR-010**: The vault MUST reject empty content on append with a clear error.
- **FR-011**: All four operations (append, query, amend, redact) MUST be defined on
  a single interface; the interface MUST NOT expose details of the underlying
  storage or key management implementation.

### Key Entities

- **MemoryVault**: The interface defining the four operations. All callers interact
  exclusively through this contract.
- **MemoryEntry**: A single record in the ledger. Carries an identifier, encrypted
  payload, timestamp, reference to the prior entry (if any), and the action type
  (append / amend / redact).
- **EntryId**: A unique, opaque identifier assigned to each entry at write time.
- **KeyManager**: A separate interface responsible for encryption, decryption, and
  signing. Composed with the vault; the vault delegates all cryptographic operations
  to it.

## Success Criteria

- **SC-001**: A caller can store, query, amend, and redact entries through the
  MemoryVault interface without needing to know anything about the underlying
  storage or encryption mechanism.
- **SC-002**: Any entry stored by the vault can be retrieved only by a caller
  possessing the correct key — verified by attempting retrieval with a wrong or
  absent key and confirming failure.
- **SC-003**: After any sequence of appends, amends, and redacts, the ledger chain
  is intact and verifiable — no gaps, no deletions, no broken references.
- **SC-004**: Redacted entries never appear in query results, confirmed across 100%
  of test scenarios.
- **SC-005**: The interface is implementable by a second backend (beyond v1) without
  any change to callers — validated by substituting a test double that implements
  the same contract.

## Assumptions

- The caller (MCP server) is responsible for deciding what content to store. The
  vault stores what it is given without applying judgment or filtering.
- A `KeyManager` implementation will be provided to the vault at construction time;
  the vault does not manage keys directly.
- Semantic ranking in query results depends on an embedding service being available.
  If unavailable, the vault may fall back to recency ordering — this is acceptable
  for the interface spec; the fallback behaviour is defined in the semantic index spec.
- Concurrent callers are expected to be rare in v1 (single local daemon); the
  interface must be correct under concurrency but extreme throughput is not a
  v1 requirement.
- This spec covers the interface contract only. The v1 implementation (SqliteVault)
  and its schema are specified separately in `specs/003-sqlite-vault`.
