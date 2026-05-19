# Quickstart: MCP Server

**Feature**: 004-mcp-server | **Date**: 2026-05-18

## Prerequisites

- Node.js 24 LTS
- `npm install` complete
- `npx agent-friday init` already run (key + vault initialised)

## Start the Daemon

```bash
npx agent-friday start
```

The daemon starts, loads the key and vault, and listens for MCP tool calls over
stdio. No output on success — it is ready when it accepts the first connection.

## Connect an MCP Client

### Claude Code / Claude Desktop

Add to your MCP server config:

```json
{
  "mcpServers": {
    "agent-friday": {
      "command": "npx",
      "args": ["agent-friday", "start"]
    }
  }
}
```

The client launches the daemon as a child process and connects over stdio.

### Manual Test via MCP Inspector

```bash
npx @modelcontextprotocol/inspector npx agent-friday start
```

Open the inspector URL, then call tools from the UI.

## Tool Calls (Reference)

### memory_append

```json
{ "content": "Remember: deployment uses AWS ap-southeast-2 region" }
```

Returns: `{ "id": "<uuid>" }`

### memory_query

```json
{ "context": "AWS deployment region", "limit": 5 }
```

Returns: `{ "entries": [{ "id", "content", "createdAt", "action" }] }`

### memory_amend

```json
{ "id": "<uuid-from-append>", "content": "Deployment moved to ap-southeast-1" }
```

Returns: `{ "id": "<new-uuid>" }`

### memory_redact

```json
{ "id": "<uuid-from-append>", "reason": "no longer relevant" }
```

Returns: `{ "id": "<redaction-record-uuid>" }`

## Running Tests

```bash
npm test                    # all suites
npm run test:mcp            # MCP server tests only (once test:mcp script is added)
```

MCP server tests use `InMemoryTransport` — no daemon process is spawned. Tests are
fast and self-contained.

## Error Scenarios

| Scenario | Expected outcome |
|----------|-----------------|
| `init` not run before `start` | Exits with code 1 and message directing user to run `init` |
| `memory_append` with empty content | MCP error response; daemon stays running |
| `memory_amend` with unknown id | MCP error response; daemon stays running |
| Client disconnects (Ctrl-C on client side) | Daemon closes vault, exits 0 |
| `SIGTERM` sent to daemon | Daemon closes vault, exits 0 |
