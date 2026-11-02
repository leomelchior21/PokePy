// Vector parts in, pixel art out. A creature is a list of shapes on a 100×100 design grid; the
// rasterizer turns them into crisp pixels at any size, then adds cel shading (light from the top
// left), dithered band edges, inner lines where parts overlap and a selective outline. The same
// pyxie can be drawn at 24 px for the overworld and at 96 px for the inspector.
import { hasCanvas, makeCanvas, shade, type Palette } from './pixels'

export type Shade = 'sphere' | 'flat' | 'soft'

interface PartBase { c: string; m?: boolean; s?: Shade }
export type Part =
  | (PartBase & { t: 'e'; x: number; y: number; rx: number; ry: number; rot?: number })
  | (PartBase & { t: 'p'; pts: number[] })
  | (PartBase & { t: 'l'; pts: number[]; r: number | [number, number] })
  | (PartBase & { t: 'ring'; x: number; y: number; rx: number; ry: number; w: number })
  | { t: 'eye'; x: number; y: number; r: number; kind?: 'cute' | 'owl' | 'glow' | 'visor' | 'fierce'; pupil?: string; m?: boolean }
  | { t: 'mouth'; x: number; y: number; w: number; kind?: 'smile' | 'open' | 'fang' | 'flat' }
  | { t: 'blush'; x: number; y: number; r: number; c?: string; m?: boolean }

export interface Design { palette: Palette; parts: Part[] }

const INK = '#1b1626'

type Shape = Exclude<Part, { t: 'eye' } | { t: 'mouth' } | { t: 'blush' }>
type Hit = { nx: number; ny: number } | null

function mirrorPart<T extends Part>(part: T): T {
  const p = { ...part, m: false } as Record<string, unknown>
  if ('pts' in part) p.pts = part.pts.map((v, i) => (i % 2 === 0 ? 100 - v : v))
  if ('x' in part) p.x = 100 - (part as { x: number }).x
  if ('rot' in part && typeof part.rot === 'number') p.rot = -part.rot
  return p as T
}

export function expand(parts: Part[]): Part[] {
  const out: Part[] = []
  for (const part of parts) {
    out.push({ ...part, m: false } as Part)
    if ((part as { m?: boolean }).m) out.push(mirrorPart(part))
  }
  return out
}

function bounds(pts: number[]) {
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity
  for (let i = 0; i < pts.length; i += 2) { x0 = Math.min(x0, pts[i]); x1 = Math.max(x1, pts[i]); y0 = Math.min(y0, pts[i + 1]); y1 = Math.max(y1, pts[i + 1]) }
  return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, hw: Math.max(1, (x1 - x0) / 2), hh: Math.max(1, (y1 - y0) / 2) }
}

function inPolygon(pts: number[], u: number, v: number): boolean {
  let inside = false
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i]; const yi = pts[i + 1]; const xj = pts[j]; const yj = pts[j + 1]
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** Where a design point falls inside a shape, as a normal for shading, or null when outside. */
function hit(part: Shape, u: number, v: number, cache: Map<Shape, ReturnType<typeof bounds> & { lengths?: number[]; total?: number }>): Hit {
  switch (part.t) {
    case 'e': {
      let dx = u - part.x
      let dy = v - part.y
      if (part.rot) { const c = Math.cos(-part.rot); const s = Math.sin(-part.rot); [dx, dy] = [dx * c - dy * s, dx * s + dy * c] }
      const nx = dx / part.rx
      const ny = dy / part.ry
      return nx * nx + ny * ny <= 1 ? { nx, ny } : null
    }
    case 'ring': {
      const nx = (u - part.x) / part.rx
      const ny = (v - part.y) / part.ry
      const ix = (u - part.x) / Math.max(0.5, part.rx - part.w)
      const iy = (v - part.y) / Math.max(0.5, part.ry - part.w)
      return nx * nx + ny * ny <= 1 && ix * ix + iy * iy > 1 ? { nx: nx * 0.6, ny: ny * 0.6 } : null
    }
    case 'p': {
      if (!inPolygon(part.pts, u, v)) return null
      let b = cache.get(part)
      if (!b) { b = bounds(part.pts); cache.set(part, b) }
      return { nx: Math.max(-1, Math.min(1, (u - b.cx) / b.hw)), ny: Math.max(-1, Math.min(1, (v - b.cy) / b.hh)) }
    }
    case 'l': {
      let meta = cache.get(part)
      if (!meta) {
        const lengths: number[] = []
        let total = 0
        for (let i = 0; i + 3 < part.pts.length; i += 2) { const l = Math.hypot(part.pts[i + 2] - part.pts[i], part.pts[i + 3] - part.pts[i + 1]); lengths.push(l); total += l }
        meta = { ...bounds(part.pts), lengths, total }
        cache.set(part, meta)
      }
      const [r0, r1] = typeof part.r === 'number' ? [part.r, part.r] : part.r
      let walked = 0
      let best: Hit = null
      let bestD = Infinity
      for (let i = 0, s = 0; i + 3 < part.pts.length; i += 2, s += 1) {
        const ax = part.pts[i]; const ay = part.pts[i + 1]; const bx = part.pts[i + 2]; const by = part.pts[i + 3]
        const len = meta.lengths![s] || 1
        const k = Math.max(0, Math.min(1, ((u - ax) * (bx - ax) + (v - ay) * (by - ay)) / (len * len)))
        const px = ax + (bx - ax) * k
        const py = ay + (by - ay) * k
        const r = r0 + (r1 - r0) * ((walked + k * len) / (meta.total || 1))
        const d = Math.hypot(u - px, v - py)
        if (d <= r && d / r < bestD) { bestD = d / r; best = { nx: (u - px) / r, ny: (v - py) / r * 0.8 - 0.2 } }
        walked += len
      }
      return best
    }
  }
}

const bayer = [[0, 2], [3, 1]]

/** The shaded color of a pixel. Bands: highlight, base, shadow, deep shadow. */
function lit(base: string, nx: number, ny: number, mode: Shade, px: number, py: number, dither: boolean): string {
  if (mode === 'flat') return base
  const nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny))
  const intensity = -0.5 * nx - 0.62 * ny + 0.6 * nz
  const soft = mode === 'soft'
  const cuts = soft ? [0.7, 0.05, -0.6] : [0.66, 0.16, -0.3]
  const jitter = dither ? (bayer[py % 2][px % 2] - 1.5) * 0.035 : 0
  const value = intensity + jitter
  if (value > cuts[0]) return shade(base, soft ? 0.16 : 0.26)
  if (value > cuts[1]) return base
  if (value > cuts[2]) return shade(base, soft ? -0.1 : -0.17)
  return shade(base, soft ? -0.2 : -0.33)
}

function disc(grid: (string | null)[], size: number, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let y = Math.floor(cy - ry - 1); y <= Math.ceil(cy + ry + 1); y += 1) {
    for (let x = Math.floor(cx - rx - 1); x <= Math.ceil(cx + rx + 1); x += 1) {
      if (x < 0 || y < 0 || x >= size || y >= size) continue
      const dx = (x + 0.5 - cx) / Math.max(0.5, rx)
      const dy = (y + 0.5 - cy) / Math.max(0.5, ry)
      if (dx * dx + dy * dy <= 1) grid[y * size + x] = color
    }
  }
}

function put(grid: (string | null)[], size: number, x: number, y: number, color: string) {
  if (x >= 0 && y >= 0 && x < size && y < size) grid[Math.round(y) * size + Math.round(x)] = color
}

function drawEye(grid: (string | null)[], size: number, part: Extract<Part, { t: 'eye' }>, palette: Palette, blink: boolean) {
  const k = size / 100
  const cx = part.x * k
  const cy = part.y * k
  const r = Math.max(1, part.r * k)
  const kind = part.kind ?? 'cute'
  if (blink && kind !== 'visor' && kind !== 'glow') {
    const w = Math.max(1, Math.round(r * 0.9))
    for (let x = -w; x <= w; x += 1) put(grid, size, cx + x - 0.5, cy + (Math.abs(x) === w ? -1 : 0), INK)
    return
  }
  if (kind === 'visor') {
    for (let y = -Math.max(1, r * 0.45); y <= Math.max(1, r * 0.45); y += 1) for (let x = -r; x <= r; x += 1) put(grid, size, cx + x - 0.5, cy + y - 0.5, palette[part.pupil ?? 'a'] ?? '#7fe3ff')
    put(grid, size, cx - r + 0.5, cy - 0.5, '#ffffff')
    return
  }
  if (kind === 'glow') {
    const color = palette[part.pupil ?? 'p'] ?? '#ff3bd4'
    disc(grid, size, cx, cy, r * 0.8, r, color)
    disc(grid, size, cx - r * 0.15, cy - r * 0.2, Math.max(0.6, r * 0.35), Math.max(0.6, r * 0.45), shade(color, 0.6))
    return
  }
  if (kind === 'owl') {
    disc(grid, size, cx, cy, r + 0.6, r + 0.6, INK)
    disc(grid, size, cx, cy, r, r, '#ffffff')
    const pupil = palette[part.pupil ?? 'p'] ?? INK
    disc(grid, size, cx, cy + r * 0.1, r * 0.58, r * 0.62, pupil)
    disc(grid, size, cx, cy + r * 0.12, r * 0.28, r * 0.3, INK)
    put(grid, size, cx - r * 0.35 - 0.5, cy - r * 0.35 - 0.5, '#ffffff')
    return
  }
  const rx = Math.max(0.8, r * 0.72)
  disc(grid, size, cx, cy, rx, r, INK)
  if (r >= 2.5) disc(grid, size, cx, cy + r * 0.45, rx * 0.8, r * 0.45, '#3a2a5a')
  const hl = Math.max(1, Math.round(r * 0.42))
  const hx = Math.round(cx - rx * 0.5)
  const hy = Math.round(cy - r * 0.62)
  for (let y = 0; y < hl; y += 1) for (let x = 0; x < hl; x += 1) put(grid, size, hx + x, hy + y, '#ffffff')
  if (r >= 3) put(grid, size, Math.round(cx + rx * 0.35), Math.round(cy + r * 0.35), '#ffffff')
  if (kind === 'fierce') {
    const side = part.x < 50 ? 1 : -1
    const w = Math.max(2, Math.round(r * 1.1))
    for (let i = 0; i < w; i += 1) put(grid, size, Math.round(cx - side * w / 2 + side * i), Math.round(cy - r - 1.5 + (i * 2) / w), INK)
  }
}

function drawMouth(grid: (string | null)[], size: number, part: Extract<Part, { t: 'mouth' }>) {
  const k = size / 100
  const cx = part.x * k
  const cy = part.y * k
  const w = Math.max(1, Math.round((part.w * k) / 2))
  const kind = part.kind ?? 'smile'
  if (kind === 'open') {
    const h = Math.max(1, Math.round(w * 0.9))
    disc(grid, size, cx, cy + h / 2, w, h, INK)
    if (h >= 2) disc(grid, size, cx, cy + h * 0.9, w * 0.6, h * 0.4, '#ff7a9a')
    return
  }
  if (kind === 'flat') { for (let x = -w; x < w; x += 1) put(grid, size, cx + x, cy, INK); return }
  for (let x = -w; x <= w; x += 1) put(grid, size, Math.round(cx + x - 0.5), Math.round(cy + (Math.abs(x) === w ? -1 : 0) - 0.5), INK)
  if (w <= 1) return
  if (kind === 'fang') { put(grid, size, Math.round(cx - w / 2), Math.round(cy + 0.5), '#ffffff'); put(grid, size, Math.round(cx + w / 2) - 1, Math.round(cy + 0.5), '#ffffff') }
}

const canvases = new Map<string, HTMLCanvasElement | null>()

export interface RasterOptions { size: number; blink?: boolean; shiny?: (palette: Palette) => Palette }

/** Draws a design to a canvas. Cached by key. */
export function rasterize(key: string, design: Design, options: RasterOptions): HTMLCanvasElement | null {
  const cacheKey = `${key}:${options.size}:${options.blink ? 1 : 0}`
  if (canvases.has(cacheKey)) return canvases.get(cacheKey)!
  if (!hasCanvas()) return null
  const size = options.size
  const palette = options.shiny ? options.shiny(design.palette) : design.palette
  const parts = expand(design.parts)
  const shapes = parts.filter((part): part is Shape => part.t === 'e' || part.t === 'p' || part.t === 'l' || part.t === 'ring')
  const cache = new Map()
  const grid: (string | null)[] = new Array(size * size).fill(null)
  const owner = new Int16Array(size * size).fill(-1)
  const keyOf: string[] = new Array(size * size).fill('')
  const dither = size >= 44
  // Topmost shape wins. At small sizes thin lines and rings get extra samples so they survive.
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = ((x + 0.5) / size) * 100
      const v = ((y + 0.5) / size) * 100
      for (let i = shapes.length - 1; i >= 0; i -= 1) {
        const part = shapes[i]
        let h = hit(part, u, v, cache)
        if (!h && size < 40 && (part.t === 'l' || part.t === 'ring')) {
          const o = 25 / size
          h = hit(part, u - o, v - o, cache) ?? hit(part, u + o, v + o, cache)
        }
        if (!h) continue
        const base = palette[part.c] ?? '#ff00ff'
        grid[y * size + x] = lit(base, h.nx, h.ny, part.s ?? 'sphere', x, y, dither)
        owner[y * size + x] = i
        keyOf[y * size + x] = part.c
        break
      }
    }
  }
  // Inner lines: where a part sits over a different-colored part, its edge darkens.
  const lines: Array<[number, string]> = []
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x
      if (owner[i] < 0) continue
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
        const j = ny * size + nx
        if (owner[j] >= 0 && owner[j] < owner[i] && keyOf[j] !== keyOf[i]) { lines.push([i, shade(palette[keyOf[i]] ?? '#888888', -0.42)]); break }
      }
    }
  }
  for (const [i, color] of lines) grid[i] = color
  // Selective outline: darker below and to the right, a touch softer above and to the left.
  const outline: Array<[number, string]> = []
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const i = y * size + x
      if (grid[i]) continue
      let near: string | null = null
      let lightSide = false
      for (const [dx, dy] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= size || ny >= size) continue
        const j = ny * size + nx
        if (owner[j] >= 0) { near = palette[keyOf[j]] ?? '#888888'; lightSide = dx > 0 || dy > 0; break }
      }
      if (near) outline.push([i, mix(shade(near, lightSide ? -0.58 : -0.7), INK, 0.35)])
    }
  }
  for (const [i, color] of outline) grid[i] = color
  for (const part of parts) {
    if (part.t === 'blush') {
      const k = size / 100
      if (size >= 32) disc(grid, size, part.x * k, part.y * k, Math.max(1, part.r * k), Math.max(0.6, part.r * k * 0.55), palette[part.c ?? ''] ?? '#ff8fb0')
    }
  }
  for (const part of parts) if (part.t === 'eye') drawEye(grid, size, part, palette, Boolean(options.blink))
  for (const part of parts) if (part.t === 'mouth' && size >= 28) drawMouth(grid, size, part)
  const canvas = makeCanvas(size, size)
  const ctx = canvas.getContext('2d')
  if (!ctx) { canvases.set(cacheKey, null); return null }
  const image = ctx.createImageData(size, size)
  for (let i = 0; i < grid.length; i += 1) {
    const color = grid[i]
    if (!color) continue
    const n = Number.parseInt(color.slice(1), 16)
    image.data[i * 4] = (n >> 16) & 255
    image.data[i * 4 + 1] = (n >> 8) & 255
    image.data[i * 4 + 2] = n & 255
    image.data[i * 4 + 3] = 255
  }
  ctx.putImageData(image, 0, 0)
  canvases.set(cacheKey, canvas)
  return canvas
}

/** Blends two hex colors. */
export function mix(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16)
  const pb = Number.parseInt(b.slice(1), 16)
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t)
  return `#${[ch(16), ch(8), ch(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
