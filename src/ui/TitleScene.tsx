import { useEffect, useRef } from 'react'
import { pyxieCanvas } from '../engine/art'
import { drawLogo, LOGO_H, LOGO_W } from '../engine/logo'
import { hasCanvas, makeCanvas } from '../engine/pixels'
import { treeCanvas } from '../engine/props'

// The title screen: the Castanho Valley at golden hour, painted in pixels with parallax layers.
// Mountains, a lake that holds the sun, the school on the hill, and pyxies wandering the meadow.

type Ctx = CanvasRenderingContext2D

// The scene is about 200 art pixels tall on a landscape screen. Taller screens (an iPad held
// upright) get more sky above the same valley, so the meadow and the pyxies keep their size.
let H = 200
let HORIZON = 122
const MARGIN = 24

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5]
/** Sky colors from the top of the screen (0) down to the horizon (1). */
const skyStops: Array<[number, string]> = [[0, '#12082a'], [0.32, '#2a1450'], [0.56, '#55229a'], [0.73, '#9a3598'], [0.85, '#e0587e'], [0.95, '#ff8f52'], [1.05, '#ffc463']]

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [n >> 16, (n >> 8) & 255, n & 255]
}

function seeded(seed: number) {
  let s = seed >>> 0
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
}

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

/** A jagged ridge line from midpoint displacement: values are heights from 0 to 1. */
function ridge(width: number, seed: number, rough: number): number[] {
  const random = seeded(seed)
  let size = 1
  while (size < width) size *= 2
  const out = new Array<number>(size + 1).fill(0)
  out[0] = random(); out[size] = random()
  let spread = 1
  for (let step = size; step > 1; step /= 2) {
    for (let i = step / 2; i < size; i += step) out[i] = (out[i - step / 2] + out[i + step / 2]) / 2 + (random() - 0.5) * spread
    spread *= rough
  }
  const min = Math.min(...out); const max = Math.max(...out)
  return out.slice(0, width).map((v) => (v - min) / (max - min || 1))
}

function disc(ctx: Ctx, cx: number, cy: number, r: number, color: string) {
  for (let dy = -r; dy <= r; dy += 1) { const half = Math.round(Math.sqrt(r * r - dy * dy)); px(ctx, color, cx - half, cy + dy, half * 2 + 1, 1) }
}

function paintSky(W: number): HTMLCanvasElement {
  const canvas = makeCanvas(W, HORIZON + 4)
  const ctx = canvas.getContext('2d')!
  const image = ctx.createImageData(W, HORIZON + 4)
  const stops = skyStops.map(([at, hex]) => [at * HORIZON, ...rgb(hex)] as const)
  for (let y = 0; y < HORIZON + 4; y += 1) {
    let i = 0
    while (i < stops.length - 2 && y > stops[i + 1][0]) i += 1
    const [y0, ...a] = stops[i]
    const [y1, ...b] = stops[i + 1]
    const f = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)))
    for (let x = 0; x < W; x += 1) {
      const pick = f * 16 > BAYER[(y % 4) * 4 + (x % 4)] + 0.5 ? b : a
      const o = (y * W + x) * 4
      image.data[o] = pick[0]; image.data[o + 1] = pick[1]; image.data[o + 2] = pick[2]; image.data[o + 3] = 255
    }
  }
  ctx.putImageData(image, 0, 0)
  // The setting sun, cut by the classic stripes where it meets the haze.
  const sx = Math.round(W / 2)
  const sy = HORIZON - 16
  disc(ctx, sx, sy, 40, 'rgba(255, 200, 110, 0.18)')
  disc(ctx, sx, sy, 33, 'rgba(255, 220, 140, 0.25)')
  disc(ctx, sx, sy, 27, '#ffcf5a')
  disc(ctx, sx, sy - 2, 23, '#ffe27a')
  disc(ctx, sx - 3, sy - 6, 15, '#fff2b0')
  for (let k = 0; k < 6; k += 1) {
    const y = sy + 2 + k * 4 + Math.floor(k * k * 0.25)
    ctx.fillStyle = k < 2 ? '#ff9a55' : '#ff8a4f'
    ctx.fillRect(sx - 30, y, 61, 1 + Math.floor(k / 2))
  }
  return canvas
}

function paintMountains(W: number): HTMLCanvasElement {
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  const far = ridge(W, 7, 0.52)
  const sunX = W / 2
  // The range opens into a pass in the middle, where the sun sets.
  const pass = (x: number) => 0.3 + 0.7 * Math.min(1, Math.abs(x - sunX) / (W * 0.3))
  const top = (x: number) => Math.round(HORIZON - 8 - (far[Math.max(0, Math.min(W - 1, x))] * 44 + 6) * pass(x) - Math.sin(x / 41) * 3)
  for (let x = 0; x < W; x += 1) {
    const y = top(x)
    // Slopes that face the sun catch a pink rim; the slope is read over a few pixels so it stays smooth.
    const slope = top(x + 3) - top(x - 3)
    const lit = x < sunX ? slope > 1 : slope < -1
    px(ctx, '#6a3592', x, y, 1, HORIZON + 6 - y)
    px(ctx, lit ? '#c86a9e' : '#8a4aa0', x, y, 1, lit ? 3 : 1)
    if (y < HORIZON - 48) px(ctx, lit ? '#ffe0ec' : '#e2b0d6', x, y, 1, Math.min(3, HORIZON - 48 - y + 1))
  }
  // Warm haze over the feet of the mountains.
  for (let y = HORIZON - 22; y < HORIZON + 6; y += 1) {
    ctx.fillStyle = `rgba(255, 150, 130, ${((y - (HORIZON - 22)) / 28) * 0.45})`
    ctx.fillRect(0, y, W, 1)
  }
  return canvas
}

function paintHills(W: number): HTMLCanvasElement {
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  const random = seeded(31)
  // The hills dip in the middle to show the lake.
  const top = (x: number) => Math.round(HORIZON - 8 - Math.sin(x / 37 + 1) * 5 - Math.sin(x / 13) * 2 + 15 * Math.exp(-(((x - W / 2) / (W * 0.13)) ** 2)))
  for (let x = 0; x < W; x += 1) {
    const t = top(x)
    px(ctx, '#43207a', x, t, 1, H - t)
    px(ctx, '#7a3f9e', x, t, 1, 1)
  }
  // Pine silhouettes along the ridge, thinner near the lake so the sun shows.
  for (let x = 2; x < W; x += 3 + Math.floor(random() * 4)) {
    if (Math.abs(x - W / 2) < W * 0.16 && random() < 0.8) continue
    const h = 6 + Math.floor(random() * 9)
    const base = top(x) + 2
    for (let k = 0; k < h; k += 1) {
      const half = Math.floor(((k / h) * h) / 3.2)
      px(ctx, '#2e1458', x - half, base - h + k, half * 2 + 1, 1)
    }
    px(ctx, '#8a4aa8', x, base - h, 1, 2)
  }
  return canvas
}

function paintLake(W: number): HTMLCanvasElement {
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  for (let y = HORIZON - 2; y < HORIZON + 22; y += 1) {
    const k = (y - HORIZON + 2) / 24
    px(ctx, k < 0.5 ? '#7a3a9a' : '#5a2a88', 0, y, W, 1)
  }
  return canvas
}

function house(ctx: Ctx, x: number, y: number, w: number, roof: string, wall: string, lit = true) {
  px(ctx, '#1b1030', x - 1, y - 1, w + 2, 10)
  px(ctx, wall, x, y, w, 8)
  px(ctx, 'rgba(0,0,0,0.18)', x + w - 3, y, 3, 8)
  for (let k = 0; k < 6; k += 1) px(ctx, k === 0 ? '#1b1030' : roof, x - 2 + k, y - 1 - k, w + 4 - k * 2, 1)
  px(ctx, '#1b1030', x - 3, y - 1, w + 6, 1)
  if (lit) { px(ctx, '#fff1a0', x + 2, y + 2, 2, 2); px(ctx, '#fff1a0', x + w - 5, y + 2, 2, 2) }
  px(ctx, '#3a1a50', x + Math.floor(w / 2) - 1, y + 4, 2, 4)
}

/** The school on the hill: yellow walls, purple roofs, a clock tower. */
function school(ctx: Ctx, x: number, y: number) {
  const ink = '#1b1030'
  px(ctx, ink, x - 1, y - 1, 46, 17)
  px(ctx, '#ffe27a', x, y, 44, 15)
  px(ctx, '#e8b84a', x, y + 12, 44, 3)
  for (let k = 0; k < 5; k += 1) { px(ctx, k === 0 ? ink : '#6a2fb8', x - 2 + k, y - 1 - k, 48 - k * 2, 1) }
  px(ctx, '#8a4fe0', x + 3, y - 5, 38, 1)
  // Clock tower.
  px(ctx, ink, x + 16, y - 20, 12, 20)
  px(ctx, '#fff1a8', x + 17, y - 19, 10, 19)
  for (let k = 0; k < 6; k += 1) px(ctx, k === 0 ? ink : '#6a2fb8', x + 15 + k, y - 20 - k, 14 - k * 2, 1)
  disc(ctx, x + 22, y - 13, 3, ink)
  disc(ctx, x + 22, y - 13, 2, '#ffffff')
  px(ctx, ink, x + 22, y - 15, 1, 2); px(ctx, ink, x + 22, y - 13, 2, 1)
  px(ctx, ink, x + 22, y - 32, 1, 7)
  for (const wx of [3, 8, 32, 37]) { px(ctx, ink, wx + x - 1, y + 3, 4, 5); px(ctx, '#fff3b0', wx + x, y + 4, 2, 3) }
  px(ctx, ink, x + 19, y + 6, 6, 9); px(ctx, '#6a2fb8', x + 20, y + 7, 4, 8)
}

function paintNear(W: number): HTMLCanvasElement {
  const canvas = makeCanvas(W, H)
  const ctx = canvas.getContext('2d')!
  const left = (x: number) => Math.round(HORIZON + 16 - Math.sin(x / 30) * 8 + (x / W) * 26)
  const right = (x: number) => Math.round(HORIZON + 6 + Math.cos((x - W) / 34) * 7 + ((W - x) / W) * 30)
  for (let x = 0; x < W; x += 1) {
    const t = Math.min(left(x), right(x))
    px(ctx, '#2f5a4e', x, t, 1, H - t)
    px(ctx, '#86b860', x, t, 1, 1)
    px(ctx, '#5d8f58', x, t + 1, 1, 1)
  }
  const sx = Math.round(W * 0.76)
  school(ctx, sx, right(sx + 22) - 15)
  house(ctx, Math.round(W * 0.12), left(Math.round(W * 0.12) + 6) - 8, 12, '#c4562a', '#ffe9c4')
  house(ctx, Math.round(W * 0.21), left(Math.round(W * 0.21) + 5) - 7, 10, '#3d7be0', '#fff4dc')
  // The meadow in front.
  for (let x = 0; x < W; x += 1) {
    const t = Math.round(H - 40 - Math.sin(x / 26) * 4 - Math.sin(x / 9) * 1.5)
    px(ctx, '#3f8a4a', x, t, 1, H - t)
    px(ctx, '#a7d870', x, t, 1, 1)
    px(ctx, '#6cb85a', x, t + 1, 1, 2)
  }
  const random = seeded(77)
  for (let i = 0; i < W * 2.2; i += 1) {
    const x = Math.floor(random() * W)
    const y = H - 34 + Math.floor(random() * 34)
    px(ctx, random() < 0.5 ? '#2f7440' : '#58a856', x, y, 1, 1 + Math.floor(random() * 2))
  }
  // A dirt path winding up from the bottom of the screen.
  for (let y = H - 38; y < H; y += 1) {
    const k = (y - (H - 38)) / 38
    const cx = W / 2 + Math.sin(k * 3) * 10
    const half = 3 + k * 16
    px(ctx, '#d9b07a', cx - half, y, half * 2, 1)
    px(ctx, '#b8885a', cx - half, y, 1, 1); px(ctx, '#b8885a', cx + half - 1, y, 1, 1)
    if (Math.floor(y * 7.3) % 5 === 0) px(ctx, '#c49866', cx - half / 2 + (y % 7), y, 2, 1)
  }
  // Flowers.
  for (let i = 0; i < W / 4; i += 1) {
    const x = Math.floor(random() * W)
    const y = H - 30 + Math.floor(random() * 28)
    if (Math.abs(x - W / 2) < 22) continue
    px(ctx, ['#ffd23f', '#ff8fb8', '#ffffff', '#b98cff'][i % 4], x, y)
  }
  return canvas
}

/** A pyxie on the meadow. `y` counts up from the bottom of the screen. */
interface Walker { species: string; x: number; y: number; dir: number; speed: number; pause: number; phase: number }

export function TitleScene() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !hasCanvas()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let layers: { W: number; sky: HTMLCanvasElement; mountains: HTMLCanvasElement; hills: HTMLCanvasElement; lake: HTMLCanvasElement; near: HTMLCanvasElement } | null = null
    let scale = 4
    let W = 0
    const random = seeded(5)
    const stars = Array.from({ length: 110 }, () => ({ x: random(), y: random() * 0.62, p: random() * 6, big: random() < 0.12 }))
    const clouds = Array.from({ length: 5 }, (_, i) => ({ x: random(), y: 0.22 + i * 0.1 + random() * 0.05, w: 24 + Math.floor(random() * 24), v: 1.2 + random() * 1.6 }))
    const fireflies = Array.from({ length: 26 }, () => ({ x: random(), y: 20 + random() * 56, p: random() * 7, r: 4 + random() * 8 }))
    const walkers: Walker[] = ['sparkit', 'booly', 'quotie', 'plusling', 'boxlet', 'forkit'].map((species, i) => ({
      species, x: 0.08 + i * 0.16 + random() * 0.05, y: 30 - (i % 3) * 8 - Math.floor(random() * 3), dir: i % 2 ? -1 : 1, speed: 6 + random() * 6, pause: random() * 3, phase: random() * 6,
    }))
    let pointer = 0
    const onMove = (event: PointerEvent) => { pointer = event.clientX / window.innerWidth - 0.5 }
    window.addEventListener('pointermove', onMove)

    const resize = () => {
      scale = Math.max(2, Math.round(Math.min(window.innerHeight / 200, window.innerWidth / 260)))
      W = Math.ceil(window.innerWidth / scale)
      H = Math.ceil(window.innerHeight / scale)
      HORIZON = H - 78
      canvas.width = W
      canvas.height = H
      canvas.style.width = `${W * scale}px`
      canvas.style.height = `${H * scale}px`
      const LW = W + MARGIN * 2
      layers = { W: LW, sky: paintSky(LW), mountains: paintMountains(LW), hills: paintHills(LW), lake: paintLake(LW), near: paintNear(LW) }
    }
    resize()
    window.addEventListener('resize', resize)
    const trees = [treeCanvas('pine', 'route', 0), treeCanvas('blossom', 'town', 1), treeCanvas('round', 'route', 2), treeCanvas('pine', 'route', 3), treeCanvas('blossom', 'town', 0)]
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let last = performance.now()
    const start = last
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = (now - start) / 1000
      if (!layers) return
      const cam = (reduce ? 0 : Math.sin(t * 0.07) * 0.6 + pointer) * MARGIN * 0.9
      const shift = (k: number) => Math.round(-MARGIN - cam * k)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(layers.sky, shift(0.1), 0)
      for (const star of stars) {
        const k = Math.sin(t * (star.big ? 1.3 : 2.1) + star.p)
        if (k < -0.3) continue
        const x = Math.round(star.x * layers.W) + shift(0.1)
        const y = Math.round(star.y * HORIZON)
        px(ctx, k > 0.7 ? '#ffffff' : '#c9b8ff', x, y)
        if (star.big && k > 0.6) { px(ctx, 'rgba(255,255,255,0.55)', x - 1, y); px(ctx, 'rgba(255,255,255,0.55)', x + 1, y); px(ctx, 'rgba(255,255,255,0.55)', x, y - 1); px(ctx, 'rgba(255,255,255,0.55)', x, y + 1) }
      }
      for (const cloud of clouds) {
        const x = Math.round(((cloud.x * (W + 80) + t * cloud.v) % (W + 80)) - 40)
        const y = Math.round(cloud.y * HORIZON)
        // Puffy clouds lit pink from below by the setting sun.
        const r = Math.round(cloud.w / 6)
        for (let k = 0; k < 3; k += 1) disc(ctx, x + r + k * r * 2, y + 1 - (k === 1 ? r / 2 : 0), r + (k === 1 ? 1 : 0), '#e8a0c0')
        px(ctx, '#ff9a8c', x, y + 1, cloud.w, r)
        px(ctx, '#c0648e', x + 2, y + r + 1, cloud.w - 4, 1)
        for (let k = 0; k < 3; k += 1) px(ctx, '#ffd8e4', x + r + k * r * 2 - 1, y - r + 2 - (k === 1 ? r / 2 : 0), Math.max(2, r), 1)
      }
      ctx.drawImage(layers.mountains, shift(0.25), 0)
      ctx.drawImage(layers.lake, shift(0.45), 0)
      // The sun's path across the lake.
      const sunX = layers.W / 2 + shift(0.45)
      for (let y = HORIZON + 1; y < HORIZON + 20; y += 2) {
        const spread = 4 + (y - HORIZON) * 0.9
        const wobble = Math.sin(t * 2 + y * 0.9) * 3
        px(ctx, y < HORIZON + 8 ? '#ffe27a' : '#ffb85a', sunX - spread / 2 + wobble, y, spread * (0.6 + 0.4 * Math.sin(t * 3 + y)), 1)
      }
      ctx.drawImage(layers.hills, shift(0.45), 0)
      ctx.drawImage(layers.near, shift(0.7), 0)
      // Window glow and chimney smoke on the near hill.
      const nearX = shift(0.7)
      for (let i = 0; i < 4; i += 1) {
        const k = (t * 0.35 + i / 4) % 1
        const x = Math.round(layers.W * 0.12 + 9 + nearX + Math.sin(k * 7 + i) * 2 + k * 6)
        const y = Math.round(HORIZON + 4 - k * 22)
        ctx.fillStyle = `rgba(255, 230, 230, ${0.5 * (1 - k)})`
        ctx.fillRect(x, y, 2 + Math.floor(k * 3), 2)
      }
      const flag = Math.floor(t * 6) % 2
      const fx = Math.round(layers.W * 0.76) + 22 + nearX
      const fy = Math.round(HORIZON + 6 + Math.cos((Math.round(layers.W * 0.76) + 22 - layers.W) / 34) * 7 + ((layers.W - Math.round(layers.W * 0.76) - 22) / layers.W) * 30) - 47
      px(ctx, '#ffd23f', fx + 1, fy, 5, 2); px(ctx, '#6a2fb8', fx + 1, fy + 2, 5 - flag, 2)
      // Trees frame the meadow, swaying in the evening wind.
      const treeSpots: Array<[number, number, number]> = [[-10, H - 42, 0], [14, H - 34, 1], [W - 30, H - 40, 2], [W - 8, H - 46, 3], [W * 0.3, H - 52, 4]]
      treeSpots.forEach(([x, y, k]) => {
        const art = trees[k]
        if (!art) return
        const sway = Math.round(Math.sin(t * 1.2 + k) * 0.8)
        const left = Math.round(x + shift(0.85) + MARGIN)
        ctx.drawImage(art, 0, 0, 44, 30, left + sway, y, 44, 30)
        ctx.drawImage(art, 0, 30, 44, 14, left, y + 30, 44, 14)
      })
      // Pyxies wander the meadow: walk, stop, look around, walk again.
      const sorted = [...walkers].sort((a, b) => b.y - a.y)
      for (const walker of sorted) {
        if (walker.pause > 0) walker.pause -= dt
        else {
          walker.x += (walker.dir * walker.speed * dt) / W
          if (walker.x < 0.04 || walker.x > 0.96) { walker.dir *= -1; walker.x = Math.max(0.04, Math.min(0.96, walker.x)) }
          if (Math.random() < dt * 0.25) { walker.pause = 1 + Math.random() * 2.5; if (Math.random() < 0.5) walker.dir *= -1 }
        }
        const art = pyxieCanvas(walker.species, false, 24, Math.sin(t * 0.9 + walker.phase) > 0.985)
        const x = Math.round(walker.x * W)
        const wy = H - walker.y
        const hop = walker.pause > 0 ? 0 : Math.round(Math.abs(Math.sin(t * 9 + walker.phase)) * 2)
        ctx.fillStyle = 'rgba(20, 30, 20, 0.35)'
        ctx.fillRect(x - 5, wy + 1, 10, 2)
        if (!art) continue
        if (walker.dir < 0) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(art, -x - 12, wy - 22 - hop); ctx.restore() } else ctx.drawImage(art, x - 12, wy - 22 - hop)
      }
      // An Echobat crosses the sky now and then.
      const bat = pyxieCanvas('echobat', false, 24)
      const bt = (t % 26) / 26
      if (bat && bt < 0.55) {
        const bx = Math.round(-30 + (bt / 0.55) * (W + 60))
        const by = Math.round(HORIZON * 0.42 + Math.sin(bt * 20) * 6)
        ctx.drawImage(bat, bx, by + (Math.floor(t * 8) % 2))
      }
      // A flock heads home over the mountains.
      const ft = (t % 18) / 18
      for (let i = 0; i < 5; i += 1) {
        const x = Math.round(W + 20 - ft * (W + 60) + i * 6)
        const y = Math.round(HORIZON - 60 + Math.abs(i - 2) * 3 + Math.sin(t * 2 + i) * 1)
        const up = Math.floor(t * 6 + i) % 2
        px(ctx, '#2a1450', x, y, 1, 1); px(ctx, '#2a1450', x - 1, y - up, 1, 1); px(ctx, '#2a1450', x + 1, y - up, 1, 1)
      }
      for (const fly of fireflies) {
        const k = Math.sin(t * 1.7 + fly.p)
        if (k < 0) continue
        const x = Math.round(fly.x * W + Math.sin(t * 0.6 + fly.p) * fly.r)
        const y = Math.round(HORIZON + fly.y + Math.cos(t * 0.8 + fly.p) * fly.r * 0.5)
        ctx.fillStyle = `rgba(255, 240, 140, ${0.25 * k})`
        ctx.fillRect(x - 1, y - 1, 3, 3)
        px(ctx, '#fff6b0', x, y)
      }
      // Swaying grass blades along the bottom edge.
      for (let x = 0; x < W; x += 3) {
        const lean = Math.round(Math.sin(t * 1.6 + x * 0.21))
        const h = 3 + ((x * 7) % 4)
        px(ctx, '#2f7440', x, H - h, 1, h)
        px(ctx, '#58a856', x + lean, H - h - 1, 1, 2)
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onMove) }
  }, [])
  return <canvas ref={ref} className="title__scene" aria-hidden="true" />
}

/** The pixel logo, scaled by whole pixels so every block stays square. */
export function Logo() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas || !hasCanvas()) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = () => {
      const k = Math.max(4, Math.floor(Math.min(window.innerWidth * 0.84, 700, window.innerHeight * 0.8) / LOGO_W))
      canvas.style.width = `${LOGO_W * k}px`
      canvas.style.height = `${LOGO_H * k}px`
    }
    size()
    window.addEventListener('resize', size)
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => { drawLogo(ctx, (now - start) / 1000); frame = requestAnimationFrame(tick) }
    frame = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', size) }
  }, [])
  return <canvas ref={ref} className="logo-art" width={LOGO_W} height={LOGO_H} aria-hidden="true" />
}
