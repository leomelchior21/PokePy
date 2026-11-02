import { useRef } from 'react'
import { audio } from '../../engine/audio'
import type { CatchChallenge } from '../minigames'
import { burst, confetti, drawParticles, hearts, hint, INK, roundRect, scenery, stepParticles, tag, text, timerBar, useCanvasLoop, type Ctx, type Loop, type Particle } from './kit'
import type { GameProps } from './types'

interface Drop { id: number; x: number; y: number; vy: number; value: string; right: boolean; wobble: number }

/** Output Catcher: values fall from the sky. Catch the one the code prints, three times. */
export function CatchGame({ challenge, accent, started, onFinish, controls }: GameProps<CatchChallenge>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({
    basket: 0, target: -1, drops: [] as Drop[], spawn: 0.4, caught: 0, misses: 0, time: challenge.seconds, t: 0,
    particles: [] as Particle[], flash: 0, shake: 0, done: false, id: 0, popup: null as null | { text: string; x: number; y: number; t: number; good: boolean },
  })
  const right = challenge.options[challenge.answer]
  const loop = useRef<Loop>({
    fit: { w: 560, h: 420 },
    update: (dt, w, h) => {
      const s = state.current
      s.t += dt
      if (s.basket === 0) s.basket = w / 2
      s.particles = stepParticles(s.particles, dt)
      s.flash = Math.max(0, s.flash - dt)
      s.shake = Math.max(0, s.shake - dt)
      if (s.popup) { s.popup.t += dt; s.popup.y -= 30 * dt; if (s.popup.t > 1.1) s.popup = null }
      if (!started.current || s.done) return
      const keys = controls.current
      if (keys.left) s.target = Math.max(40, (s.target < 0 ? s.basket : s.target) - 480 * dt)
      if (keys.right) s.target = Math.min(w - 40, (s.target < 0 ? s.basket : s.target) + 480 * dt)
      if (keys.pointerX !== null) s.target = keys.pointerX
      if (s.target >= 0) s.basket += (s.target - s.basket) * Math.min(1, dt * 14)
      s.time -= dt
      s.spawn -= dt
      if (s.spawn <= 0) {
        const level = s.caught * 0.12
        s.spawn = Math.max(0.55, 0.95 - level)
        const isRight = Math.random() < 0.38 || !s.drops.some((d) => d.right) && Math.random() < 0.6
        const wrong = challenge.options.filter((_, i) => i !== challenge.answer)
        s.drops.push({ id: s.id++, x: 50 + Math.random() * (w - 100), y: -24, vy: 70 + Math.random() * 40 + level * 60, value: isRight ? right : wrong[Math.floor(Math.random() * wrong.length)], right: isRight, wobble: Math.random() * 6 })
      }
      const top = h - 74
      for (const drop of s.drops) {
        drop.y += drop.vy * dt
        if (drop.y > top - 6 && drop.y < top + 22 && Math.abs(drop.x - s.basket) < 62) {
          drop.y = 9999
          if (drop.right) {
            s.caught += 1
            audio.sfx('right')
            burst(s.particles, s.basket, top, confetti, 16)
            s.popup = { text: `✓ ${right}`, x: s.basket, y: top - 40, t: 0, good: true }
          } else {
            s.misses += 1
            s.flash = 0.35
            s.shake = 0.35
            audio.sfx('wrong')
            s.popup = { text: `✗ not ${drop.value}`, x: s.basket, y: top - 40, t: 0, good: false }
          }
        }
      }
      s.drops = s.drops.filter((d) => d.y < h + 30)
      if (s.caught >= challenge.need) { s.done = true; audio.sfx('catch'); burst(s.particles, w / 2, h / 2, confetti, 40, 320); window.setTimeout(() => onFinish(true, Math.max(0.4, 1 - s.misses * 0.25)), 900) }
      else if (s.misses >= 3 || s.time <= 0) { s.done = true; window.setTimeout(() => onFinish(false, 0), 700) }
    },
    draw: (ctx: Ctx, w: number, h: number) => {
      const s = state.current
      ctx.save()
      if (s.shake > 0) ctx.translate(Math.sin(s.t * 70) * 5 * s.shake, 0)
      scenery(ctx, w, h, s.t, accent)
      for (const drop of s.drops) {
        const sway = Math.sin(s.t * 3 + drop.wobble) * 4
        ctx.save()
        ctx.translate(drop.x + sway, drop.y)
        ctx.strokeStyle = 'rgba(27,22,38,0.5)'; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(-10, -26); ctx.lineTo(0, -14); ctx.lineTo(10, -26); ctx.stroke()
        ctx.fillStyle = '#ff9fd0'; ctx.beginPath(); ctx.ellipse(0, -34, 16, 12, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = INK; ctx.stroke()
        tag(ctx, drop.value, 0, 0, 17)
        ctx.restore()
      }
      // The basket: a woven crate with the concept color.
      const top = h - 74
      const bx = s.basket
      ctx.fillStyle = 'rgba(27,22,38,0.25)'; ctx.beginPath(); ctx.ellipse(bx, h - 30, 60, 8, 0, 0, Math.PI * 2); ctx.fill()
      roundRect(ctx, bx - 58, top, 116, 40, 8, '#c98a4a')
      for (let i = 0; i < 5; i += 1) { ctx.fillStyle = i % 2 ? '#a8743a' : '#e2ad6e'; ctx.fillRect(bx - 54 + i * 22, top + 4, 20, 32) }
      roundRect(ctx, bx - 62, top - 6, 124, 12, 6, accent)
      ctx.strokeStyle = INK
      drawParticles(ctx, s.particles)
      if (s.popup) { ctx.globalAlpha = Math.max(0, 1 - s.popup.t); tag(ctx, s.popup.text, s.popup.x, s.popup.y, 16, s.popup.good ? '#c9f7d2' : '#ffd0d8'); ctx.globalAlpha = 1 }
      ctx.restore()
      if (s.flash > 0) { ctx.fillStyle = `rgba(255, 60, 90, ${s.flash * 0.5})`; ctx.fillRect(0, 0, w, h) }
      hearts(ctx, 22, 22, 3 - s.misses, 3)
      timerBar(ctx, 100, 16, Math.min(260, w - 260), s.time / challenge.seconds)
      for (let i = 0; i < challenge.need; i += 1) text(ctx, i < s.caught ? '★' : '☆', w - 30 - i * 28, 22, 24, i < s.caught ? '#ffd23f' : '#ffffff')
      hint(ctx, `CATCH: ${challenge.focus ? `the value of ${challenge.focus}` : 'what it prints'}`, w / 2, h - 17, 15)
    },
  })
  useCanvasLoop(canvas, loop, controls)
  return <canvas ref={canvas} className="mini__canvas" aria-label="Output Catcher: move the basket under the right value" />
}
