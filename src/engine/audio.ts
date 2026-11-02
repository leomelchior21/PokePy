// Chiptune sound with the Web Audio API, in the spirit of a handheld sound chip: a pulse-wave
// lead with vibrato and a soft echo, a quiet arpeggio that spells each chord, a triangle bass and
// a noise drum kit. Songs are loops written as note names, so the game needs no audio files.
//
// Every song is in eighth notes: one bar is 8 steps, '-' holds the note before it.
// The PYXIES theme opens with G C E G (a rising "hello"), and that hook comes back in Vila
// Maker and in the victory jingle, so the soundtrack feels like one story.

type Drums = 'calm' | 'pop' | 'drive' | 'march' | 'heavy'
type Song = {
  tempo: number
  lead: string
  /** Note names, or 'auto' to walk the chord roots. */
  bass: string
  /** One chord per bar, like 'C Am F G'. Spelled as an arpeggio when `arp` is on. */
  chords?: string
  arp?: boolean
  drums?: Drums
  wave?: 'pulse' | 'square' | 'triangle' | 'sawtooth'
}

const songs: Record<string, Song> = {
  // The theme: a rising hello, a question, an answer, then the bridge that climbs back home.
  title: {
    tempo: 126, drums: 'pop', arp: true, bass: 'auto', chords: 'C Am F G C Am F C F G Em Am F G Am G',
    lead: 'G4 C5 E5 G5 - - E5 G5 A5 - G5 E5 C5 - D5 E5 F5 - E5 D5 C5 - A4 C5 D5 - - - G4 - B4 D5 '
      + 'G4 C5 E5 G5 - - E5 G5 A5 - C6 B5 A5 - G5 E5 F5 A5 G5 F5 E5 D5 B4 D5 C5 - - - - - - - '
      + 'A5 - - G5 F5 - E5 F5 G5 - - F5 E5 - D5 E5 E5 - - D5 C5 - B4 C5 A4 - - - E5 - A5 - '
      + 'A5 - G5 F5 E5 - F5 A5 G5 - F5 E5 D5 - E5 F5 E5 - C6 - B5 - G5 - D5 - - - G4 - B4 D5',
  },
  // Vila Maker: the theme's hello, slower and at home.
  vila: {
    tempo: 100, drums: 'calm', arp: true, bass: 'auto', chords: 'C F G C Am F G C',
    lead: 'G4 C5 E5 G5 - - E5 D5 C5 - A4 - F4 - - - B4 D5 G5 - F5 E5 D5 - E5 - C5 - - - - - '
      + 'A4 C5 E5 A5 - G5 E5 D5 C5 - F5 - A5 - G5 F5 E5 D5 C5 D5 G5 - B4 D5 C5 - - - - - - -',
  },
  home: { tempo: 92, arp: true, chords: 'G G', lead: 'G4 B4 D5 B4 C5 E5 D5 - B4 A4 G4 A4 B4 - - -', bass: 'G2 - D3 - C3 - G2 - E2 - D3 - G2 - - -' },
  // On the road: bouncy, made for walking.
  route: {
    tempo: 138, drums: 'pop', arp: true, bass: 'auto', chords: 'G Em C D G Em C G',
    lead: 'B4 - D5 - G5 - F#5 G5 E5 - D5 B4 - - G4 A4 C5 - E5 - G5 - E5 C5 D5 - - A4 D5 - F#5 - '
      + 'G5 - F#5 G5 B5 - A5 G5 E5 - G5 - B4 - E5 D5 C5 E5 D5 C5 B4 C5 A4 F#4 G4 - - - B4 C5 D5 -',
  },
  // Harbor towns: a sunny stroll.
  town: {
    tempo: 112, drums: 'calm', arp: true, bass: 'auto', chords: 'F Dm Bb C F Dm Bb F',
    lead: 'A4 C5 F5 - E5 F5 G5 - A5 - G5 F5 D5 - - - D5 F5 Bb5 - A5 G5 F5 - G5 - - - C5 - E5 - '
      + 'A4 C5 F5 - E5 F5 G5 - A5 - C6 A5 G5 F5 D5 - Bb4 D5 G5 F5 E5 - C5 E5 F5 - - - - - - -',
  },
  beach: { tempo: 116, drums: 'calm', arp: true, chords: 'Am C Am Am', lead: 'A4 C5 E5 - D5 C5 A4 - G4 A4 C5 D5 E5 - - - A4 C5 E5 G5 E5 D5 C5 - D5 C5 A4 G4 A4 - - -', bass: 'A2 - E3 - F2 - C3 - G2 - D3 - A2 - E3 - A2 - E3 - F2 - C3 - G2 - D3 - A2 - - -', wave: 'triangle' },
  forest: { tempo: 104, drums: 'calm', arp: true, chords: 'Dm C Dm Bb', lead: 'D5 - F5 A5 G5 F5 E5 - C5 - E5 G5 F5 E5 D5 - D5 F5 A5 D6 C6 A5 G5 - F5 E5 D5 E5 D5 - - -', bass: 'D3 - A3 - D3 - A3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - Bb2 - C3 - D3 - - -' },
  cave: { tempo: 90, lead: 'E4 - G4 - F#4 - D4 - E4 - B3 - C4 - - - E4 - G4 - B4 - A4 - G4 - F#4 - E4 - - -', bass: 'E2 - - - E2 - - - C2 - - - D2 - - - E2 - - - E2 - - - C2 - - - B1 - - -', wave: 'triangle' },
  // The Makerspace: curious and a little mischievous, like a robot humming while it works.
  makerspace: {
    tempo: 124, drums: 'pop', arp: true, bass: 'auto', chords: 'Am G F E Am G F Am',
    lead: 'A4 - C5 E5 D5 - C5 D5 B4 - G4 - D5 - B4 - C5 - F5 A5 G5 - F5 E5 E5 - G#5 - B5 - - - '
      + 'A5 - G5 E5 D5 - C5 D5 B4 D5 G5 - F#5 G5 D5 - F5 E5 D5 C5 B4 C5 D5 E5 A4 - - - E5 - A5 -',
  },
  lab: { tempo: 128, drums: 'pop', arp: true, chords: 'Am G F E', lead: 'A4 A4 C5 E5 D5 C5 A4 - G4 G4 B4 D5 C5 B4 G4 - F4 A4 C5 F5 E5 C5 A4 - B4 C5 D5 E5 E5 - - -', bass: 'A2 A3 A2 A3 G2 G3 G2 G3 F2 F3 F2 F3 E2 E3 E2 E3 A2 A3 A2 A3 G2 G3 G2 G3 F2 F3 F2 F3 E2 E3 E2 E3' },
  station: { tempo: 100, arp: true, chords: 'C G', lead: 'C5 E5 G5 C6 B5 G5 E5 - A5 F5 D5 F5 G5 - - -', bass: 'C3 - G3 - E3 - G3 - F3 - D3 - G3 - - -' },
  victory: { tempo: 140, drums: 'march', arp: true, chords: 'Dm C Bb Dm', lead: 'D5 D5 D5 A5 - G5 F5 E5 D5 C5 D5 E5 - - - - D5 D5 D5 A5 - Bb5 A5 G5 F5 E5 F5 D5 - - - -', bass: 'D3 - A3 - D3 - A3 - C3 - G3 - C3 - G3 - Bb2 - F3 - Bb2 - F3 - A2 - E3 - A2 - - -' },
  academy: { tempo: 118, drums: 'pop', arp: true, chords: 'C G F C', lead: 'G4 C5 E5 G5 - E5 G5 C6 B5 A5 G5 E5 F5 - - - G4 C5 E5 G5 - A5 G5 F5 E5 D5 C5 D5 C5 - - -', bass: 'C3 - G3 - C3 - G3 - F3 - C4 - G3 - D3 - C3 - G3 - A2 - E3 - F2 - G2 - C3 - - -' },
  hall: { tempo: 126, drums: 'drive', arp: true, chords: 'C G Am G', lead: 'C5 - G4 C5 E5 - D5 C5 B4 - G4 B4 D5 - C5 B4 A4 - E4 A4 C5 - B4 A4 G4 A4 B4 C5 D5 - - -', bass: 'C3 C3 G2 G2 C3 C3 G2 G2 G2 G2 D3 D3 G2 G2 D3 D3 A2 A2 E2 E2 A2 A2 E2 E2 G2 G2 D3 D3 G2 - - -' },
  legend: { tempo: 84, drums: 'heavy', chords: 'Em G Em B', lead: 'E5 - B4 - G5 - F#5 - E5 - D5 - B4 - - - E5 - B4 - G5 - A5 - B5 - - - - - - -', bass: 'E2 - - - E2 - - - C2 - - - B1 - - - E2 - - - E2 - - - C2 - - - D2 - - -', wave: 'sawtooth' },
  // Wild battle: a riff over a pedal E, then the theme's climb in a minor key.
  battle: {
    tempo: 168, drums: 'drive', arp: true, bass: 'auto', chords: 'Em Em C D Em C Am B',
    lead: 'E4 E4 B4 E4 D5 E4 B4 A4 E4 E4 B4 E4 G5 F#5 E5 D5 C5 - E5 G5 - E5 C5 E5 D5 - F#5 A5 - F#5 D5 F#5 '
      + 'E5 G5 B5 G5 E5 G5 B5 E6 C6 B5 A5 G5 E5 G5 A5 B5 A5 - C6 - B5 - A5 G5 F#5 - - - D#5 - B4 -',
  },
  trainer: { tempo: 176, drums: 'drive', arp: true, chords: 'Am F Am E', lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 A5 C6 A5 G5 E5 D5 B4 A4 C5 E5 A5 B5 A5 G5 E5 F5 E5 D5 C5 B4 C5 D5 E5', bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 G2 G3 G2 G3 A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 G2 G3 E2 E3 E2 E3' },
  master: { tempo: 160, drums: 'drive', arp: true, chords: 'Dm Bb Dm A', lead: 'D5 F5 A5 D6 C6 A5 F5 A5 Bb5 A5 G5 F5 E5 F5 G5 E5 D5 F5 A5 D6 E6 D6 C6 A5 Bb5 A5 G5 F5 E5 D5 C#5 E5', bass: 'D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 C2 C3 C2 C3 D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 C2 C3 A1 A2 A1 A2' },
  // The victory jingle quotes the theme's hello.
  win: { tempo: 150, drums: 'march', arp: true, chords: 'C G C C', lead: 'G4 C5 E5 G5 - E5 G5 - A5 - G5 - B5 - D6 - C6 - - - G5 - C6 - - - - - - - - -', bass: 'auto' },
}

const NOTE: Record<string, number> = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 }

function freq(note: string): number | null {
  if (note === '-') return null
  const match = note.match(/^([A-G][#b]?)(\d)$/)
  if (!match) return null
  const semitone = NOTE[match[1]] + (Number(match[2]) - 4) * 12
  return 440 * 2 ** (semitone / 12)
}

/** The three notes of a chord name like 'C', 'Am' or 'F#m', as semitones from A4. */
function triad(name: string): number[] {
  const match = name.match(/^([A-G][#b]?)(m?)$/)
  if (!match) return []
  const root = NOTE[match[1]]
  return [root, root + (match[2] ? 3 : 4), root + 7]
}

const drumKits: Record<Drums, string> = {
  calm: 'k...s...',
  pop: 'k.h.s.hk',
  drive: 'khshkhsh',
  march: 'k.s.kks.',
  heavy: 'k.......',
}

class Chiptune {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private echo: GainNode | null = null
  private pulse: PeriodicWave | null = null
  private thin: PeriodicWave | null = null
  private noiseBuffer: AudioBuffer | null = null
  private current: string | null = null
  private timer: number | null = null
  private step = 0
  private nextTime = 0
  music = true
  sfxOn = true

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    const AudioCtor = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined
    if (!AudioCtor) return null
    try {
      const ctx = new AudioCtor()
      this.ctx = ctx
      this.master = ctx.createGain()
      this.master.gain.value = 0.2
      this.master.connect(ctx.destination)
      this.musicGain = ctx.createGain()
      this.musicGain.gain.value = 0.55
      this.musicGain.connect(this.master)
      // A short echo behind the lead, for a bigger room than a tiny speaker.
      const delay = ctx.createDelay(1)
      delay.delayTime.value = 0.27
      const feedback = ctx.createGain()
      feedback.gain.value = 0.28
      const wet = ctx.createGain()
      wet.gain.value = 0.35
      delay.connect(feedback)
      feedback.connect(delay)
      delay.connect(wet)
      wet.connect(this.musicGain)
      this.echo = ctx.createGain()
      this.echo.connect(delay)
      this.pulse = this.pulseWave(0.25)
      this.thin = this.pulseWave(0.125)
      const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1
      this.noiseBuffer = buffer
    } catch {
      this.ctx = null
    }
    return this.ctx
  }

  /** A pulse wave with the given duty, the classic handheld lead sound. */
  private pulseWave(duty: number): PeriodicWave | null {
    if (!this.ctx) return null
    const n = 32
    const real = new Float32Array(n)
    const imag = new Float32Array(n)
    for (let k = 1; k < n; k += 1) real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty)
    return this.ctx.createPeriodicWave(real, imag)
  }

  /** Browsers only allow sound after a tap or key press. */
  unlock() {
    const ctx = this.ensure()
    if (ctx?.state === 'suspended') void ctx.resume()
  }

  private tone(f: number, start: number, length: number, type: OscillatorType, volume: number, target: AudioNode | null, slide?: number) {
    const ctx = this.ctx
    if (!ctx || !target) return
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(f, start)
    if (slide) osc.frequency.exponentialRampToValueAtTime(slide, start + length)
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    osc.connect(gain)
    gain.connect(target)
    osc.start(start)
    osc.stop(start + length + 0.02)
  }

  /** A held lead note: quick attack, a little vibrato once it settles, and a soft release. */
  private voice(f: number, start: number, length: number, wave: Song['wave'], volume: number) {
    const ctx = this.ctx
    if (!ctx || !this.musicGain) return
    const osc = ctx.createOscillator()
    if ((wave ?? 'pulse') === 'pulse' && this.pulse) osc.setPeriodicWave(this.pulse)
    else osc.type = wave === 'pulse' || !wave ? 'square' : wave
    osc.frequency.setValueAtTime(f, start)
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, start)
    gain.gain.linearRampToValueAtTime(volume, start + 0.008)
    gain.gain.linearRampToValueAtTime(volume * 0.7, start + Math.min(0.12, length * 0.4))
    gain.gain.setValueAtTime(volume * 0.7, start + length * 0.85)
    gain.gain.linearRampToValueAtTime(0.0001, start + length)
    if (length > 0.3) {
      const lfo = ctx.createOscillator()
      const depth = ctx.createGain()
      lfo.frequency.value = 5.5
      depth.gain.setValueAtTime(0, start)
      depth.gain.linearRampToValueAtTime(14, start + 0.25)
      lfo.connect(depth)
      depth.connect(osc.detune)
      lfo.start(start)
      lfo.stop(start + length + 0.02)
    }
    osc.connect(gain)
    gain.connect(this.musicGain)
    if (this.echo) gain.connect(this.echo)
    osc.start(start)
    osc.stop(start + length + 0.02)
  }

  private noise(start: number, length: number, volume: number, high = 0, target: AudioNode | null = this.master) {
    const ctx = this.ctx
    if (!ctx || !target || !this.noiseBuffer) return
    const source = ctx.createBufferSource()
    source.buffer = this.noiseBuffer
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(volume, start)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + length)
    let node: AudioNode = source
    if (high) {
      const filter = ctx.createBiquadFilter()
      filter.type = 'highpass'
      filter.frequency.value = high
      source.connect(filter)
      node = filter
    }
    node.connect(gain)
    gain.connect(target)
    source.start(start, Math.random() * 0.5)
    source.stop(start + length + 0.02)
  }

  private drum(hit: string, start: number) {
    const target = this.musicGain
    if (hit === 'k') this.tone(140, start, 0.16, 'sine', 0.9, target, 42)
    else if (hit === 's') { this.noise(start, 0.13, 0.45, 1800, target); this.tone(190, start, 0.07, 'triangle', 0.35, target, 120) }
    else if (hit === 'h') this.noise(start, 0.035, 0.18, 7000, target)
  }

  play(name: string) {
    if (this.current === name) return
    this.stop()
    this.current = name
    if (!this.music) return
    const ctx = this.ensure()
    const song = songs[name]
    if (!ctx || !song) return
    const lead = song.lead.trim().split(/\s+/)
    const chords = song.chords?.split(/\s+/).map(triad) ?? []
    const bars = Math.max(1, Math.ceil(lead.length / 8))
    // Hold each lead note through the dashes that follow it.
    const holds = lead.map((note, i) => { let n = 1; while (note !== '-' && n < 8 && lead[(i + n) % lead.length] === '-') n += 1; return n })
    const bass = song.bass === 'auto' ? walkBass(chords, bars) : song.bass.trim().split(/\s+/)
    const beat = 60 / song.tempo / 2
    const kit = song.drums ? drumKits[song.drums] : ''
    this.step = 0
    this.nextTime = ctx.currentTime + 0.06
    const schedule = () => {
      if (!this.ctx || this.current !== name) return
      while (this.nextTime < this.ctx.currentTime + 0.3) {
        const i = this.step % lead.length
        const l = freq(lead[i])
        if (l) this.voice(l, this.nextTime, beat * holds[i] * 0.95, song.wave, song.wave === 'triangle' ? 0.3 : 0.13)
        const b = freq(bass[this.step % bass.length])
        if (b) this.tone(b, this.nextTime, beat * 0.95, 'triangle', 0.34, this.musicGain)
        const chord = chords.length ? chords[Math.floor(i / 8) % chords.length] : null
        if (song.arp && chord?.length && this.thin) {
          const semitone = chord[this.step % 3] + 12
          const osc = ctx.createOscillator()
          osc.setPeriodicWave(this.thin)
          osc.frequency.value = 440 * 2 ** (semitone / 12)
          const gain = ctx.createGain()
          gain.gain.setValueAtTime(0.035, this.nextTime)
          gain.gain.exponentialRampToValueAtTime(0.0001, this.nextTime + beat * 0.9)
          osc.connect(gain); gain.connect(this.musicGain!)
          osc.start(this.nextTime); osc.stop(this.nextTime + beat)
        }
        if (kit) this.drum(kit[this.step % 8], this.nextTime)
        this.step += 1
        this.nextTime += beat
      }
    }
    schedule()
    this.timer = window.setInterval(schedule, 90)
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.current = null
  }

  setMusic(on: boolean) {
    this.music = on
    if (!on) this.stop()
  }

  sfx(name: string) {
    if (!this.sfxOn) return
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    const m = this.master
    switch (name) {
      case 'blip': this.tone(880, t, 0.04, 'square', 0.12, m); break
      case 'select': this.tone(660, t, 0.05, 'square', 0.15, m); this.tone(990, t + 0.05, 0.06, 'square', 0.15, m); break
      case 'back': this.tone(440, t, 0.06, 'square', 0.12, m, 300); break
      case 'bump': this.tone(110, t, 0.08, 'square', 0.18, m, 80); break
      case 'door': this.noise(t, 0.12, 0.25); this.tone(220, t, 0.12, 'triangle', 0.3, m, 110); break
      case 'jump': this.tone(300, t, 0.15, 'square', 0.15, m, 700); break
      case 'alert': this.tone(1200, t, 0.06, 'square', 0.18, m); this.tone(1600, t + 0.07, 0.1, 'square', 0.18, m); break
      case 'item': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.08, 0.12, 'square', 0.14, m)); break
      case 'heal': [523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.1, 0.14, 'triangle', 0.3, m)); break
      case 'fanfare': [392, 523, 659, 784, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.11, 0.16, 'square', 0.15, m)); break
      case 'hit': this.noise(t, 0.15, 0.4); this.tone(200, t, 0.12, 'square', 0.2, m, 60); break
      case 'super': this.noise(t, 0.25, 0.5); this.tone(400, t, 0.25, 'sawtooth', 0.2, m, 80); break
      case 'miss': this.tone(300, t, 0.2, 'triangle', 0.25, m, 150); break
      case 'right': this.tone(784, t, 0.07, 'square', 0.15, m); this.tone(1175, t + 0.07, 0.12, 'square', 0.15, m); break
      case 'wrong': this.tone(220, t, 0.12, 'square', 0.15, m); this.tone(165, t + 0.12, 0.2, 'square', 0.15, m); break
      case 'faint': this.tone(600, t, 0.5, 'square', 0.15, m, 60); break
      case 'level': [523, 587, 659, 698, 784, 880, 988, 1047].forEach((f, i) => this.tone(f, t + i * 0.06, 0.08, 'square', 0.13, m)); break
      case 'throw': this.tone(500, t, 0.25, 'triangle', 0.25, m, 1200); break
      case 'shake': this.tone(180, t, 0.08, 'square', 0.18, m); break
      case 'catch': [784, 988, 1175, 1568].forEach((f, i) => this.tone(f, t + i * 0.09, 0.14, 'square', 0.15, m)); break
      case 'break': this.noise(t, 0.3, 0.4); this.tone(900, t, 0.25, 'square', 0.12, m, 200); break
      case 'shield': this.tone(1400, t, 0.05, 'square', 0.15, m); this.noise(t + 0.03, 0.12, 0.35); break
      case 'encounter': [220, 330, 220, 330, 440, 660].forEach((f, i) => this.tone(f, t + i * 0.05, 0.06, 'square', 0.15, m)); break
      case 'evolve': for (let i = 0; i < 12; i += 1) this.tone(400 + i * 60, t + i * 0.09, 0.1, 'triangle', 0.25, m); break
      case 'type': this.tone(1000 + Math.random() * 200, t, 0.015, 'square', 0.05, m); break
      // Footsteps: a soft brush through grass, a crunch on dirt and sand, a tap on floors.
      case 'step-grass': this.noise(t, 0.06, 0.07, 2600); break
      case 'step-dirt': this.noise(t, 0.045, 0.09, 900); break
      case 'step-floor': this.tone(170 + Math.random() * 30, t, 0.03, 'triangle', 0.12, m); break
      case 'rustle': this.noise(t, 0.16, 0.12, 3200); this.noise(t + 0.05, 0.1, 0.08, 4200); break
      case 'chop': this.noise(t, 0.06, 0.35, 700); this.tone(150, t, 0.07, 'square', 0.16, m, 80); break
      case 'splash': this.noise(t, 0.2, 0.14, 1200); this.tone(600, t, 0.12, 'sine', 0.08, m, 300); break
    }
  }
}

/** A bass line from the chord roots: root, fifth, octave, fifth, in every bar. */
function walkBass(chords: number[][], bars: number): string[] {
  const out: string[] = []
  const names = ['A', 'Bb', 'B', 'C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab']
  const name = (semitone: number) => {
    const n = Math.round(semitone)
    const octave = 4 + Math.floor((n + 9) / 12)
    return `${names[((n % 12) + 12) % 12]}${octave}`
  }
  for (let bar = 0; bar < bars; bar += 1) {
    const chord = chords[bar % Math.max(1, chords.length)]
    if (!chord?.length) { out.push('-', '-', '-', '-', '-', '-', '-', '-'); continue }
    // Keep the root between E2 and D#3.
    let root = chord[0] - 24
    while (root < -29) root += 12
    while (root > -18) root -= 12
    const fifth = root + 7
    out.push(name(root), '-', name(fifth), '-', name(root + 12), '-', name(fifth), name(root))
  }
  return out
}

export const audio = new Chiptune()
