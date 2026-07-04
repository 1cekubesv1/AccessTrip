# AGENTS.md — AccessTrip

> Canonical orientation for anyone (human or agent) working in this repo.
> `CLAUDE.md` is a symlink to this file. If older docs (README, `docs/product/brief.md`,
> `docs/architecture/spec.md`) disagree with this file on the **narrative**, this file wins —
> those docs predate the pivot and are being brought in line.

## What AccessTrip is

AI trip-orchestration for travelers with disabilities. The product's job is to make
accessibility **guaranteed and traceable**, not left to the traveler to chase.

**Canonical narrative — initial reservation (proactive setup).** From the moment a trip is
booked, an AI agent secures accessibility end-to-end **before departure**: it reads the
itinerary and **proactively calls the providers** — the airport for wheelchair assistance
(WCHC) and the hotel for a roll-in shower — obtains structured confirmations, and logs them
to a registry. The traveler simply receives confirmations. This is the story the demo tells
and the flow the MVP implements.

> **Disruption / re-planning is a _future_ direction, not the current center.** The earlier
> build was organized around reactive disruption handling (SNCF delay → replan → re-confirm).
> That remains an interesting capability we may bring into the MVP later, but it is no longer
> what the demo or the MVP lead with. Treat disruption code/docs as legacy-but-kept.

Persona: **Camille Moreau**, 34, electric wheelchair (Permobil M3). Needs: step-free routing,
roll-in shower, boarding/deboarding assistance. Trip: **Paris → Nice**. UI/voice: **French**.

Accessibility is the product, not a finish: WCAG AA, full keyboard nav, visible focus,
`prefers-reduced-motion` honored, `aria-live` on live regions — the demo must itself be
accessible.

## Two deliverables

1. **`apps/demo`** — a stylized, animation-heavy **scrollytelling landing page** (static).
   Tells Camille's story: agent receives the itinerary → **calls the airport** → **calls the
   hotel** → Camille gets **two phone notifications** confirming both. No backend, no login.
   Faces are AI-generated (Codex), call audio is voice-generated (ElevenLabs), both committed
   to the repo so it deploys with zero keys. **Deploy: GitHub Pages first** (no external
   account needed), Vercel considered later.
2. **The MVP** — the real Express + React app (currently at the repo **root**: `server/`,
   `web/`, `shared/`), centered on the same initial-reservation flow, hardened over time to do
   real work (real Vapi calls, real Claude agents, real open-data plugins, persistence).

## Repo structure — workspace, not a migration

A pnpm **workspace** gives the demo its own isolated dependency closure (gsap, lenis,
framer-motion, howler, wavesurfer) without dragging them into the MVP. The MVP is **left in
place at the repo root** — no `apps/mvp` move, no `packages/shared` extraction yet. Those are
a clean post-hackathon step if shared code actually grows.

```
AccessTrip/
├─ package.json            # the MVP (root package): server/ + web/ + shared/
├─ pnpm-workspace.yaml     # declares apps/* as workspace members
├─ server/  web/  shared/  # MVP, unmoved
├─ apps/
│  └─ demo/                # isolated static landing page → GitHub Pages
├─ tooling/
│  └─ demo/                # asset generators (faces + voices) + call scripts
├─ docs/                   # deeper docs (some predate the pivot — see banners)
├─ RESTRUCTURE_PLAN.md     # the plan behind this structure
└─ AGENTS.md / CLAUDE.md   # this file
```

## Asset tooling (`tooling/demo/`)

- **Voices** — `generate-voices.ts`: ElevenLabs TTS per line → stitched `conversation.mp3` +
  `manifest.json` with per-line start/duration (via `ffprobe`) for caption sync. Distinct
  voice per speaker (agent / airport / hotel), env-overridable with baked fallbacks.
- **Faces** — `generate-faces.ts`: Codex CLI image tool (ChatGPT OAuth, no API key) →
  photoreal PNGs from `characters.json`.
- Scripts: `scripts/airport-call.json`, `scripts/hotel-call.json` (French, per-line captions,
  an `outcome` block driving the notification scene).
- Generated media is **committed** (`apps/demo/public/{faces,audio}`) so the demo runs
  key-free and deterministic.

```bash
node node_modules/tsx/dist/cli.mjs tooling/demo/generate-voices.ts   # needs ELEVENLABS_API_KEY
node node_modules/tsx/dist/cli.mjs tooling/demo/generate-faces.ts     # needs `codex` on PATH
```

## Dev conventions

- **Invoke tools via `node node_modules/<pkg>/...`, never `npx`/`pnpm exec`/bare bins.** The
  working folder path breaks the `node_modules/.bin` PATH shim; every script (and the git
  hooks) calls `node` directly. Keep it that way.
- TypeScript **strict**. Vitest, ESLint (flat config), Prettier. Lefthook installs hooks on
  `pnpm install`: pre-commit = Prettier `--write` + ESLint `--fix` on staged; pre-push =
  `typecheck` + `test`.

```bash
pnpm install
pnpm dev           # Express (3000) + Vite (5173)
pnpm test          # Vitest
pnpm typecheck
```

## Environment

Copy `.env.example` → `.env`. MVP live mode needs `ANTHROPIC_API_KEY` + `VAPI_*`; demo asset
regeneration needs `ELEVENLABS_API_KEY` (+ optional `ELEVENLABS_VOICE_*`). The MVP runs
offline with deterministic fallbacks when keys are absent.
