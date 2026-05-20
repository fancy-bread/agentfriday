# Contract: `init` Command (Updated)

**File**: `src/cli/init.ts` (updated), `src/cli/index.ts` (updated)  
**Phase**: 1 | **Feature**: 007-packaging

## CLI Signature

```
agent-friday init [--vault-path <path>] [--integration <tool>]
```

## Options

| Option | Values | Effect |
|--------|--------|--------|
| `--vault-path` | Any writable path | Override default vault location |
| `--integration` | `claude` (only v1 value) | Install skills + register MCP after vault setup |

## Behaviour

### Without `--integration`

1. Check if key exists → abort if yes with message "Vault already initialised"
2. Generate keypair → create vault.db placeholder
3. Print fingerprint + vault path
4. Print hint: `"Run agent-friday init --integration claude to install skills and register the memory service."`

### With `--integration claude`

Steps 1–3 as above (or skip key/vault creation if already exists).

Then:

4. **Install skills**: Copy all four `skills/friday-*/SKILL.md` to `~/.claude/skills/friday-*/SKILL.md`. Create `~/.claude/skills/` if absent.
5. **Register MCP**: Run `claude mcp add agent-friday -- npx agent-friday start`.
   - On success: print "Memory service registered with Claude Code."
   - On failure (claude CLI not found or non-zero exit): print the manual config
     snippet and the path to Claude Code's settings file.
6. Print final summary: vault path, fingerprint, skills path, MCP status.

## Idempotency

- Key and vault: never overwritten if they already exist (existing behaviour).
- Skills: always overwritten — the installed version is always the package version.
- MCP registration: `claude mcp add` is idempotent (overwrites existing entry).

## Exit Codes

| Code | Condition |
|------|-----------|
| 0 | All requested steps completed (even if MCP registration fell back to manual) |
| 1 | Key or vault creation failed |

## Test Contract

`tests/integration/init.test.ts` MUST verify:
1. `runInit({})` without integration creates key + vault, prints hint
2. `runInit({ integration: 'claude' })` copies all 4 skill files to a temp skills dir
3. `runInit({ integration: 'claude' })` on already-initialised vault does not regenerate key
4. Skills overwrite on re-run (idempotency)
