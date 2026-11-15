# Security Policy

## Reporting a vulnerability

Open a [private security advisory](https://github.com/shivamkumarmehta64-sketch/MetShield-AI/security/advisories/new)
or email the maintainer. Please do not open a public issue.

Include what you did, what happened, and what you expected. A reproduction
against the live demo is ideal.

## What this deployment is, so you can scope a report

The live demo is a **prototype**, not a national service. The following are
known and documented in [README §13](README.md#13-honest-engineering-notes--known-limitations):

- **No authentication on reads.** `GET /api/telemetry` and the console routes
  are open. There is no RBAC anywhere.
- **AI routes are open when no model key is set.** They then serve deterministic
  local responses. If `OPENAI_API_KEY` is configured, the route fails closed
  (503) unless `METSHIELD_AI_ACCESS_KEY` is also set, and requires that key in
  the `x-metshield-ai-key` header.
- **The telemetry integrity tag is a checksum, not a MAC.** An unkeyed 32-bit
  FNV-1a value detects a truncated write and nothing more. It does not resist
  an attacker and must not be described as tamper-proof.
- **Writes are authenticated, reads are not.** `POST /api/telemetry` requires a
  per-station pre-shared key and fails closed when the key table is unset.

Known-and-accepted findings are not vulnerabilities; a way to bypass the PSK
write path, exfiltrate another station's credential, or execute code in the
server runtime would be.

## Dependencies

`npm audit --omit=dev --audit-level=critical` runs in CI on every push.
