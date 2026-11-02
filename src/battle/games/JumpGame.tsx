import { useRef } from 'react'
import { audio } from '../../engine/audio'
import type { JumpChallenge } from '../minigames'
import { burst, confetti, drawParticles, hearts, hint, INK, roundRect, stepParticles, tag, text, textWidth, timerBar, useCanvasLoop, type Ctx, type Loop, type Particle } from './kit'
import type { GameProps } from './types'

const GRAVITY = 1150
const ROW = 104

interface Pad { row: number; x: number; w: number; expr: string; value: boolean; state: 'idle' | 'true' | 'broken'; fall: number }

/** True Jump: bounce up through rows of conditions. True ones hold you, False ones crumble. */
export function JumpGame({ challenge, accent, hero, started, onFinish, controls }: GameProps<JumpChallenge>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({
    pads: [] as Pad[], x: 0, y: 0, vx: 0, vy: 0, cam: 0, best: 0, strikes: 0, time: challenge.seconds, t: 0, done: false, w: 0,
    particles: [] as Particle[], message: '', messageT: 0, good: true, target: -1,
  })
  const bounce = Math.sqrt(2 * GRAVITY * ROW * 1.3)
  const layout = (ctx: Ctx | null, w: number) => {
    const s = state.current
    s.w = w
    s.pads = []
    challenge.rows.forEach((row, r) => {
      row.forEach((p, side) => {
        const pw = Math.min(w * 0.42, (ctx ? textWidth(ctx, p.expr, 16) : p.expr.length * 10) + 40)
        const cx = side === 0 ? w * 0.27 : w * 0.73
        s.pads.push({ row: r + 1, x: cx - pw / 2 + (((r * 37) % 30) - 15), w: pw, expr: p.expr, value: p.value, state: 'idle', fall: 0 })
      })
    })
    s.x = w / 2
    s.y = 0
  }
  const loop = useRef<Loop>({
    fit: { w: 460, h: 520 },
    update: (dt, w, h) => {
      const s = state.current
      s.t += dt
      if (s.w !== w) layout(canvas.current?.getContext('2d') ?? null, w)
      s.particles = stepParticles(s.particles, dt)
      s.messageT = Math.max(0, s.messageT - dt)
      for (const pad of s.pads) if (pad.state === 'broken') pad.fall += dt
      if (!started.current || s.done) return
      s.time -= dt
      const c = controls.current
      if (c.pointerX !== null) s.target = c.pointerX
      let ax = 0
      if (c.left) ax = -1
      if (c.right) ax = 1
      if (ax) { s.vx = ax * 260; s.target = -1 } else if (s.target >= 0) s.vx = Math.max(-300, Math.min(300, (s.target - s.x) * 6)); else s.vx *= 0.85
      s.x = Math.max(20, Math.min(w - 20, s.x + s.vx * dt))
      // y is the height of the pyxie's feet above the floor; vy is positive going up.
      const before = s.y
      s.vy -= GRAVITY * dt
      s.y += s.vy * dt
      if (s.y <= 0) { s.y = 0; s.vy = bounce * 0.92 }
      // Landing: when moving down, test every pad between the old and new height.
      if (s.y < before) {
        for (const pad of s.pads) {
          const py = pad.row * ROW
          if (pad.state === 'broken' || before < py || s.y > py) continue
          if (s.x < pad.x - 8 || s.x > pad.x + pad.w + 8) continue
          if (pad.value) {
            s.y = py
            s.vy = bounce
            audio.sfx('jump')
            if (pad.state !== 'true') { pad.state = 'true'; burst(s.particles, s.x, h - (py - s.cam) - 60, ['#5fd17a', '#c9f7d2', '#ffffff'], 10) }
            if (pad.row > s.best) s.best = pad.row
            if (pad.row === challenge.rows.length) {
              s.done = true
              audio.sfx('catch')
              burst(s.particles, w / 2, h / 2, confetti, 40, 320)
              s.message = 'TOP! Every step was True.'
              s.messageT = 2
              window.setTimeout(() => onFinish(true, Math.max(0.4, 1 - s.strikes * 0.25)), 1000)
            }
          } else {
            pad.state = 'broken'
            s.strikes += 1
            audio.sfx('break')
            s.message = `✗ ${pad.expr} is False`
            s.messageT = 1.6
            s.good = false
            if (s.strikes >= challenge.strikes) { s.done = true; window.setTimeout(() => onFinish(false, 0), 900) }
          }
          break
        }
      }
      // Camera follows the climb.
      const want = Math.max(0, s.y - h * 0.4)
      s.cam += (want - s.cam) * Math.min(1, dt * 5)
      if (s.time <= 0 && !s.done) { s.done = true; s.message = 'Time!'; s.messageT = 2; window.setTimeout(() => onFinish(false, 0), 800) }
    },
    draw: (ctx: Ctx, w: number, h: number) => {
      const s = state.current
      const sky = ctx.createLinearGradient(0, 0, 0, h)
      const k = Math.min(1, s.cam / (challenge.rows.length * ROW))
      sky.addColorStop(0, k > 0.6 ? '#3b2470' : '#6cc4ff')
      sky.addColorStop(1, k > 0.6 ? '#a57bff' : '#d6f1ff')
      ctx.fillStyle = sky
      ctx.fillRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      for (let i = 0; i < 14; i += 1) { const y = ((i * 97 + s.cam * 0.3) % (h + 40)) - 20; ctx.fillRect((i * 173) % w, y, 3, 3) }
      const screenY = (height: number) => h - 60 - (height - s.cam)
      // Floor.
      const fy = screenY(0)
      if (fy < h + 40) { roundRect(ctx, -10, fy, w + 20, 80, 0, '#5aa646', INK, 3); text(ctx, 'START', w / 2, fy + 22, 16, '#ffffff') }
      for (const pad of s.pads) {
        const y = screenY(pad.row * ROW) + pad.fall * pad.fall * 400
        if (y < -40 || y > h + 60) continue
        const fill = pad.state === 'true' ? '#8ee6a0' : pad.state === 'broken' ? '#ff9fb0' : '#fff8e8'
        ctx.globalAlpha = pad.state === 'broken' ? Math.max(0, 1 - pad.fall * 1.5) : 1
        ctx.fillStyle = 'rgba(27,22,38,0.3)'; ctx.beginPath(); ctx.roundRect(pad.x + 3, y + 5, pad.w, 30, 10); ctx.fill()
        roundRect(ctx, pad.x, y, pad.w, 30, 10, fill)
        ctx.fillStyle = pad.state === 'idle' ? accent : 'transparent'; ctx.fillRect(pad.x + 6, y + 24, pad.w - 12, 3)
        text(ctx, pad.expr, pad.x + pad.w / 2, y + 14, 16)
        if (pad.state !== 'idle') text(ctx, pad.state === 'true' ? 'True' : 'False', pad.x + pad.w / 2, y - 13, 16, pad.state === 'true' ? '#1e6a34' : '#a1253d')
        ctx.globalAlpha = 1
      }
      const py = screenY(s.y)
      const squash = s.vy > bounce * 0.8 ? 0.85 : 1
      ctx.fillStyle = 'rgba(27,22,38,0.25)'; ctx.beginPath(); ctx.ellipse(s.x, py + 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill()
      if (hero) ctx.drawImage(hero, s.x - 22, py - 44 * squash, 44, 44 * squash)
      else roundRect(ctx, s.x - 14, py - 28, 28, 28, 8, accent)
      drawParticles(ctx, s.particles)
      hearts(ctx, 22, 22, challenge.strikes - s.strikes, challenge.strikes)
      timerBar(ctx, 100, 16, Math.min(220, w - 240), s.time / challenge.seconds)
      text(ctx, `${s.best}/${challenge.rows.length}`, w - 40, 22, 16, INK)
      if (s.messageT > 0) tag(ctx, s.message, w / 2, 56, 16, s.good ? '#c9f7d2' : '#ffd0d8')
      if (started.current && s.best === 0 && !s.done) hint(ctx, '← → or drag to steer', w / 2, h - 22, 15)
    },
  })
  useCanvasLoop(canvas, loop, controls)
  return <canvas ref={canvas} className="mini__canvas" aria-label="True Jump: land only on True platforms" />
}
