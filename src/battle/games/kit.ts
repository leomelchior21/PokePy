// Shared pieces for the canvas mini-games: a game loop sized to its box, drawing helpers in the
// game's pixel style (ink outlines, cream labels, concept colors) and a tiny particle system.
import { useEffect, useRef } from 'react'

export type Ctx = CanvasRenderingContext2D

export interface Loop {
  update: (dt: number, w: number, h: number) => void
  draw: (ctx: Ctx, w: number, h: number) => void
  /** The stage size the game was designed for. Bigger stages (an iPad) zoom the whole game in. */
  fit?: { w: number; h: number }
}

/** Runs a game on a canvas that fills its parent, in CSS pixels, at the screen's real resolution. */
export function useCanvasLoop(ref: React.RefObject<HTMLCanvasElement | null>, loop: React.RefObject<Loop>, controls?: React.RefObject<{ scale: number }>) {
  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(40, now - last) / 1000
      last = now
      const dpr = window.devicePixelRatio || 1
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
      const fit = loop.current.fit
      const k = fit ? Math.max(1, Math.min(1.7, w / fit.w, h / fit.h)) : 1
      if (controls?.current) controls.current.scale = k
      loop.current.update(dt, w / k, h / k)
      ctx.setTransform(dpr * k, 0, 0, dpr * k, 0, 0)
      ctx.imageSmoothingEnabled = false
      loop.current.draw(ctx, w / k, h / k)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [ref, loop, controls])
}

/** A ref that always holds the latest value, for callbacks inside the loop. */
export function useLatest<T>(value: T) {
  const ref = useRef(value)
  useEffect(() => { ref.current = value })
  return ref
}

export const INK = '#1b1626'
export const CREAM = '#fff8e8'
export const MONO = '"IBM Plex Mono", ui-monospace, monospace'

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = INK, line = 3) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke() }
}

export function text(ctx: Ctx, value: string, x: number, y: number, size: number, color = INK, align: CanvasTextAlign = 'center', weight = 700) {
  ctx.font = `${weight} ${size}px ${MONO}`
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillStyle = color
  const lines = value.split('\n')
  lines.forEach((line, i) => ctx.fillText(line, x, y + (i - (lines.length - 1) / 2) * size * 1.15))
}

export function textWidth(ctx: Ctx, value: string, size: number): number {
  ctx.font = `700 ${size}px ${MONO}`
  return Math.max(...value.split('\n').map((line) => ctx.measureText(line).width))
}

/** A cream label with an ink outline, sized to its text: falling values, tower signs, gate tags. */
export function tag(ctx: Ctx, value: string, cx: number, cy: number, size: number, fill = CREAM, color = INK): { w: number; h: number } {
  const lines = value.split('\n').length
  const w = textWidth(ctx, value, size) + size * 1.3
  const h = size * (1.15 * lines + 0.9)
  ctx.fillStyle = 'rgba(27, 22, 38, 0.35)'
  ctx.beginPath(); ctx.roundRect(cx - w / 2 + 2, cy - h / 2 + 4, w, h, 9); ctx.fill()
  roundRect(ctx, cx - w / 2, cy - h / 2, w, h, 9, fill)
  text(ctx, value, cx, cy + 1, size, color)
  return { w, h }
}

/** How-to-play text on a dark pill, readable over any sky. */
export function hint(ctx: Ctx, value: string, cx: number, cy: number, size = 16) {
  const w = textWidth(ctx, value, size) + size * 1.6
  const h = size * 2
  ctx.fillStyle = 'rgba(27, 22, 38, 0.78)'
  ctx.beginPath(); ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2); ctx.fill()
  text(ctx, value, cx, cy + 1, size, '#ffffff')
}

/** Sky, hills and grass in the battle's colors. */
export function scenery(ctx: Ctx, w: number, h: number, t: number, accent: string, ground = true) {
  const sky = ctx.createLinearGradient(0, 0, 0, h)
  sky.addColorStop(0, '#6cc4ff')
  sky.addColorStop(0.65, '#c8ecff')
  sky.addColorStop(1, '#fff4d6')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  for (let i = 0; i < 4; i += 1) {
    const x = ((i * 260 + t * 12) % (w + 200)) - 100
    const y = 30 + i * 37 % 90
    ctx.beginPath(); ctx.ellipse(x, y, 46, 14, 0, 0, Math.PI * 2); ctx.ellipse(x + 26, y - 8, 26, 14, 0, 0, Math.PI * 2); ctx.fill()
  }
  if (!ground) return
  ctx.fillStyle = mixHex(accent, '#7cc86a', 0.75)
  ctx.beginPath()
  ctx.moveTo(0, h)
  for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h - 70 - Math.sin(x / 70) * 16 - Math.sin(x / 23) * 5)
  ctx.lineTo(w, h)
  ctx.fill()
  ctx.fillStyle = '#5aa646'
  ctx.fillRect(0, h - 34, w, 34)
  ctx.fillStyle = '#86cb5e'
  ctx.fillRect(0, h - 34, w, 5)
  ctx.fillStyle = '#3f8f3e'
  for (let x = 6; x < w; x += 19) ctx.fillRect(x, h - 26 + (x % 3) * 4, 2, 4)
}

export function hearts(ctx: Ctx, x: number, y: number, left: number, total: number) {
  for (let i = 0; i < total; i += 1) {
    const cx = x + i * 26
    ctx.fillStyle = INK
    ctx.beginPath(); ctx.arc(cx - 5, y, 7, 0, Math.PI * 2); ctx.arc(cx + 5, y, 7, 0, Math.PI * 2); ctx.moveTo(cx - 12, y + 1); ctx.lineTo(cx, y + 14); ctx.lineTo(cx + 12, y + 1); ctx.fill()
    ctx.fillStyle = i < left ? '#ff5f7e' : '#5a4a6a'
    ctx.beginPath(); ctx.arc(cx - 5, y, 5, 0, Math.PI * 2); ctx.arc(cx + 5, y, 5, 0, Math.PI * 2); ctx.moveTo(cx - 9.5, y + 1); ctx.lineTo(cx, y + 11); ctx.lineTo(cx + 9.5, y + 1); ctx.fill()
    if (i < left) { ctx.fillStyle = '#ffd0da'; ctx.fillRect(cx - 7, y - 3, 3, 3) }
  }
}

export function timerBar(ctx: Ctx, x: number, y: number, w: number, ratio: number) {
  roundRect(ctx, x, y, w, 12, 6, '#3b2470')
  const r = Math.max(0, Math.min(1, ratio))
  if (r > 0) roundRect(ctx, x + 2, y + 2, (w - 4) * r, 8, 4, r > 0.3 ? '#ffd23f' : '#ff5f7e', '')
}

export interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number; glyph?: string }

export function burst(list: Particle[], x: number, y: number, colors: string[], count = 14, speed = 220, glyph?: string) {
  for (let i = 0; i < count; i += 1) {
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.4
    const v = speed * (0.4 + Math.random() * 0.8)
    list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, life: 0, max: 0.6 + Math.random() * 0.5, color: colors[i % colors.length], size: 3 + Math.random() * 4, glyph })
  }
}

export function stepParticles(list: Particle[], dt: number): Particle[] {
  for (const p of list) { p.life += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 420 * dt; p.vx *= 0.98 }
  return list.filter((p) => p.life < p.max)
}

export function drawParticles(ctx: Ctx, list: Particle[]) {
  for (const p of list) {
    ctx.globalAlpha = Math.max(0, 1 - p.life / p.max)
    if (p.glyph) text(ctx, p.glyph, p.x, p.y, 14 + p.size * 2, p.color)
    else { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.size), Math.round(p.size)) }
  }
  ctx.globalAlpha = 1
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16)
  const pb = Number.parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return `#${[ch(16), ch(8), ch(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export const confetti = ['#ffd23f', '#a57bff', '#5fd17a', '#ff6fae', '#4fa3ff']
