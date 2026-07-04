# TypeScript Migration Plan

Migrating AccessTrip from JavaScript (ESM) to TypeScript, switching the package manager to **pnpm**, and adding **Vitest** unit tests, **ESLint**, **Prettier**, and **Lefthook** pre-commit hooks.

## Current state

- ESM project (`"type": "module"`), no transpile step — everything runs through `node`.
- Backend: plain Node/Express in `server/` (17 files) — SSE, raw-fetch Claude client, Playwright autofill, and external open-data plugins in `server/plugins/` (SNCF punctuality, Open-Meteo weather) exposed via `/api/context`.
- Frontend: React/Vite in `web/` (~21 `.jsx`/`.js` files).
- Two Node launcher scripts in `scripts/`.
- Package manager: npm (`package-lock.json`).
- ~40 files total.

## Critical constraint

**The parent folder name contains a `:`**, which corrupts `PATH` and breaks `node_modules/.bin` shims. That's why every script calls `node <entrypoint.js>` directly. **All tooling (`tsx`, `tsc`, `vite`, `eslint`, `prettier`, `lefthook`) must be invoked the same way — via `node node_modules/...`, never as a bare bin or through `npx`/`pnpm exec`.** This applies inside git hooks too — Lefthook hook commands must call `node node_modules/...`. This also means pnpm's `.bin` symlinks are irrelevant to us — we call the underlying `.js`/`.mjs` entrypoints, so the switch doesn't disturb the run pattern.

## Guiding decisions

- **No backend build step for dev.** Run TS directly with `tsx` (via `node node_modules/tsx/dist/cli.mjs`). `tsc` is used only for type-checking (`--noEmit`) and an optional prod build.
- **Vite handles the frontend TS natively** — `@vitejs/plugin-react` already transpiles `.tsx`; no config change beyond renaming files and adding types.
- **Incremental, not big-bang.** Enable `allowJs` so `.ts` and `.js` coexist; migrate file-by-file, keeping `pnpm dev` + `pnpm smoke` green after each phase.
- **Strictness gradually.** Start with `strict: false` + `noImplicitAny: false` to compile fast, then tighten in Phase 8.

## Phase 0 — Package manager: npm → pnpm

- Import the existing lockfile to preserve resolutions: `pnpm import` (reads `package-lock.json` → `pnpm-lock.yaml`), then `pnpm install`.
- Delete `package-lock.json`; commit `pnpm-lock.yaml`.
- Add `"packageManager": "pnpm@<version>"` to `package.json`.
- Keep every script as `node node_modules/<pkg>/<entry>` — the direct deps (`vite`, `tsx`, `typescript`, `playwright`, `eslint`) are symlinked at `node_modules/<pkg>` under pnpm, so these paths still resolve.
- **Watch item:** pnpm's strict/isolated `node_modules` hides "phantom" transitive deps. Our direct deps (express, vite, react, playwright) are self-contained, so this should be a no-op — but if any package fails to resolve a transitive import, add `.npmrc` with `shamefully-hoist=true` as the escape hatch.
- Update `README.md` / any `npm run` references to `pnpm`.

## Phase 1 — TS tooling & config

- Add dev deps: `typescript`, `tsx`, `@types/node`, `@types/express`, `@types/react`, `@types/react-dom` (`pnpm add -D ...`).
- Add three tsconfigs:
  - `tsconfig.base.json` — shared options (`"module": "ESNext"`, `"moduleResolution": "Bundler"`, `"target": "ES2022"`, `"allowJs": true`, `"esModuleInterop": true`).
  - `tsconfig.server.json` — includes `server/`, `scripts/`, `shared/`; `"types": ["node"]`.
  - `tsconfig.web.json` — includes `web/src`, `shared/`; `"lib": ["ES2022","DOM"]`, `"jsx": "react-jsx"`, `"types": ["vite/client"]`.
- Update `package.json` scripts (keeping the `node <path>` pattern):
  - `"server": "node node_modules/tsx/dist/cli.mjs server/index.ts"`
  - `"dev"`: update `scripts/dev.js` to spawn `tsx` for the server entry.
  - `"typecheck": "node node_modules/typescript/bin/tsc -p tsconfig.server.json --noEmit && node node_modules/typescript/bin/tsc -p tsconfig.web.json --noEmit"`
  - `"web"` / `"build"` stay as-is (Vite auto-detects TS).

## Phase 2 — Shared types (the payoff)

- Create `shared/types.ts` defining the state/event contract used by **both** sides: `Trip`, `Step`, `LedgerEntry`, `AgentLogEntry`, `TranscriptChunk`, `AppState`, and the SSE event map (`step_updated`, `agent_log`, `ledger_entry`, `replan_proposed`, `vision_verdict`, `call_status`, `metrics`, `agent_state`, `agent_reasoning`, …).
- Derive these directly from `server/seed.js`, `server/state.js`, and the `reduce()` switch in `web/src/useEvents.js` — the two must stay in sync, and shared types enforce that.
- Also type the **real-context contract** crossing `/api/context`: `SncfRegularity` (`axe`, `month`, `regularite`, `ponctualite`, `source`, `live`) and `NiceWeather` (`tempC`, `windKmh`, `code`, `label`, `disruptive`, `source`, `live`), plus the wrapping `{ ok, sncf, weather }` response — consumed by `web/src/ops/RealContext.jsx`.

## Phase 3 — Backend migration (`server/`, `scripts/`)

- Rename `.js` → `.ts`, keeping `.js` extensions in relative imports (required by ESM/`tsx`; `moduleResolution: Bundler` allows them).
- Type the leaves first, then core: `agents/claude.ts` (define `ClaudeJSONArgs`, response shape), `plugins/sncf.ts` + `plugins/weather.ts` (type their return objects from shared; the raw external JSON — `data.results?.[0]`, `data.current` — stays loosely typed / cast, since the shape is the vendor's, not ours), `state.ts` (import `AppState` from shared), `events.ts`, then `routes/*.ts`, `index.ts`.
- `server/index.ts`: type the Express `Request`/`Response`, keep the hand-rolled `loadDotEnv`.
- Convert `scripts/dev.js` and `scripts/smoke.js` last (launchers; can stay `.js` longer if needed).

## Phase 4 — Frontend migration (`web/src/`)

- Rename `.jsx` → `.tsx`, plain `.js` (`config.js`, `lib/speech.js`) → `.ts`.
- Update `web/index.html` script src → `/src/main.tsx`.
- `useEvents.ts`: type `state` as `AppState | null`, type the reducer and event payloads from the shared event map — this is where shared types catch real bugs.
- Type component props (each `ops/`, `traveler/`, `fleet/`, `demo/` component, including `ops/RealContext.tsx` — type its `ctx` state from the shared `/api/context` response).
- Add `web/src/vite-env.d.ts` (`/// <reference types="vite/client" />`).

## Phase 5 — Unit tests (Vitest) ✅ done

**Why Vitest:** the project already uses Vite, so Vitest reuses the same ESM/TS transpile pipeline and `@vitejs/plugin-react` with zero extra config (no `ts-jest`/Babel ESM wrangling that Jest would need here). Jest-compatible API, fast, and handles both the Node backend and the jsdom frontend in one runner.

- Added dev deps: `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@vitest/coverage-v8`.
  - **Version pin:** the project is on Vite **5**; Vitest **4** requires Vite 6+ (it imports Vite's `./module-runner` export, absent in Vite 5) and fails at startup with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Pinned `vitest@^3` + `@vitest/coverage-v8@^3` (v3 supports Vite 5 & 6). Bump both to v4 only when Vite itself moves to 6+.
- Added `vitest.config.ts` using **projects** to split environments in one run:
  - `server` project — `environment: 'node'`, matches `server/**/*.test.ts` + `scripts/**/*.test.ts`.
  - `web` project — `environment: 'jsdom'`, `globals: true`, `plugins: [react()]`, `setupFiles: ['./vitest.setup.ts']` (imports `@testing-library/jest-dom/vitest` + `afterEach(cleanup)`), matches `web/src/**/*.test.{ts,tsx}`.
  - `web/src/vitest.d.ts` imports `@testing-library/jest-dom/vitest` so `tsc` (not just the runtime) sees the matcher augmentation — otherwise `pnpm typecheck` errors on `toBeInTheDocument`.
- Added scripts (dodging the PATH bug):
  - `"test": "node node_modules/vitest/vitest.mjs run"`
  - `"test:watch": "node node_modules/vitest/vitest.mjs"`
  - `"test:coverage": "node node_modules/vitest/vitest.mjs run --coverage"`
  - `.gitignore`s the `coverage/` output dir.
- Coverage delivered (55 tests, all green; targeted files fully covered):
  - `web/src/useEvents.test.ts` — the pure `reduce()` SSE reducer, one test per event type (`step_updated` status-preserve, `ledger_entry` unwrap, `replan_proposed` clear-on-null, `agent_reasoning` slice-to-14, immutability of `prev`, unknown-type passthrough).
  - `server/state.test.ts` — `findStep`, `setStepStatus`, `appendLedger`, `appendAgentLog` (500-entry cap), `resetState`; `node:fs` is `vi.mock`ed (existsSync→false forces fresh seed, writes are no-ops) so it never touches disk.
  - `server/seed.test.ts` — the seed shape `scripts/smoke.ts` asserts (7 steps, traveler name, ledger seed) plus deep-copy isolation and dependency integrity.
  - `server/plugins/sncf.test.ts` + `weather.test.ts` — `vi.stubGlobal('fetch', …)` to assert the normalized mapping **and** the graceful-fallback path on HTTP error; sncf uses `vi.resetModules()` per test to reset its module-level 10-min cache (a dedicated test asserts the cache hit).
  - `server/agents/claude.test.ts` — `hasClaude()` / `authHeaders()` / `baseUrl()` branch logic (api-key vs bearer, trailing-slash strip) with `vi.stubEnv`.
  - Component smoke tests `ops/RealContext.test.tsx` (mocked `/api/context` fetch, incl. not-ok + null-weather degrade paths) and `traveler/Timeline.test.tsx` (steps render, receipt count, at-risk reason chip, `StatusBadge` fallback).
- Done **after** Phase 4 so tests are authored in TS against the shared types; the existing `scripts/smoke.ts` stays as the live end-to-end check.

## Phase 6 — ESLint & Prettier ✅ done

**ESLint**

- Add dev deps: `eslint`, `typescript-eslint`, `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `globals` (and `eslint-plugin-react-refresh` for the Vite fast-refresh rule).
- Add a flat config `eslint.config.js` (ESM, matches `"type": "module"`):
  - `@eslint/js` recommended + `typescript-eslint` recommended.
  - Type-aware linting via `languageOptions.parserOptions.projectService` pointing at `tsconfig.server.json` / `tsconfig.web.json`.
  - A `web/**` override enabling React + React Hooks rules with `globals.browser`; a `server/**` + `scripts/**` override with `globals.node`.
  - `ignores`: `web/dist`, `node_modules`, `data`.

**Prettier**

- Add dev deps: `prettier` and `eslint-config-prettier` (the latter turns off ESLint's formatting rules so the two don't fight; add it **last** in the `eslint.config.js` config array).
- Add `.prettierrc` matching the codebase's existing style (no semicolons, single quotes, 2-space indent, trailing commas) and a `.prettierignore` (`web/dist`, `node_modules`, `data`, `pnpm-lock.yaml`, `package-lock.json`).
- Add scripts (dodging the PATH bug):
  - `"lint": "node node_modules/eslint/bin/eslint.js ."`
  - `"lint:fix": "node node_modules/eslint/bin/eslint.js . --fix"`
  - `"format": "node node_modules/prettier/bin/prettier.cjs --write ."`
  - `"format:check": "node node_modules/prettier/bin/prettier.cjs --check ."`
- Do this **after** the TS migration so it covers `.ts`/`.tsx`; run `format` then `lint:fix` once to normalize the tree, then triage remaining lint findings.

## Phase 7 — Lefthook pre-commit hooks ✅ done

- Add dev dep: `lefthook`.
- Add `lefthook.yml` with a `pre-commit` hook that runs on staged files only, invoking every tool through `node node_modules/...` (the `:` PATH bug applies inside hooks):
  - `format` — `node node_modules/prettier/bin/prettier.cjs --write {staged_files}` (with `stage_fixed: true` so re-formatted files are re-staged).
  - `lint` — `node node_modules/eslint/bin/eslint.js --fix {staged_files}`, globbed to `*.{ts,tsx,js,jsx}`.
  - Optionally a `pre-push` hook running `pnpm typecheck` and `pnpm test`.
- Install the git hooks: `node node_modules/lefthook/bin/index.js install` (not the bare `lefthook install` bin). Wire it into a `"prepare"` script so `pnpm install` sets hooks up automatically — but call it via `node node_modules/...` there too.
- **Note:** the repo lives in a folder whose name contains `:`; confirm the generated `.git/hooks/pre-commit` shim resolves (Lefthook writes an absolute path to its own runner). If it can't find `lefthook`, invoke the runner explicitly with `node`.

## Phase 8 — Tighten & verify ✅ done

- Flip `strict: true`; fix resulting `any`s and null-checks.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm dev` (manual smoke of the UI + SSE), and `pnpm smoke` against the running server.
- Verify the pre-commit hook fires on a trial commit (touch a file with a format/lint issue and confirm it's auto-fixed and re-staged).
- Update `README.md` / `SPEC.md` references (pnpm, `typecheck`, `lint`, `format`, `test`, pre-commit hooks).

## Risks / watch-items

- **The `:` PATH bug** — verify all `tsx` / `tsc` / `eslint` / `prettier` / `lefthook` invocations use `node node_modules/...`, never `npx` / `pnpm exec` / bare bins — including inside `lefthook.yml` and the generated git-hook shims.
- **ESLint ⇄ Prettier conflicts** — keep `eslint-config-prettier` last in the config array; don't add `eslint-plugin-prettier` (runs Prettier as a lint rule, slower and noisier) — run Prettier separately.
- **pnpm phantom deps** — strict `node_modules` may surface a hidden transitive dependency; fall back to `shamefully-hoist=true` in `.npmrc` only if something breaks.
- **ESM import extensions** — TS files must still import with `.js` specifiers; easy to get wrong during rename.
- **`output_config`/`thinking` in `claude.ts`** — current-API fields; keep them as a typed request interface rather than fighting a stale SDK type (the client is raw fetch, so no SDK types needed).
- **Playwright** already ships its own types — just import them in `autofill.ts`.
- **External open-data JSON** (SNCF Opendatasoft, Open-Meteo) is untyped and vendor-owned — don't over-model it. Type only the normalized objects your code returns; cast the raw `fetch().json()` payloads (`as any` / a minimal `interface`) at the boundary.

## Effort

~40 files but small. Phase 0 (pnpm) is quick and independent; Phases 1–2 in one sitting; backend and frontend each a focused pass; Vitest adds a focused test pass (start with the pure `reduce()` reducer and `state.ts`); ESLint/Prettier then Lefthook last — the tooling is config-only and fast once the code is TS.
