// AccessTrip server: Express + SSE + static serving in one Node process.
import express, { type Request, type Response, type NextFunction } from 'express'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import apiRouter from './routes/api.js'
import vapiWebhookRouter from './routes/vapi-webhook.js'
import { addClient, clientCount } from './events.js'
import { getState } from './state.js'

// Load .env by hand (no dependency) so ANTHROPIC/VAPI keys are available in later milestones.
loadDotEnv()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json({ limit: '10mb' }))

// --- SSE stream: a single /events endpoint everything broadcasts to ---
app.get('/events', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write('retry: 3000\n\n')
  res.write(`event: hello\ndata: ${JSON.stringify({ clients: clientCount() + 1 })}\n\n`)
  addClient(res)

  // heartbeat so proxies don't drop the idle connection during a demo
  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      clearInterval(ping)
    }
  }, 15000)
  req.on('close', () => clearInterval(ping))
})

// --- REST API ---
app.use('/api', apiRouter)

// --- Vapi webhook ---
app.use('/webhooks', vapiWebhookRouter)

// --- replica airline PRM form (target for the Playwright autofill demo) ---
app.use('/prm-form', express.static(path.join(__dirname, 'prm-form')))

// --- health ---
app.get('/healthz', (req: Request, res: Response) =>
  res.json({ ok: true, steps: getState().trip.steps.length }),
)

// --- static frontend (production build). In dev, Vite serves the UI and proxies here. ---
const distDir = path.join(__dirname, '..', 'web', 'dist')
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir))
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path.startsWith('/api') ||
      req.path.startsWith('/events') ||
      req.path.startsWith('/webhooks')
    )
      return next()
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.listen(PORT, () => {
  console.log(`\n  AccessTrip server → http://localhost:${PORT}`)
  if (!fs.existsSync(distDir)) {
    console.log('  (dev) frontend served by Vite → http://localhost:5173')
  }
  console.log('')
})

// Minimal .env parser — avoids adding dotenv as a dependency. Reads AccessTrip/.env
// first, then the parent workspace .env as a fallback (so an existing Claude
// gateway config is reused without duplicating the token into a new file).
function loadDotEnv(): void {
  const dir = path.dirname(fileURLToPath(import.meta.url))
  loadEnvFile(path.join(dir, '..', '.env'))
  loadEnvFile(path.join(dir, '..', '..', '.env'))
}

function loadEnvFile(envPath: string): void {
  try {
    if (!fs.existsSync(envPath)) return
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/)
      if (!m) continue
      const key = m[1]
      const val = m[2].replace(/^["']|["']$/g, '')
      if (process.env[key] === undefined) process.env[key] = val // first file wins
    }
  } catch {
    /* non-fatal */
  }
}
