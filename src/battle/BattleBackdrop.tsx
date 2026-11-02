import { useEffect, useRef } from 'react'
import { hasCanvas, makeCanvas, shade } from '../engine/pixels'
import { treeCanvas, TREE_SIZE } from '../engine/props'
import type { Area } from '../world/types'

// Battle scenery: a painted, layered landscape for every area (skies, ranges, tree lines, the sea,
// a crystal cave, a lab, the hackathon stage) plus the things that move in it. Painted in big
// pixels at the stage's own shape; the still layers are cached and the moving ones redrawn.

type Ctx = CanvasRenderingContext2D

/** One canvas pixel is this many screen pixels. */
const SCALE = 4
const INK = '#1b1626'
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)))
}

function hash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  for (let dy = -r; dy <= r; dy += 1) { const half = Math.round(Math.sqrt(r * r - dy * dy)); px(ctx, color, cx - half, cy + dy, half * 2 + 1, 1) }
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

/** A vertical gradient between color stops, dithered like an old handheld. */
function gradient(ctx: Ctx, W: number, y0: number, y1: number, colors: string[]) {
  const image = ctx.getImageData(0, y0, W, y1 - y0)
  const stops = colors.map(rgb)
  for (let y = 0; y < y1 - y0; y += 1) {
    const f = (y / Math.max(1, y1 - y0 - 1)) * (stops.length - 1)
    const i = Math.min(stops.length - 2, Math.floor(f))
    const k = f - i
    for (let x = 0; x < W; x += 1) {
      const c = k * 16 > BAYER[(y % 4) * 4 + (x % 4)] + 0.5 ? stops[i + 1] : stops[i]
      const o = (y * W + x) * 4
      image.data[o] = c[0]; image.data[o + 1] = c[1]; image.data[o + 2] = c[2]; image.data[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, y0)
}

function ridge(ctx: Ctx, W: number, base: number, amp: number, seed: number, body: string, rim: string, snow?: string) {
  for (let x = 0; x < W; x += 1) {
    const n = Math.abs(Math.sin(x / 23 + seed)) * 0.6 + Math.abs(Math.sin(x / 9 + seed * 3)) * 0.25 + Math.sin(x / 51 + seed) * 0.15
    const top = Math.round(base - amp * n)
    px(ctx, body, x, top, 1, base - top + 2)
    px(ctx, rim, x, top, 1, 1)
    if (snow && top < base - amp * 0.62) px(ctx, snow, x, top, 1, 2)
  }
}

/** A row of round tree crowns with dark rims. */
function treeLine(ctx: Ctx, W: number, y: number, size: number, dark: string, mid: string, light: string, seed: number) {
  px(ctx, dark, 0, y - size * 0.4, W, size * 0.4 + 2)
  for (let x = -size; x < W + size; x += size * 0.7) {
    const r = Math.round((size / 2) * (0.85 + hash(x + seed) * 0.35))
    const cx = Math.round(x + hash(x * 3 + seed) * 3)
    const cy = Math.round(y - r)
    disc(ctx, cx, cy, r + 1, INK)
    disc(ctx, cx, cy, r, dark)
    disc(ctx, cx - 1, cy - 1, r - 2, mid)
    disc(ctx, cx - Math.round(r / 3), cy - Math.round(r / 3), Math.max(1, Math.round(r / 3)), light)
  }
  px(ctx, dark, 0, y, W, 2)
}

/** Ground that recedes: bands get taller toward the viewer, like a mowed field. */
function field(ctx: Ctx, W: number, H: number, y0: number, a: string, b: string, dot: string, seed: number) {
  for (let y = y0; y < H; y += 1) {
    const k = (y - y0) / Math.max(1, H - y0)
    px(ctx, Math.floor(Math.sqrt(k) * 9) % 2 ? a : b, 0, y, W, 1)
  }
  const n = Math.floor((W * (H - y0)) / 30)
  for (let i = 0; i < n; i += 1) {
    const y = y0 + 2 + hash(i + seed) * (H - y0 - 2)
    const near = (y - y0) / (H - y0)
    px(ctx, dot, hash(i * 7 + seed) * W, y, 1, near > 0.5 ? 2 : 1)
  }
}

function cloud(ctx: Ctx, x: number, y: number, w: number, light = '#ffffff', dark = '#d9ecff') {
  const r = Math.max(3, Math.round(w / 6))
  disc(ctx, x + r, y + 1, r, light); disc(ctx, x + r * 3, y - Math.round(r / 2), r + 1, light); disc(ctx, x + r * 5, y + 1, r, light)
  px(ctx, light, x, y + 1, w, r)
  px(ctx, dark, x + 1, y + r, w - 2, 1)
}

function sideTrees(ctx: Ctx, W: number, y: number, kind: Parameters<typeof treeCanvas>[0], area: Area) {
  const left = treeCanvas(kind, area, 0)
  const right = treeCanvas(kind, area, 3)
  if (left) ctx.drawImage(left, -14, y - TREE_SIZE)
  if (right) ctx.drawImage(right, W - TREE_SIZE + 12, y - TREE_SIZE + 4)
}

/** The parts of the scene that never move. */
function paintBase(area: Area, W: number, H: number): HTMLCanvasElement {
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  const hz = Math.round(H * 0.47)
  switch (area) {
    case 'beach': {
      gradient(ctx, W, 0, hz, ['#4aa8f5', '#7cc8ff', '#b8e4ff', '#e6f6ff'])
      disc(ctx, Math.round(W * 0.8), Math.round(hz * 0.3), 9, '#fff6c8')
      px(ctx, '#3f8fdc', 0, hz, W, 20)
      px(ctx, '#2f74c4', 0, hz, W, 3)
      ridge(ctx, W, hz, 6, 4, '#7aa8c8', '#9cc4e0')
      px(ctx, '#e0c47e', 0, hz + 20, W, 4)
      field(ctx, W, H, hz + 24, '#f3df9e', '#efd894', '#d9bf74', 3)
      for (let i = 0; i < 6; i += 1) px(ctx, ['#ff9fb0', '#ffffff', '#ffd23f'][i % 3], hash(i + 40) * W, hz + 30 + hash(i + 41) * (H - hz - 34), 2, 1)
      sideTrees(ctx, W, hz + 26, 'palm', 'beach')
      break
    }
    case 'forest': {
      gradient(ctx, W, 0, hz, ['#0f2a1c', '#1d4c2c', '#3f7a3e', '#86b85a'])
      for (let i = 0; i < W / 9; i += 1) {
        const x = Math.round(hash(i + 3) * W)
        const w = 2 + Math.round(hash(i + 9) * 4)
        px(ctx, i % 2 ? '#1a3a24' : '#24482c', x, 0, w, hz + 6)
      }
      treeLine(ctx, W, hz + 2, 18, '#174024', '#2e7d45', '#5aaa5e', 9)
      field(ctx, W, H, hz + 4, '#4f9a48', '#55a24c', '#2f7a34', 5)
      // A canopy hangs over the top of the picture.
      for (let x = -8; x < W + 8; x += 7) { const r = 6 + Math.round(hash(x) * 6); disc(ctx, x, Math.round(hash(x + 1) * 4) - 2, r + 1, INK); disc(ctx, x, Math.round(hash(x + 1) * 4) - 2, r, '#1d4c2c'); disc(ctx, x - 2, Math.round(hash(x + 1) * 4) - 4, Math.round(r / 2), '#2e7d45') }
      sideTrees(ctx, W, hz + 14, 'dark', 'forest')
      for (let i = 0; i < W / 10; i += 1) { const x = hash(i + 70) * W; const y = hz + 8 + hash(i + 71) * (H - hz - 10); px(ctx, '#2f7a34', x, y, 1, 3); px(ctx, '#2f7a34', x - 1, y + 1, 1, 2); px(ctx, '#2f7a34', x + 1, y + 1, 1, 2) }
      break
    }
    case 'cave': {
      gradient(ctx, W, 0, H, ['#120c18', '#1e1424', '#2a1c26'])
      for (let i = 0; i < W / 5; i += 1) { const x = hash(i) * W; const y = hash(i + 50) * hz; px(ctx, '#2c1f2c', x, y, 3 + hash(i + 2) * 6, 1) }
      // Stalactites.
      for (let x = 0; x < W; x += 6 + Math.round(hash(x) * 6)) {
        const h = 6 + Math.round(hash(x + 5) * hz * 0.45)
        for (let k = 0; k < h; k += 1) { const half = Math.max(0, Math.round((1 - k / h) * 3)); px(ctx, '#3a2a38', x - half, k, half * 2 + 1, 1); px(ctx, '#4e3a4a', x - half, k, 1, 1) }
      }
      px(ctx, '#2a1f1a', 0, hz, W, H - hz)
      field(ctx, W, H, hz + 2, '#3a2c26', '#40312a', '#2a1f1a', 8)
      px(ctx, '#4e3d33', 0, hz, W, 2)
      for (const [x, color] of [[0.12, '#7fe3ff'], [0.88, '#c58aff'], [0.6, '#7fe3ff']] as Array<[number, string]>) {
        const cx = Math.round(W * x)
        const cy = hz + 6
        for (let k = 0; k < 4; k += 1) {
          const h = 6 + k * 3 - (k === 3 ? 6 : 0)
          const bx = cx - 4 + k * 3
          px(ctx, INK, bx - 1, cy - h - 1, 4, h + 2)
          px(ctx, color, bx, cy - h, 2, h)
          px(ctx, '#ffffff', bx, cy - h, 1, 2)
        }
      }
      for (let i = 0; i < 4; i += 1) { const x = hash(i + 90) * W; const y = hz + 14 + hash(i + 91) * (H - hz - 20); px(ctx, '#1f2a3a', x, y, 12, 2); px(ctx, '#3a5470', x + 2, y, 5, 1) }
      break
    }
    case 'lab': {
      px(ctx, '#e4ecf6', 0, 0, W, hz)
      for (let x = 0; x < W; x += 12) px(ctx, '#d4deec', x, 0, 1, hz)
      px(ctx, '#7b3fd6', 0, Math.round(hz * 0.62), W, 3)
      px(ctx, '#ffd23f', 0, Math.round(hz * 0.62) + 3, W, 1)
      for (let x = 8; x < W - 26; x += 44) {
        const y = Math.round(hz * 0.18)
        px(ctx, INK, x, y, 30, 20); px(ctx, '#0e1a2a', x + 2, y + 2, 26, 15); px(ctx, '#9aa6ba', x + 12, y + 20, 6, 3)
      }
      // Shelves of beakers.
      const sy = Math.round(hz * 0.72)
      px(ctx, '#8a6a52', 0, sy, W, 2)
      for (let x = 4; x < W; x += 9) { const color = ['#5fd17a', '#72dcff', '#ff8fb8', '#ffd23f'][Math.floor(hash(x) * 4)]; px(ctx, INK, x, sy - 6, 5, 6); px(ctx, '#f4f9ff', x + 1, sy - 5, 3, 5); px(ctx, color, x + 1, sy - 3, 3, 3) }
      px(ctx, '#94a3ba', 0, hz - 6, W, 6)
      px(ctx, '#f6f9ff', 0, hz - 6, W, 1)
      for (let y = hz; y < H; y += 1) {
        const k = (y - hz) / (H - hz)
        const band = Math.floor(Math.sqrt(k) * 8)
        px(ctx, band % 2 ? '#dfe7f2' : '#cfd9e8', 0, y, W, 1)
      }
      for (let x = -W; x < W * 2; x += 18) for (let y = hz; y < H; y += 1) { const k = (y - hz) / (H - hz); px(ctx, '#bccadc', W / 2 + (x - W / 2) * (0.4 + k * 1.2), y, 1, 1) }
      break
    }
    case 'mountain': {
      gradient(ctx, W, 0, hz, ['#8f7fe0', '#b4a4f0', '#d8ccff', '#f4ecff'])
      ridge(ctx, W, hz - 4, hz * 0.55, 2, '#9a8cb8', '#c4b8e0', '#ffffff')
      px(ctx, 'rgba(255,255,255,0.35)', 0, hz - 12, W, 6)
      ridge(ctx, W, hz + 2, hz * 0.3, 7, '#7a6c8a', '#968aa6', '#f4f0ff')
      field(ctx, W, H, hz + 2, '#a0877a', '#a88e80', '#7c675b', 6)
      for (let i = 0; i < W / 12; i += 1) { const x = hash(i + 33) * W; const y = hz + 8 + hash(i + 34) * (H - hz - 12); px(ctx, INK, x - 1, y - 1, 6, 4); px(ctx, '#cbb6a7', x, y, 4, 2); px(ctx, '#efe2d6', x, y, 2, 1) }
      sideTrees(ctx, W, hz + 16, 'pine', 'mountain')
      break
    }
    case 'academy': {
      gradient(ctx, W, 0, hz, ['#2a1450', '#4a1f8a', '#6a2fb8'])
      for (let x = 6; x < W; x += 34) {
        px(ctx, INK, x, 0, 10, hz); px(ctx, '#ffd23f', x + 1, 0, 8, hz); px(ctx, '#c99a2a', x + 7, 0, 2, hz); px(ctx, '#fff3a8', x + 2, 0, 1, hz)
      }
      for (let x = 22; x < W - 8; x += 34) {
        const color = (x / 34) % 2 < 1 ? '#ffffff' : '#ffd23f'
        px(ctx, INK, x - 1, 0, 10, Math.round(hz * 0.5) + 1); px(ctx, color, x, 0, 8, Math.round(hz * 0.5)); px(ctx, '#7b3fd6', x + 2, Math.round(hz * 0.18), 4, 4)
      }
      px(ctx, '#ffd23f', 0, hz - 4, W, 4); px(ctx, '#fff3a8', 0, hz - 4, W, 1)
      for (let y = hz; y < H; y += 1) {
        const k = (y - hz) / (H - hz)
        const band = Math.floor(Math.sqrt(k) * 8)
        for (let x = 0; x < W; x += 1) {
          const col = Math.floor((W / 2 + (x - W / 2) / (0.4 + k * 1.2)) / 14)
          px(ctx, (band + col) % 2 ? '#ffe680' : '#f6d24a', x, y, 1, 1)
        }
      }
      break
    }
    default: {
      const town = area === 'town' || area === 'house'
      gradient(ctx, W, 0, hz, ['#4aa8f5', '#78c4ff', '#a8dcff', '#d8f0ff'])
      disc(ctx, Math.round(W * 0.82), Math.round(hz * 0.26), 12, 'rgba(255, 246, 200, 0.4)')
      disc(ctx, Math.round(W * 0.82), Math.round(hz * 0.26), 8, '#fff6c8')
      ridge(ctx, W, hz - 2, hz * 0.32, 5, '#9cc4e8', '#c4dcf4', '#ffffff')
      ridge(ctx, W, hz + 2, hz * 0.14, 1, '#7cc86a', '#a8e08a')
      if (town) {
        for (let x = 4; x < W - 10; x += 22) {
          const y = hz - 4
          const roof = ['#e8483f', '#3d7be0', '#7b3fd6'][Math.floor(hash(x) * 3)]
          px(ctx, INK, x - 1, y - 1, 14, 9); px(ctx, '#fff4dc', x, y, 12, 7); px(ctx, '#ffe680', x + 3, y + 2, 2, 2)
          for (let k = 0; k < 4; k += 1) px(ctx, k === 0 ? INK : roof, x - 1 + k, y - 1 - k, 14 - k * 2, 1)
        }
      }
      treeLine(ctx, W, hz + 4, 14, '#1d5c34', '#2e8546', '#6cc06a', 5)
      field(ctx, W, H, hz + 5, town ? '#d8cdb6' : '#8fd06a', town ? '#d2c6ae' : '#86c862', town ? '#b8a88a' : '#6cb24e', 2)
      if (!town) for (let i = 0; i < W / 6; i += 1) px(ctx, ['#ffd23f', '#ffffff', '#ff8fb8'][i % 3], hash(i + 60) * W, hz + 10 + hash(i + 61) * (H - hz - 12))
      sideTrees(ctx, W, hz + 18, town ? 'blossom' : 'round', town ? 'town' : 'route')
    }
  }
  return canvas
}

/** The moving parts: clouds, waves, light, sparks, drips and crowds. */
function animate(ctx: Ctx, area: Area, W: number, H: number, t: number) {
  const hz = Math.round(H * 0.47)
  switch (area) {
    case 'beach':
      for (let i = 0; i < 3; i += 1) cloud(ctx, ((i * 70 + t * 3) % (W + 60)) - 40, hz * (0.15 + i * 0.16), 20 + i * 6)
      for (let y = hz + 4; y < hz + 20; y += 3) for (let x = 0; x < W; x += 11) { const s = Math.round(Math.sin(t * 1.4 + x * 0.3 + y) * 3); px(ctx, '#a7dcff', x + s + (y % 2) * 5, y, 4, 1) }
      { const foam = Math.round(Math.sin(t * 0.9) * 2); px(ctx, '#e6f6ff', 0, hz + 19 + foam, W, 2); px(ctx, '#ffffff', 0, hz + 19 + foam, W, 1) }
      for (let i = 0; i < 2; i += 1) { const x = ((t * (8 + i * 3) + i * 60) % (W + 30)) - 15; const y = hz * 0.4 + i * 10 + Math.sin(t * 2 + i) * 2; const up = Math.floor(t * 5 + i) % 2; px(ctx, '#ffffff', x, y, 1, 1); px(ctx, '#ffffff', x - 2, y - up, 2, 1); px(ctx, '#ffffff', x + 1, y - up, 2, 1) }
      break
    case 'forest':
      for (let i = 0; i < 3; i += 1) {
        const x0 = W * (0.2 + i * 0.3) + Math.sin(t * 0.3 + i) * 4
        ctx.fillStyle = `rgba(255, 246, 180, ${0.08 + 0.05 * Math.sin(t * 0.8 + i * 2)})`
        ctx.beginPath(); ctx.moveTo(x0, 0); ctx.lineTo(x0 + 8, 0); ctx.lineTo(x0 + 26, H); ctx.lineTo(x0 + 10, H); ctx.fill()
      }
      for (let i = 0; i < 7; i += 1) { const y = ((t * (10 + i * 2) + i * 37) % (H + 10)) - 5; const x = (hash(i) * W + Math.sin(t + i) * 8) % W; px(ctx, i % 2 ? '#e8a23a' : '#7cc86a', x, y, 2, 1) }
      for (let i = 0; i < 8; i += 1) { const k = Math.sin(t * 2 + i * 1.7); if (k < 0.2) continue; px(ctx, '#fff6a0', hash(i + 20) * W + Math.sin(t * 0.7 + i) * 6, hz + 6 + hash(i + 21) * (H - hz - 10) + Math.cos(t + i) * 3) }
      break
    case 'cave':
      for (const [x, color] of [[0.12, '127, 227, 255'], [0.88, '197, 138, 255'], [0.6, '127, 227, 255']] as Array<[number, string]>) {
        const glow = 0.12 + 0.08 * Math.sin(t * 1.6 + x * 10)
        ctx.fillStyle = `rgba(${color}, ${glow})`
        ctx.beginPath(); ctx.ellipse(W * x, hz + 2, 18, 12, 0, 0, Math.PI * 2); ctx.fill()
      }
      for (let i = 0; i < 3; i += 1) { const k = ((t * 0.7 + i * 0.37) % 1); const x = Math.round(hash(i + 7) * W); px(ctx, '#7fc8ff', x, k * hz * 1.4, 1, 2) }
      break
    case 'lab':
      for (let x = 8, n = 0; x < W - 26; x += 44, n += 1) {
        const y = Math.round(hz * 0.18)
        for (let k = 0; k < 5; k += 1) { const line = Math.floor(t * 2.6) + k + n * 4; px(ctx, ['#5fd17a', '#72dcff', '#ffd23f', '#ff8fb8'][line % 4], x + 4 + (line % 3) * 2, y + 3 + k * 3, 6 + (line * 7) % 14, 1) }
        if (Math.floor(t * 2) % 2) px(ctx, '#ffffff', x + 4, y + 16, 2, 1)
      }
      { const y = hz + ((t * 14) % (H - hz)); ctx.fillStyle = 'rgba(123, 63, 214, 0.18)'; ctx.fillRect(0, Math.round(y), W, 2) }
      break
    case 'mountain':
      for (let i = 0; i < 3; i += 1) cloud(ctx, ((i * 80 + t * 4) % (W + 70)) - 50, hz * (0.12 + i * 0.12), 22 + i * 8)
      for (let i = 0; i < 4; i += 1) { const x = ((t * 40 + i * 50) % (W + 40)) - 20; px(ctx, 'rgba(255,255,255,0.55)', x, hz * 0.5 + i * 9 + Math.sin(t + i) * 2, 8, 1) }
      break
    case 'academy':
      for (let i = 0; i < 2; i += 1) {
        const x = W * (0.3 + i * 0.4) + Math.sin(t * 0.6 + i * 2) * W * 0.18
        ctx.fillStyle = 'rgba(255, 246, 200, 0.12)'
        ctx.beginPath(); ctx.moveTo(W * (0.3 + i * 0.4) - 2, 0); ctx.lineTo(W * (0.3 + i * 0.4) + 2, 0); ctx.lineTo(x + 18, H); ctx.lineTo(x - 18, H); ctx.fill()
      }
      for (let i = 0; i < 14; i += 1) { const y = ((t * (14 + (i % 4) * 4) + i * 23) % (H + 10)) - 5; const x = hash(i + 5) * W + Math.sin(t * 2 + i) * 4; px(ctx, ['#ffd23f', '#ffffff', '#ff8fb8', '#72dcff'][i % 4], x, y, 2, 1 + (Math.floor(t * 6 + i) % 2)) }
      // The crowd, bobbing along the back of the stage.
      for (let x = 2, i = 0; x < W; x += 6, i += 1) { const bob = Math.round(Math.max(0, Math.sin(t * 3 + i * 1.3)) * 1.5); px(ctx, '#1a0c34', x, hz - 9 - bob, 4, 5) }
      break
    default:
      for (let i = 0; i < 3; i += 1) cloud(ctx, ((i * 64 + t * (2.5 + i)) % (W + 60)) - 40, hz * (0.1 + i * 0.15), 18 + i * 7)
      for (let i = 0; i < 2; i += 1) {
        const x = (W * (0.3 + i * 0.4) + Math.sin(t * 0.5 + i * 3) * W * 0.2)
        const y = hz + 14 + i * 16 + Math.sin(t * 1.3 + i) * 5
        const open = Math.floor(t * 8 + i) % 2
        px(ctx, i ? '#ffd23f' : '#ff8fb8', x - 1 - open, y, 1 + open, 2); px(ctx, i ? '#ffd23f' : '#ff8fb8', x + 1, y, 1 + open, 2); px(ctx, INK, x, y, 1, 2)
      }
  }
  // Grass and sand along the bottom edge sway in the breeze.
  if (area !== 'lab' && area !== 'academy' && area !== 'cave') {
    const color = area === 'beach' ? '#d9bf74' : area === 'mountain' ? '#7c675b' : shade('#5aa646', area === 'forest' ? -0.2 : 0)
    for (let x = 0; x < W; x += 3) { const lean = Math.round(Math.sin(t * 1.8 + x * 0.25)); const h = 2 + ((x * 7) % 3); px(ctx, color, x, H - h, 1, h); px(ctx, color, x + lean, H - h - 1, 1, 1) }
  }
}

/** The battle scenery, painted in big pixels at the stage's own shape. */
export function BattleBackdrop({ area }: { area: Area }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !hasCanvas()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let base: HTMLCanvasElement | null = null
    const fit = () => {
      const w = Math.max(60, Math.round(canvas.clientWidth / SCALE))
      const h = Math.max(40, Math.round(canvas.clientHeight / SCALE))
      if (canvas.width !== w || canvas.height !== h || !base) { canvas.width = w; canvas.height = h; base = paintBase(area, w, h) }
    }
    fit()
    const observer = new ResizeObserver(fit)
    observer.observe(canvas)
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      if (base) {
        ctx.drawImage(base, 0, 0)
        animate(ctx, area, canvas.width, canvas.height, (now - start) / 1000)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); observer.disconnect() }
  }, [area])
  return <canvas ref={ref} className="battle__backdrop" aria-hidden="true" />
}
