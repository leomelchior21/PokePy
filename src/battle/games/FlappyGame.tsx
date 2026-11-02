import { useRef } from 'react'
import { audio } from '../../engine/audio'
import type { FlappyChallenge } from '../minigames'
import { burst, confetti, drawParticles, hearts, INK, roundRect, scenery, stepParticles, tag, text, useCanvasLoop, type Ctx, type Loop, type Particle } from './kit'
import type { GameProps } from './types'

const GRAVITY = 900
const FLAP = -290
const SPEED = 92
const GAP = 300
const WALL = 56
/** Opening height: generous, but walls always stay between the openings. */
const hole = (h: number, n: number) => Math.max(56, Math.min(108, (h - 120) / n - 20))

/**
 * Trace Flight: every gate is one line of the program. Fly through the opening that shows the
 * variable's new value. The code panel fills in each value as you pass, like a trace table.
 */
export function FlappyGame({ challenge, accent, hero, started, onFinish, onTrace, controls }: GameProps<FlappyChallenge>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({
    y: 0, vy: 0, scroll: 0, gate: 0, hearts: challenge.hearts, t: 0, taps: 0, wait: 0, done: false, particles: [] as Particle[],
    notes: {} as Record<number, string>, message: '', messageT: 0, good: true, h: 0, bob: 0,
  })
  /** Openings spread evenly between the ceiling and the grass. */
  const holes = (h: number, count: number) => {
    const top = 60
    const bottom = h - 60
    return Array.from({ length: count }, (_, i) => top + ((bottom - top) * (i + 0.5)) / count)
  }
  const gateX = (i: number) => 380 + i * GAP
  const loop = useRef<Loop>({
    update: (dt, w, h) => {
      const s = state.current
      s.t += dt
      s.particles = stepParticles(s.particles, dt)
      s.messageT = Math.max(0, s.messageT - dt)
      if (s.h !== h) { s.h = h; if (!s.y) s.y = h / 2 }
      const c = controls.current
      if (!started.current || s.done) { s.bob += dt; s.y = h / 2 + Math.sin(s.bob * 3) * 8; s.taps = c.taps; return }
      if (c.taps !== s.taps) { s.taps = c.taps; if (s.wait <= 0) { s.vy = FLAP; audio.sfx('jump') } }
      if (s.wait > 0) { s.wait -= dt; if (s.wait <= 0) { s.y = h / 2; s.vy = FLAP * 0.6 } return }
      s.vy += GRAVITY * dt
      s.y += s.vy * dt
      s.scroll += SPEED * dt
      const birdX = Math.min(170, w * 0.24)
      const gate = challenge.gates[s.gate]
      if (!gate) return
      const gx = gateX(s.gate) - s.scroll
      const ys = holes(h, gate.options.length)
      const crash = () => {
        s.hearts -= 1
        audio.sfx('hit')
        s.message = 'Bonk! Try that gate again.'
        s.messageT = 1.4
        s.good = false
        s.scroll -= 150
        s.wait = 0.5
        if (s.hearts <= 0) { s.done = true; window.setTimeout(() => onFinish(false, 0), 700) }
      }
      if (s.y < 12 || s.y > h - 40) { crash(); return }
      if (birdX + 14 > gx && birdX - 14 < gx + WALL) {
        const size = hole(h, ys.length)
        const inside = ys.findIndex((hy) => s.y > hy - size / 2 + 8 && s.y < hy + size / 2 - 8)
        if (inside < 0) { crash(); return }
      }
      if (birdX - 14 > gx + WALL) {
        const inside = ys.reduce((best, hy, i) => (Math.abs(s.y - hy) < Math.abs(s.y - ys[best]) ? i : best), 0)
        const value = gate.options[gate.answer]
        s.notes = { ...s.notes, [gate.line]: `${challenge.focus} is ${value}` }
        if (inside === gate.answer) {
          audio.sfx('right')
          burst(s.particles, birdX, s.y, confetti, 12)
          s.message = `✓ ${challenge.focus} = ${value}`
          s.good = true
        } else {
          s.hearts -= 1
          audio.sfx('wrong')
          s.message = `✗ After that line ${challenge.focus} = ${value}`
          s.good = false
        }
        s.messageT = 1.8
        s.gate += 1
        onTrace?.(challenge.gates[s.gate]?.line ?? null, s.notes)
        if (s.hearts <= 0) { s.done = true; window.setTimeout(() => onFinish(false, 0), 900) }
        else if (s.gate >= challenge.gates.length) { s.done = true; audio.sfx('catch'); burst(s.particles, w / 2, h / 2, confetti, 40, 320); window.setTimeout(() => onFinish(true, s.hearts / challenge.hearts), 1000) }
      }
    },
    draw: (ctx: Ctx, w: number, h: number) => {
      const s = state.current
      scenery(ctx, w, h, s.t + s.scroll / 40, accent)
      const birdX = Math.min(170, w * 0.24)
      challenge.gates.forEach((gate, i) => {
        const gx = gateX(i) - s.scroll
        if (gx < -WALL - 40 || gx > w + 40) return
        const ys = holes(h, gate.options.length)
        const passed = i < s.gate
        const color = passed ? '#9a8fb0' : accent
        const size = hole(h, ys.length)
        let y = 0
        for (const hy of [...ys, h + size / 2 + 60]) {
          const top = hy - size / 2
          if (top > y) {
            roundRect(ctx, gx, y - 8, WALL, top - y + 8, 8, color)
            ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.fillRect(gx + 6, y, 6, top - y - 6)
            roundRect(ctx, gx - 6, top - 16, WALL + 12, 16, 6, color)
          }
          y = hy + size / 2
          if (hy < h) roundRect(ctx, gx - 6, y, WALL + 12, 16, 6, color)
        }
        ys.forEach((hy, k) => {
          if (passed) return
          tag(ctx, gate.options[k], gx + WALL / 2, hy, 17)
        })
        text(ctx, `line ${gate.line + 1}`, gx + WALL / 2, 26, 12, '#ffffff')
      })
      // The pyxie, tilted by its speed.
      ctx.save()
      ctx.translate(birdX, s.y)
      ctx.rotate(Math.max(-0.5, Math.min(0.9, s.vy / 600)))
      if (hero) ctx.drawImage(hero, -22, -24, 44, 44)
      else roundRect(ctx, -14, -14, 28, 28, 8, accent)
      ctx.restore()
      drawParticles(ctx, s.particles)
      hearts(ctx, 22, 22, s.hearts, challenge.hearts)
      text(ctx, `GATE ${Math.min(s.gate + 1, challenge.gates.length)}/${challenge.gates.length}`, w - 70, 22, 15, INK)
      if (s.messageT > 0) tag(ctx, s.message, w / 2, 50, 16, s.good ? '#c9f7d2' : '#ffd0d8')
      if (started.current && s.gate === 0 && s.scroll < 120) text(ctx, 'TAP or SPACE to flap', w / 2, h - 60, 15, '#ffffff')
    },
  })
  useCanvasLoop(canvas, loop)
  return <canvas ref={canvas} className="mini__canvas" aria-label="Trace Flight: tap to flap through the right value" />
}
