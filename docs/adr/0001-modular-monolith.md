# ADR-0001 — One deployable, modular monolith

**Status:** Accepted · 2026-11-15

## Context

The system is a quality-control console for 21 registered stations: a
deterministic engine, an operations console, a field client, and a benchmark
harness. The only write path is `POST /api/telemetry`, authenticated per station
with a pre-shared key. There is no queue, no cross-service transaction, and no
independent scaling axis — the console and the engine have identical load.

## Decision

Ship a single Next.js deployment. Separate concerns by **module boundary**, not
by network hop. `lib/` holds the domain; `app/` holds transport and rendering;
`components/` holds presentation.

## Consequences

- One cold-start, one deploy, one log stream, one version to reason about.
- The engine is callable in-process from a React server component, an API
  route, a test and a CLI benchmark without serialisation.
- A future extraction is possible *if* the engine gains an interface
  (see ADR-0002); until then a service split would buy latency, not isolation.
- Scaling beyond one instance means the module-level state in ADR-0003 must go
  first, because it would otherwise be per-instance.

## Alternatives rejected

- **Microservices.** At 21 stations and one deployable, this adds a network hop,
  a contract versioning problem and a distributed failure mode in exchange for
  no isolation benefit.
- **Serverless functions per concern.** The engine is pure and fast
  (p95 0.005 ms); splitting it into functions would pay cold-start per call.

## Revisit when

More than one write path needs independent scale, or a second team owns a
module, or the engine is consumed by an external system rather than this app.
