# Accord Pharma · Full-Stack Next.js Commercial CRM & e-Detailing Studio

A unified pharmaceutical commercial CRM, Key Opinion Leader (KOL) hub, Interactive Visual Aid (IVA) clinical e-detailing presenter, and hospital formulary tracker built on **Next.js 16 (App Router)**, **TypeScript**, and **Tailwind CSS v4**.

---

## Architecture Overview

* **Framework:** Next.js 16 with App Router & Turbopack
* **Styling:** Tailwind CSS v4 with custom glassmorphism and HSL design tokens
* **Icons:** Lucide React
* **Persistence & Backend:** Integrated Next.js API Routes (`/api/*`) with singleton persistent state store (`src/lib/store.ts`)

---

## Core Modules & Route Map

| Module | URL Route | Description |
|---|---|---|
| **Executive Dashboard** | `/` | Commercial revenue KPIs, clinical portfolio summaries, and real-time work queue |
| **Physicians & KOL Hub** | `/contacts` | Medical prescriber registry, NPI licenses, decile tiers, and slide-over 360° physician dossiers |
| **Clinical e-Detailing (IVA)** | `/edetailing` | Interactive visual presenter for OncoTarget-700 & CardioVas-XR with Phase III Kaplan-Meier curves and objection logging |
| **Hospital Formulary & P&T** | `/formulary` | Formulary tiers (Tier 1 Preferred, Tier 2 Prior Auth), committee review tracker, and competitor displacement |
| **Accounts 360° Directory** | `/accounts` | Health system facilities, bed counts, deterministic health scoring, and financial summaries |
| **Account 360° Detail** | `/accounts/[id]` | Comprehensive facility dossier with dedicated Formulary, Prescribers, Orders, and Timeline tabs |
| **Commercial Orders** | `/orders` | Hospital procurement orders, SKU catalog pricing, and dynamic total calculation |
| **Work Queue** | `/tasks` | Priority follow-up tasks, trial reprint deliveries, and 1-click completion |

---

## Full-Stack API Endpoints

- `GET /api/contacts` & `POST /api/contacts`: List/create physicians and Key Opinion Leaders
- `GET /api/contacts/[id]` & `PATCH /api/contacts/[id]`: Prescriber 360° dossier & updates
- `GET /api/sales/edetailing/products`: Clinical trial decks with Kaplan-Meier curves & MOA
- `POST /api/sales/edetailing/sessions`: Record detailing session, update prescriber, and auto-generate follow-up tasks
- `GET /api/sales/formulary` & `PATCH /api/sales/formulary`: Hospital formulary tiers and P&T review cycles
- `GET /api/accounts` & `GET /api/accounts/[id]`: Health systems list and comprehensive 360° dossier
- `GET /api/orders` & `POST /api/orders`: Commercial supply orders
- `GET /api/tasks` & `PATCH /api/tasks`: Rep productivity work queue

---

## Running Locally

```bash
cd accordpharma-next
npm run dev -- --port 3000
```

Access the platform at [http://localhost:3000](http://localhost:3000).
