import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "AWS-SIH2026-FINAL/**",
    ".agents/**",
    // Generated / one-off artefacts, not source.
    "tsconfig.tsbuildinfo",
  ]),

  /**
   * Rules promoted to ERRORS because they each caught a real defect in this
   * codebase that shipped to main:
   *
   *   react-hooks/purity            Date.now() during render — made a chart
   *                                 re-randomise on every frame, and produced
   *                                 colliding message ids in the same tick.
   *   react-hooks/set-state-in-effect  cascading re-render on mount; also
   *                                 masked a real bug where the offline queue
   *                                 replayed on every page load.
   *   @typescript-eslint/no-explicit-any  hid a missing mlPrediction field
   *                                 behind an `as TelemetryPacket` cast.
   *
   * eslint-config-next ships these as warnings, which is why they accumulated.
   * `next build` does not run ESLint in Next 16, so nothing was enforcing them
   * at all — hence the explicit `npm run verify` gate in package.json.
   */
  {
    rules: {
      "react-hooks/purity": "error",
      "react-hooks/set-state-in-effect": "error",
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
]);

export default eslintConfig;
