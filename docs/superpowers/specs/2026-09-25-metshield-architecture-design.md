# MetShield AI – Account-Free Edge QMS Architecture (SIH 26073)

## 1. Context and Purpose
**Goal:** Provide a comprehensive, zero-cost, zero-account software architecture for the MetShield AI Quality Management System (AWS-QMS) to solve SIH 26073.
**Users:** 
1. National Operations Center (Desktop) - Monitoring 766 districts and triaging WMO Pub No. 8 data faults.
2. Field Technicians (Mobile) - Capturing telemetry, acting as an impromptu edge sensor, and resolving hardware maintenance tickets.

## 2. Core Architectural Approach
The system utilizes a **Local-First, Account-Free Prototype** model perfectly suited for a hackathon presentation. Compute and state are pushed entirely to the client browsers and local Next.js memory, removing the need for any third-party database accounts (like Supabase or Firebase).

*   **Compute/Hosting:** Vercel (Free Next.js hosting) or Localhost for pitch.
*   **Database:** IndexedDB (Browser) and in-memory API caching.
*   **Live Sync Engine:** `BroadcastChannel` API and local state.
*   **Client Context:** React 19 + Next.js App Router.

## 3. UI/UX Strategy: "One System, Two Surfaces"
The design relies on a singular semantic token system (`app/tokens.css`) mapped to two distinct situational themes, natively absorbing the legacy components.

*   **Ops Console (Desktop, `/dashboard`):** 
    *   *Theme:* Light mode (`#f8fafc`). Assumes the exact legacy identity (Cyan gradient, font scaling, Hindi translation, high contrast).
    *   *Architecture:* Dense 12-column grid. Left-pane mapping and global metrics; Right-pane anomaly register and gating.
*   **Field Node (Mobile, `/mobile`):**
    *   *Theme:* Dark mode (`#070d1e`) to reduce AMOLED power draw in the field.
    *   *Architecture:* Vertical `<Sheet>` stacks. Minimum 44px touch targets. HTML5 Haptic alerts and high-contrast telemetry readings.

## 4. Frontend Architecture
*   **Progressive Web App (PWA):** Equipped with a service worker and `manifest.json`.
*   **Offline Resilience:** When `navigator.onLine` is false, the Field Node queues uplink packets in IndexedDB (`idb`).
*   **Device as a Sensor:** Hook (`useMobileSensors.ts`) accesses `DeviceOrientation` (Compass WD), `DeviceMotion` (Gust estimation), and `Geolocation` (Spatial validation) to simulate a physical Automatic Weather Station (AWS).
*   **Unified Telemetry Hook:** `useStationTelemetry.ts` manages state for both the Desktop and Mobile views. The `BroadcastChannel` instantly pushes mobile packets to the desktop dashboard when opened in the same browser, enabling spectacular live demos without a server.

## 5. Backend (Zero-Account Setup)
*   **Ingest Node (`/api/telemetry`):** Next.js API route that temporarily holds data in memory or immediately returns the WMO engine verdict.
*   **WMO QC Engine:** Computations (`lib/anomalyLogic.ts`) run inside the browser or the local Next.js server to evaluate the 3-parameter criteria (e.g., erratic sensor drift vs. genuine convective storm).

## 6. Implementation Prerequisites
*   Node.js installed locally.
*   (Optional but recommended) Vercel account linked to GitHub to easily host a live URL for the judges. ZERO database setups required.
