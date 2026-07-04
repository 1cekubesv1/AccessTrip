// Browser text-to-speech for the live call simulation. Speaks each transcript
// bubble in a French voice as it streams, giving the "AI on the phone" effect
// without a real call. Two distinct voices (assistant vs. receptionist).

let cachedVoices: SpeechSynthesisVoice[] = []

function loadVoices(): void {
  try {
    cachedVoices = window.speechSynthesis.getVoices() || []
  } catch {
    cachedVoices = []
  }
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  loadVoices()
  // voices populate asynchronously on some browsers
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
}

export function supportsSpeech(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function frenchVoices(): SpeechSynthesisVoice[] {
  const fr = cachedVoices.filter((v) => /^fr/i.test(v.lang))
  return fr.length ? fr : cachedVoices
}

// Speak one line. `who` = 'assistant' (the AI) or 'human' (the receptionist).
// Returns the utterance so callers can await its `end` if needed.
export function speak(
  text: string,
  { who = 'assistant' }: { who?: 'assistant' | 'human' } = {},
): SpeechSynthesisUtterance | null {
  if (!supportsSpeech() || !text) return null
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  const voices = frenchVoices()
  if (voices.length) {
    // assistant = first FR voice; human = a different one if available
    u.voice = who === 'assistant' ? voices[0] : voices[1] || voices[0]
  }
  u.rate = who === 'assistant' ? 1.0 : 1.03
  u.pitch = who === 'assistant' ? 1.06 : 0.92
  window.speechSynthesis.speak(u)
  return u
}

export function cancelSpeech(): void {
  if (supportsSpeech()) window.speechSynthesis.cancel()
}

export default { speak, cancelSpeech, supportsSpeech }
