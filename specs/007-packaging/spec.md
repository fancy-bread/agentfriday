# Feature Specification: Packaging & CLI

**Feature Branch**: `007-packaging`
**Created**: 2026-05-19
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Install and Set Up Friday in One Command (Priority: P1)

A developer downloads Agent Friday and runs a single setup command specifying Claude
Code as their AI tool. When it finishes, they open Claude Code and Friday's memory
commands are immediately available — no additional steps, no manual configuration,
no looking up documentation. The command sets up the encrypted vault, installs
Friday's skills into Claude Code, and registers the memory service so Claude Code
knows how to connect to it.

**Why this priority**: The entire product fails at the install step if it takes more
than one command. The "Friday night install" goal requires this to be frictionless.

**Independent Test**: On a fresh machine with no Agent Friday configuration, run
the setup command with the Claude integration flag. Open Claude Code and confirm
`/friday-note` is available. Confirm the memory service can be started. Confirm the
vault and key exist in the expected location.

**Acceptance Scenarios**:

1. **Given** a machine with no prior Agent Friday setup, **When** the user runs
   `agent-friday init --integration claude`, **Then** the vault and keypair are
   created, Friday's skills are installed into Claude Code, and the memory service
   is registered with Claude Code — all without additional steps.
2. **Given** the setup command completes, **When** the user opens Claude Code,
   **Then** `/friday-note`, `/friday-recall`, `/friday-amend`, and `/friday-forget`
   are available as slash commands.
3. **Given** setup is run a second time on an already-configured machine, **When**
   the command completes, **Then** the existing keypair is preserved, skills are
   updated in place, and the memory service registration is updated — nothing is
   corrupted or duplicated.
4. **Given** Claude Code's integration tooling is not available on the machine,
   **When** `agent-friday init --integration claude`, **Then** the vault and keypair
   are still created and the skills are still installed, and the user is given the
   exact configuration snippet they need to complete registration manually.

---

### User Story 2 — Run Friday Without a Global Install (Priority: P1)

A developer wants to try Agent Friday without committing to a global installation.
They run the setup command using their package manager's remote execution feature.
Everything works identically to a locally installed version.

**Why this priority**: Most developers will try a tool via remote execution before
installing it. If this path is broken, the tool never gets past the trial stage.

**Independent Test**: On a machine where Agent Friday is not globally installed, run
`npx agent-friday init --integration claude`. Confirm all setup steps complete
successfully.

**Acceptance Scenarios**:

1. **Given** Agent Friday is not globally installed, **When** the user runs
   `npx agent-friday init --integration claude`, **Then** setup completes
   successfully.
2. **Given** the daemon is started via remote execution (`npx agent-friday start`),
   **When** a connected AI tool calls a memory tool, **Then** the daemon responds
   correctly.

---

### User Story 3 — Verify Everything Is Working (Priority: P1)

A developer runs a status check to see at a glance whether their Agent Friday
installation is healthy: key accessible, vault accessible, skills installed, memory
service registered. If anything is missing or broken, the output tells them what
to fix and how.

**Why this priority**: Debugging a broken installation is painful without a status
command. Users need a single command to diagnose the system.

**Independent Test**: After a successful setup, run the status command and confirm
all indicators are healthy. Intentionally remove one component and confirm the status
command identifies it as missing with an actionable message.

**Acceptance Scenarios**:

1. **Given** a fully configured installation, **When** `agent-friday status` is run,
   **Then** the output shows all indicators healthy: key, vault, skills, and memory
   service registration.
2. **Given** setup has not been run, **When** `agent-friday status` is run, **Then**
   the output clearly identifies what is missing and instructs the user to run the
   setup command.
3. **Given** skills are installed but the memory service is not registered, **When**
   `agent-friday status` is run, **Then** the output identifies this specifically
   and provides the action needed.

---

### User Story 4 — Start the Memory Service (Priority: P1)

A developer starts the memory service to begin a session. The service launches,
connects to the vault and key, and is ready to serve memory commands within a
few seconds. When the AI tool session ends, the service exits cleanly.

**Why this priority**: The service must be startable without technical knowledge
beyond the command name. It is the runtime foundation for all four memory commands.

**Independent Test**: Run the start command after setup. Connect the configured AI
tool and call `/friday-note`. Confirm the call succeeds. Disconnect the AI tool
and confirm the service exits cleanly.

**Acceptance Scenarios**:

1. **Given** a configured installation, **When** `agent-friday start` is run,
   **Then** the service is ready to accept memory commands within 2 seconds.
2. **Given** the service is running, **When** the connected AI tool disconnects,
   **Then** the service exits cleanly without data corruption.
3. **Given** setup has not been run, **When** `agent-friday start` is run, **Then**
   the service exits immediately with a clear message directing the user to run
   setup first.

---

### Edge Cases

- What if the skills directory for Claude Code does not exist on the user's machine?
  Create it rather than failing.
- What if a skill file already exists at the installation path? Overwrite it — the
  installed version is always the authoritative one from the package.
- What if the memory service registration step fails but everything else succeeds?
  Report partial success clearly: vault and skills are ready; registration failed
  with the exact manual step to complete it.
- What if `agent-friday init` is run without `--integration`? Vault and keypair are
  created; the user is informed that no skills were installed and prompted to re-run
  with `--integration claude` when ready.

---

## Requirements

### Functional Requirements

- **FR-001**: `agent-friday init --integration claude` MUST create the keypair and
  vault if they do not exist, install all four Friday skills into Claude Code's
  skill path, and register the memory service with Claude Code.
- **FR-002**: `agent-friday init` without `--integration` MUST create the keypair
  and vault only, and inform the user that no integration was configured.
- **FR-003**: `agent-friday init` MUST be idempotent — re-running MUST NOT
  overwrite an existing keypair or corrupt the vault.
- **FR-004**: `agent-friday init --integration claude` MUST succeed even if the
  Claude Code registration mechanism is unavailable, completing vault and skill
  installation and providing the manual registration snippet.
- **FR-005**: `agent-friday status` MUST report the state of: the keypair, the
  vault, Friday's skills (installed or not), and the memory service registration.
- **FR-006**: `agent-friday status` MUST provide a specific, actionable message for
  each unhealthy indicator.
- **FR-007**: `agent-friday start` MUST exit with a non-zero code and human-readable
  message if setup has not been run.
- **FR-008**: The package MUST be runnable via `npx agent-friday` without a prior
  global installation.
- **FR-009**: All four Friday skill files MUST be installed to Claude Code's skill
  path during integration setup.

### Key Entities

- **Setup Command**: `agent-friday init --integration <tool>` — the first-run
  command that configures the full stack for a specific AI tool integration.
- **Integration**: A supported AI tool (Claude Code for v1). Determines the skill
  installation path and memory service registration mechanism.
- **Status Check**: `agent-friday status` — reports health of each component: key,
  vault, skills, and service registration.

## Success Criteria

- **SC-001**: A developer with no prior Agent Friday setup completes installation
  and has `/friday-note` working in Claude Code in under 3 minutes, using only
  the documented commands.
- **SC-002**: `npx agent-friday init --integration claude` succeeds on a clean
  machine in 100% of test scenarios.
- **SC-003**: `agent-friday status` correctly identifies the state of every
  component (healthy, missing, or broken) in 100% of test scenarios.
- **SC-004**: `agent-friday init` is idempotent — re-running on an already-configured
  machine never corrupts the keypair or vault in 100% of test scenarios.
- **SC-005**: The memory service starts and is ready to accept commands within
  2 seconds of running `agent-friday start` on a standard developer machine.

## Assumptions

- Claude Code is the only supported integration for v1. Additional integrations
  (Cursor, etc.) are v2.
- The user has Node.js 24 LTS installed before running any Agent Friday command.
- The memory service is started manually by the user (`agent-friday start`) or
  configured as an MCP server in Claude Code's settings (which auto-launches it).
  Auto-start on login is out of scope for v1.
- Uninstallation is out of scope for v1. Users who want to remove Agent Friday
  can delete the key and vault files manually.
- The four Friday skill files are already authored and shipped with the package
  (006-skill-files). This spec covers their installation, not their content.
- The CLI commands `init`, `status`, and `start` exist in the codebase. This spec
  covers completing, packaging, and distributing them — not building them from scratch.
