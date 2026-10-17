MetShield-AI — Codespaces guide

This repository uses Next.js + TypeScript and Playwright for tests. The devcontainer in .devcontainer provides a ready development environment in GitHub Codespaces for editing, running the dev server, and debugging browser issues.

Quick start in a Codespace
1. Create a new Codespace for this repository (Code → Codespaces → New codespace).
2. After the container finishes setup, open the terminal in VS Code.
3. Run the development server:
   npm run dev
   The app will run on http://localhost:3000. Use the Ports panel to open a browser preview or forward the port.

Environment variables / secrets
- The app may require secrets like SUPABASE_URL, SUPABASE_KEY, and OPENAI_API_KEY. Do NOT commit secrets to the repo.
- Add them as repository secrets and expose to Codespaces, or add Codespaces-specific secrets in the repository Settings → Codespaces → Secrets.
- In the Codespace, create a .env.local file with the required variables (these remain in the Codespace and are not committed):

  NEXT_PUBLIC_SUPABASE_URL=...
  NEXT_PUBLIC_SUPABASE_ANON_KEY=...
  OPENAI_API_KEY=...

Playwright (end-to-end testing)
- Playwright is installed during container setup. To run tests:
  npx playwright test
- To run tests headed (with visible browser windows):
  npx playwright test --headed

Python scripts
- The repository contains a Python helper script (scripts/skyguard_anomaly_engine.py). If it requires extra packages, install them manually in the Codespace:
  python -m pip install -r requirements.txt
- Then run the demo:
  npm run sih:demo

Troubleshooting & tips
- If the dev server fails, check the terminal output and ensure node_modules installed correctly (run npm install).
- If Playwright needs extra dependencies, run npx playwright install-deps or re-run the postCreateCommand.
- Use the VS Code debugger to set breakpoints in server or client code. For server-side breakpoints, run the dev server with the debugger attached.

Notes on limits
- Codespaces provides a Linux container. If you need to reproduce platform-specific behaviour (e.g., Windows-only), use appropriate CI or a local machine.
- Heavy CPU/GPU model inference (large ML models) may not be practical inside Codespaces.

If you want, I can now:
- open a PR from this branch to main with the devcontainer files (I already pushed them to branch add/devcontainer-metshield-ai), or
- add a GitHub Actions workflow to run lint/typecheck/test on PRs, or
- customize the devcontainer to also install additional tools (supabase CLI, wrangler, ffmpeg) — tell me which tools to include.
