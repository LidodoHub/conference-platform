// Système d'effets sonores feutrés et soyeux (style Linear / Apple)
// Générés dynamiquement via la Web Audio API (zéro fichier lourd, zéro latence, 60fps)

let audioCtx = null

function getAudioContext() {
  if (typeof window === 'undefined') return null
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (AudioContextClass) {
      audioCtx = new AudioContextClass()
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {})
  }
  return audioCtx
}

export function isSoundEnabled() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('confera:sound') !== 'false'
}

export function setSoundEnabled(enabled) {
  if (typeof window === 'undefined') return
  localStorage.setItem('confera:sound', enabled ? 'true' : 'false')
}

// 1. Carillon feutré de succès (deux notes chaleureuses : Do5 -> Mi5)
export function playSuccessSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime

    // Note 1 (Do5 - 523.25 Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(523.25, now)
    gain1.gain.setValueAtTime(0.08, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.18)

    // Note 2 (Mi5 - 659.25 Hz, légèrement décalée pour l'effet carillon)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(659.25, now + 0.08)
    gain2.gain.setValueAtTime(0.09, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.32)
  } catch {
    // Les navigateurs peuvent bloquer l'audio avant la 1ère interaction
  }
}

// 2. Bip net et rassurant d'émargement QR Code à la porte
export function playScanSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(880, now) // La5
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.08) // Ré6
    gain.gain.setValueAtTime(0.07, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.12)
  } catch {
    // ignoré
  }
}

// 3. Petit retour haptique sonore (micro-clic feutré)
export function playTickSound() {
  if (!isSoundEnabled()) return
  try {
    const ctx = getAudioContext()
    if (!ctx) return

    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(440, now)
    gain.gain.setValueAtTime(0.03, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(now)
    osc.stop(now + 0.04)
  } catch {
    // ignoré
  }
}
