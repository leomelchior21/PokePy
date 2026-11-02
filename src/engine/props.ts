// Standing scenery: trees, bushes, boulders, fences and tall grass. Trees and rocks are vector
// designs rasterized like the pyxies, so their leaves get real light and outlines.
import type { Area } from '../world/types'
import { hasCanvas, makeCanvas } from './pixels'
import { rasterize, type Design, type Part } from './raster'

const roundCanopy: Part[] = [
  { t: 'p', c: 't', pts: [44, 66, 56, 66, 58, 90, 64, 95, 36, 95, 42, 90] },
  { t: 'e', c: 'g', x: 50, y: 44, rx: 36, ry: 26 },
  { t: 'e', c: 'g', x: 26, y: 50, rx: 18, ry: 15 },
  { t: 'e', c: 'g', x: 74, y: 50, rx: 18, ry: 15 },
  { t: 'e', c: 'g', x: 50, y: 60, rx: 26, ry: 13 },
  { t: 'e', c: 'h', x: 36, y: 30, rx: 19, ry: 16 },
  { t: 'e', c: 'h', x: 62, y: 26, rx: 19, ry: 16 },
  { t: 'e', c: 'h', x: 50, y: 18, rx: 15, ry: 12 },
  { t: 'e', c: 'g', x: 20, y: 40, rx: 11, ry: 10 },
  { t: 'e', c: 'g', x: 80, y: 40, rx: 11, ry: 10 },
]

const pineTiers: Part[] = [
  { t: 'p', c: 't', pts: [45, 74, 55, 74, 57, 95, 43, 95] },
  { t: 'p', c: 'g', pts: [50, 44, 86, 82, 72, 80, 64, 86, 50, 80, 36, 86, 28, 80, 14, 82] },
  { t: 'p', c: 'h', pts: [50, 24, 78, 60, 66, 58, 58, 64, 50, 58, 42, 64, 34, 58, 22, 60] },
  { t: 'p', c: 'g', pts: [50, 4, 70, 38, 60, 36, 50, 42, 40, 36, 30, 38] },
]

const palmParts: Part[] = [
  { t: 'l', c: 't', pts: [52, 94, 50, 70, 46, 46, 48, 34], r: [5, 3] },
  { t: 'p', c: 'g', pts: [48, 34, 14, 30, 4, 44, 22, 36, 48, 38] },
  { t: 'p', c: 'g', pts: [48, 34, 86, 28, 96, 44, 76, 36, 48, 38] },
  { t: 'p', c: 'h', pts: [48, 32, 26, 12, 10, 18, 30, 20, 48, 36] },
  { t: 'p', c: 'h', pts: [48, 32, 72, 10, 90, 18, 68, 20, 48, 36] },
  { t: 'p', c: 'g', pts: [48, 32, 46, 6, 54, 8, 52, 34] },
  { t: 'e', c: 'a', x: 44, y: 38, rx: 4, ry: 4, m: true },
]

export type TreeKind = 'round' | 'pine' | 'blossom' | 'palm' | 'apple' | 'dark'

const treeDesigns: Record<TreeKind, Design> = {
  round: { palette: { t: '#7a4a2a', g: '#3f9a46', h: '#5cb84e' }, parts: roundCanopy },
  apple: { palette: { t: '#7a4a2a', g: '#3a9244', h: '#56b04a', a: '#e8483f' }, parts: [...roundCanopy, { t: 'e', c: 'a', x: 32, y: 46, rx: 3.5, ry: 3.5 }, { t: 'e', c: 'a', x: 64, y: 38, rx: 3.5, ry: 3.5 }, { t: 'e', c: 'a', x: 54, y: 56, rx: 3.5, ry: 3.5 }] },
  dark: { palette: { t: '#5a3620', g: '#2c6e3a', h: '#3f8a44' }, parts: roundCanopy },
  blossom: { palette: { t: '#7a4a2a', g: '#ee8fb6', h: '#ffb8d2' }, parts: roundCanopy },
  pine: { palette: { t: '#6a3e22', g: '#2f7a46', h: '#3c9150' }, parts: pineTiers },
  palm: { palette: { t: '#a8743a', g: '#3fa44a', h: '#5cc05a', a: '#7a4a2a' }, parts: palmParts },
}

export const TREE_SIZE = 44

const flipped = new Map<HTMLCanvasElement, HTMLCanvasElement>()

/** A tree sprite, in one of four looks: two sizes, each also mirrored. The trunk's foot sits at the bottom middle. */
export function treeCanvas(kind: TreeKind, area: Area, variant = 0): HTMLCanvasElement | null {
  const design = treeDesigns[kind]
  const forest = area === 'forest' && kind === 'round'
  const small = variant >= 2
  const art = rasterize(`tree:${kind}:${forest}:${small}`, {
    palette: forest ? { ...design.palette, t: '#5a3620', g: '#2f8040', h: '#46a04c' } : design.palette,
    parts: small ? design.parts.map((part) => scalePart(part, 0.86)) : design.parts,
  }, { size: TREE_SIZE })
  if (!art || variant % 2 === 0) return art
  let mirror = flipped.get(art)
  if (!mirror && hasCanvas()) {
    mirror = makeCanvas(art.width, art.height)
    const ctx = mirror.getContext('2d')!
    ctx.scale(-1, 1)
    ctx.drawImage(art, -art.width, 0)
    flipped.set(art, mirror)
  }
  return mirror ?? art
}

/** Shrinks a part toward the bottom middle, where the trunk stands. */
function scalePart(part: Part, k: number): Part {
  const sx = (x: number) => 50 + (x - 50) * k
  const sy = (y: number) => 95 - (95 - y) * k
  const p = { ...part } as Record<string, unknown>
  if ('pts' in part) p.pts = part.pts.map((v, i) => (i % 2 === 0 ? sx(v) : sy(v)))
  if ('x' in part) { p.x = sx(part.x); p.y = sy(part.y) }
  if ('rx' in part) { p.rx = part.rx * k; p.ry = part.ry * k }
  if ('r' in part && part.t === 'l') p.r = typeof part.r === 'number' ? part.r * k : [part.r[0] * k, part.r[1] * k]
  return p as Part
}

/** Which tree grows on a tile: pines up high and in the woods, palms on the beach, blossoms near the school. */
export function treeKindFor(area: Area, roll: number): TreeKind {
  if (area === 'beach') return roll < 0.55 ? 'palm' : 'round'
  if (area === 'mountain') return roll < 0.7 ? 'pine' : 'round'
  if (area === 'forest') return roll < 0.45 ? 'pine' : roll < 0.9 ? 'round' : 'dark'
  if (area === 'academy') return roll < 0.25 ? 'blossom' : roll < 0.4 ? 'pine' : 'round'
  if (area === 'town') return roll < 0.08 ? 'blossom' : roll < 0.18 ? 'apple' : roll < 0.38 ? 'pine' : 'round'
  return roll < 0.12 ? 'apple' : roll < 0.4 ? 'pine' : 'round'
}

const bushDesign: Design = {
  palette: { g: '#3f9a46', h: '#5cb84e', f: '#ffd23f' },
  parts: [
    { t: 'e', c: 'g', x: 50, y: 66, rx: 44, ry: 28 },
    { t: 'e', c: 'h', x: 32, y: 52, rx: 22, ry: 20 },
    { t: 'e', c: 'h', x: 64, y: 48, rx: 24, ry: 22 },
    { t: 'e', c: 'g', x: 22, y: 70, rx: 16, ry: 14 },
    { t: 'e', c: 'g', x: 80, y: 70, rx: 16, ry: 14 },
  ],
}

const berryBush: Design = { palette: { ...bushDesign.palette, f: '#ff5f8f' }, parts: [...bushDesign.parts, { t: 'e', c: 'f', x: 36, y: 54, rx: 5, ry: 5, s: 'flat' }, { t: 'e', c: 'f', x: 66, y: 60, rx: 5, ry: 5, s: 'flat' }, { t: 'e', c: 'f', x: 54, y: 44, rx: 5, ry: 5, s: 'flat' }] }

export function bushCanvas(variant: number): HTMLCanvasElement | null {
  return rasterize(`bush:${variant}`, variant === 1 ? berryBush : bushDesign, { size: 20 })
}

const boulder: Design = {
  palette: { r: '#a39a92', h: '#c9c0b6', m: '#6fae4c' },
  parts: [
    { t: 'p', c: 'r', pts: [10, 86, 6, 60, 22, 30, 50, 18, 78, 26, 94, 56, 90, 86] },
    { t: 'p', c: 'h', pts: [24, 40, 50, 26, 70, 32, 56, 46, 30, 52], s: 'soft' },
    { t: 'e', c: 'm', x: 40, y: 26, rx: 16, ry: 7 },
  ],
}

export function boulderCanvas(): HTMLCanvasElement | null {
  return rasterize('boulder', boulder, { size: 18 })
}

const smallRock: Design = { palette: { r: '#9c948c', h: '#c4bcb2' }, parts: [{ t: 'e', c: 'r', x: 50, y: 64, rx: 40, ry: 28 }, { t: 'e', c: 'h', x: 42, y: 54, rx: 20, ry: 12, s: 'soft' }] }
const mushroom: Design = { palette: { s: '#f4ead8', r: '#e8483f', w: '#ffffff' }, parts: [{ t: 'p', c: 's', pts: [40, 56, 60, 56, 62, 90, 38, 90] }, { t: 'e', c: 'r', x: 50, y: 50, rx: 40, ry: 26 }, { t: 'e', c: 'w', x: 36, y: 44, rx: 7, ry: 6, s: 'flat' }, { t: 'e', c: 'w', x: 62, y: 40, rx: 6, ry: 5, s: 'flat' }] }
const blueShroom: Design = { palette: { ...mushroom.palette, r: '#4fa3ff' }, parts: mushroom.parts }
const orangeShroom: Design = { palette: { ...mushroom.palette, r: '#f2a03b' }, parts: mushroom.parts }
const stump: Design = { palette: { t: '#8a5a32', l: '#d9a86a', d: '#5a3620' }, parts: [{ t: 'p', c: 't', pts: [18, 50, 82, 50, 86, 88, 96, 94, 4, 94, 14, 88] }, { t: 'e', c: 'l', x: 50, y: 50, rx: 32, ry: 14, s: 'flat' }, { t: 'ring', c: 'd', x: 50, y: 50, rx: 18, ry: 7, w: 4 }] }
const lily: Design = { palette: { g: '#4fb05a', h: '#7fd36e', f: '#ffb8d2' }, parts: [{ t: 'p', c: 'g', pts: [50, 50, 92, 40, 90, 70, 60, 92, 20, 84, 8, 54, 30, 24, 50, 46] }, { t: 'e', c: 'h', x: 40, y: 50, rx: 16, ry: 10, s: 'soft' }] }
const lilyFlower: Design = { palette: lily.palette, parts: [...lily.parts, { t: 'e', c: 'f', x: 46, y: 46, rx: 14, ry: 12 }] }

const decorDesigns: Record<string, [Design, number]> = {
  rock: [smallRock, 9], mushroom: [mushroom, 9], blueshroom: [blueShroom, 9], orangeshroom: [orangeShroom, 9], stump: [stump, 14], lily: [lily, 12], lilyflower: [lilyFlower, 12],
}

export function decorCanvas(name: keyof typeof decorDesigns | string): HTMLCanvasElement | null {
  const entry = decorDesigns[name]
  return entry ? rasterize(`decor:${name}`, entry[0], { size: entry[1] }) : null
}

// ------------------------------------------------------------- TALL GRASS

const grassCache = new Map<string, HTMLCanvasElement | null>()

/** A clump of tall grass that covers the feet of whoever walks in it. Three sway frames. */
export function tallGrassCanvas(variant: number, frame: number, area: Area): HTMLCanvasElement | null {
  const key = `${variant}:${frame}:${area}`
  if (grassCache.has(key)) return grassCache.get(key)!
  if (!hasCanvas()) return null
  const canvas = makeCanvas(16, 18)
  const ctx = canvas.getContext('2d')!
  const forest = area === 'forest'
  const dark = forest ? '#2a6e34' : '#3a8a3c'
  const mid = forest ? '#3f8f3e' : '#52a848'
  const light = forest ? '#66b257' : '#7fcc5f'
  const tip = forest ? '#8fd070' : '#b2e889'
  const outline = forest ? '#1d4a26' : '#24572c'
  // Three clumps, each a fan of blades leaning out from a shared root.
  const clumps = variant === 0 ? [[3, 13], [8, 16], [13, 12]] : [[2, 12], [7, 15], [12, 14]]
  const blade = (x: number, base: number, h: number, lean: number, color: string, line: boolean) => {
    for (let i = 0; i < h; i += 1) {
      const bx = Math.round(x + (lean * i) / h)
      const by = base - i
      ctx.fillStyle = line ? outline : i >= h - 2 ? tip : color
      if (line) ctx.fillRect(bx - 1, by - 1, 3, 2)
      else ctx.fillRect(bx, by, 1, 1)
    }
  }
  const sway = frame === 1 ? 1 : frame === 2 ? -1 : 0
  for (const pass of [true, false]) {
    for (const [cx, h] of clumps) {
      const fan: Array<[number, number, number, string]> = [[cx - 1, h - 4, -2 + sway, dark], [cx + 1, h - 3, 2 + sway, dark], [cx, h, sway, mid], [cx - 1, h - 1, -1 + sway, light], [cx + 1, h - 2, 1 + sway, light]]
      for (const [x, bh, lean, color] of fan) blade(x, 17, bh, lean, color, pass)
    }
  }
  grassCache.set(key, canvas)
  return canvas
}

// ------------------------------------------------------------------ FENCE

/** A wooden fence segment that joins its neighbors. */
export function drawFence(ctx: CanvasRenderingContext2D, x: number, y: number, left: boolean, right: boolean, up: boolean, down: boolean) {
  const wood = '#b07a46'
  const light = '#d9a86a'
  const dark = '#6e4424'
  const ink = '#3a2416'
  const post = (px: number) => {
    ctx.fillStyle = ink; ctx.fillRect(px - 1, y + 1, 6, 15)
    ctx.fillStyle = wood; ctx.fillRect(px, y + 2, 4, 13)
    ctx.fillStyle = light; ctx.fillRect(px, y + 2, 1, 12)
    ctx.fillStyle = dark; ctx.fillRect(px + 3, y + 3, 1, 12)
  }
  const rail = (ry: number, from: number, to: number) => {
    ctx.fillStyle = ink; ctx.fillRect(x + from, ry - 1, to - from, 4)
    ctx.fillStyle = wood; ctx.fillRect(x + from, ry, to - from, 2)
    ctx.fillStyle = light; ctx.fillRect(x + from, ry, to - from, 1)
  }
  if (left || right || (!up && !down)) {
    rail(y + 5, left ? 0 : 6, right ? 16 : 10)
    rail(y + 10, left ? 0 : 6, right ? 16 : 10)
  }
  if (up || down) {
    ctx.fillStyle = ink; ctx.fillRect(x + 6, y + (up ? -2 : 4), 4, (up ? 6 : 0) + (down ? 14 : 8))
    ctx.fillStyle = wood; ctx.fillRect(x + 7, y + (up ? -2 : 4), 2, (up ? 6 : 0) + (down ? 14 : 8))
  }
  post(x + 6)
  ctx.fillStyle = 'rgba(20, 30, 10, 0.18)'
  ctx.fillRect(x + 4, y + 15, 9, 2)
}

