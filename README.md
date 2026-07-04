# TripAssist

AI trip-orchestration platform for disabled travelers. One traveler (Camille Moreau), one
trip (Paris → Nice), French UI.

> **Direction (2026-07-04).** The product now leads with the **initial-reservation** story:
> at booking time an AI agent **proactively calls providers** (airport for wheelchair
> assistance, hotel for a roll-in shower) to secure accessibility _before departure_, and logs
> the confirmations. The earlier **disruption / re-planning** flow (below) is kept but demoted
> to a possible future feature. The repo now holds **two deliverables** — a stylized static
> demo landing page (`apps/demo`, → GitHub Pages) and this real MVP (repo root), in a pnpm
> workspace. **Canonical vision + repo map: [`AGENTS.md`](AGENTS.md)** · plan:
> [`RESTRUCTURE_PLAN.md`](RESTRUCTURE_PLAN.md).

Full documentation lives in [`docs/`](docs/README.md) — note some deeper docs predate the
pivot and carry a banner pointing here.

## Architecture (tech)

Full technical map, diagram, and an honest "real vs demo" table:
**[`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md)**.

In one breath: a single Express process (TypeScript strict) streams everything to a
React 18 front over **SSE**; a pasted booking is turned into a structured trip by
**Claude** (`/api/ingest`) and persisted in a **durable SQLite store** (`node:sqlite`,
multi-tenant); **AI agents** (planner, extractor, vision, watchdog, caller) run on
**real Claude** (HTTP token or the local `claude` CLI bridge) with a deterministic
fallback; **7 open-data feeds** (SNCF, OpenStreetMap, Open-Meteo, Navitia, acceslibre,
OpenRouteService) each follow a timeout + cache + reference fallback contract. Guiding
principle: **never breaks in the demo, goes live the moment a key is present**.
`~6,250` lines, **91 tests**, TS strict, ESLint/Prettier, Lefthook pre-commit/pre-push.
A one-page jury brief lives at
[`docs/AccessTrip_Brief-Technique_v1.pdf`](docs/AccessTrip_Brief-Technique_v1.pdf).

## History — the milestone build (M1 → M6)

The sections below record the disruption-centric build the app grew from. It's accurate
history and the code still runs; treat the _narrative_ as superseded by AGENTS.md.

## Status

- **M1 (spine)** ✅ — Express + SSE + seed + traveler timeline + ops layout + demo panel with Reset.
- **M2 (chaos cascade)** ✅ — watchdog + chaos button + planner (Claude w/ hardcoded fallback) + at-risk cascade with reason chips + replan card + apply. Flow A runs end-to-end offline.
- **M3 (voice)** ✅ — caller (real Vapi + offline simulation) + `/webhooks/vapi` + live transcript CallPanel (aria-live bubbles).
- **M4 (extraction)** ✅ — extractor (Claude w/ keyword fallback) on call end → ledger archive → s5 flip → escalation + pre-seeded Hôtel Aston recovery. Flow B runs end-to-end offline via the simulated call.
- **M5 (aces)** ✅ — vision verdict card (Claude vision w/ fallback) + replica PRM form at `/prm-form` + headed Playwright autofill.
- **M6 (hardening)** ✅ — force-step overrides in the demo panel (manual override for any step/status), aria-live on all live regions, keyboard-operable, WCAG AA.

### Post-milestone enhancements

- **Voix live** ✅ — the simulated call is spoken aloud in a French voice (Web Speech API), a distinct voice for the AI vs. the receptionist, with a mute toggle.
- **Sprint 1 (storytelling)** ✅ — impact-metrics KPI band (incidents caught, remediations applied, minutes recovered, calls made, accessibility held, all live); a catalogue of **5 disruption scenarios** (`server/scenarios.js`: TGV delay, SNCF strike, PMR elevator down, storm, taxi cancelled), each with its own cascade + accessibility-safe remediation; and animations on status changes, bubbles, chips, and KPI updates (reduced-motion aware).
- **Sprint 2 (visible reasoning)** ✅ — the **agent orchestra** (`web/src/ops/AgentGraph.jsx`): five agent nodes (Veille, Planificateur, Appelant, Extracteur, Vision) that light up and pulse as they work, plus a live reasoning stream showing each agent's chain of thought. Backed by `server/agents/trace.js` (`agent_state` + `agent_reasoning` SSE events) woven through the watchdog, planner, caller, extractor, and vision agents.
- **Sprint 3 (fleet)** ✅ — a **fleet dashboard** (`web/src/fleet/`) is the new home: a portfolio of monitored travelers (Camille live + 3 seeded profiles with varied disabilities and trip states), fleet-level KPIs, and per-traveler detail at `/traveler/:id`.
- **Sprint 4 (guided demo)** ✅ — a **narrated auto-play** (`web/src/demo/GuidedDemo.jsx`) launched from the demo panel: it drives the three flows end-to-end (disruption → replan → live call → recovery → vision) with a caption bar and progress, polling server state for readiness. The presenter's zero-stress path.
- **Sprint 5 (visual refonte)** ✅ — SVG logo mark + wordmark (`web/src/Logo.jsx`), centralized brand name (`web/src/config.js` — swap `APP_NAME` to rename everywhere), refined design system (gradients, depth, fleet/KPI cards, header). Name is a working title pending final choice.
- **Real open-data plugins** ✅ — `server/plugins/sncf.js` pulls **real SNCF punctuality** for the Paris→Nice (Sud-Est) axis from data.sncf.com (Opendatasoft Explore v2.1), and `server/plugins/weather.js` pulls **real Nice weather** from Open-Meteo. Surfaced in a live "Contexte réel" strip (`web/src/ops/RealContext.jsx`) via `GET /api/context`, and the watchdog grounds its reasoning in these real figures during a disruption. All calls have timeout + cache + fallback — the demo never blocks on the network.

### The 7 hackathon "wow" ideas — status

1. Live AI phone call ✅ (Vapi + offline sim with live French voice; real phone needs keys/ngrok) · 2. Multi-agent orchestration you can watch ✅ (agent orchestra) · 3. Real SNCF data ✅ (Sud-Est axis punctuality, live) · 4. Transcript→ledger extraction ✅ · 5. Passport auto-fill (Playwright) ✅ · 6. Vision verification ✅ · 7. Voice-first / screen-reader-native ✅. Plugins: Open-Meteo ✅, SNCF Open Data ✅.

### Live vs. offline

The demo runs **fully offline** with no keys: the planner/extractor/vision agents fall back to deterministic results, and `/api/call/start` plays a scripted call over the same SSE pipeline. To go live, fill `AccessTrip/.env`:

- `ANTHROPIC_API_KEY` (direct key, sent as `x-api-key`) **or** `ANTHROPIC_AUTH_TOKEN` + `ANTHROPIC_BASE_URL` (gateway/OAuth, sent as `Authorization: Bearer`) — real Claude planning / extraction / vision.
- `VAPI_*` + `RECEPTIONIST_PHONE` + `PUBLIC_URL` (ngrok) — a real phone call with streamed transcript. Full walkthrough in **[docs/guides/vapi-setup.md](docs/guides/vapi-setup.md)**.

### Autofill (M5) — one-time setup

Playwright is installed as a devDependency. If the browser binary is missing, install it (use this, not `npx`/`pnpm exec` — the folder name's `:` breaks the PATH shim; the script calls `node node_modules/...` directly):

```bash
pnpm pw:install
```

Without the browser, the autofill button reports "Playwright non installé" and nothing else breaks.

## Run

```bash
pnpm install
pnpm dev           # Express (3000) + Vite (5173) with HMR
# open http://localhost:5173
```

Single-process / production mode:

```bash
pnpm build         # emits web/dist
pnpm start         # Express serves API + built frontend on :3000
```

Smoke check (server must be running):

```bash
pnpm smoke
```

## Quality & tests

The project is TypeScript (strict) with Vitest, ESLint (flat config), and Prettier.
Every tool is invoked via `node node_modules/...` — the folder name's `:` breaks the
`node_modules/.bin` PATH shim, so `npx`/`pnpm exec`/bare bins are avoided everywhere,
including inside the git hooks.

```bash
pnpm typecheck     # tsc --noEmit for server + web
pnpm test          # Vitest (55 tests, node + jsdom in one run)
pnpm test:watch    # Vitest watch mode
pnpm lint          # ESLint
pnpm lint:fix      # ESLint --fix
pnpm format        # Prettier --write
pnpm format:check  # Prettier --check
```

Lefthook installs git hooks on `pnpm install` (via `prepare`):

- **pre-commit** — Prettier `--write` then ESLint `--fix` on staged files, auto-re-staged.
- **pre-push** — `typecheck` + `test`.

## Views

- `/` — traveler timeline in a phone frame + accessibility passport.
- `/ops` — control center: step watchlist, agent log, confirmation ledger.
- `/demo` — presenter panel: **Reset** (one-click return to seed).

## Accessibility

French UI, semantic landmarks, `aria-live="polite"` on timeline / watchlist / agent log,
keyboard-operable steps, visible focus, reduced-motion aware. Built to be demoed with VoiceOver.

## Config

Copy `.env.example` → `.env`. Only needed from M3 (Vapi) onward; M1/M2 run with no keys.
