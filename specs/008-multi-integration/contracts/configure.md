# Contract: `configure` Command

**File**: `src/cli/configure.ts` (new), `src/cli/index.ts` (updated)
**Phase**: 1 | **Feature**: 008-multi-integration

## CLI Signature

```
agent-friday configure --integration <tool>
```

## Options

| Option | Required | Values | Effect |
|--------|----------|--------|--------|
| `--integration` | Yes | `claude`, `cursor` | Target agent tool |

## Behaviour

1. Validate `--integration` value. If unrecognised: print supported names and exit 1.
2. Check vault + key exist (via `backend.exists()`). If not: print "Run `agent-friday init` first." and exit 1.
3. Resolve skill source dir from `import.meta.url` (same as 007).
4. Resolve shared target dir: `path.join(os.homedir(), '.agents', 'skills')`.
5. Call `integration.installSkills(skillsSourceDir, agentsSkillsDir)`.
6. Print: `✓ Skills installed to ~/.agents/skills/`
7. Call `integration.registerMcp()`.
8. If `method === 'cli'` or `method === 'file'`: print `✓ Memory service registered with <displayName>`.
9. If `method === 'manual'`: print snippet + target file path.

## Exit Codes

| Code | Condition |
|------|-----------|
| 0 | Skills installed; MCP registered or manual snippet provided |
| 1 | Unknown integration name, or vault/key not found |

## `init` Changes

`--integration` option removed from `init`. After vault + key creation, `init` prints:
> "Run `agent-friday configure --integration claude` (or cursor) to connect Friday to your AI tool."

## Test Contract

`tests/integration/configure.test.ts` MUST verify:
1. `runConfigure('cursor')` with temp dirs copies all 4 skills to `~/.agents/skills/` equivalent
2. `runConfigure('unknown')` exits with code 1
3. `runConfigure('cursor')` without vault/key exits with code 1
4. `runConfigure('cursor')` twice is idempotent (no duplicate skills or MCP entries)
