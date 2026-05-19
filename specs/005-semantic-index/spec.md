# Feature Specification: Semantic Index

**Feature Branch**: `005-semantic-index`
**Created**: 2026-05-18
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Query Returns Semantically Relevant Results (Priority: P1)

An AI agent calls `memory_query` with a context string. Instead of receiving only
the most recently stored entries, the agent receives entries that are semantically
related to the context — entries that share meaning even if they use different words.
The user benefits because the agent surfaces the right memories without the user
having to rephrase or remember exactly what they stored.

**Why this priority**: Without semantic ranking, `memory_query` falls back to
recency. The entire value of the memory service depends on returning *relevant*
memories. Relevance is the product.

**Independent Test**: Store several entries on varied topics. Call `memory_query`
with a context string that semantically matches one topic but uses different
vocabulary. Confirm the matching entry appears near the top of results. Confirm
unrelated entries are ranked lower or absent.

**Acceptance Scenarios**:

1. **Given** entries covering distinct topics, **When** `memory_query` is called
   with a context string that semantically matches one topic, **Then** the response
   contains the matching entry ranked above unrelated entries.
2. **Given** entries with semantic embeddings stored, **When** `memory_query` is
   called, **Then** results are ordered by semantic relevance, not insertion time.
3. **Given** a `limit` parameter, **When** `memory_query` is called, **Then** the
   top-N semantically ranked results are returned.

---

### User Story 2 — Embeddings Generated When Storing a Memory (Priority: P1)

When an AI agent stores a memory via `memory_append` or updates one via
`memory_amend`, the service automatically generates a semantic representation of
the content and stores it alongside the entry. The user does not need to do
anything different — storage works exactly as before, and the semantic capability
is added transparently.

**Why this priority**: Embeddings must be stored at write time. If entries are
stored without embeddings, they are invisible to semantic search. Write-time
embedding is the prerequisite for US1.

**Independent Test**: Call `memory_append` with content while the embedding service
is available. Confirm the entry is stored and is retrievable via `memory_query`
with a semantically related context. Confirm a subsequent query with a different
but related context also returns the entry.

**Acceptance Scenarios**:

1. **Given** the embedding service is available, **When** `memory_append` is called,
   **Then** the entry is stored with a semantic embedding and is reachable via
   semantic query.
2. **Given** the embedding service is available, **When** `memory_amend` is called,
   **Then** the amended entry is stored with a fresh embedding.
3. **Given** the embedding service is unavailable, **When** `memory_append` is
   called, **Then** the entry is still stored successfully with a placeholder
   representation — the write does not fail.

---

### User Story 3 — Graceful Degradation When Embedding Service Is Unavailable (Priority: P1)

The AI agent calls `memory_query`. The embedding service is not running. The service
returns results ranked by recency instead of relevance, without surfacing an error
to the agent. The user's workflow is uninterrupted; the quality of recall degrades
silently rather than blocking the operation.

**Why this priority**: A dependency on an external service must never block core
operations. The memory service must remain functional regardless of embedding
service availability.

**Independent Test**: Stop the embedding service. Call `memory_append` and
`memory_query`. Confirm both complete without error. Confirm results are returned
(by recency). Confirm no error is propagated to the calling agent.

**Acceptance Scenarios**:

1. **Given** the embedding service is unavailable, **When** `memory_query` is
   called, **Then** results are returned based on recency and no error is raised.
2. **Given** the embedding service is unavailable, **When** `memory_append` is
   called, **Then** the entry is stored with a placeholder and the call succeeds.
3. **Given** the service recovers after being unavailable, **When** subsequent
   `memory_append` calls are made, **Then** new entries receive embeddings
   without requiring a restart.

---

### Edge Cases

- What if an entry's content produces an unusable embedding (empty vector, model
  error)? The entry must be stored with a placeholder; the write must not fail.
- What if `memory_query` is called with a context string that produces no meaningful
  embedding? Return results by recency; do not error.
- What if the vault contains thousands of entries? The ranking operation must
  complete within a time that does not degrade the agent's experience.
- What if the embedding service returns an unexpected response format? Treat it as
  unavailable and fall back to recency.

---

## Requirements

### Functional Requirements

- **FR-001**: When the embedding service is available, `memory_append` MUST store
  a semantic embedding alongside each new entry.
- **FR-002**: When the embedding service is available, `memory_amend` MUST store a
  fresh semantic embedding for the new entry.
- **FR-003**: When the embedding service is unavailable, write operations MUST
  succeed and store a placeholder embedding without error.
- **FR-004**: `memory_query` MUST rank results by semantic similarity when embeddings
  are present, falling back to recency when they are not.
- **FR-005**: `memory_query` MUST NOT return an error when the embedding service is
  unavailable; it MUST fall back silently to recency-based ranking.
- **FR-006**: The embedding service connection MUST be configurable — host, port,
  or equivalent — with a sensible local default.
- **FR-007**: The service MUST recover embedding generation automatically after the
  embedding service becomes available again, without requiring a restart.

### Key Entities

- **Embedding**: A fixed-size numeric representation of an entry's content that
  captures semantic meaning. Stored alongside the encrypted payload. Not considered
  sensitive — derived from plaintext but does not allow content reconstruction.
- **Placeholder Embedding**: A zero-value representation stored when the embedding
  service is unavailable. Marks the entry as not yet semantically indexed.
- **Embedding Service**: An external local process that converts text into embeddings.
  The memory service connects to it at write time and query time.

## Success Criteria

- **SC-001**: A `memory_query` call with a semantically related context returns the
  correct entry in the top 3 results in 95% of test cases covering varied topics.
- **SC-002**: `memory_append` completes in under 2 seconds when the embedding service
  is available (including embedding generation time).
- **SC-003**: `memory_append` and `memory_query` complete without error in 100% of
  test scenarios where the embedding service is unavailable.
- **SC-004**: `memory_query` with semantic ranking returns results in under 1 second
  for vaults containing up to 1,000 entries.

## Assumptions

- The embedding service runs locally on the same machine as the daemon — no
  network calls leave the device. This preserves the keys-never-leave-device trust
  model: the content is sent to a local process only.
- The `SqliteVault` (003) already stores an embedding blob per entry. This spec does
  not modify the schema — it fills in those blobs with real values.
- The embedding model produces fixed-size vectors. The size must match the column
  definition in the existing schema (768 dimensions per TDD).
- Re-indexing of entries stored before this feature ships is out of scope — this is
  a greenfield project and the feature ships before any real user data exists.
- The specific embedding model and service protocol are resolved in the planning
  phase — this spec does not name them.
