# Agent Friday

Local encrypted memory for AI agents. Friday gives Claude Code (and any compatible agent tool) a private, persistent memory vault — so context carries across sessions without re-explaining.

**Keys never leave your device. No cloud. No vendor.**

---

## Install & Setup

```bash
npx agent-friday init --integration claude
```

This single command:
1. Generates your encryption keypair locally
2. Creates the encrypted vault
3. Installs the `/friday-*` skills into Claude Code
4. Registers the memory service so Claude Code auto-starts it

**Prerequisites**: Node.js 24+. Ollama (optional — enables semantic search).

---

## Commands

| Command | What it does |
|---------|-------------|
| `/friday-note` | Store a memory — "remember that our deploy region is ap-southeast-2" |
| `/friday-recall` | Recall relevant memories — surfaces context from past sessions |
| `/friday-amend` | Update a stale memory — confirms the match before changing anything |
| `/friday-forget` | Remove a memory — confirms before permanently hiding it from recall |

`/friday-amend` and `/friday-forget` always show you the matching memory and ask for confirmation before acting.

---

## CLI

```bash
agent-friday status          # check vault, key, skills, and MCP registration
agent-friday start           # start the memory daemon (Claude Code does this automatically)
agent-friday init            # vault + key only, no integration
```

---

## How It Works

- **Vault**: SQLite database encrypted with SQLCipher. Append-only — nothing is ever deleted.
- **Keys**: Generated locally on `init`. Stored at `~/.agent-friday/keys/` (0600). Never sent anywhere.
- **Encryption**: Each memory entry is encrypted with XSalsa20-Poly1305 before it touches storage.
- **Semantic search**: When [Ollama](https://ollama.com) is running with `nomic-embed-text`, queries return semantically relevant results. Falls back to recency if Ollama is unavailable.
- **Skills**: Follow the [Agent Skills specification](https://agentskills.io/specification). Installed to `~/.claude/skills/`.

---

## Semantic Search (Optional)

```bash
ollama serve
# in a new terminal:
ollama pull nomic-embed-text
```

With Ollama running, `memory_query` ranks results by meaning rather than recency.

---

## Privacy

Friday is designed so that you are the only party who can read your memories:

- The encryption key never leaves the device
- Content is encrypted before being written to the vault
- The vault file is additionally encrypted at the database level (SQLCipher)
- Ollama runs locally — content is sent to a local process only, never a remote API
