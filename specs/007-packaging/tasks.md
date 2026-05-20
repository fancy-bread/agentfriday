# Tasks: Packaging & CLI

**Input**: Design documents from `specs/007-packaging/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story this task belongs to (US1–US4)
- US4 (`start`) is fully implemented — its only work here is the build fix (Phase 2)

---

## Phase 1: Setup

No new directories needed. Config files go at repository root.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix the build output path so `npx agent-friday` resolves to `dist/cli/index.js`.
Without this, US1–US4 cannot be accessed via the published package.

**⚠️ CRITICAL**: All user story implementation depends on the build being correct.

- [x] T001 [P] Create `tsconfig.build.json` at repository root — content: `{ "extends": "./tsconfig.json", "compilerOptions": { "rootDir": "src", "outDir": "dist", "types": ["node"] }, "include": ["src/**/*"], "exclude": ["node_modules", "dist", "tests"] }`
- [x] T002 [P] Update `package.json` — add `"build": "tsc -p tsconfig.build.json"` and `"prepare": "npm run build"` to scripts; add `"files": ["dist/", "skills/", "README.md"]` field alongside existing fields
- [x] T003 Run `npm run build` after T001+T002 complete — verify `dist/cli/index.js` exists and `node dist/cli/index.js --help` prints the CLI help without error

**Checkpoint**: `dist/cli/index.js` exists; `node dist/cli/index.js --help` succeeds

---

## Phase 3: User Story 1 — Install and Set Up Friday in One Command (Priority: P1)

**Goal**: `agent-friday init --integration claude` creates vault, installs all 4 skills to `~/.claude/skills/`, and registers the MCP server with Claude Code (or prints manual snippet on fallback)

**Independent Test**: Run `runInit({ integration: 'claude' })` with a temp skills source dir and temp target dir; verify all 4 skill files are copied; verify the function completes without error even when `claude` CLI is absent

### Tests for User Story 1

- [x] T004 [P] [US1] Write `tests/integration/init-integration.test.ts` — import `installSkills` from `../../src/integration/claude.js`; test with temp source dir (create 4 `friday-*/SKILL.md` stub files) and temp target dir: (1) all 4 skills copied to target; (2) target dir created if absent; (3) re-run overwrites existing files (idempotency); (4) `checkSkills(targetDir)` returns true after install, false before

### Implementation for User Story 1

- [x] T005 [US1] Create `src/integration/claude.ts` — export: `SKILL_NAMES: string[]` (the 4 skill directory names); `async installSkills(skillsSourceDir: string, claudeSkillsDir: string): Promise<void>` (copies each `skillsSourceDir/<name>/SKILL.md` to `claudeSkillsDir/<name>/SKILL.md`, creating dirs with `{ recursive: true }`); `registerMcp(): { method: 'cli' | 'manual'; snippet?: string }` (tries `execSync('claude mcp add agent-friday -- npx agent-friday start', { stdio: 'pipe', timeout: 10000 })`, returns `{ method: 'cli' }` on success or `{ method: 'manual', snippet: JSON.stringify({ mcpServers: { 'agent-friday': { command: 'npx', args: ['agent-friday', 'start'] } } }, null, 2) }` on failure); `checkSkills(claudeSkillsDir: string): boolean` (returns true if all 4 `<claudeSkillsDir>/<name>/SKILL.md` exist); `checkMcpRegistered(): boolean | 'unknown'` (runs `claude mcp list`, returns true if output includes `agent-friday`, false if it doesn't, `'unknown'` if command throws)
- [x] T006 [US1] Update `runInit()` in `src/cli/init.ts` — change signature to `runInit(options: { vaultPath?: string; integration?: string } = {})`: after existing vault+key setup, if `options.integration === 'claude'`, resolve `skillsSourceDir` via `path.resolve(fileURLToPath(import.meta.url), '..', '..', '..', 'skills')` (3 levels up from `dist/cli/init.js` → package root, then `skills/`), resolve `claudeSkillsDir` to `path.join(os.homedir(), '.claude', 'skills')`, call `await installSkills(skillsSourceDir, claudeSkillsDir)`, call `registerMcp()`, print skills path and MCP registration result; add `import { fileURLToPath } from 'url'` and import from `../integration/claude.js`
- [x] T007 [US1] Update `src/cli/index.ts` — add `.option('--integration <tool>', 'Install skills and register MCP for the specified AI tool (claude)')` to the `init` command; pass `{ vaultPath: options.vaultPath, integration: options.integration }` to `runInit()`

**Checkpoint**: `node dist/cli/index.js init --integration claude` (after rebuild) installs skills to `~/.claude/skills/` and prints MCP status

---

## Phase 4: User Story 2 — Run Without Global Install (Priority: P1)

**Goal**: `npx agent-friday init --integration claude` works identically to the global install path

**Independent Test**: After `npm run build`, run `node dist/cli/index.js --help`; verify the command name, version, and all subcommands appear correctly

### Implementation for User Story 2

No new implementation — US2 is satisfied by the build fix (Phase 2) and US1 implementation (Phase 3). The `package.json` `bin` field already declares `dist/cli/index.js`; after the build fix this path exists and `npx` resolves it correctly.

- [x] T008 [P] [US2] Verify `npx` resolution: after Phase 2 and Phase 3 complete, run `npm pack --dry-run` and confirm `dist/cli/index.js` and `skills/friday-*/SKILL.md` files appear in the packed contents; confirm no `specs/`, `tests/`, or `.specify/` files are included

**Checkpoint**: `npm pack --dry-run` output contains only `dist/`, `skills/`, `README.md`, `package.json`

---

## Phase 5: User Story 3 — Verify Everything Is Working (Priority: P1)

**Goal**: `agent-friday status` shows 4 rows: key, vault, skills (installed/not), MCP (registered/not/unknown)

**Independent Test**: Run `runStatus()` with skills installed in a temp dir; verify output contains Skills and MCP rows with correct indicators

### Implementation for User Story 3

- [x] T009 [US3] Update `src/cli/status.ts` — import `checkSkills`, `checkMcpRegistered` from `../integration/claude.js`; import `os` and `path`; after existing key+vault rows, resolve `claudeSkillsDir = path.join(os.homedir(), '.claude', 'skills')`; add Skills row: `checkSkills(claudeSkillsDir)` → `✓  ~/.claude/skills/ (4 installed)` or `✗  not installed  →  run: agent-friday init --integration claude`; add MCP row: `checkMcpRegistered()` → `✓  agent-friday registered with Claude Code` / `✗  not registered  →  run: agent-friday init --integration claude` / `?  unknown (claude CLI not found)` — MCP/Skills rows do NOT affect `process.exitCode`

**Checkpoint**: `node dist/cli/index.js status` shows 4 rows; Skills and MCP rows reflect actual state

---

## Phase 6: User Story 4 — Start the Memory Service (Priority: P1)

**Goal**: `agent-friday start` (already implemented in 004) is accessible via the fixed `npx` path

No implementation tasks — `runStart()` is complete. Covered by Phase 2 build fix.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [x] T010 [P] Run `npm run typecheck` — fix any TypeScript errors across `src/integration/claude.ts`, `src/cli/init.ts`, `src/cli/index.ts`, `src/cli/status.ts`
- [x] T011 [P] Run `npm test` — all suites pass including new `tests/integration/init-integration.test.ts`
- [x] T012 [P] Write `README.md` at repository root — include: one-line description ("Local encrypted memory for AI agents"), prerequisites (Node 24, Ollama optional), install + setup section (`npx agent-friday init --integration claude`), the four `/friday-*` commands with one-line descriptions, `agent-friday status` and `agent-friday start` usage, brief architecture note (local daemon, SQLCipher vault, keys never leave device), link to agentskills.io for skill format reference; keep it under 100 lines — quickstart focus, not exhaustive docs
- [x] T013 Run full quickstart validation per `specs/007-packaging/quickstart.md`: rebuild, run `node dist/cli/index.js init --integration claude` (with a fresh temp vault using `--vault-path`), run `node dist/cli/index.js status`, confirm output matches expected format

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Requires Phase 2 complete (build must work before testing cli changes)
- **US2 (Phase 4)**: Requires Phase 2 + Phase 3 complete (npx resolution = build fix + correct init)
- **US3 (Phase 5)**: Requires T005 complete (`checkSkills`, `checkMcpRegistered` must exist)
- **US4 (Phase 6)**: No implementation — covered by Phase 2
- **Polish (Phase 7)**: Requires all phases complete

### User Story Dependencies

- **US1 + US2**: Share the same foundation (build fix); US2 has no additional impl
- **US3**: Depends on T005 (`src/integration/claude.ts`) — reuses `checkSkills` and `checkMcpRegistered`
- **US4**: No dependencies — already implemented

### Within US1

- T004 (tests) and T005 (implementation) can run in parallel — different files
- T005 must complete before T006 (init.ts needs integration functions to import)
- T006 must complete before T007 (index.ts needs updated runInit signature)

### Parallel Opportunities

- T001 + T002 (config files, different targets)
- T004 + T005 (tests + implementation, different files)
- T008 (pack verification) once build works
- T010 + T011 (typecheck and test)

---

## Parallel Examples

```
# Phase 2 — run together:
Task T001: Create tsconfig.build.json
Task T002: Update package.json

# Phase 3 — run together after T005:
Task T004: Write tests/integration/init-integration.test.ts
Task T005: Create src/integration/claude.ts
```

---

## Implementation Strategy

### MVP (US1 + US2 — the core install flow)

1. Phase 2: Build fix (T001–T003)
2. Phase 3: Integration module + init update (T004–T007)
3. Phase 4: npx verification (T008)
4. **STOP and VALIDATE**: `node dist/cli/index.js init --integration claude` completes successfully

### Full Delivery

5. Phase 5: Status update (T009)
6. Phase 7: Polish (T010–T012)
