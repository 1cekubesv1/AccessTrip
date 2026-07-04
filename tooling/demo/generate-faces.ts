/**
 * generate-faces.ts — Demo asset tooling (image generation)
 *
 * Generates the storytelling portraits (Camille, Julien, airport & hotel staff)
 * and the AI-agent avatar for the stylized landing page, by talking directly to
 * the Codex CLI's built-in image tool. This rides the ChatGPT subscription via
 * Codex's stored OAuth login — no OpenAI API key, no per-image billing.
 *
 * See the `codex-image-generation` skill for the full mechanism and traps. The key
 * ones handled here: Codex is spawned with the terminal's TTY inherited (given only
 * piped stdio it silently no-ops its image tool, exiting 0 with no file); if its own
 * copy step is cut off we recover the image from Codex's store; and any miss exits
 * non-zero instead of masquerading as success. Run it in a foreground terminal — a
 * detached/backgrounded run has no TTY, so Codex will produce nothing.
 *
 * Run (folder name contains ':' which breaks the .bin PATH shim, so call tsx directly):
 *   node node_modules/tsx/dist/cli.mjs tooling/demo/generate-faces.ts
 *   node node_modules/tsx/dist/cli.mjs tooling/demo/generate-faces.ts --only camille,ai-agent
 *   node node_modules/tsx/dist/cli.mjs tooling/demo/generate-faces.ts --force
 *
 * Requires: `codex` on PATH, signed in (`codex login`; verify auth with
 * `codex features list | grep image_generation` → stable/true).
 */
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CODEX_TIMEOUT_MS = 5 * 60_000
const HERE = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(HERE, '..', '..')
const CODEX_STORE = join(process.env.CODEX_HOME ?? join(homedir(), '.codex'), 'generated_images')

interface Character {
  id: string
  file: string
  prompt: string
}
interface Manifest {
  outputDir: string
  style: string
  characters: Character[]
  avatars: Character[]
}

function parseArgs(argv: string[]) {
  const only =
    argv.find((a) => a.startsWith('--only='))?.split('=')[1] ??
    (argv.includes('--only') ? argv[argv.indexOf('--only') + 1] : undefined)
  return {
    force: argv.includes('--force'),
    only: only ? new Set(only.split(',').map((s) => s.trim())) : null,
  }
}

/**
 * Newest PNG in Codex's store written since `sinceMs`. Restricting to this call's
 * window avoids grabbing an unrelated/earlier generation when we recover a file.
 */
function newestStoreImageSince(sinceMs: number): string | null {
  if (!existsSync(CODEX_STORE)) return null
  let best: { path: string; mtime: number } | null = null
  for (const session of readdirSync(CODEX_STORE)) {
    let entries: string[]
    try {
      entries = readdirSync(join(CODEX_STORE, session))
    } catch {
      continue // not a directory, or vanished mid-scan
    }
    for (const f of entries) {
      if (!f.toLowerCase().endsWith('.png')) continue
      const p = join(CODEX_STORE, session, f)
      const mtime = statSync(p).mtimeMs
      // 2s slack: the store write can predate our JS clock read slightly.
      if (mtime >= sinceMs - 2_000 && (!best || mtime > best.mtime)) best = { path: p, mtime }
    }
  }
  return best?.path ?? null
}

/**
 * Run one `codex exec` turn for a single image. Stdio is INHERITED so Codex gets the
 * terminal's TTY — with only piped stdio it silently no-ops the image tool. Resolves on
 * exit regardless of code; the caller judges success by whether a file was produced.
 */
function runCodex(outDir: string, prompt: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(
      'codex',
      ['exec', '--skip-git-repo-check', '--sandbox', 'workspace-write', '-C', outDir, prompt],
      { stdio: 'inherit' },
    )
    const timer = setTimeout(() => child.kill('SIGKILL'), CODEX_TIMEOUT_MS)
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', () => {
      clearTimeout(timer)
      resolvePromise()
    })
  })
}

async function generateOne(
  char: Character,
  style: string,
  outDir: string,
  force: boolean,
): Promise<boolean> {
  const outPath = join(outDir, char.file)
  if (existsSync(outPath) && !force) {
    console.log(`  ⏭  ${char.id}: exists (use --force to regenerate) → ${outPath}`)
    return true
  }
  const prompt = `Generate an image: ${char.prompt} ${style} Save it as ${outPath} and report the path.`

  console.log(`  🎨 ${char.id}: generating…`)
  const startMs = Date.now()
  // Under --force a stale file may already sit at outPath; remember it so a no-op run
  // (Codex wrote nothing) can't masquerade as success just because the old file exists.
  const beforeMtime = existsSync(outPath) ? statSync(outPath).mtimeMs : null
  const producedThisRun = () =>
    existsSync(outPath) && (beforeMtime === null || statSync(outPath).mtimeMs !== beforeMtime)

  try {
    await runCodex(outDir, prompt)
  } catch (err) {
    // Couldn't even launch Codex (not on PATH, etc.). A timeout kill lands on 'close',
    // not here, so fall through to recovery in that case.
    console.error(`  ❌ ${char.id}: failed to run codex —`, (err as Error).message)
    return false
  }

  if (producedThisRun()) {
    console.log(`  ✅ ${char.id} → ${outPath}`)
    return true
  }

  // Codex generated the image but its own copy step didn't land the file — recover the
  // PNG it wrote to the store during this call. (A pre-existing stale file at outPath is
  // deliberately ignored above, so recovery still runs.)
  const recovered = newestStoreImageSince(startMs)
  if (recovered) {
    copyFileSync(recovered, outPath)
    console.log(`  ✅ ${char.id} → ${outPath} (recovered from store)`)
    return true
  }

  console.error(
    `  ❌ ${char.id}: no image produced — nothing new at ${outPath} or in Codex's store. ` +
      `See Codex's output above: if auth expired run \`codex login\`; if it ran without a ` +
      `terminal (detached/backgrounded) it no-ops — run this in a foreground shell.`,
  )
  return false
}

async function main() {
  const { force, only } = parseArgs(process.argv.slice(2))
  const manifest: Manifest = JSON.parse(readFileSync(join(HERE, 'characters.json'), 'utf8'))
  const outDir = resolve(REPO_ROOT, manifest.outputDir)
  mkdirSync(outDir, { recursive: true })

  const all = [...manifest.characters, ...manifest.avatars]
  const todo = only ? all.filter((c) => only.has(c.id)) : all
  if (todo.length === 0) {
    console.error(`No characters matched --only. Known ids: ${all.map((c) => c.id).join(', ')}`)
    process.exit(1)
  }

  console.log(`Generating ${todo.length} image(s) → ${outDir}\n`)
  let failures = 0
  for (const char of todo) {
    // Serial on purpose: codex image runs are heavy and rate-limited, and one image
    // per `codex exec` call is the reliable pattern.
    const ok = await generateOne(char, manifest.style, outDir, force)
    if (!ok) failures += 1
  }

  if (failures > 0) {
    console.error(`\n${failures}/${todo.length} image(s) failed — see messages above.`)
    process.exit(1)
  }
  console.log('\nDone.')
}

main().catch((err) => {
  console.error('generate-faces failed:', err)
  process.exit(1)
})
