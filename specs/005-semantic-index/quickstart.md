# Quickstart: Semantic Index

**Feature**: 005-semantic-index | **Date**: 2026-05-18

## Prerequisites

- Node.js 24 LTS
- `npm install` complete
- Agent Friday initialised: `npx agent-friday init`
- Ollama installed (optional but needed for semantic search)

## Set Up Ollama (Optional)

```bash
# macOS
brew install ollama

# Start Ollama first
ollama serve

# Then pull the embedding model (in a separate terminal)
ollama pull nomic-embed-text
```

Verify Ollama is running:

```bash
curl http://localhost:11434/api/embed \
  -d '{"model":"nomic-embed-text","input":"test"}' | head -c 200
```

## Start the Daemon

```bash
npx agent-friday start
```

The daemon connects to Ollama automatically. If Ollama is not running, writes and
queries still work — just without semantic ranking.

## Verify Semantic Ranking

Using MCP Inspector or Claude Code:

```json
// Store two entries on different topics
{"tool": "memory_append", "arguments": {"content": "The deployment region is AWS ap-southeast-2"}}
{"tool": "memory_append", "arguments": {"content": "Our team uses daily stand-ups at 9am"}}

// Query semantically — should return the AWS entry first
{"tool": "memory_query", "arguments": {"context": "cloud infrastructure region"}}
```

With Ollama running, the AWS entry should rank first despite not containing the
words "cloud", "infrastructure", or "region".

Without Ollama running, both entries are returned by recency (most recent first).

## Running Tests

```bash
npm test                      # All suites including new semantic tests
npm run test:unit             # Cosine math tests (no vault, no Ollama)
npm run test:integration      # Semantic ranking with StubEmbedder (no real Ollama)
```

Semantic integration tests use a `StubEmbedder` with deterministic vectors — no
Ollama required to run them.

## Degraded Mode (No Ollama)

| Scenario | Behaviour |
|----------|-----------|
| Ollama not installed | Entries stored with zero-vector; query returns by recency |
| Ollama installed, not running | Same as above — no error surfaced to agent |
| Ollama starts mid-session | New writes get real embeddings; old zero-vector entries remain recency-only |
