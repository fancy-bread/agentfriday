# Agent Friday — Vision

## The Insight

R2-D2 was the most capable agent in Star Wars because Anakin never wiped his memory
between missions. Persistent memory compounds capability. The droids who were
memory-wiped were consistently less effective — not because they were less powerful,
but because they started from zero every time.

That is the problem with AI agents today. Every session starts blank. You re-explain
context, re-establish preferences, re-describe the project. The agent is capable but
amnesiac. Capability without continuity does not compound.

## What Agent Friday Is

A local memory service for AI agents. A private, encrypted, append-only vault that
gives any skill-compatible agent tool durable memory across sessions — exposed as
`/friday-*` slash commands, backed by a local MCP daemon, with keys and data that
belong to the user and never leave the device.

LLMs are interchangeable inference engines above it. Agent Friday is the durable
memory layer below.

## The Value Proposition

**You stop re-explaining yourself.** Context accumulates rather than evaporating.
The agent knows what was decided, what was tried, what matters to you — not because
you told it again, but because Friday remembered.

**Your memory, not theirs.** ChatGPT memory, Claude Projects, Cursor rules — all
store your context on vendor servers. Agent Friday's privacy guarantee is structural,
not contractual. The keys never leave your device; the service literally cannot
reveal what it knows without them. No policy promise. No trust-me. A design
constraint.

**Cross-tool continuity.** Your memory follows you across Claude, Cursor, and
whatever comes next. It is not locked to one tool's ecosystem.

## The Honest Boundary

Storing memories securely does not make agents heroic. R2-D2's effectiveness came
from memory plus judgment plus agency. Agent Friday delivers the first. The judgment
and agency come from the LLM above it — and true agent agency, the kind that acts
without being asked, does not reliably exist yet.

When it does arrive, adoption will be constrained by fear. People will want the
benefits of agency without feeling like they have handed control to something they
do not understand or trust.

## The North Star

Humans extend agency incrementally, and they extend it to things they trust. A named
service with a track record, memory that is provably theirs, and an explicit forget
mechanism is a safer surface to delegate to than an anonymous stateless process.

The progression:

- **v1 — reactive memory**: Friday stores and recalls what you ask. Value is context
  continuity and structural privacy.
- **v2 — proactive recall**: Friday surfaces relevant context before you ask, because
  the agent queries it ahead of time. Still reactive at the agency level, but smarter.
- **v3 — trusted agency substrate**: Friday as the memory layer for an agent users
  are willing to delegate real decisions to — because the memory is theirs, it is
  auditable, and they can revoke anything.

The dystopia fear is navigable precisely because of what is already in the design.
The question is not whether humans will embrace agency. It is whether they will
embrace agency from something they control. Agent Friday's answer is yes — because
the keys are theirs and the memory is theirs.

## Distribution

Nerd-first. Ship something a developer will run on a Friday night. `npx agent-friday`
installs the daemon and drops skill files into the user's skill path. No browser
extension. No managed cloud. No runtime beyond Node.

Trust reputation compounds outward. Signal, Tailscale, and 1Password all grew this
way — technical credibility first, broader adoption second.
