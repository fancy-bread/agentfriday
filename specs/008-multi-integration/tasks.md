# Tasks: Multi-Integration Support

**Input**: Design documents from `specs/008-multi-integration/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1–US4)
- US3 (shared path) is implemented by Phase 2 — no additional tasks

---

## Phase 1: Setup

No new directories needed. All files go into existing `src/integration/` and `src/cli/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Define the `IntegrationConfig` interface and implement both integrations.
All user stories depend on this.

**⚠️ CRITICAL**: US1–US4 cannot be implemented until this phase is complete.

- [ ] T001 Create `src/integration/types.ts` — export `IntegrationConfig` interface with fields: `name: string`, `displayName: string`, and async methods: `installSkills(agentsSkillsDir: string): Promise<void>` (copies skill files from package root to shared path), `registerMcp(): Promise<{ method: 'cli' | 'file' | 'manual'; snippet?: string }>`, `checkMcpRegistered(): Promise<boolean | 'unknown'>`
- [ ] T002 [P] Update `src/integration/claude.ts` — import `IntegrationConfig` from `./types.js`; keep existing standalone functions but add a `claudeIntegration: IntegrationConfig` export object that wraps them; update skill path used in `checkSkills` to use the `agentsSkillsDir` parameter instead of hardcoded `CLAUDE_SKILLS_DIR`; implement `installSkills(agentsSkillsDir)` by resolving `skillsSourceDir` from `import.meta.url` (3 levels up from `dist/integration/claude.js` → package root → `skills/`) then calling existing `installSkills(src, agentsSkillsDir)`; make `checkMcpRegistered` async (currently sync); set `displayName: 'Claude Code'`
- [ ] T003 [P] Create `src/integration/cursor.ts` — export `cursorIntegration: IntegrationConfig` with `name: 'cursor'`, `displayName: 'Cursor'`; `installSkills(agentsSkillsDir)` resolves source dir from `import.meta.url` and calls shared `installSkills` from `./claude.js`; `registerMcp()` reads `~/.cursor/mcp.json` (create if absent, merge `agent-friday` entry if valid JSON, return `{ method: 'manual', snippet }` if malformed — never overwrite malformed file); `checkMcpRegistered()` reads `~/.cursor/mcp.json` and returns true if `mcpServers['agent-friday']` exists, false if missing entry, false if file absent
- [ ] T004 Create `src/integration/registry.ts` — import `claudeIntegration` from `./claude.js` and `cursorIntegration` from `./cursor.js`; export `INTEGRATIONS: Record<string, IntegrationConfig>` = `{ claude: claudeIntegration, cursor: cursorIntegration }`; export `detectInstalledTools(): string[]` that checks `existsSync(path.join(os.homedir(), '.claude'))` and `existsSync(path.join(os.homedir(), '.cursor'))` and returns the names of tools whose directories exist

**Checkpoint**: `npx tsc --noEmit` passes; `INTEGRATIONS.claude` and `INTEGRATIONS.cursor` both implement the interface

---

## Phase 3: User Story 1 — Add Cursor to an Existing Installation (Priority: P1)

**Goal**: `agent-friday configure --integration cursor` installs skills to `~/.agents/skills/` and registers MCP in `~/.cursor/mcp.json`

**Independent Test**: With a configured vault, run `runConfigure('cursor')` with temp dirs; verify skills copied to shared path and `~/.cursor/mcp.json` contains the agent-friday entry

### Tests for User Story 1

- [ ] T005 [P] [US1] Write `tests/integration/configure.test.ts` — test `runConfigure` using temp dirs: (1) valid integration + configured vault → skills copied, function resolves; (2) unknown integration name → throws or rejects (exit 1 behaviour); (3) no vault/key → throws with "run agent-friday init" message; (4) running twice → idempotent (skills overwritten, no duplicate MCP entry in temp cursor config)

### Implementation for User Story 1

- [ ] T006 [US1] Create `src/cli/configure.ts` — export `runConfigure({ integration: string })`: import `INTEGRATIONS` from `../integration/registry.js`; look up integration by name — if not in registry: print "Unknown integration. Supported: claude, cursor" and throw; check `backend.exists()` — if false: print "Run \`agent-friday init\` first." and throw; resolve `agentsSkillsDir = path.join(os.homedir(), '.agents', 'skills')`; call `integration.installSkills(agentsSkillsDir)` and print `✓ Skills installed to ~/.agents/skills/`; call `integration.registerMcp()` and print `✓ Memory service registered with <displayName>` on cli/file, or manual snippet on fallback
- [ ] T007 [US1] Update `src/cli/index.ts` — import `runConfigure` from `./configure.js`; add `.command('configure').description('Connect Friday to an AI tool').option('--integration <tool>', 'Agent tool to configure (claude, cursor)').action(async (options) => { try { await runConfigure(options); } catch (err) { console.error('Error:', err.message); process.exit(1); } })`

**Checkpoint**: `node dist/cli/index.js configure --integration cursor` runs without error on a configured vault

---

## Phase 4: User Story 2 — Configure Claude Code via `configure` Command (Priority: P1)

**Goal**: `configure --integration claude` replaces `init --integration claude`; `init` is stripped of `--integration`; tool detection prints specific hints after `init`

**Independent Test**: Run `agent-friday init` (no flags); confirm output detects installed tools and prints specific configure commands for each

### Implementation for User Story 2

- [ ] T008 [P] [US2] Update `src/cli/init.ts` — remove `integration` from `InitOptions`; remove imports of `installSkills`, `registerMcp` from `../integration/claude.js`; remove all integration-related code from `runInit()`; import `detectInstalledTools` from `../integration/registry.js`; after printing vault/key success, call `detectInstalledTools()`; if non-empty: print `"\nDetected tools:"` + one line per tool: `"  ✓ <displayName>  →  run: agent-friday configure --integration <name>"`; if empty: print neutral tip listing both integration names
- [ ] T009 [P] [US2] Update `src/cli/index.ts` — remove `.option('--integration <tool>', ...)` from the `init` command; remove `integration` from the options object passed to `runInit()`

**Checkpoint**: `node dist/cli/index.js init --help` no longer shows `--integration`; `agent-friday init` prints specific configure hints when Claude Code or Cursor directories are present

---

## Phase 5: User Story 3 — Skills Install Once, Work Everywhere (Priority: P1)

No additional tasks — implemented entirely by T002 and T003 (both integrations use `~/.agents/skills/` via the `IntegrationConfig.installSkills` interface).

---

## Phase 6: User Story 4 — Status Shows Skills and Per-Integration MCP Health (Priority: P1)

**Goal**: `agent-friday status` shows one skills row at `~/.agents/skills/` and one MCP row per integration in the registry

**Independent Test**: After configuring one integration, run `agent-friday status`; verify skills row uses shared path and both Claude and Cursor MCP rows appear

### Implementation for User Story 4

- [ ] T010 [US4] Update `src/cli/status.ts` — import `INTEGRATIONS` from `../integration/registry.js`; replace `CLAUDE_SKILLS_DIR` constant with `AGENTS_SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills')`; update `checkSkills()` call to use `AGENTS_SKILLS_DIR`; replace single MCP row with `for (const integration of Object.values(INTEGRATIONS))` — `await integration.checkMcpRegistered()` → build row as `MCP (${integration.displayName})  ✓/✗/?  ...`; remove `checkMcpRegistered` import from `../integration/claude.js`

**Checkpoint**: `node dist/cli/index.js status` shows `Skills ✓/✗  ~/.agents/skills/ ...` and two MCP rows

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T011 [P] Run `npm run typecheck` — fix any TypeScript errors across `src/integration/`, `src/cli/configure.ts`, `src/cli/init.ts`, `src/cli/status.ts`, `src/cli/index.ts`
- [ ] T012 [P] Run `npm test` — all suites pass including new `tests/integration/configure.test.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 2)**: No dependencies — start immediately
- **US1 (Phase 3)**: Requires T001–T004 (registry and both integrations)
- **US2 (Phase 4)**: Requires T004 (detectInstalledTools); T008+T009 can run parallel to T005–T007
- **US4 (Phase 6)**: Requires T004 (INTEGRATIONS registry)
- **Polish (Phase 7)**: Requires all phases complete

### Parallel Opportunities

- T002 + T003 (different integration files, both depend on T001)
- T005 + T006 (test and implementation for configure, different files)
- T008 + T009 (init.ts and index.ts, different files)
- T011 + T012 (typecheck and test)

---

## Parallel Examples

```
# Phase 2 — after T001:
Task T002: Update src/integration/claude.ts
Task T003: Create src/integration/cursor.ts

# Phase 3 — after T004:
Task T005: Write tests/integration/configure.test.ts
Task T006: Create src/cli/configure.ts

# Phase 4:
Task T008: Update src/cli/init.ts
Task T009: Update src/cli/index.ts (remove --integration from init)
```

---

## Implementation Strategy

### MVP (US1 + foundation)

1. Phase 2: Foundational — types, claude, cursor, registry (T001–T004)
2. Phase 3: configure command (T005–T007)
3. **STOP and VALIDATE**: `agent-friday configure --integration cursor` works

### Full Delivery

4. Phase 4: init cleanup + tool detection (T008–T009)
5. Phase 6: status update (T010)
6. Phase 7: Polish (T011–T012)
