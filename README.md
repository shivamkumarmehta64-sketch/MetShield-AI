# MetShield AI (SIH 26073)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.4-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black?logo=vercel)](#)

> **Zero-Cost, Account-Free, Edge-First Quality Management System (QMS)**  
> Developed for Smart India Hackathon (SIH 26073) to identify and impute anomalies in Automatic Weather Station (AWS) data under WMO standards.

<img src="/public/metshield-logo.jpg" alt="MetShield AI" width="200" align="right">

## 🏆 The Problem
During severe weather (cyclones, squalls), massive barometric pressure drops are often mistakenly filtered out by legacy rule engines as "hardware failures," blinding national forecast models (NWP/GFS) at the exact moment meteorologists need the data most.

## 🚀 The MetShield AI Solution
MetShield AI acts as an **autonomous telemetry shield**. It uses Thermodynamic Coupling (cross-referencing $\Delta P$ drops with $\Delta RH$ humidity spikes) to instantly discriminate between a broken thermistor and a true convective storm in under 5ms. 

### Why this architecture wins hackathons:
1. **Zero-Cost "Account-Free" Architecture:** We removed all cloud database dependencies for the pitch. Telemetry syncs in real-time between the PWA Field Node and the Desktop Ops Console using the HTML5 `BroadcastChannel` and hoards data locally via `IndexedDB`.
2. **True PWA "Field Node":** The mobile view (`/mobile`) functions entirely without internet. It uses dark-mode AMOLED contrast for field workers and taps into the `window.DeviceOrientation` API to act as its own hardware test vector.
3. **Transparent WMO Imputation (Zero Void):** Instead of just deleting corrupt data, the engine applies physics-based moving averages, ensuring WRF/GFS forecast models never receive a null tensor.

## 🛠 Usage & Pitch Setup (Offline-Friendly)

1. Clone and install dependencies:
   ```bash
   git clone https://github.com/MetShield-AI/MetShield-AI.git
   cd MetShield-AI
   npm i
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. **The Live Zero-Latency Demo:**
   - Open `http://localhost:3000/dashboard` on the left half of your screen.
   - Open `http://localhost:3000/mobile` on the right half (responsive mobile view).
   - Click "Simulate hardware fault (Chime)" on the mobile view and watch the anomaly instantly dispatch a work order on the desktop screen. No databases, no paid APIs.

## 🧩 Tech Stack
- **Frontend Core:** Next.js (App Router), React 19, Tailwind CSS v3
- **Local Synchronization:** HTML5 `BroadcastChannel`, `IndexedDB` Web Storage
- **Hardware Integration:** `window.DeviceOrientation`, `window.DeviceMotion`, Navigator Vibration
- **Data Rendering:** Recharts v3.10, Framer Motion v11

---

🤖 *Architected autonomously by MetShield AI Team.*
