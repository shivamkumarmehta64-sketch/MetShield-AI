---
description: Implement and visually verify a MetShield UI change in the browser
---

Implement a UI change and verify it in the browser. Do not stop at the code.

1. **Inspect first.** Read the target component and the tokens in `app/globals.css`. Reuse existing components. Do not introduce a new colour — the status ramp is fixed (§5 of `AGENTS.md`).

2. **Implement.** Smallest correct change. Do not refactor unrelated code. Do not add dependencies.

3. **Run the app.**
   ```bash
   npm run dev
   ```

4. **Look at the rendered output.** Use the `chrome-devtools` MCP server:
   - navigate to the route
   - `take_snapshot` for structure and accessible names
   - `take_screenshot` at desktop (1440×900) **and** mobile (390×844)
   - `list_console_messages` — errors and warnings
   - `list_network_requests` — failed or 4xx/5xx API calls

5. **Fix what you see:**
   - overflow and horizontal scroll
   - misalignment, inconsistent spacing
   - unreadable contrast — status text needs the `--color-*-text` token, not the `--color-*` fill token
   - non-functional buttons and dead controls
   - layout breakage at both widths

6. **Verify.**
   ```bash
   npm run verify
   ```

Screenshot before and after. Report which issues you found in the browser and which you fixed. If you could not check something, say so.
