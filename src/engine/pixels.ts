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

/** Draws a grid onto a fresh canvas at one pixel per cell. */
export function renderGrid(key: string, grid: string[][], palette: Palette): HTMLCanvasElement | null {
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
      ctx.fillStyle = c === 'O' ? palette.O ?? OUTLINE : palette[c] ?? '#ff00ff'
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

/** A darker or lighter version of a hex color, for shading. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(amount >= 0 ? c + (255 - c) * amount : c * (1 + amount))))
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}
