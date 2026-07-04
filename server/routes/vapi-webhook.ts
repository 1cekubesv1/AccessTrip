// POST /webhooks/vapi — receives Vapi call events (status + transcript chunks)
// and drives the same SSE pipeline the simulation uses. On end-of-call it runs
// the extractor + recovery (M4).
import express from 'express'
import { getState, updateState, appendAgentLog } from '../state.js'
import { pushEvent } from '../events.js'
import { runExtractionAndRecover } from '../agents/extractor.js'
import type { LogLevel } from '../../shared/types.js'

const router = express.Router()

function log(agent: string, level: LogLevel, message: string): void {
  const entry = appendAgentLog({ agent, level, message })
  pushEvent('agent_log', entry)
}

router.post('/vapi', async (req, res) => {
  // Vapi wraps payloads in { message: {...} }
  const msg = req.body?.message || req.body || {}
  const type = msg.type

  try {
    if (type === 'transcript' && msg.transcriptType === 'final') {
      const speaker: 'assistant' | 'human' = msg.role === 'assistant' ? 'assistant' : 'human'
      const chunk = { speaker, text: msg.transcript as string }
      updateState((s) => {
        s.transcript.push(chunk)
      })
      pushEvent('transcript_chunk', chunk)
    } else if (type === 'status-update') {
      const status = msg.status // queued | ringing | in-progress | ended
      updateState((s) => {
        s.call = { ...s.call, status: status === 'in-progress' ? 'in_progress' : status }
      })
      pushEvent('call_status', { status: status === 'in-progress' ? 'in_progress' : status })
      if (status === 'ringing') log('caller', 'info', 'Le téléphone sonne…')
    } else if (type === 'end-of-call-report') {
      updateState((s) => {
        s.call = { ...s.call, status: 'ended' }
      })
      pushEvent('call_status', { status: 'ended' })
      log('caller', 'info', 'Appel terminé — extraction de la confirmation…')
      const transcript = getState().transcript
      // attach recording if present
      if (msg.recordingUrl) {
        updateState((s) => {
          s.call.recordingUrl = msg.recordingUrl
        })
      }
      await runExtractionAndRecover(transcript)
    }
    res.json({ ok: true })
  } catch (err) {
    res.status(200).json({ ok: false, error: err.message }) // 200 so Vapi doesn't retry-storm
  }
})

export default router
