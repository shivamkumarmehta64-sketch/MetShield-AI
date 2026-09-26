# SIH 26073 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the current functional MetShield AI UI into a premium, Google Weather-inspired Ops Console and Field Node, integrating AIKosh, Data.gov.in, DigiLocker, Bhashini, and Setu.

**Architecture:** A unified semantic token system (app/tokens.css) drives a shared AppShell with a light-themed desktop console and a dark-themed mobile field node. API integrations are modularized as data-layer services that gracefully fallback to simulation mode when APIs are offline.

**Tech Stack:** Next.js 16 (App Router), Tailwind CSS (w/ custom semantic tokens), Recharts, Lucide React, India Stack (DigiLocker, Bhashini, Setu APIs).

**Spec:** `docs/superpowers/specs/2026-09-25-sih-26073-design.md`

## Global Constraints

- Design Paradigm: Google Weather-inspired (soft glassmorphism, rounded cards, glanceable metrics).
- Themes: Desktop (light), Mobile (dark, high-glare resistance).
- Language: Multi-language support (English/Hindi) powered by Bhashini.
- Offline Capability: Must maintain functional offline queueing (IndexedDB) for Field Nodes.

## Review Focus

1. Hydration Mismatches: Token-driven CSS variables vs. SSR-rendered components (Ensure `AppShell` correctly injects the theme class before hydration).
2. API Reliability: Setu/Bhashini/DigiLocker failures must not crash the app (Ensure graceful fallback/simulation mode active).
3. Mobile Touch Targets: Every interactive element in the field node must be >= 44px min touch target.
4. Data Integrity: Normalization of disparate QC engines (WMO vs. Anomaly) into a unified `NormalisedPacket`.
5. Authentication: DigiLocker flow must be secure but low-friction for techs.

---

## Task Structure

### Task 1: Token Foundation and Visual Normalization
**Files:**
- Create: `app/tokens.css`
- Modify: `app/globals.css`, `app/layout.tsx`

**Interfaces:**
- Produces: Semantic CSS variable system for `--surface-*`, `--text-*`, `--status-*`, `--chart-*`.

- [ ] **Step 1: Create `app/tokens.css` with semantic variables.**
- [ ] **Step 2: Update `app/globals.css` to import tokens and purge legacy utilities.**
- [ ] **Step 3: Refactor `app/layout.tsx` to remove hardcoded body background; rely on `tokens.css`.**

### Task 2: Data Layer Unification (The "Engine Room")
**Files:**
- Create: `lib/normalizePacket.ts`, `hooks/useStationTelemetry.ts`
- Modify: `lib/anomalyLogic.ts`

**Interfaces:**
- Produces: `NormalisedPacket` type and `useStationTelemetry()` hook.

- [ ] **Step 1: Create `normalizePacket.ts` to bridge anomalyLogic and anomalyDetector engines.**
- [ ] **Step 2: Implement `useStationTelemetry()` hook with `live|simulation` mode and fallback logic.**

### Task 3: UI Primitives & AppShell
**Files:**
- Create: `components/shell/AppShell.tsx`
- Create: `components/ui/Card.tsx`
- Create: `components/ui/MetricTile.tsx`
- Create: `components/ui/StatusBadge.tsx`
- Create: `components/ui/Sheet.tsx`
- Create: `components/ui/FieldRow.tsx`

**Interfaces:**
- Consumes: `useStationTelemetry()`
- Produces: `AppShell` variant="console|field".

- [ ] **Step 1: Build `AppShell.tsx` to handle contextual theming.**
- [ ] **Step 2: Build atomic UI components (Card, MetricTile, etc.) using tokens.**

### Task 4: Console Redesign (/dashboard)
**Files:**
- Modify: `app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `AppShell`, `useStationTelemetry`

- [ ] **Step 1: Rewire orphaned components into the desktop grid layout.**
- [ ] **Step 2: Inject Bhashini translation provider at the shell level.**

### Task 5: Field Node Redesign (/mobile)
**Files:**
- Modify: `app/mobile/page.tsx`

**Interfaces:**
- Consumes: `AppShell`, `useStationTelemetry`, `useMobileSensors`

- [ ] **Step 1: Restyle Mobile Field Node to premium dark theme, ensuring 44px touch targets.**
- [ ] **Step 2: Integrate DigiLocker authentication flow.**

### Task 6: API Integration Wiring (Setu/AIKosh/Data.gov.in)
**Files:**
- Create: `lib/apiAdapters.ts`

- [ ] **Step 1: Create API wrappers for Setu (payments), AIKosh (models), and Data.gov.in (baselines).**
- [ ] **Step 2: Integrate into `useStationTelemetry` or appropriate surface UI.**
