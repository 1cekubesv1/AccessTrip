// Autofill (M5): launches a HEADED Playwright browser on the local replica PRM
// form and fills it field-by-field from Camille's passport, with a visible delay
// between fields so the jury can watch it happen on stage.
import { getState, appendAgentLog } from './state.js'
import { pushEvent } from './events.js'
import type { LogLevel } from '../shared/types.js'

const STEP_DELAY = 600 // ms between fields — tuned for stage visibility

function log(level: LogLevel, message: string): void {
  const entry = appendAgentLog({ agent: 'autofill', level, message })
  pushEvent('agent_log', entry)
}

// Returns { ok, error? }. Never throws — a missing Playwright install degrades
// gracefully with an agent-log message rather than breaking the demo.
export async function runAutofill({
  port = process.env.PORT || 3000,
}: { port?: number | string } = {}): Promise<{ ok: boolean; error?: string }> {
  let chromium
  try {
    const mod = await import('playwright')
    chromium = mod.chromium || mod.default?.chromium
    if (!chromium) throw new Error('chromium export missing')
  } catch {
    log(
      'error',
      'Playwright non installé — exécutez `pnpm pw:install` (installe le navigateur Chromium).',
    )
    return { ok: false, error: 'playwright_not_installed' }
  }

  const t = getState().traveler
  const eq = t.equipment
  const url = `http://localhost:${port}/prm-form`

  let browser
  try {
    log('info', 'Ouverture du formulaire PMR — remplissage automatique depuis le passeport…')
    browser = await chromium.launch({ headless: false, slowMo: 120 })
    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    const fills = [
      ['#nom', t.name],
      ['#age', String(t.age)],
      ['#langue', t.lang === 'fr' ? 'Français' : t.lang],
      ['#contact', t.emergency_contact],
      ['#equip_type', eq.type],
      ['#equip_modele', eq.model],
      ['#equip_poids', String(eq.weight_kg)],
      ['#equip_batterie', eq.battery],
      ['#equip_dim', `${eq.dimensions_cm.l}×${eq.dimensions_cm.w}×${eq.dimensions_cm.h}`],
    ]
    for (const [sel, val] of fills) {
      await page.fill(sel, val)
      await page.waitForTimeout(STEP_DELAY)
    }

    // functional-need checkboxes
    for (const sel of ['#need_transfert', '#need_sansmarche', '#need_embarquement']) {
      await page.check(sel)
      await page.waitForTimeout(STEP_DELAY / 2)
    }
    await page.fill(
      '#remarques',
      "Douche à l'italienne requise à l'arrivée. Assistance quai confirmée.",
    )
    await page.waitForTimeout(STEP_DELAY)
    await page.click('.submit')
    await page.waitForTimeout(1200)

    log('info', 'Formulaire PMR rempli et soumis — référence AEG-PRM-2209.')
    // leave the window open a moment for the audience, then close
    await page.waitForTimeout(1500)
    await browser.close()
    return { ok: true }
  } catch (err) {
    if (browser) await browser.close().catch(() => {})
    log('error', `Échec autofill : ${err.message}`)
    return { ok: false, error: err.message }
  }
}

export default { runAutofill }
