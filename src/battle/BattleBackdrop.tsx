import { useEffect, useRef } from 'react'
import { hasCanvas } from '../engine/pixels'
import type { Area } from '../world/types'

type Ctx = CanvasRenderingContext2D

/** One canvas pixel is this many screen pixels. */
const SCALE = 4
const OUT = '#1b1626'

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function sky(ctx: Ctx, W: number, colors: string[], height: number) {
  const band = height / colors.length
  colors.forEach((color, i) => {
    px(ctx, color, 0, i * band, W, band + 1)
    if (i > 0) for (let x = 0; x < W; x += 2) px(ctx, colors[i - 1], x + (i % 2), i * band, 1, 1)
  })
}

function cloud(ctx: Ctx, x: number, y: number) {
  px(ctx, '#ffffff', x, y + 3, 22, 4); px(ctx, '#ffffff', x + 4, y, 10, 5); px(ctx, '#ffffff', x + 12, y + 1, 7, 4); px(ctx, '#d9ecff', x, y + 6, 22, 1)
}

/** A row of round tree crowns with dark rims. */
function trees(ctx: Ctx, W: number, y: number, size: number, dark: string, mid: string, light: string, seed: number) {
  const disc = (cx: number, cy: number, r: number, color: string) => {
    for (let dy = -r; dy <= r; dy += 1) { const half = Math.round(Math.sqrt(r * r - dy * dy)); px(ctx, color, cx - half, cy + dy, half * 2 + 1, 1) }
  }
  px(ctx, dark, 0, y - size * 0.4, W, size * 0.4 + 2)
  for (let x = -size; x < W + size; x += size * 0.75) {
    const r = Math.round((size / 2) * (0.85 + hash(x + seed) * 0.35))
    const cx = Math.round(x + hash(x * 3 + seed) * 3)
    const cy = Math.round(y - r)
    disc(cx, cy, r + 1, OUT)
    disc(cx, cy, r, dark)
    disc(cx - 1, cy - 1, r - 2, mid)
    disc(cx - Math.round(r / 3), cy - Math.round(r / 3), Math.max(1, Math.round(r / 3)), light)
  }
  px(ctx, dark, 0, y, W, 2)
}

function hills(ctx: Ctx, W: number, H: number, base: number, amp: number, color: string, light: string, seed: number) {
  for (let x = 0; x < W; x += 1) {
    const h = base - amp * (0.5 + 0.5 * Math.sin(x / 19 + seed) * Math.cos(x / 37 + seed * 2))
    px(ctx, color, x, h, 1, H - h)
    px(ctx, light, x, h, 1, 1)
  }
}

function ground(ctx: Ctx, W: number, H: number, y: number, base: string, dot: string, tuft?: string) {
  px(ctx, base, 0, y, W, H - y)
  const n = Math.floor((W * (H - y)) / 40)
  for (let i = 0; i < n; i += 1) px(ctx, dot, hash(i) * W, y + hash(i + 99) * (H - y), 1 + (i % 3 === 0 ? 1 : 0), 1)
  if (tuft) for (let i = 0; i < n / 8; i += 1) { const x = hash(i + 7) * W; const yy = y + 4 + hash(i + 13) * (H - y - 4); px(ctx, tuft, x, yy, 1, 2); px(ctx, tuft, x + 2, yy, 1, 2); px(ctx, tuft, x + 1, yy - 1, 1, 3) }
}

function paint(ctx: Ctx, area: Area, W: number, H: number) {
  ctx.clearRect(0, 0, W, H)
  const horizon = Math.round(H * 0.46)
  switch (area) {
    case 'beach':
      sky(ctx, W, ['#7cc8ff', '#9bd6ff', '#bfe5ff', '#dff2ff'], horizon - 12)
      cloud(ctx, W * 0.1, horizon * 0.2); cloud(ctx, W * 0.65, horizon * 0.35)
      px(ctx, '#3f8fdc', 0, horizon - 12, W, 18)
      for (let x = 0; x < W; x += 9) px(ctx, '#a7dcff', x + (x % 18 ? 0 : 4), horizon - 8 + (x % 3) * 4, 5, 1)
      px(ctx, '#e6f6ff', 0, horizon + 5, W, 2)
      ground(ctx, W, H, horizon + 7, '#f3df9e', '#d9bf74')
      break
    case 'forest':
      sky(ctx, W, ['#5aa86a', '#6fbd78', '#86cf87'], horizon)
      trees(ctx, W, horizon - 10, 16, '#1d4c2c', '#2a6b3c', '#4c9a58', 3)
      trees(ctx, W, horizon + 2, 20, '#174024', '#2e7d45', '#5aaa5e', 9)
      ground(ctx, W, H, horizon + 4, '#5fae4f', '#3f8f3a', '#2f7a34')
      break
    case 'cave':
      px(ctx, '#1a1220', 0, 0, W, H)
      for (let x = 0; x < W; x += 12) { const h = 8 + hash(x) * horizon * 0.5; px(ctx, '#2b1f2a', x, 0, 8, h); px(ctx, '#3b2b38', x + 2, 0, 3, h - 3) }
      for (let i = 0; i < 12; i += 1) { const x = hash(i + 3) * W; const y = horizon * 0.4 + hash(i + 7) * horizon * 0.5; px(ctx, '#7fe3ff', x, y, 2, 4); px(ctx, '#d8f7ff', x, y, 1, 1) }
      ground(ctx, W, H, horizon, '#3a2c26', '#2a1f1a')
      break
    case 'lab':
      px(ctx, '#dfe8f4', 0, 0, W, horizon)
      for (let x = 0; x < W; x += 8) px(ctx, '#d2ddec', x, 0, 4, horizon - 6)
      for (let x = 10; x < W - 30; x += 50) { px(ctx, OUT, x, horizon * 0.25, 34, 22); px(ctx, '#0e1a2a', x + 2, horizon * 0.25 + 2, 30, 18); px(ctx, '#5fd17a', x + 5, horizon * 0.25 + 5, 16, 2); px(ctx, '#72dcff', x + 5, horizon * 0.25 + 10, 22, 2); px(ctx, '#ffd23f', x + 5, horizon * 0.25 + 15, 10, 2) }
      px(ctx, '#9aa8bc', 0, horizon - 6, W, 6)
      for (let y = horizon; y < H; y += 10) for (let x = ((y - horizon) / 10) % 2 ? 0 : 10; x < W; x += 20) px(ctx, '#c9d6e6', x, y, 10, 10)
      break
    case 'mountain':
      sky(ctx, W, ['#9f8fe8', '#b8a8f2', '#d4c8ff', '#efe6ff'], horizon)
      cloud(ctx, W * 0.55, horizon * 0.2)
      for (const [fx, fh] of [[0.05, 0.75], [0.35, 0.95], [0.7, 0.8]] as Array<[number, number]>) {
        const peak = horizon - horizon * fh * 0.7
        for (let y = peak; y < horizon; y += 1) {
          const half = (y - peak) * 0.9
          px(ctx, '#7a6e80', W * fx + 30 - half, y, half * 2, 1)
          px(ctx, '#968a9c', W * fx + 30 - half, y, half * 0.6, 1)
        }
        px(ctx, '#ffffff', W * fx + 26, peak, 8, 3)
      }
      ground(ctx, W, H, horizon, '#a0877a', '#7c675b')
      break
    case 'academy':
      px(ctx, '#5a26a0', 0, 0, W, horizon)
      for (let x = 0; x < W; x += 16) px(ctx, '#6a2fb8', x, 0, 8, horizon)
      for (let x = 12; x < W - 20; x += 60) { px(ctx, OUT, x, horizon * 0.15, 20, horizon * 0.6); px(ctx, '#ffd23f', x + 2, horizon * 0.15 + 2, 16, horizon * 0.6 - 4); px(ctx, '#6a2fb8', x + 2, horizon * 0.35, 16, 5) }
      px(ctx, '#ffd23f', 0, horizon - 5, W, 5)
      for (let y = horizon; y < H; y += 10) for (let x = 0; x < W; x += 10) px(ctx, ((x + y) / 10) % 2 ? '#ffe680' : '#f6d24a', x, y, 10, 10)
      break
    default: {
      const town = area === 'town' || area === 'house'
      sky(ctx, W, ['#78c4ff', '#94d2ff', '#b4e1ff', '#d4efff'], horizon)
      cloud(ctx, W * 0.08, horizon * 0.15); cloud(ctx, W * 0.6, horizon * 0.3)
      hills(ctx, W, H, horizon - 6, horizon * 0.18, '#7cc86a', '#a8e08a', 1)
      trees(ctx, W, horizon + 2, 14, '#1d5c34', '#2e8546', '#6cc06a', 5)
      ground(ctx, W, H, horizon + 3, town ? '#d8cdb6' : '#94d470', town ? '#b8a88a' : '#7cc25a', town ? undefined : '#5aa646')
    }
  }
}

/** The battle scenery, painted in big pixels at the stage's own shape. */
export function BattleBackdrop({ area }: { area: Area }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !hasCanvas()) return
    const draw = () => {
      const w = Math.max(60, Math.round(canvas.clientWidth / SCALE))
      const h = Math.max(40, Math.round(canvas.clientHeight / SCALE))
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }
      const ctx = canvas.getContext('2d')
      if (ctx) paint(ctx, area, w, h)
    }
    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [area])
  return <canvas ref={ref} className="battle__backdrop" aria-hidden="true" />
}
