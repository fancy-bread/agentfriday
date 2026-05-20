# Research: Packaging & CLI

**Phase**: 0 | **Feature**: 007-packaging | **Date**: 2026-05-19

## Decision 1: Build Output — Separate `tsconfig.build.json`

**Decision**: Add `tsconfig.build.json` that extends `tsconfig.json` but sets
`rootDir: "src"`, `include: ["src/**/*"]`, and removes `vitest/globals` from
types. The existing `tsconfig.json` continues to serve `tsc --noEmit` (typecheck
with tests).

**Rationale**: The current `tsconfig.json` has `rootDir: "."` which causes output
to land at `dist/src/cli/index.js` rather than `dist/cli/index.js`. The `package.json`
`bin` field declares `dist/cli/index.js`. Fixing `rootDir` would break test
compilation since `tests/` would be outside `rootDir`. A separate build config is the
standard Node.js ESM solution: one tsconfig for editing/typecheck (includes tests),
one for production build (src only).

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": "src",
    "outDir": "dist",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Alternatives considered**:
- Fix `bin` path to `dist/src/cli/index.js`: works but is unusual and will confuse
  anyone looking at the package structure.
- Single tsconfig with `rootDir: "src"` and separate paths for tests: fragile,
  requires `paths` remapping.

---

## Decision 2: `package.json` Changes

**Decision**: Add `"build"` script, `"prepare"` hook, and `"files"` field.

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "prepare": "npm run build"
  },
  "files": ["dist/", "skills/", "README.md"]
}
```

**Rationale**:
- `prepare` runs automatically before `npm publish` and after `npm install` in the
  repo — ensures the dist is always up to date.
- `files` limits the published package to compiled output and skill files. Without
  it, `npm publish` would include `specs/`, `tests/`, `.specify/`, and other dev
  artifacts (~50MB+ of unnecessary content).
- `dist/` is the compiled CLI and library code.
- `skills/` is the Friday skill directories (needed for `installSkills()`).

---

## Decision 3: Skill Path Resolution

**Decision**: Resolve the skills directory relative to the compiled file's location
using `import.meta.url`.

```typescript
import { fileURLToPath } from 'url';
import path from 'path';

const packageRoot = path.resolve(
  fileURLToPath(import.meta.url), // dist/integration/claude.js
  '..', '..', '..'               // → package root (dist/integration → dist → root)
);
const skillsDir = path.join(packageRoot, 'skills');
```

With `tsconfig.build.json` (`rootDir: "src"`):
- `src/integration/claude.ts` compiles to `dist/integration/claude.js`
- Three `..` steps: `dist/integration` → `dist` → package root ✓
- Works identically in development (`/path/to/agentfriday/`) and in
  `npx` execution (`/path/to/.npm/_npx/.../node_modules/agent-friday/`)

**Alternatives considered**:
- Hardcode `~/.agent-friday/` adjacent path: fragile, breaks in npx context.
- Use `__dirname` (CommonJS): not available in ESM modules.

---

## Decision 4: Claude Code Skill Installation Path

**Decision**: Install to `~/.claude/skills/<skill-name>/SKILL.md`.

Claude Code reads user skills from `~/.claude/skills/`. Each skill is a directory.
This matches the Agent Skills specification and the structure already in `skills/`.

**Path construction**:
```typescript
const claudeSkillsDir = path.join(os.homedir(), '.claude', 'skills');
```

Create the directory if it does not exist (`mkdir -p` semantics via `fs.mkdir`
with `{ recursive: true }`).

---

## Decision 5: MCP Registration — `claude mcp add` with Manual Fallback

**Decision**: Attempt `claude mcp add agent-friday -- npx agent-friday start`. On
failure (command not found, non-zero exit), print the manual config snippet.

```typescript
import { execSync } from 'child_process';

function registerMcp(): { method: 'cli' | 'manual'; snippet?: string } {
  try {
    execSync('claude mcp add agent-friday -- npx agent-friday start',
      { stdio: 'pipe', timeout: 10_000 });
    return { method: 'cli' };
  } catch {
    return { method: 'manual', snippet: JSON.stringify({
      mcpServers: { 'agent-friday': { command: 'npx', args: ['agent-friday', 'start'] } }
    }, null, 2) };
  }
}
```

The `--` separator is required by `claude mcp add` to separate CLI arguments from
the command to run.

**Alternatives considered**:
- Write directly to `~/.claude.json` or `~/.claude/settings.json`: risky — parsing
  and writing JSON config files can corrupt them. The `claude` CLI is the safe path.
- Require manual step always: violates the zero-friction setup goal.

---

## Decision 6: MCP Registration Check in `status`

**Decision**: Use `claude mcp list` to detect registration. Parse output for
`agent-friday`.

```typescript
function checkMcpRegistered(): boolean {
  try {
    const output = execSync('claude mcp list', { stdio: 'pipe', timeout: 5_000 }).toString();
    return output.includes('agent-friday');
  } catch {
    return false; // claude CLI not available or no servers registered
  }
}
```

If `claude` is not on PATH, `status` reports "MCP registration: unknown (claude CLI
not found)" rather than "not registered".

---

## Decision 7: `init` Without `--integration`

**Decision**: `init` without `--integration` creates vault + key only (current
behaviour). It prints a single hint line: "Run `agent-friday init --integration
claude` to install skills and register the memory service."

**Rationale**: Keep existing `init` behaviour intact. The `--integration` flag is
additive — it does not change what init does without it. Users who ran `init` before
007 don't need to re-init.

---

## Decision 8: `status` Output Format

**Decision**: Extend the existing `status` table with two new rows. When `--integration`
context is known, show integration-specific health. When no integration is configured,
show a hint row.

```
Key        ✓  abc1:def2:3456 (software)
Vault      ✓  ~/.agent-friday/vault.db
Skills     ✓  ~/.claude/skills/ (4 installed)
MCP        ✓  agent-friday registered with Claude Code
```

Or when not set up:
```
Skills     ✗  not installed  →  run: agent-friday init --integration claude
MCP        ✗  not registered →  run: agent-friday init --integration claude
```
