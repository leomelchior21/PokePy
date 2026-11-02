import { useRef } from 'react'
import { audio } from '../../engine/audio'
import type { SlingChallenge } from '../minigames'
import { burst, confetti, drawParticles, hint, INK, roundRect, scenery, stepParticles, tag, text, textWidth, useCanvasLoop, type Ctx, type Loop, type Particle } from './kit'
import type { GameProps } from './types'

interface Block { x: number; y: number; w: number; h: number; vx: number; vy: number; rot: number; spin: number }
interface Tower { x: number; base: number; blocks: Block[]; value: string; right: boolean; state: 'stand' | 'boom' | 'wrong'; shake: number; signY: number; signW: number; signH: number }

const GRAVITY = 760

/** Print Slingshot: drag back, let go, and knock down the tower that shows the real output. */
export function SlingGame({ challenge, accent, hero, started, onFinish, controls }: GameProps<SlingChallenge>) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const state = useRef({
    towers: [] as Tower[], w: 0, h: 0, shot: { x: 0, y: 0, vx: 0, vy: 0, flying: false, rest: 0 }, dragging: false, shots: challenge.shots,
    particles: [] as Particle[], t: 0, done: false, laid: false, lastDown: false, trail: [] as Array<{ x: number; y: number }>, message: '' as string, messageT: 0,
  })
  const anchor = (h: number) => ({ x: 96, y: h - 120 })
  const build = (w: number, h: number) => {
    const s = state.current
    s.w = w
    s.h = h
    const n = challenge.options.length
    const left = Math.max(170, w * 0.3)
    const span = w - left - 16
    s.towers = challenge.options.map((value, i) => {
      const x = left + (span * (i + 0.5)) / n
      // Alternate short and tall towers so neighboring signs never overlap.
      const floors = i % 2 === 0 ? 1 : 3
      const base = h - 34
      const blocks: Block[] = []
      for (let f = 0; f < floors; f += 1) {
        blocks.push({ x: x - 26, y: base - (f + 1) * 26, w: 52, h: 26, vx: 0, vy: 0, rot: 0, spin: 0 })
      }
      return { x, base, blocks, value, right: i === challenge.answer, state: 'stand', shake: 0, signY: base - floors * 26 - 34, signW: 0, signH: 0 }
    })
    const a = anchor(h)
    s.shot = { x: a.x, y: a.y, vx: 0, vy: 0, flying: false, rest: 0 }
    s.laid = false
  }
  const signSize = (w: number) => Math.min(20, Math.max(15, (w - Math.max(170, w * 0.3)) / challenge.options.length / 8))
  /** Lifts each sign until it clears every other sign and every other tower, so nothing overlaps. */
  const layout = (ctx: Ctx, w: number) => {
    const s = state.current
    const size = signSize(w)
    const placed: Array<{ l: number; r: number; t: number; b: number }> = []
    const half = (tower: Tower) => (textWidth(ctx, tower.value, size) + size * 1.3) / 2 + 6
    for (const tower of [...s.towers].sort((a, b) => half(b) - half(a))) {
      const hw = half(tower)
      const h = size * 2.1
      const others = s.towers.filter((other) => other !== tower).map((other) => ({ l: other.x - 30, r: other.x + 30, t: other.base - other.blocks.length * 26 - 8, b: other.base }))
      const hits = (y: number) => [...placed, ...others].some((box) => tower.x - hw < box.r && tower.x + hw > box.l && y - h / 2 < box.b && y + h / 2 > box.t)
      let y = tower.base - tower.blocks.length * 26 - 34
      while (hits(y) && y > h + 60) y -= 6
      tower.signY = y
      placed.push({ l: tower.x - hw, r: tower.x + hw, t: y - h / 2, b: y + h / 2 })
    }
    s.laid = true
  }
  const loop = useRef<Loop>({
    fit: { w: 600, h: 420 },
    update: (dt, w, h) => {
      const s = state.current
      s.t += dt
      if (s.w !== w || s.h !== h) build(w, h)
      s.particles = stepParticles(s.particles, dt)
      s.messageT = Math.max(0, s.messageT - dt)
      for (const tower of s.towers) {
        tower.shake = Math.max(0, tower.shake - dt)
        if (tower.state === 'boom') for (const b of tower.blocks) { b.x += b.vx * dt; b.y += b.vy * dt; b.vy += GRAVITY * dt; b.rot += b.spin * dt }
      }
      if (!started.current || s.done) return
      const a = anchor(h)
      const c = controls.current
      const shot = s.shot
      if (!shot.flying && s.shots > 0) {
        if (c.down && !s.lastDown && c.pointerX !== null && c.pointerY !== null && Math.hypot(c.pointerX - shot.x, c.pointerY - shot.y) < 70) s.dragging = true
        if (s.dragging && c.down && c.pointerX !== null && c.pointerY !== null) {
          let dx = c.pointerX - a.x
          let dy = c.pointerY - a.y
          const d = Math.hypot(dx, dy)
          if (d > 92) { dx = (dx / d) * 92; dy = (dy / d) * 92 }
          shot.x = a.x + dx
          shot.y = a.y + dy
        }
        if (s.dragging && !c.down) {
          s.dragging = false
          const dx = a.x - shot.x
          const dy = a.y - shot.y
          if (Math.hypot(dx, dy) > 18) {
            shot.vx = dx * 7.6
            shot.vy = dy * 7.6
            shot.flying = true
            s.trail = []
            audio.sfx('throw')
          } else { shot.x = a.x; shot.y = a.y }
        }
      }
      s.lastDown = c.down
      if (shot.flying) {
        shot.vy += GRAVITY * dt
        shot.x += shot.vx * dt
        shot.y += shot.vy * dt
        if (Math.floor(s.t * 30) % 2 === 0) s.trail.push({ x: shot.x, y: shot.y })
        for (const tower of s.towers) {
          if (tower.state !== 'stand') continue
          const top = tower.signY - tower.signH / 2
          const hw = Math.max(30, tower.signW / 2)
          if (shot.x > tower.x - hw - 12 && shot.x < tower.x + hw + 12 && shot.y > top - 12 && shot.y < tower.base) {
            shot.flying = false
            s.done = true
            if (tower.right) {
              tower.state = 'boom'
              for (const b of tower.blocks) { b.vx = (Math.random() - 0.3) * 340; b.vy = -200 - Math.random() * 260; b.spin = (Math.random() - 0.5) * 9 }
              burst(s.particles, tower.x, tower.signY, confetti, 36, 340)
              audio.sfx('super')
              s.message = '✓ RIGHT OUTPUT!'
              s.messageT = 2
              window.setTimeout(() => onFinish(true, Math.max(0.5, s.shots / challenge.shots)), 1300)
            } else {
              tower.state = 'wrong'
              tower.shake = 0.6
              audio.sfx('wrong')
              s.message = `✗ It prints ${challenge.options[challenge.answer].replace(/\n/g, ' / ')}`
              s.messageT = 3
              window.setTimeout(() => onFinish(false, 0), 1800)
            }
            break
          }
        }
        if (shot.flying && (shot.y > h - 40 || shot.x > w + 40 || shot.x < -40)) {
          shot.flying = false
          s.shots -= 1
          audio.sfx('bump')
          s.message = s.shots > 0 ? `Missed! ${s.shots} shot${s.shots === 1 ? '' : 's'} left` : 'Out of shots!'
          s.messageT = 1.4
          if (s.shots <= 0) { s.done = true; window.setTimeout(() => onFinish(false, 0), 1200) }
          else { shot.x = a.x; shot.y = a.y; shot.vx = 0; shot.vy = 0 }
        }
      }
    },
    draw: (ctx: Ctx, w: number, h: number) => {
      const s = state.current
      scenery(ctx, w, h, s.t, accent)
      if (!s.laid) layout(ctx, w)
      const a = anchor(h)
      // Trajectory preview while aiming.
      if (s.dragging) {
        let x = s.shot.x
        let y = s.shot.y
        const vx = (a.x - s.shot.x) * 7.6
        let vy = (a.y - s.shot.y) * 7.6
        ctx.fillStyle = 'rgba(255,255,255,0.85)'
        for (let i = 0; i < 22; i += 1) {
          for (let k = 0; k < 3; k += 1) { vy += GRAVITY * 0.02; x += vx * 0.02; y += vy * 0.02 }
          ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, 4 - i * 0.12), 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      for (const p of s.trail) { ctx.beginPath(); ctx.arc(p.x, p.y, 2, 0, Math.PI * 2); ctx.fill() }
      for (const tower of s.towers) {
        const jx = tower.shake > 0 ? Math.sin(s.t * 60) * 4 : 0
        for (const b of tower.blocks) {
          ctx.save()
          ctx.translate(b.x + b.w / 2 + jx, b.y + b.h / 2)
          ctx.rotate(b.rot)
          roundRect(ctx, -b.w / 2, -b.h / 2, b.w, b.h, 4, tower.state === 'wrong' ? '#c98a8a' : '#c98a4a')
          ctx.fillStyle = '#e2ad6e'; ctx.fillRect(-b.w / 2 + 4, -b.h / 2 + 4, b.w - 8, 4)
          ctx.fillStyle = '#8a5a2a'; ctx.fillRect(-1, -b.h / 2 + 3, 2, b.h - 6)
          ctx.restore()
        }
        if (tower.state !== 'boom') {
          ctx.fillStyle = INK; ctx.fillRect(tower.x - 2 + jx, tower.signY, 4, tower.base - tower.blocks.length * 26 - tower.signY)
          const size = signSize(w)
          const box = tag(ctx, tower.value, tower.x + jx, tower.signY, size, tower.state === 'wrong' ? '#ffd0d8' : '#fff8e8')
          tower.signW = box.w
          tower.signH = box.h
          if (tower.state === 'wrong') text(ctx, '✗', tower.x + jx, tower.signY - box.h / 2 - 14, 22, '#e8483f')
        }
      }
      // The slingshot: a forked branch with a rubber band.
      ctx.lineWidth = 10; ctx.strokeStyle = INK; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(a.x, h - 34); ctx.lineTo(a.x, a.y + 26); ctx.moveTo(a.x, a.y + 26); ctx.lineTo(a.x - 18, a.y - 8); ctx.moveTo(a.x, a.y + 26); ctx.lineTo(a.x + 18, a.y - 8); ctx.stroke()
      ctx.lineWidth = 6; ctx.strokeStyle = '#8a5a2a'; ctx.stroke()
      const shot = s.shot
      if (!shot.flying && s.shots > 0 && !s.done) {
        ctx.lineWidth = 4; ctx.strokeStyle = '#5a2a3a'
        ctx.beginPath(); ctx.moveTo(a.x - 18, a.y - 8); ctx.lineTo(shot.x, shot.y); ctx.lineTo(a.x + 18, a.y - 8); ctx.stroke()
      }
      if (s.shots > 0 || shot.flying) {
        if (hero) ctx.drawImage(hero, Math.round(shot.x - 22), Math.round(shot.y - 26), 44, 44)
        else roundRect(ctx, shot.x - 12, shot.y - 12, 24, 24, 6, accent)
      }
      drawParticles(ctx, s.particles)
      for (let i = 0; i < challenge.shots; i += 1) roundRect(ctx, 18 + i * 22, 14, 16, 16, 4, i < s.shots ? accent : '#5a4a6a')
      if (!s.dragging && !shot.flying && !s.done && started.current && s.messageT <= 0) hint(ctx, 'Drag your pyxie back, then let go', w / 2, 40, 16)
      if (s.messageT > 0) tag(ctx, s.message, w / 2, 40, 17, s.message.startsWith('✓') ? '#c9f7d2' : s.message.startsWith('✗') ? '#ffd0d8' : '#fff8e8')
    },
  })
  useCanvasLoop(canvas, loop, controls)
  return <canvas ref={canvas} className="mini__canvas" aria-label="Print Slingshot: drag back and launch at the right tower" />
}
