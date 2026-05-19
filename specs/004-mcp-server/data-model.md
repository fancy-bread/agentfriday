# Data Model: MCP Server

**Phase**: 1 | **Feature**: 004-mcp-server | **Date**: 2026-05-18

## Overview

This feature introduces no new persisted entities. All persistent state lives in
the vault (`SqliteVault` from 003). This document captures the in-process
request/response shapes used at the MCP tool boundary.

---

## Tool: `memory_append`

**Input**

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `content` | string | yes | non-empty |

**Output (success)**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUIDv4) | Identifier of the new vault entry |

**Output (error)** — returned as MCP tool error (isError: true)

| Condition | Message |
|-----------|---------|
| `content` is empty | `"content must not be empty"` |
| Vault write fails | Error message from SqliteVault |

---

## Tool: `memory_query`

**Input**

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `context` | string | yes | non-empty |
| `limit` | integer | no | ≥ 1; default 10 |

**Output (success)**

| Field | Type | Description |
|-------|------|-------------|
| `entries` | array | Zero or more decrypted entries |
| `entries[].id` | string (UUIDv4) | Entry identifier |
| `entries[].content` | string | Decrypted plaintext |
| `entries[].createdAt` | number | Unix timestamp (ms) |
| `entries[].action` | `'append' \| 'amend'` | Entry kind (redacted entries excluded) |

**Output (error)**

| Condition | Message |
|-----------|---------|
| Vault read fails | Error message from SqliteVault |

---

## Tool: `memory_amend`

**Input**

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `id` | string | yes | Must reference an existing entry |
| `content` | string | yes | non-empty |

**Output (success)**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUIDv4) | Identifier of the new (amended) vault entry |

**Output (error)**

| Condition | Message |
|-----------|---------|
| `id` not found in vault | Error from SqliteVault |
| `content` is empty | `"content must not be empty"` |
| Vault write fails | Error message from SqliteVault |

---

## Tool: `memory_redact`

**Input**

| Field | Type | Required | Constraint |
|-------|------|----------|------------|
| `id` | string | yes | Must reference an existing entry |
| `reason` | string | no | Optional human-readable explanation |

**Output (success)**

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUIDv4) | Identifier of the new redaction record |

**Output (error)**

| Condition | Message |
|-----------|---------|
| `id` not found in vault | Error from SqliteVault |
| Vault write fails | Error message from SqliteVault |

---

## Response Serialisation

All tool responses are serialised as JSON text in the MCP `content` array:

```json
{ "content": [{ "type": "text", "text": "<JSON string>" }] }
```

Success payloads are `JSON.stringify`-ed before being placed in `text`.
Error responses use the MCP error format (`isError: true`) produced automatically
by `McpServer` when a handler throws.
