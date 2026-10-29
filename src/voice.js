// Spoken guidance for the login / signup pages, using the browser's built-in
// Web Speech API (SpeechSynthesis) — no API key, no network call, no
// dependency. Chrome and Edge ship Google's neural voices with the browser, so
// picking the best available English voice gives the "Google AI" sound; other
// platforms fall back to their system voice.

const STORAGE_KEY = 'we-voice'

let cachedVoice = null
let pendingText = null
let interacted = false

export function voiceAvailable() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function isVoiceEnabled() {
  try {
    // Default ON: the feature is the point of these pages.
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

export function setVoiceEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch {
    /* private mode — the setting just won't persist */
  }
  if (!enabled) stopSpeaking()
}

// Prefer a neural/Google voice when the platform offers one; otherwise the
// first English voice, otherwise whatever the system has.
function bestVoice() {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  if (cachedVoice && voices.includes(cachedVoice)) return cachedVoice
  const english = voices.filter((v) => v.lang?.toLowerCase().startsWith('en'))
  const pick =
    english.find((v) => /natural|neural|enhanced|premium/i.test(v.name)) ||
    english.find((v) => /google/i.test(v.name)) ||
    english.find((v) => /aria|jenny|libby|zira/i.test(v.name)) ||
    english[0] ||
    voices[0]
  cachedVoice = pick
  return pick
}

function doSpeak(text) {
  const synth = window.speechSynthesis
  synth.cancel() // never let two greetings overlap
  const utterance = new SpeechSynthesisUtterance(text)
  const voice = bestVoice()
  if (voice) utterance.voice = voice
  utterance.lang = voice?.lang || 'en-US'
  utterance.rate = 1.02
  utterance.pitch = 1
  synth.speak(utterance)
}

// Chrome and Safari block speech that starts before the first user gesture.
// We keep the text pending and retry on the first click/keypress instead of
// silently losing the greeting.
function flush() {
  if (!pendingText || !voiceAvailable() || !isVoiceEnabled()) {
    pendingText = null
    return
  }
  const synth = window.speechSynthesis
  if (synth.speaking || synth.pending) return
  doSpeak(pendingText)
  if (synth.speaking) pendingText = null // it went through; nothing left to say
}

export function speak(text) {
  if (!text || !voiceAvailable() || !isVoiceEnabled()) return
  pendingText = text
  if (!interacted) {
    const onFirstGesture = () => {
      interacted = true
      flush()
    }
    document.addEventListener('pointerdown', onFirstGesture, { once: true })
    document.addEventListener('keydown', onFirstGesture, { once: true })
  }
  flush()
}

export function stopSpeaking() {
  pendingText = null
  if (voiceAvailable()) window.speechSynthesis.cancel()
}

// Voices load asynchronously in most browsers; drop the cache when the list
// changes so we pick the best one once it's available.
if (voiceAvailable()) {
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoice = null
  })
}
