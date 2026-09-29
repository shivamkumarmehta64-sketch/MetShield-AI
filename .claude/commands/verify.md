---
description: Run the full MetShield verification gate and report honestly
---

Run the verification gate and report the result honestly.

```bash
npm run verify    # lint && typecheck && test
npm run build     # verify, then next build
```

`npm run build` runs `verify` first, so one lint error blocks the whole build.

Rules:
- **Fix errors before declaring done.** Do not report success with a failing step.
- **Report what actually ran.** Paste real output. If a step was skipped, say which and why.
- If tests fail, quote the failure — do not summarise it away.

After a clean gate, report:
- lint: errors / warnings
- typecheck: error count
- tests: files passed / total, tests passed / total
- build: route count, and any warnings (the `__dirname` Vite advisory and the Edge Runtime deprecation are known and pre-existing)

Then update `progress.md` with the current state.
