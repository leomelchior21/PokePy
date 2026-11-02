// Pixel art helpers: text matrices become cached canvases, outlined automatically.

export type Palette = Record<string, string>

const OUTLINE = '#1b1626'

/** Turns rows of characters into a pixel grid. '.' is transparent. */
export function gridFrom(rows: string[], mirror = false): string[][] {
  return rows.map((row) => {
    const chars = [...row]
    return mirror ? [...chars, ...[...chars].reverse()] : chars
  })
}

/** Paints a dark outline around every filled pixel, the way handheld sprites look. */
export function outline(grid: string[][], mark = 'O'): string[][] {
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const out = grid.map((row) => [...row])
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      if (grid[y][x] !== '.') continue
      const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const c = grid[y + dy]?.[x + dx]
        return c !== undefined && c !== '.' && c !== mark
      })
      if (near) out[y][x] = mark
    }
  }
  return out
}

const canvasCache = new Map<string, HTMLCanvasElement>()
const urlCache = new Map<string, string>()

export function hasCanvas(): boolean {
  if (typeof document === 'undefined') return false
  try {
    return Boolean(document.createElement('canvas').getContext('2d'))
  } catch {
    return false
  }
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  return canvas
}

const flat = new Set(['O', 'w', 'p', 'E', 'q', 'g', 'k', 't', 'r', 'R'])

/** Draws a grid onto a fresh canvas at one pixel per cell. With volume, every color gets light and shadow. */
export function renderGrid(key: string, grid: string[][], palette: Palette, volume = false): HTMLCanvasElement | null {
  const cached = canvasCache.get(key)
  if (cached) return cached
  if (!hasCanvas()) return null
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const canvas = makeCanvas(w, h)
  const ctx = canvas.getContext('2d')!
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const c = grid[y][x]
      if (c === '.') continue
      const base = c === 'O' ? palette.O ?? outlineFor(grid, palette, x, y) : palette[c] ?? '#ff00ff'
      let color = base
      if (volume && !flat.has(c)) {
        const edge = (dx: number, dy: number) => { const n = grid[y + dy]?.[x + dx]; return n === undefined || n === '.' || n === 'O' }
        if (edge(0, 1) || edge(1, 0)) color = shade(base, -0.22)
        else if (edge(0, -1) || edge(-1, 0)) color = shade(base, 0.22)
      }
      ctx.fillStyle = color
      ctx.fillRect(x, y, 1, 1)
    }
  }
  canvasCache.set(key, canvas)
  return canvas
}

export function dataUrl(key: string, canvas: HTMLCanvasElement | null): string {
  if (!canvas) return ''
  const cached = urlCache.get(key)
  if (cached) return cached
  const url = canvas.toDataURL()
  urlCache.set(key, url)
  return url
}

/** Selective outline: a dark version of the color it wraps, darker below and to the right. */
function outlineFor(grid: string[][], palette: Palette, x: number, y: number): string {
  for (const [dx, dy] of [[0, -1], [-1, 0], [0, 1], [1, 0]]) {
    const n = grid[y + dy]?.[x + dx]
    if (n && n !== '.' && n !== 'O' && palette[n]) return shade(blend(palette[n], OUTLINE, 0.3), dy < 0 || dx < 0 ? -0.68 : -0.55)
  }
  return OUTLINE
}

function blend(a: string, b: string, t: number): string {
  const pa = Number.parseInt(a.slice(1), 16)
  const pb = Number.parseInt(b.slice(1), 16)
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t)
  return `#${[ch(16), ch(8), ch(0)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

/** A darker or lighter version of a hex color, for shading. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))))
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
