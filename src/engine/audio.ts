// Chiptune sound with the Web Audio API: square-wave melodies, triangle bass, noise hits.
// Songs are short loops written as note names, so the game needs no audio files.

type Song = { tempo: number; lead: string; bass: string; wave?: OscillatorType }

const songs: Record<string, Song> = {
  title: { tempo: 132, lead: 'E5 G5 A5 B5 A5 G5 E5 - D5 E5 G5 E5 D5 B4 - - E5 G5 A5 B5 D6 B5 A5 - G5 A5 B5 A5 G5 E5 - -', bass: 'E3 - B3 - C3 - G3 - D3 - A3 - E3 - B2 - E3 - B3 - C3 - G3 - D3 - A3 - E3 - E3 -' },
  vila: { tempo: 112, lead: 'C5 E5 G5 E5 F5 A5 G5 - E5 D5 C5 D5 E5 - - - C5 E5 G5 C6 B5 A5 G5 - F5 E5 D5 E5 C5 - - -', bass: 'C3 - G3 - F3 - C3 - A2 - G2 - C3 - G2 - C3 - G3 - F3 - C3 - F2 - G2 - C3 - - -' },
  home: { tempo: 96, lead: 'G4 B4 D5 B4 C5 E5 D5 - B4 A4 G4 A4 B4 - - -', bass: 'G2 - D3 - C3 - G2 - E2 - D3 - G2 - - -' },
  route: { tempo: 138, lead: 'G4 A4 B4 D5 - B4 D5 E5 D5 B4 A4 G4 A4 - - - G4 A4 B4 D5 - E5 G5 E5 D5 B4 A4 B4 G4 - - -', bass: 'G2 - D3 - G2 - D3 - C3 - G3 - D3 - A2 - G2 - D3 - G2 - D3 - C3 - D3 - G2 - - -' },
  town: { tempo: 120, lead: 'E5 - C5 D5 E5 G5 E5 - D5 - B4 C5 D5 E5 C5 - A4 C5 E5 A5 G5 E5 D5 - C5 D5 E5 D5 C5 - - -', bass: 'C3 - G3 - C3 - G3 - G2 - D3 - G2 - D3 - A2 - E3 - A2 - E3 - F2 - G2 - C3 - - -' },
  beach: { tempo: 116, lead: 'A4 C5 E5 - D5 C5 A4 - G4 A4 C5 D5 E5 - - - A4 C5 E5 G5 E5 D5 C5 - D5 C5 A4 G4 A4 - - -', bass: 'A2 - E3 - F2 - C3 - G2 - D3 - A2 - E3 - A2 - E3 - F2 - C3 - G2 - D3 - A2 - - -', wave: 'triangle' },
  forest: { tempo: 104, lead: 'D5 - F5 A5 G5 F5 E5 - C5 - E5 G5 F5 E5 D5 - D5 F5 A5 D6 C6 A5 G5 - F5 E5 D5 E5 D5 - - -', bass: 'D3 - A3 - D3 - A3 - C3 - G3 - C3 - G3 - A2 - E3 - A2 - E3 - Bb2 - C3 - D3 - - -' },
  cave: { tempo: 90, lead: 'E4 - G4 - F#4 - D4 - E4 - B3 - C4 - - - E4 - G4 - B4 - A4 - G4 - F#4 - E4 - - -', bass: 'E2 - - - E2 - - - C2 - - - D2 - - - E2 - - - E2 - - - C2 - - - B1 - - -', wave: 'triangle' },
  lab: { tempo: 128, lead: 'A4 A4 C5 E5 D5 C5 A4 - G4 G4 B4 D5 C5 B4 G4 - F4 A4 C5 F5 E5 C5 A4 - B4 C5 D5 E5 E5 - - -', bass: 'A2 A3 A2 A3 G2 G3 G2 G3 F2 F3 F2 F3 E2 E3 E2 E3 A2 A3 A2 A3 G2 G3 G2 G3 F2 F3 F2 F3 E2 E3 E2 E3' },
  makerspace: { tempo: 124, lead: 'C5 D5 E5 G5 E5 D5 C5 - C5 D5 E5 G5 A5 G5 E5 - F5 E5 D5 C5 D5 E5 G5 - E5 D5 C5 D5 C5 - - -', bass: 'C3 - E3 - G3 - E3 - F3 - A3 - G3 - - - F3 - E3 - D3 - G3 - C3 - G2 - C3 - - -' },
  station: { tempo: 100, lead: 'C5 E5 G5 C6 B5 G5 E5 - A5 F5 D5 F5 G5 - - -', bass: 'C3 - G3 - E3 - G3 - F3 - D3 - G3 - - -' },
  victory: { tempo: 140, lead: 'D5 D5 D5 A5 - G5 F5 E5 D5 C5 D5 E5 - - - - D5 D5 D5 A5 - Bb5 A5 G5 F5 E5 F5 D5 - - - -', bass: 'D3 - A3 - D3 - A3 - C3 - G3 - C3 - G3 - Bb2 - F3 - Bb2 - F3 - A2 - E3 - A2 - - -' },
  academy: { tempo: 118, lead: 'G4 C5 E5 G5 - E5 G5 C6 B5 A5 G5 E5 F5 - - - G4 C5 E5 G5 - A5 G5 F5 E5 D5 C5 D5 C5 - - -', bass: 'C3 - G3 - C3 - G3 - F3 - C4 - G3 - D3 - C3 - G3 - A2 - E3 - F2 - G2 - C3 - - -' },
  hall: { tempo: 126, lead: 'C5 - G4 C5 E5 - D5 C5 B4 - G4 B4 D5 - C5 B4 A4 - E4 A4 C5 - B4 A4 G4 A4 B4 C5 D5 - - -', bass: 'C3 C3 G2 G2 C3 C3 G2 G2 G2 G2 D3 D3 G2 G2 D3 D3 A2 A2 E2 E2 A2 A2 E2 E2 G2 G2 D3 D3 G2 - - -' },
  legend: { tempo: 84, lead: 'E5 - B4 - G5 - F#5 - E5 - D5 - B4 - - - E5 - B4 - G5 - A5 - B5 - - - - - - -', bass: 'E2 - - - E2 - - - C2 - - - B1 - - - E2 - - - E2 - - - C2 - - - D2 - - -', wave: 'sawtooth' },
  battle: { tempo: 168, lead: 'E5 E5 G5 E5 A5 E5 G5 E5 D5 D5 F5 D5 G5 D5 F5 D5 C5 C5 E5 C5 F5 C5 E5 C5 B4 C5 D5 E5 F5 E5 D5 B4', bass: 'E2 E3 E2 E3 E2 E3 E2 E3 D2 D3 D2 D3 D2 D3 D2 D3 C2 C3 C2 C3 C2 C3 C2 C3 B1 B2 B1 B2 B1 B2 B1 B2' },
  trainer: { tempo: 176, lead: 'A4 C5 E5 A5 G5 E5 C5 E5 F5 A5 C6 A5 G5 E5 D5 B4 A4 C5 E5 A5 B5 A5 G5 E5 F5 E5 D5 C5 B4 C5 D5 E5', bass: 'A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 F2 F3 G2 G3 G2 G3 A2 A3 A2 A3 A2 A3 A2 A3 F2 F3 G2 G3 E2 E3 E2 E3' },
  master: { tempo: 160, lead: 'D5 F5 A5 D6 C6 A5 F5 A5 Bb5 A5 G5 F5 E5 F5 G5 E5 D5 F5 A5 D6 E6 D6 C6 A5 Bb5 A5 G5 F5 E5 D5 C#5 E5', bass: 'D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 Bb1 Bb2 C2 C3 C2 C3 D2 D3 D2 D3 D2 D3 D2 D3 Bb1 Bb2 C2 C3 A1 A2 A1 A2' },
  win: { tempo: 150, lead: 'C5 E5 G5 C6 - G5 C6 - D6 - E6 - - - - -', bass: 'C3 - G3 - C3 - E3 - G3 - C4 - - - - -' },
}

const NOTE: Record<string, number> = { C: -9, 'C#': -8, Db: -8, D: -7, 'D#': -6, Eb: -6, E: -5, F: -4, 'F#': -3, Gb: -3, G: -2, 'G#': -1, Ab: -1, A: 0, 'A#': 1, Bb: 1, B: 2 }

function freq(note: string): number | null {
  if (note === '-') return null
  const match = note.match(/^([A-G][#b]?)(\d)$/)
  if (!match) return null
  const semitone = NOTE[match[1]] + (Number(match[2]) - 4) * 12
  return 440 * 2 ** (semitone / 12)
}

class Chiptune {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
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
      this.ctx = new AudioCtor()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.18
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.55
      this.musicGain.connect(this.master)
    } catch {
      this.ctx = null
    }
    return this.ctx
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

  private noise(start: number, length: number, volume: number) {
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * length), ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length)
    const source = ctx.createBufferSource()
    const gain = ctx.createGain()
    gain.gain.value = volume
    source.buffer = buffer
    source.connect(gain)
    gain.connect(this.master)
    source.start(start)
  }

  play(name: string) {
    if (this.current === name) return
    this.stop()
    this.current = name
    if (!this.music) return
    const ctx = this.ensure()
    const song = songs[name]
    if (!ctx || !song) return
    const lead = song.lead.split(/\s+/)
    const bass = song.bass.split(/\s+/)
    const beat = 60 / song.tempo / 2
    this.step = 0
    this.nextTime = ctx.currentTime + 0.05
    const schedule = () => {
      if (!this.ctx || this.current !== name) return
      while (this.nextTime < this.ctx.currentTime + 0.25) {
        const l = freq(lead[this.step % lead.length])
        const b = freq(bass[this.step % bass.length])
        if (l) this.tone(l, this.nextTime, beat * 0.9, song.wave ?? 'square', 0.16, this.musicGain)
        if (b) this.tone(b, this.nextTime, beat * 0.95, 'triangle', 0.32, this.musicGain)
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
    }
  }
}

export const audio = new Chiptune()
