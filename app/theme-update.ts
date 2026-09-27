import fs from 'fs';

let css = `@import "tailwindcss";
@import "tailwindcss/utilities";

@theme {
  --font-sans: "Inter", -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", "Courier New", monospace;
  
  --color-bg-primary: #FFFFFF;
  --color-bg-secondary: #F7F7F7;
  --color-bg-tertiary: #F0F0F0;
  --color-bg-dark: #0A0A0A;
  --color-bg-dark-card: #141414;
  --color-bg-dark-border: #1E1E1E;
  
  --color-text-primary: #0A0A0A;
  --color-text-secondary: #3D3D3D;
  --color-text-muted: #7A7A7A;
  --color-text-disabled: #BBBBBB;
  --color-text-inverse: #FFFFFF;
  --color-text-inverse-muted: #9A9A9A;
  
  --color-accent-primary: #C0162C;
  --color-accent-hover: #A01020;
  --color-accent-light: #FFE8EB;
  --color-accent-border: #E8B0B8;
  --color-accent-dark: #8B0F1F;
  
  --color-status-ok: #1A7A1A;
  --color-status-warning: #7A5A00;
  --color-status-critical: #C0162C;
  --color-status-offline: #5A5A5A;
  
  --color-border-light: #E8E8E8;
  --color-border-medium: #D0D0D0;
  --color-border-dark: #2A2A2A;
}

:root {
  --bg-primary: #FFFFFF;
  --bg-secondary: #F7F7F7;
  --bg-tertiary: #F0F0F0;
  --bg-dark: #0A0A0A;
  --bg-dark-card: #141414;
  --bg-dark-border: #1E1E1E;
  
  --text-primary: #0A0A0A;
  --text-secondary: #3D3D3D;
  --text-muted: #7A7A7A;
  --text-disabled: #BBBBBB;
  --text-inverse: #FFFFFF;
  --text-inverse-muted: #9A9A9A;
  
  --accent-primary: #C0162C;
  --accent-hover: #A01020;
  --accent-light: #FFE8EB;
  --accent-border: #E8B0B8;
  --accent-dark: #8B0F1F;
  
  --status-ok: #1A7A1A;
  --status-warning: #7A5A00;
  --status-critical: #C0162C;
  --status-offline: #5A5A5A;
  
  --border-light: #E8E8E8;
  --border-medium: #D0D0D0;
  --border-dark: #2A2A2A;
}

html {
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  /* The layout wraps body content differently in LandingPage, so defaults here */
  font-family: var(--font-sans);
  overflow-x: hidden;
  margin: 0;
  padding: 0;
}

::selection {
  background-color: var(--accent-light);
  color: var(--accent-primary);
}

.mpi-monospaced {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.mpi-eyebrow {
  font-size: 11px;
  line-height: 1.4;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--text-muted);
  font-weight: 600;
}

/* Animations */
@keyframes mpiPulse {
  0% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.85); }
  100% { opacity: 1; transform: scale(1); }
}
.mpi-dot-pulse {
  animation: mpiPulse 2s infinite ease-in-out;
}

@keyframes mpiSkeleton {
  0% { opacity: 0.3; }
  50% { opacity: 0.6; }
  100% { opacity: 0.3; }
}
.mpi-skeleton {
  background-color: var(--border-light);
  animation: mpiSkeleton 1.5s infinite ease-in-out;
}
`;

fs.writeFileSync('app/globals.css', css);
