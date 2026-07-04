// Shared state/event contract used by BOTH the Node server and the React frontend.
// Types only — erased at compile time, so this file is safe to import from either
// side (tsx on the server, Vite on the web). The server's seed/state and the web's
// SSE reducer must agree with these shapes; keeping them here enforces that.

// --- traveler / passport -----------------------------------------------------

export interface Dimensions {
  l: number
  w: number
  h: number
}

export interface Equipment {
  type: string
  model: string
  weight_kg: number
  battery: string
  dimensions_cm: Dimensions
}

export interface Caregiver {
  name: string
  relation: string
  access: string
}

export interface Traveler {
  name: string
  age: number
  lang: string
  profile_functional_needs: string[]
  equipment: Equipment
  caregiver: Caregiver
  emergency_contact: string
}

// --- trip / steps ------------------------------------------------------------

export type StepStatus =
  | 'identified'
  | 'contacted'
  | 'confirmed'
  | 'reconfirmed'
  | 'in_progress'
  | 'done'
  | 'at_risk'
  | 'failed'

export interface Step {
  id: string
  title: string
  provider: string
  when: string
  depends_on: string[]
  status: StepStatus
  ref: string
  reason?: string | null
  reconfirm_due?: boolean
}

export interface Trip {
  label: string
  steps: Step[]
}

// --- ledger ------------------------------------------------------------------

export interface CallArchive {
  transcript: TranscriptChunk[]
  extracted: Extracted
  audio: string | null
}

export interface LedgerEntry {
  step: string
  confirmed_by: string
  channel: string
  at: string
  ref: string
  notes?: string
  call?: CallArchive
}

// --- agent log / reasoning ---------------------------------------------------

export type LogLevel = 'info' | 'warn' | 'error'

export interface AgentLogEntry {
  agent: string
  level: LogLevel
  message: string
}

export interface ReasoningEntry {
  agent: string
  thought: string
}

// --- call / transcript / extraction ------------------------------------------

export type CallStatus =
  'idle' | 'dialing' | 'ringing' | 'in_progress' | 'ended' | 'extracted' | 'queued'

export interface TranscriptChunk {
  speaker: 'assistant' | 'human'
  text: string
}

export interface CallState {
  status: CallStatus | string
  id: string | null
  mode?: 'vapi' | 'simulation'
  branch?: string
  recordingUrl?: string
  extracted?: Extracted
}

export interface Extracted {
  confirmed_by: string
  role: string
  room_available: boolean | null
  room_number: string | null
  roll_in_shower: boolean | null
  bed_height_ok: boolean | null
  reference: string | null
  commitments: string[]
  red_flags: string[]
}

// --- disruptions / replanning ------------------------------------------------

export interface Disruption {
  source: string
  details: string
  scenarioId?: string
  realData?: ({ type: 'sncf' } & SncfRegularity) | ({ type: 'weather' } & NiceWeather)
}

export interface ReplanItem {
  stepId: string
  action: string
  new_time: string
  rationale: string
}

export interface ReplanPlan {
  at_risk: string[]
  plan: ReplanItem[]
  message_voyageur: string
  minutesSaved?: number
}

// --- vision ------------------------------------------------------------------

export interface VisionVerdict {
  conforme: boolean
  confiance: number
  critere: string
  preuve: string
  recommandation: string
  source?: string
}

// --- metrics / fleet ---------------------------------------------------------

export interface Metrics {
  minutesRecovered: number
  interventions: number
  callsMade: number
}

export interface FleetTraveler {
  id: string
  name: string
  age: number
  profileShort: string
  needs: string[]
  route: string
  dates: string
  confirmations: number
  steps: StepStatus[]
}

// --- the single application state ("AppState") -------------------------------

export interface AppState {
  traveler: Traveler
  trip: Trip
  ledger: LedgerEntry[]
  agentLog: AgentLogEntry[]
  transcript: TranscriptChunk[]
  disruptions: Disruption[]
  replan: ReplanPlan | null
  visionVerdict: VisionVerdict | null
  call: CallState
  metrics: Metrics
  fleet: FleetTraveler[]
  // Populated client-side by the SSE reducer (not persisted server-side).
  agentStates?: Record<string, boolean>
  reasoning?: ReasoningEntry[]
}

// --- real-world context (open-data plugins, crossing /api/context) -----------

export interface SncfRegularity {
  axe: string
  month: string | null
  regularite: number | null
  ponctualite: number | null
  source: string
  live: boolean
}

export interface NiceWeather {
  tempC: number | null
  windKmh: number | null
  code: number | null
  label: string
  disruptive: boolean
  source: string
  live: boolean
}

export interface RealtimeDisruptions {
  count: number
  records: unknown[]
  live: boolean
}

export interface ContextResponse {
  ok: boolean
  sncf?: SncfRegularity
  weather?: NiceWeather
  realtime?: RealtimeDisruptions
  error?: string
}

// --- SSE event contract ------------------------------------------------------

// step_updated carries the stepId plus any subset of step fields to patch.
export interface StepUpdatedPayload extends Partial<Step> {
  stepId: string
}

// The named events the server emits and the web reducer consumes. Keeping the
// payloads in one map lets both sides stay honest about the wire shape.
export interface ServerEventMap {
  hello: { clients: number }
  step_updated: StepUpdatedPayload
  agent_log: AgentLogEntry
  transcript_chunk: TranscriptChunk
  ledger_entry: { entry: LedgerEntry }
  disruption: Disruption
  replan_proposed: { plan: ReplanPlan | null }
  vision_verdict: { verdict: VisionVerdict }
  call_status: Partial<CallState> & { extracted?: Extracted }
  metrics: Metrics
  agent_state: { agent: string; active: boolean }
  agent_reasoning: ReasoningEntry
  state_reset: { at: string | null }
}

export type ServerEventType = keyof ServerEventMap

// The envelope pushEvent wraps every broadcast in.
export interface ServerEventEnvelope<T extends ServerEventType = ServerEventType> {
  type: T
  payload: ServerEventMap[T]
  at: string | null
}
