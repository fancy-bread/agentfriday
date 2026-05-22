# Feature Specification: Multi-Integration Support

**Feature Branch**: `008-multi-integration`
**Created**: 2026-05-21
**Status**: Draft

## User Scenarios & Testing

### User Story 1 — Add Cursor to an Existing Friday Installation (Priority: P1)

A developer already has Friday set up with Claude Code. They install Cursor and want
Friday's skills and memory service available there too. They run a single configure
command specifying Cursor. When it finishes, Friday's skills appear in Cursor and
the memory service is registered — no re-initialisation, no keypair touch, no vault
disruption.

**Why this priority**: Cursor is the second major target. Without this, Friday
claims to be tool-agnostic but only works frictionlessly with Claude Code.

**Independent Test**: With a configured vault and keypair, run
`agent-friday configure --integration cursor`. Confirm Friday's skills are available
in Cursor and the memory service is registered in Cursor's MCP configuration.

**Acceptance Scenarios**:

1. **Given** a configured vault and keypair, **When** the user runs
   `agent-friday configure --integration cursor`, **Then** Friday's four skills are
   installed to the shared skill path and the memory service is registered in
   Cursor's MCP configuration.
2. **Given** Cursor's configuration is absent or the integration tooling is not
   available, **When** `agent-friday configure --integration cursor` is run,
   **Then** skills are still installed and the user is given the exact manual
   configuration snippet and the file path where it should be placed.
3. **Given** `agent-friday configure --integration cursor` is run a second time,
   **When** it completes, **Then** the MCP configuration is updated in place and
   skills are overwritten — no duplicates, no corruption.
4. **Given** no vault or keypair exists, **When**
   `agent-friday configure --integration cursor` is run, **Then** the command fails
   with a clear message directing the user to run `agent-friday init` first.

---

### User Story 2 — Configure Claude Code as an Integration (Priority: P1)

A developer runs `agent-friday configure --integration claude` after initialising
their vault. Skills are installed to the shared path and the memory service is
registered with Claude Code. The experience is identical to the Cursor flow — the
same command, a different integration name.

**Why this priority**: The configure command replaces the `--integration` flag that
was on `init`. Claude Code support must not regress.

**Independent Test**: Run `agent-friday init` then
`agent-friday configure --integration claude`. Confirm skills are at the shared path
and the memory service is registered with Claude Code.

**Acceptance Scenarios**:

1. **Given** an initialised vault, **When**
   `agent-friday configure --integration claude` is run, **Then** Friday's skills
   are installed to the shared skill path and the memory service is registered with
   Claude Code.
2. **Given** `agent-friday configure` is run without `--integration`, **Then** the
   command fails with a message listing the supported integration names.

---

### User Story 3 — Skills Install Once, Work Everywhere (Priority: P1)

A developer uses both Claude Code and Cursor. After running
`agent-friday configure --integration claude`, they open Cursor and Friday's
skills are already available — no second configure needed. Skills live in a single
shared location that all compliant agent tools discover.

**Why this priority**: Tool-specific skill paths undermine the portability promise.
The standard shared path is why the Agent Skills specification exists.

**Independent Test**: Run `agent-friday configure --integration claude`. Open Cursor.
Confirm Friday's skills are discoverable in Cursor without running configure again.

**Acceptance Scenarios**:

1. **Given** skills installed via any integration, **When** a second compatible
   agent tool is opened, **Then** Friday's skills are discoverable without running
   configure again.
2. **Given** configure is run for both Claude Code and Cursor over time, **Then**
   both MCP registrations coexist independently and skills remain at the shared path.

---

### User Story 4 — Status Shows Skills and Per-Integration MCP Health (Priority: P1)

A developer runs `agent-friday status`. The output shows: key health, vault health,
a single skills row for the shared path, and one MCP row for each integration they
have configured. Each row is independently actionable.

**Why this priority**: With multiple integrations, status must say which tool is
healthy and which isn't — not just "something is misconfigured."

**Independent Test**: Configure both Claude Code and Cursor. Run
`agent-friday status`. Confirm the skills row shows the shared path and two
independent MCP rows appear, each reflecting the actual registration state.

**Acceptance Scenarios**:

1. **Given** configure has been run for one tool, **When** `agent-friday status`
   is run, **Then** the output shows the shared skills path and the configured
   integration's MCP state, with no rows for unconfigured integrations.
2. **Given** configure has been run for both Claude Code and Cursor, **When**
   `agent-friday status` is run, **Then** two MCP rows appear — one per tool —
   each independently reporting healthy or not.
3. **Given** skills are not installed, **When** `agent-friday status` is run,
   **Then** the skills row shows not installed with a message to run
   `agent-friday configure --integration <tool>`.

---

### Edge Cases

- What if `agent-friday configure` is run before `agent-friday init`? Fail with a
  clear message — vault and key must exist first.
- What if the shared skills path does not exist? Create it rather than failing.
- What if Cursor's MCP configuration file does not exist? Create it with only the
  Friday entry rather than failing.
- What if Cursor's MCP configuration file contains malformed JSON? Report the error
  and print the manual snippet; do not overwrite the corrupted file.
- What if `agent-friday configure --integration` is run without a value? Fail with
  a message listing supported integration names.
- What if `agent-friday init` completes but no supported tools are detected on the
  machine? Print a neutral tip: "Run `agent-friday configure --integration <claude|cursor>`
  when you're ready to connect Friday to an AI tool."

---

## Requirements

### Functional Requirements

- **FR-001**: `agent-friday configure --integration <tool>` MUST be a new top-level
  command, separate from `init`. It MUST require the vault and keypair to already
  exist before running.
- **FR-002**: `agent-friday init` MUST accept no integration arguments. It creates
  the vault and keypair only.
- **FR-003**: `agent-friday configure --integration <tool>` MUST install all four
  Friday skill files to the standard shared skill path (`~/.agents/skills/`),
  regardless of which integration is specified.
- **FR-004**: `agent-friday configure --integration cursor` MUST register the memory
  service in Cursor's MCP configuration.
- **FR-005**: `agent-friday configure --integration claude` MUST register the memory
  service with Claude Code, installing skills to the shared path.
- **FR-006**: MCP registration MUST be idempotent — re-running MUST update the
  existing entry without duplicating it.
- **FR-007**: If MCP registration fails or the integration tooling is unavailable,
  `agent-friday configure` MUST still install skills and MUST provide the manual
  configuration snippet and the target file path.
- **FR-008**: `agent-friday status` MUST show the shared skills path as a single
  row, independent of which integrations are configured.
- **FR-009**: `agent-friday status` MUST show one MCP row per integration that has
  been configured, each independently reporting its health.
- **FR-010**: After `agent-friday init` completes successfully, the output MUST
  detect which supported agent tools are installed on the machine and print a
  specific `configure` command for each detected tool. If no supported tools are
  detected, a neutral tip listing the available integration names MUST be shown.

### Key Entities

- **`configure` Command**: A new top-level CLI command that installs Friday's skills
  and registers the MCP service for a specified agent tool. Requires prior `init`.
- **Shared Skill Path**: `~/.agents/skills/` — the standard cross-tool location
  where all Friday skill directories are installed. Tool-agnostic.
- **Integration**: A supported agent tool (Claude Code, Cursor). Each integration
  has its own MCP registration mechanism. New integrations are additive — no
  existing spec or code changes required.
- **MCP Configuration**: The tool-specific mechanism used to register the memory
  service. The `configure` command handles this automatically where possible and
  falls back to a printed snippet when not.

## Success Criteria

- **SC-001**: `agent-friday configure --integration cursor` completes setup for
  Cursor in under 30 seconds on a machine with Cursor installed.
- **SC-002**: Friday's skills appear in both Claude Code and Cursor after running
  `agent-friday configure` once for either tool, in 100% of test scenarios on
  machines with both tools installed.
- **SC-003**: `agent-friday status` correctly identifies the state of skills and
  each configured integration's MCP registration in 100% of test scenarios.
- **SC-004**: `agent-friday configure --integration <tool>` is idempotent —
  re-running never corrupts the keypair, vault, or existing MCP configuration in
  100% of test scenarios.
- **SC-005**: Running `agent-friday configure` before `agent-friday init` produces
  a clear error in 100% of test scenarios — it never attempts to create a vault or
  key.
- **SC-006**: After `agent-friday init`, the output lists a specific `configure`
  command for every supported agent tool detected on the machine — no generic hints
  when tools can be identified.

## Assumptions

- `~/.agents/skills/` is discovered by all Agent Skills-compliant tools, including
  Claude Code and Cursor. Tools that do not yet support this path are out of scope.
- Cursor's MCP configuration file location is resolved in the planning phase.
- The four Friday skill files are already authored (006-skill-files). This spec
  covers installation destination, not content.
- The existing `--integration` flag on `init` (from 007) is removed by this spec.
  Users with a 007 installation who previously ran `init --integration claude` are
  directed to run `configure --integration claude` to update to the shared path.
- Adding integrations beyond Cursor is additive — a new implementation only, no
  spec or existing code changes.
