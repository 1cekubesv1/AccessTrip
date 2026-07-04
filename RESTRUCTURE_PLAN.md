# AccessTrip — Restructure Plan: Stylized Demo + Real MVP

**Status:** proposed · **Date:** 2026-07-04 · **Owner:** shbernal

This plan splits the current single offline-simulation app into two deliverables in one
repo. They live in a pnpm **workspace** (for dependency isolation), **not** a full monorepo
migration — the MVP stays put at the repo root; only the demo is added as an isolated
workspace member. Both center on the same **initial-reservation** narrative (see AGENTS.md).

1. **`apps/demo`** — a **stylized, animation-heavy storytelling landing page** (static,
   **published to GitHub Pages** first; Vercel considered later). It tells Camille's story:
   an AI agent receives her itinerary, **calls the airport** for wheelchair assistance,
   **calls the hotel** for a roll-in shower, and Camille gets **two phone notifications**
   confirming both. No backend, no login — pure narrative. Faces are AI-generated (Codex),
   phone dialogue is voice-generated (ElevenLabs). Both generators live in the repo as tooling.
2. **The MVP** (stays at the repo **root** — `server/` + `web/` + `shared/`, unmoved) — the
   **real product**, centered on the same proactive initial-reservation flow and hardened to
   do _real_ work (real Vapi calls, real Claude agents, real open-data plugins, persistence).
   This is what we keep building after the hackathon.

> The MVP is **not relocated**. A workspace gives the demo its own dependency closure without
> touching the working app; an `apps/mvp` move + `packages/shared` extraction is a clean
> _post-hackathon_ step, deferred until shared code actually grows.
>
> **Disruption / re-planning** (the old center of gravity) is demoted to a _possible future_
> MVP feature — kept, but no longer what either deliverable leads with.

---

## 0. TL;DR — recommended stack

| Concern                 | Recommendation                                                              | Why                                                                                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Demo hosting**        | **GitHub Pages** (primary), Vercel considered later                         | No external account needed; the repo's already on GitHub. `base`-aware Vite build (`--base=/AccessTrip/`) publishes `dist/` to `gh-pages`. Vercel (preview URLs per PR) is an easy later switch. |
| **Demo framework**      | **Vite + React + TypeScript** (SPA, static build)                           | Matches existing toolchain; no server needed; trivial to deploy anywhere.                                                                                                                        |
| **Scroll storytelling** | **GSAP + ScrollTrigger**                                                    | The industry standard for scene-by-scene, scroll-pinned "scrollytelling". Drives the whole narrative timeline.                                                                                   |
| **Smooth scroll**       | **Lenis** (`@studio-freight/lenis`)                                         | Buttery inertia scroll that ScrollTrigger hooks into.                                                                                                                                            |
| **Component animation** | **Framer Motion** (`motion`)                                                | Declarative enter/exit, layout animations, gesture springs — phone UI, notification cards, chips.                                                                                                |
| **Micro-illustrations** | **Lottie** (`lottie-react`)                                                 | Pre-baked vector loops: call waves, checkmarks, spinner-to-check transitions.                                                                                                                    |
| **Call audio playback** | **Howler.js** + **wavesurfer.js**                                           | Reliable cross-browser audio + a live waveform synced to captions.                                                                                                                               |
| **Styling**             | **Tailwind CSS** + a small design-token layer                               | Fast to build a bespoke, polished look; JIT keeps CSS tiny.                                                                                                                                      |
| **Icons**               | **lucide-react** (already a dep)                                            | Consistent with the MVP.                                                                                                                                                                         |
| **Face images**         | **Codex CLI image tool** (`tooling/demo/generate-faces.ts`)                 | Rides ChatGPT subscription, no API key. See `~/codex-image-generation.md`.                                                                                                                       |
| **Voice**               | **ElevenLabs** `eleven_multilingual_v2` (`tooling/demo/generate-voices.ts`) | High-quality French TTS, distinct voice per speaker, key already in `.env`.                                                                                                                      |
| **Reduced motion**      | `prefers-reduced-motion` honored everywhere                                 | It is an _accessibility_ product — the demo must itself be accessible.                                                                                                                           |

**Install (demo app):**

```bash
# from apps/demo
pnpm add react react-dom gsap lenis framer-motion lottie-react howler wavesurfer.js
pnpm add -D vite @vitejs/plugin-react typescript tailwindcss @tailwindcss/vite \
  @types/react @types/react-dom @types/howler
```

---

## 1. Target repository layout

```
AccessTrip/
├─ apps/
│  ├─ demo/                     # NEW — stylized landing page (static, → GitHub Pages)
│  │  ├─ index.html
│  │  ├─ vite.config.ts         # base: '/AccessTrip/' for GH Pages ('/' toggle if Vercel later)
│  │  ├─ src/
│  │  │  ├─ main.tsx
│  │  │  ├─ App.tsx
│  │  │  ├─ story/              # the scroll-driven scenes
│  │  │  │  ├─ Story.tsx        # ScrollTrigger master timeline
│  │  │  │  ├─ scenes/
│  │  │  │  │  ├─ 01-Hero.tsx           # Camille + tagline
│  │  │  │  │  ├─ 02-Itinerary.tsx      # agent receives the itinerary
│  │  │  │  │  ├─ 03-AirportCall.tsx    # animated call → CDG
│  │  │  │  │  ├─ 04-HotelCall.tsx      # animated call → hotel
│  │  │  │  │  ├─ 05-Notifications.tsx  # 2 phone notifications land
│  │  │  │  │  └─ 06-Outro.tsx          # CTA → link to MVP
│  │  │  ├─ components/
│  │  │  │  ├─ Phone.tsx        # the phone mock (frame, lockscreen, notifications)
│  │  │  │  ├─ CallStage.tsx    # agent avatar ↔ callee, waveform, live captions
│  │  │  │  ├─ Waveform.tsx     # wavesurfer wrapper
│  │  │  │  ├─ Caption.tsx      # caption bubble synced to audio timeline
│  │  │  │  └─ Notification.tsx # iOS-style banner card
│  │  │  ├─ lib/
│  │  │  │  ├─ useCallPlayer.ts # loads manifest.json, drives audio+captions
│  │  │  │  ├─ useReducedMotion.ts
│  │  │  │  └─ scroll.ts        # Lenis + GSAP wiring
│  │  │  └─ styles/
│  │  └─ public/
│  │     ├─ faces/              # generated by tooling/demo/generate-faces.ts
│  │     └─ audio/              # generated by tooling/demo/generate-voices.ts
│  │        ├─ airport-call/{01-*.mp3, conversation.mp3, manifest.json}
│  │        └─ hotel-call/{...}
│  # NOTE: no apps/mvp — the MVP stays at the repo root (below), unmoved.
├─ server/  web/  shared/       # THE MVP — stays in root (root package.json)
│                               #   shared/{types.ts,reference.ts} kept here; a
│                               #   packages/shared extraction is deferred post-hackathon.
├─ tooling/
│  └─ demo/                     # NEW — demo asset generators (this turn's deliverables)
│     ├─ characters.json        # face prompts
│     ├─ generate-faces.ts      # Codex image tool
│     ├─ generate-voices.ts     # ElevenLabs TTS + ffmpeg stitch + timing manifest
│     └─ scripts/
│        ├─ airport-call.json   # phone dialogue: agent ↔ CDG assistance
│        └─ hotel-call.json     # phone dialogue: agent ↔ hotel reception
├─ docs/                        # (existing)
├─ AGENTS.md / CLAUDE.md        # canonical vision (CLAUDE.md is a symlink)
├─ RESTRUCTURE_PLAN.md          # this file
├─ pnpm-workspace.yaml          # add: packages: ["apps/*"]  (MVP stays the root package)
└─ package.json                 # the MVP; keeps its own scripts unchanged
```

**Why a workspace (not two repos, not a full monorepo migration):** one `pnpm install` and
one repo, while `apps/demo` gets an **isolated dependency closure** (its heavy animation deps
never touch the MVP's server deploy). The MVP is left untouched at the root — zero import
rewrites, zero tsconfig-path juggling, no risk to the working app before the deadline. If the
demo ever needs the MVP's data shapes it can `import type` across a relative path; a true
`apps/mvp` + `packages/shared` split is a clean later move.

---

## 2. The demo — narrative & scene spec

**Persona:** Camille Moreau, 34, electric wheelchair (Permobil M3). **New narrative
(proactive setup, not a disruption):** the agent _organizes_ the trip and secures
accessibility _before_ departure.

Six scroll-pinned scenes. Each scene is a GSAP ScrollTrigger "pin" section; entering it
plays a Framer Motion / Lottie beat; scenes 3–4 auto-play their ElevenLabs call audio
when scrolled into view (with a mute/replay control — never autoplay sound without a
visible control).

| #   | Scene                 | What animates                                                                                                                                                  | Assets                                                         |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 1   | **Hero**              | Camille portrait fades/parallax in; tagline types on; wheelchair + travel motifs drift.                                                                        | `faces/camille.png`                                            |
| 2   | **Itinerary arrives** | A boarding-pass / itinerary card flies into the AI agent's "inbox"; the agent avatar wakes (orb pulse); it parses steps into chips (flight, hotel, transfers). | `faces/ai-agent.png`                                           |
| 3   | **Call the airport**  | Split stage: AI orb ↔ CDG agent. Dialer animation → "connected". **Waveform + live captions** track the audio; a WCHC "confirmed" chip stamps in at the end.   | `faces/airport-agent.png`, `audio/airport-call/*`              |
| 4   | **Call the hotel**    | Same call stage → hotel receptionist. Tension beat: "104 has a bathtub" (⚠️ chip) → agent pushes → "room 210, roll-in shower" (✅).                            | `faces/hotel-receptionist.png`, `audio/hotel-call/*`           |
| 5   | **Two notifications** | Camille's phone (tilted, floating). Two iOS-style banners slide down in sequence with haptic-style bounce + checkmark Lottie: airport ✅ then hotel ✅.        | `faces/camille.png`, both `manifest.json.outcome.notification` |
| 6   | **Outro / CTA**       | Registry "ledger" seals (confirmations logged); tagline; button → the real MVP.                                                                                | —                                                              |

**Caption/animation sync:** every call `manifest.json` carries `lines[]` with `{start,
duration, caption, speaker}`. `useCallPlayer.ts` plays `conversation.mp3` and drives which
caption is active + which avatar is "speaking" purely from `currentTime`. No manual timing.

**Accessibility (non-negotiable — it's the product):**

- `prefers-reduced-motion`: replace scroll-pinned motion with instant states; still readable.
- Every call has a text transcript rendered in the DOM (captions are real text, not baked into audio), `aria-live="polite"` on the active caption.
- Audio is opt-in via a visible play/mute control; captions work with sound off.
- Full keyboard nav; focus-visible; WCAG AA contrast; alt text on every face.

---

## 3. Phone scripts & voice generation (delivered this turn)

- **Scripts:** `tooling/demo/scripts/airport-call.json`, `hotel-call.json`. French
  (matches persona). Each line has `speaker`, `text`, and a short `caption` for the UI.
  Each script ends with an `outcome` (status, reference, one-line summary, and the exact
  push-notification title/body used in scene 5).
- **Distinct voices per speaker:** the agent, the airport agent, and the hotel receptionist
  each use a different ElevenLabs voice. Voice IDs are read from env
  (`ELEVENLABS_VOICE_AGENT` / `ELEVENLABS_VOICE_AIRPORT` / `ELEVENLABS_VOICE_HOTEL`) with
  sensible public-voice fallbacks baked into the scripts, so it runs with just
  `ELEVENLABS_API_KEY`.
- **Generator:** `tooling/demo/generate-voices.ts` → one MP3 per line, a stitched
  `conversation.mp3`, and a `manifest.json` with per-line start/duration (probed via
  `ffprobe`) for caption sync. `--only <id>` and `--no-stitch` flags.

**Run:**

```bash
node node_modules/tsx/dist/cli.mjs tooling/demo/generate-voices.ts          # both calls
node node_modules/tsx/dist/cli.mjs tooling/demo/generate-voices.ts --only hotel-call
```

## 4. Face generation (delivered this turn)

- **Manifest:** `tooling/demo/characters.json` — prompts for Camille, Julien, the airport
  agent, the hotel receptionist, and the AI-agent orb avatar; a shared photoreal `style`.
- **Generator:** `tooling/demo/generate-faces.ts` → PNGs into `apps/demo/public/faces/`
  via the Codex CLI image tool (ChatGPT OAuth, no API key). `--only a,b` and `--force`.

**Run:**

```bash
node node_modules/tsx/dist/cli.mjs tooling/demo/generate-faces.ts
node node_modules/tsx/dist/cli.mjs tooling/demo/generate-faces.ts --only camille,ai-agent --force
```

> Both generators write into `apps/demo/public/*`, which is `.gitignore`d for large media
> by default — regenerate on demand, or commit if we want deploy-without-keys. Decide in
> Phase 1.

---

## 5. The MVP — making it "real"

**Narrative:** the MVP now leads with the same **initial-reservation** story as the demo —
at booking time the agent proactively calls providers to secure accessibility and logs
confirmations. The existing **disruption / re-planning** machinery is kept but demoted to a
_possible future_ capability, not the MVP's headline flow.

The current app already has the right shape (agents, SSE, plugins). To be a real MVP,
promote each simulated fallback to a real integration behind the same interface:

1. **Real phone calls** — wire Vapi end-to-end (`server/agents/caller.ts` +
   `routes/vapi-webhook.ts`) with a public URL (ngrok/deploy). Keep the offline sim only
   as an automated-test path, not the demo path.
2. **Real reasoning** — require `ANTHROPIC_API_KEY` for planner/extractor/vision; keep
   deterministic fallbacks for tests/CI only.
3. **Real data** — SNCF / Open-Meteo / Navitia plugins already pull live data; add real
   booking-source ingestion (parse an itinerary → structured steps) as the MVP entry point.
4. **Persistence** — replace `data/state.json` single-file store with a real store
   (SQLite via better-sqlite3, or Postgres) so multiple travelers/trips survive restarts.
5. **Auth & multi-tenant** — minimal login so a B2B operator sees only their portfolio
   (the fleet view already models this).
6. **Deploy target** — the MVP needs a Node host (Render/Fly/Railway) — _not_ static —
   because of Express + SSE + webhooks. Keep it separate from the demo's static deploy.

The MVP is out of scope for the demo deadline but the restructure keeps it a first-class
app so work continues cleanly.

---

## 6. Deployment

- **Demo → GitHub Pages (primary).** A workflow builds `apps/demo` with `--base=/AccessTrip/`
  and publishes `dist/` to `gh-pages`. No external account needed. **Vercel later (optional):**
  root `apps/demo`, `vite build` → `dist/`, `vercel.json` SPA rewrite, preview URL per PR —
  an easy switch if we want it.
- **MVP → Node host** (later): Render/Fly, env from `.env`, ngrok/public URL for Vapi
  webhooks.

---

## 7. Phased execution checklist

**Phase 0 — Assets & scripts (this turn, done)**

- [x] Phone dialogue scripts (`airport-call.json`, `hotel-call.json`).
- [x] Face-generation tooling (`generate-faces.ts` + `characters.json`).
- [x] Voice-generation tooling (`generate-voices.ts`, timing manifest).
- [x] This plan.

**Phase 1 — Workspace skeleton (no MVP move)**

- [ ] Add `packages: ["apps/*"]` to `pnpm-workspace.yaml`; **leave `server`/`web`/`shared` at
      the root** (MVP stays the root package). Verify `pnpm test` still green.
- [ ] Scaffold `apps/demo` (Vite + React + TS + Tailwind) with its own `package.json` holding
      the animation deps; hello-world deploy to **GitHub Pages** (`--base=/AccessTrip/`).

**Phase 2 — Generate assets**

- [ ] Run both generators; review faces & listen to calls; tune prompts/voice settings.

**Phase 3 — Demo build (the "huge" part)**

- [ ] Wire Lenis + GSAP ScrollTrigger master timeline; build scenes 1–6.
- [ ] Build `Phone`, `CallStage`, `Waveform`, `Caption`, `Notification`, `useCallPlayer`.
- [ ] Reduced-motion + keyboard + screen-reader passes; Lighthouse a11y ≥ 95.

**Phase 4 — MVP hardening** (post-demo) — section 5.

**Phase 5 — Ship**

- [ ] Demo live on Vercel; README updated with both apps; runbook refreshed for the new
      (proactive-setup) narrative.

---

## 8. Decisions (resolved 2026-07-04)

1. **Commit generated media → YES.** Faces + call audio are committed to the repo so the
   demo deploys and runs with zero keys and deterministic visuals. Generators stay in
   `tooling/demo` for regeneration; `apps/demo/public/{faces,audio}` are **not**
   gitignored.
2. **Demo language → French only.** French audio + French captions (persona-true). The
   transcript component stays language-agnostic so an EN track could be added later, but
   no bilingual toggle is built now.
3. **One repo, workspace not migration → YES.** pnpm workspace with `apps/demo` as an
   isolated member for dependency isolation; the **MVP stays at the repo root, unmoved**. No
   `apps/mvp` move and no `packages/shared` extraction now — both deferred post-hackathon.
4. **Narrative → initial reservation (proactive setup), for BOTH demo and MVP.** The agent
   secures accessibility before departure (calls airport + hotel). **Disruption / re-planning
   is kept but demoted to a possible future feature**, no longer the headline. Canonical
   vision lives in `AGENTS.md` (`CLAUDE.md` symlinks to it).
5. **Demo hosting → GitHub Pages first.** No external account; Vercel considered later.
6. **`.env.example` → includes ElevenLabs** (`ELEVENLABS_API_KEY` + optional voice IDs).

**Status:** decisions above resolved 2026-07-04; docs (README + `docs/`) being brought in
line with the new narrative. Implementation of Phase 1 pending go-ahead.
