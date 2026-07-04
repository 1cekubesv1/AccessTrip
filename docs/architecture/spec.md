# AccessTrip — Claude Code Build Spec (hackathon)

_Drive Claude Code milestone by milestone (M1→M6), not all at once. After each milestone: run it, demo-click it, then continue._

> ⚠️ **Narrative superseded (2026-07-04).** This spec is organized around the
> **disruption → replan** flow. The product now leads with the **initial-reservation**
> narrative (agent proactively calls providers to secure accessibility before departure);
> disruption is kept as a possible future feature. The technical shape (Express + SSE +
> agents + plugins) still holds. Canonical vision: [`AGENTS.md`](../../AGENTS.md).

---

## 0. Mission & constraints

Build a working demo of **AccessTrip**: an AI trip-orchestration platform for disabled travelers. One hardcoded user (Camille), one hardcoded trip (Paris→Nice). The demo must run on localhost, updated live via SSE, and survive a 5-minute stage demo including a real AI phone call.

**Hard constraints — do not violate:**

- Single repo, single Node process serving both API and frontend. No auth, no real database (lowdb/JSON file), no Docker, no tests beyond one smoke script, no TypeScript strictness battles (plain JS or loose TS).
- Everything must be resettable to initial state in one click (`/demo` panel → Reset).
- Frontend: React + Vite. Backend: Express. Realtime: Server-Sent Events (one `/events` stream).
- Accessibility is NOT optional polish: semantic HTML, landmarks, `aria-live="polite"` on the timeline and agent log, full keyboard navigation, visible focus, WCAG AA contrast. The app will be demoed with VoiceOver.
- All UI text in French.

**Env vars (`.env`):** `ANTHROPIC_API_KEY`, `VAPI_API_KEY`, `VAPI_PHONE_NUMBER_ID`, `VAPI_ASSISTANT_ID`, `RECEPTIONIST_PHONE` (the teammate's real number), `SNCF_API_KEY` (optional), `PUBLIC_URL` (ngrok URL for webhooks).

## 1. Repo structure

```
/server
  index.js            Express + SSE + static serving
  state.js            in-memory state + JSON persistence + reset()
  seed.js             Camille, trip, ledger seed (data in §3)
  events.js           SSE hub: pushEvent(type, payload)
  agents/
    planner.js        trip → steps w/ dependencies; re-plan on disruption
    watchdog.js       SNCF poller + chaos event handler
    caller.js         Vapi call trigger + webhook handling
    extractor.js      transcript → structured confirmation (schema §5)
    vision.js         photo + profile → accessibility verdict
  routes/
    api.js            REST endpoints (§2)
    vapi-webhook.js   POST /webhooks/vapi
  prm-form/           replica airline PRM form (static HTML page, realistic)
  autofill.js         Playwright script filling prm-form from passport
/web
  src/
    App.jsx           router: / (traveler) /ops (control center) /demo (ops panel)
    traveler/         Timeline.jsx, Passport.jsx, phone-frame layout
    ops/              Watchlist.jsx, Ledger.jsx, AgentLog.jsx, CallPanel.jsx,
                      ReplanCard.jsx, VisionCheck.jsx
    demo/             DemoPanel.jsx (reset, chaos, force-step, start-call)
    useEvents.js      SSE hook
```

## 2. API & SSE contract

REST: `GET /api/state` (full state) · `POST /api/demo/reset` · `POST /api/demo/chaos` (inject disruption) · `POST /api/call/start` (trigger Vapi call) · `POST /api/replan/apply` · `POST /api/vision/check` (multipart photo) · `POST /api/autofill/run` · `POST /webhooks/vapi` (Vapi events: call status + transcript chunks).

SSE event types (all rendered live): `step_updated {stepId, status}` · `agent_log {agent, level, message}` (terminal-style feed; every agent narrates its reasoning in short French lines) · `transcript_chunk {speaker, text}` · `ledger_entry {entry}` · `disruption {source, details}` · `replan_proposed {plan}` · `vision_verdict {verdict}`.

Step statuses: `identified → contacted → confirmed → reconfirmed` (green shades), `at_risk` (amber), `failed` (red), `in_progress`, `done`. Timeline renders as a vertical pipeline in a phone frame; each step expandable to show its ledger receipts.

## 3. Seed data (use EXACTLY this)

See `server/seed.js` — matches the spec verbatim (traveler Camille Moreau, 7 steps s1–s7, 2 ledger seed entries).

## 4. The demo flows (the product IS these three flows)

**Flow A — Chaos cascade.** `POST /api/demo/chaos` injects `{source: "SNCF", details: "TGV 6173 retardé de 55 min"}` (watchdog also polls real SNCF API for train 6173 if `SNCF_API_KEY` set — real data replaces fake when available). Watchdog logs the catch → planner recomputes: s3, s4 flip `at_risk` with reason chips → `replan_proposed` (new assistance slot, taxi pushed 15:55, hotel notified of late arrival) rendered as a card → `POST /api/replan/apply` flips everything back green with new times, ledger entries appended. Planner uses Claude API (prompt in §5) with a hardcoded fallback plan if the API call fails — the demo NEVER breaks.

**Flow B — Live call (the finale).** `POST /api/call/start` triggers Vapi to call `RECEPTIONIST_PHONE` about step s5 re-confirmation. Webhook streams transcript chunks → CallPanel shows bubbles live (aria-live). On call end: extractor runs → if `room_available: false` → s5 flips `failed`, agent log shows escalation, planner proposes recovery (pre-seeded alternative: "Hôtel Aston — ch. accessible équivalente, taxi re-routé") → apply → green. Ledger stores the full call: transcript, extracted JSON, audio link.

**Flow C — Q&A aces.** Vision: upload photo → Claude vision compares against Camille's needs → verdict card with confidence + evidence quote ("ressaut de douche ≈ 15 cm → non conforme douche italienne → signalé"). Autofill: `POST /api/autofill/run` launches **headed** Playwright on the local replica PRM form (`/prm-form`), fields fill visibly from the passport, ~600ms delay between fields for stage visibility.

## 5. Agent prompts (embed verbatim, adapt lightly)

**Planner** (Claude, JSON out): _"Tu es l'agent planificateur d'AccessTrip. Voici le profil fonctionnel du voyageur, les étapes du voyage avec dépendances, et un événement de perturbation. Détermine quelles étapes sont à risque et propose un plan de remédiation minimal qui préserve les besoins d'accessibilité (jamais de compromis sur: transfert assisté, sans marche, douche italienne). Réponds en JSON: {at_risk: [stepId], plan: [{stepId, action, new_time, rationale}], message_voyageur: '...'}. Le message_voyageur doit être calme et rassurant, 2 phrases max."_

**Extractor** (Claude, JSON out): _"Extrait de cette transcription d'appel téléphonique une confirmation structurée. JSON strict: {confirmed_by: string, role: string, room_available: bool, room_number: string|null, roll_in_shower: bool|null, bed_height_ok: bool|null, reference: string|null, commitments: [string], red_flags: [string]}. Si l'interlocuteur est évasif ou contradictoire, mets le point concerné à null et ajoute un red_flag."_

**Vapi assistant system prompt (French voice):** _"Tu es l'assistante vocale d'AccessTrip, appelant au nom de [Assureur] pour Mme Camille Moreau. Objectif: re-confirmer la réservation de la chambre 104 accessible (douche à l'italienne, référence BR-104-ACC) pour le 12 septembre. Sois brève, polie, professionnelle. Annonce en début d'appel que tu es une assistante automatisée et que l'appel est enregistré. Obtiens: la chambre est-elle bien réservée, le nom de ton interlocuteur, une référence. Si la chambre n'est plus disponible: reste calme, demande quelles alternatives accessibles existent, indique qu'un conseiller va rappeler, remercie. Ne raccroche jamais sans avoir reformulé ce qui a été dit."_

**Receptionist script (teammate — 3 branches, rehearse all):** B1 happy: confirms room 104, gives name "Mme Laurent". B2 **stage branch**: "Ah… la 104 a été réattribuée, nous n'avons plus de chambre accessible ce soir-là" — polite, slightly embarrassed, offers nothing. B3 evasive: "il faudrait voir avec ma collègue demain" (tests red_flag path). On stage: play B2.

## 6. Milestones for Claude Code (build in this order)

- **M1 (spine):** server + state + seed + SSE + traveler timeline + ops layout + demo panel with Reset. _Done when: timeline renders green from seed, reset works._ ✅
- **M2 (agent log + chaos):** agent_events feed + watchdog + chaos button + planner (with hardcoded fallback) + cascade + replan card + apply. _Done when: Flow A runs end-to-end offline._
- **M3 (voice):** Vapi integration, call trigger, webhook, live transcript panel. _Done when: a real phone rings and bubbles stream._
- **M4 (extraction):** extractor on call end → ledger → step flip → escalation path with recovery plan. _Done when: Flow B runs end-to-end with a test call._
- **M5 (aces):** vision endpoint + verdict card; replica PRM form + headed Playwright autofill. _Done when: both run from the demo panel._
- **M6 (a11y + demo hardening):** VoiceOver pass, aria-live verified, keyboard-only run; demo panel force-step overrides for every SSE event (invisible insurance).

## 7. How to drive Claude Code

1. Build M1 only → run + click-test → then next milestone. Never "build everything".
2. Keep Vapi/SNCF keys out of prompts; the server reads `.env` names from this spec.
3. If a milestone stalls >45 min, invoke the fallback and move on.
4. Final hour belongs to rehearsal, not code. Freeze at M6.
