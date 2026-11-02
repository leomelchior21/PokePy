// The outdoor ground, painted once per map. Paths, sand and water are smooth fields sampled per
// pixel, so their edges come out round and organic instead of square tiles. Cliffs, ledges and
// piers are autotiled on top, then the buildings.
import type { GameMap } from '../world/types'
import { mapHeight, mapWidth, tileAt } from '../world/world'
import { makeCanvas } from './pixels'
import { decorCanvas } from './props'
import { drawBuilding } from './tiles'

type Ctx = CanvasRenderingContext2D

export function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const smooth = (t: number) => t * t * (3 - 2 * t)

/** Smooth value noise, for big organic patches of light and dark grass. */
function noise(x: number, y: number, cell: number, salt: number): number {
  const fx = x / cell
  const fy = y / cell
  const i = Math.floor(fx)
  const j = Math.floor(fy)
  const tx = smooth(fx - i)
  const ty = smooth(fy - j)
  const a = hash(i, j, salt); const b = hash(i + 1, j, salt); const c = hash(i, j + 1, salt); const d = hash(i + 1, j + 1, salt)
  return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
}

function rgb(hex: string): number {
  const n = Number.parseInt(hex.slice(1), 16)
  return 0xff000000 | ((n & 255) << 16) | (n & 0xff00) | ((n >> 16) & 255)
}

interface GroundPalette { grass: number[]; under: number }

function grassFor(map: GameMap): GroundPalette {
  if (map.area === 'forest') return { grass: ['#74bc5c', '#62ad50', '#529c46', '#438a3c'].map(rgb), under: rgb('#3f8038') }
  if (map.area === 'mountain') return { grass: ['#b4d070', '#a0c262', '#8cb156', '#7a9f4a'].map(rgb), under: rgb('#6f9244') }
  return { grass: ['#9ad870', '#86cb5e', '#73bb50', '#62a944'].map(rgb), under: rgb('#4f9440') }
}

const DIRT = ['#e2b47c', '#d4a46c', '#c4925c', '#a87a48', '#f0cc98'].map(rgb)
const SAND = ['#f6e2a8', '#ecd494', '#d9bc78', '#fff2cc'].map(rgb)
const COBBLE = ['#e8c690', '#ddb880', '#d0aa72', '#a77f4e', '#f6deae'].map(rgb)
const WATER = { deep: rgb('#45a2e6'), base: rgb('#5cb8f2'), light: rgb('#94dcff'), foam: rgb('#f2fbff'), bank: rgb('#8a5a32'), bankDark: rgb('#5e3a20'), wet: rgb('#d2b878') }

export const isOutdoor = (map: GameMap) => map.outside !== 'void' && map.area !== 'cave'

/** Paints the whole ground of an outdoor map, with a margin of `pad` tiles on every side. */
export function buildGround(map: GameMap, flags: ReadonlySet<string>, pad: number): HTMLCanvasElement {
  const w = mapWidth(map) + pad * 2
  const h = mapHeight(map) + pad * 2
  const canvas = makeCanvas(w * 16, h * 16)
  const ctx = canvas.getContext('2d')!
  const W = w * 16
  const H = h * 16
  const tiles: string[] = []
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) tiles.push(tileAt(map, x - pad, y - pad))
  const tile = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? tiles[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))] : tiles[y * w + x])
  const field = (match: (t: string) => boolean, blur = false) => {
    let values = new Float32Array(w * h)
    for (let i = 0; i < tiles.length; i += 1) values[i] = match(tiles[i]) ? 1 : 0
    if (blur) {
      const blurred = new Float32Array(w * h)
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        let sum = 0
        for (let j = -1; j <= 1; j += 1) for (let i = -1; i <= 1; i += 1) sum += values[Math.max(0, Math.min(h - 1, y + j)) * w + Math.max(0, Math.min(w - 1, x + i))]
        blurred[y * w + x] = sum / 9
      }
      values = blurred
    }
    return (px: number, py: number) => {
      const fx = px / 16 - 0.5
      const fy = py / 16 - 0.5
      const i = Math.floor(fx)
      const j = Math.floor(fy)
      const tx = smooth(fx - i)
      const ty = smooth(fy - j)
      const at = (x: number, y: number) => values[Math.max(0, Math.min(h - 1, y)) * w + Math.max(0, Math.min(w - 1, x))]
      return (at(i, j) * (1 - tx) + at(i + 1, j) * tx) * (1 - ty) + (at(i, j + 1) * (1 - tx) + at(i + 1, j + 1) * tx) * ty
    }
  }
  // A bridge site is river until the bridge is built over it.
  const water = field((t) => t === '~' || t === 'P' || t === 'b')
  const depth = field((t) => t === '~' || t === 'P' || t === 'b', true)
  const sand = field((t) => t === 's')
  const dirt = field((t) => t === ':')
  const pave = field((t) => t === '=')
  const trees = field((t) => t === 'T')
  const { grass, under } = grassFor(map)
  const image = ctx.createImageData(W, H)
  const out = new Uint32Array(image.data.buffer)
  // Cobblestones: a jittered grid of stones, each pixel belongs to the nearest center.
  const stone = (px: number, py: number): [number, number] => {
    const cell = 7
    const cx = Math.floor(px / cell)
    const cy = Math.floor(py / cell)
    let best = Infinity
    let second = Infinity
    let id = 0
    for (let j = -1; j <= 1; j += 1) for (let i = -1; i <= 1; i += 1) {
      const gx = cx + i
      const gy = cy + j
      const sx = (gx + 0.2 + hash(gx, gy, 5) * 0.6) * cell
      const sy = (gy + 0.2 + hash(gx, gy, 6) * 0.6) * cell
      const d = Math.hypot(px - sx, py - sy)
      if (d < best) { second = best; best = d; id = gx * 31 + gy } else if (d < second) second = d
    }
    return [second - best, id]
  }
  for (let py = 0; py < H; py += 1) {
    for (let px = 0; px < W; px += 1) {
      const n = (hash(px, py, 1) - 0.5) * 0.03
      const edgeNoise = (noise(px, py, 5, 9) - 0.5) * 0.16
      const wv = water(px, py) + edgeNoise * 0.4
      let color: number
      if (wv > 0.5) {
        const deep = depth(px, py) + (noise(px, py, 14, 4) - 0.5) * 0.12 + ((px + py) & 1) * 0.02
        color = wv < 0.56 ? WATER.foam : wv < 0.64 ? WATER.light : deep > 0.9 ? WATER.deep : WATER.base
        if (color === WATER.base && hash(px >> 2, py, 8) > 0.993) color = WATER.light
      } else {
        const sv = sand(px, py) + edgeNoise
        const dv = dirt(px, py) + edgeNoise
        const vv = pave(px, py) + edgeNoise * 0.5
        if (wv > 0.43) color = sv > 0.5 ? WATER.wet : wv > 0.47 ? WATER.bankDark : WATER.bank
        else if (vv > 0.5) {
          const [gap, id] = stone(px, py)
          color = gap < 1.1 ? COBBLE[3] : vv < 0.56 ? COBBLE[3] : COBBLE[Math.floor(hash(id, 3, 2) * 3)]
          if (gap >= 1.1 && gap < 2.2 && hash(px, py, 3) > 0.6) color = COBBLE[4]
        } else if (dv > 0.5) {
          color = dv < 0.55 ? DIRT[3] : dv < 0.6 ? DIRT[2] : DIRT[noise(px, py, 9, 2) + n > 0.62 ? 0 : 1]
          const r = hash(px, py, 4)
          if (r > 0.985) color = DIRT[2]
          else if (r < 0.006) color = DIRT[4]
        } else if (sv > 0.5) {
          color = sv < 0.56 ? SAND[2] : SAND[noise(px, py, 10, 3) > 0.6 ? 0 : 1]
          const r = hash(px, py, 7)
          if (r > 0.99) color = SAND[2]
          else if (r < 0.01) color = SAND[3]
        } else {
          // Grass: big soft patches, dithered where they meet, a lighter lip along paths.
          const patch = noise(px, py, 26, 11) + noise(px, py, 9, 12) * 0.35 + n
          const dither = ((px + py) & 1) * 0.04
          let k = patch + dither > 1.02 ? 0 : patch + dither > 0.62 ? 1 : patch + dither > 0.38 ? 2 : 3
          const tv = trees(px, py)
          if (tv > 0.55) k = Math.min(3, k + 1)
          color = tv > 0.8 ? under : grass[k]
          if (dv > 0.42 || vv > 0.42 || sv > 0.42) color = grass[0]
          const r = hash(px, py, 2)
          if (r > 0.997) color = grass[0]
          else if (r < 0.002) color = grass[3]
        }
      }
      out[py * W + px] = color
    }
  }
  ctx.putImageData(image, 0, 0)

  const ox = (x: number) => (x + pad) * 16
  const oy = (y: number) => (y + pad) * 16
  for (let y = -pad; y < h - pad; y += 1) for (let x = -pad; x < w - pad; x += 1) decorate(ctx, map, x, y, ox(x), oy(y))
  for (let y = -pad; y < h - pad; y += 1) for (let x = -pad; x < w - pad; x += 1) {
    const t = tile(x + pad, y + pad)
    if (t === '#') cliff(ctx, map, x, y, ox(x), oy(y))
    else if (t === 'L') ledge(ctx, map, x, y, ox(x), oy(y))
    else if (t === 'P') pier(ctx, map, x, y, ox(x), oy(y))
    else if (t === 'b') { if (flags.has(`built:${map.id}`)) pier(ctx, map, x, y, ox(x), oy(y), true); else brokenBridge(ctx, map, x, y, ox(x), oy(y)) }
  }
  for (const building of map.buildings ?? []) drawBuilding(ctx, building, ox(building.x), oy(building.y), 0)
  return canvas
}

/** What the storm left: snapped posts at both banks and one plank drifting in the current. */
function brokenBridge(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number) {
  const site = (x: number, y: number) => tileAt(map, x, y) === 'b'
  const ink = '#1b1626'
  const post = (x: number, y: number) => { ctx.fillStyle = ink; ctx.fillRect(x - 1, y - 1, 5, 7); ctx.fillStyle = '#6e4526'; ctx.fillRect(x, y, 3, 5); ctx.fillStyle = '#a06d40'; ctx.fillRect(x, y, 3, 1) }
  if (!site(tx, ty - 1)) { post(ox + 2, oy - 2); post(ox + 11, oy - 1) }
  if (!site(tx, ty + 1)) { post(ox + 3, oy + 10); post(ox + 10, oy + 11) }
  if (site(tx, ty - 1) && site(tx, ty + 1) && !site(tx - 1, ty)) {
    ctx.fillStyle = ink; ctx.fillRect(ox + 4, oy + 5, 14, 5)
    ctx.fillStyle = '#b47c48'; ctx.fillRect(ox + 5, oy + 6, 12, 3)
    ctx.fillStyle = '#d29a5e'; ctx.fillRect(ox + 5, oy + 6, 12, 1)
  }
}

const flowerColors = [['#ffffff', '#ffe14d'], ['#ffd23f', '#ff9f1c'], ['#ff7fb0', '#ffe14d'], ['#7fb8ff', '#ffffff'], ['#c79bff', '#ffe14d']]

function flower(ctx: Ctx, x: number, y: number, petal: string, center: string) {
  ctx.fillStyle = '#2f7a34'
  ctx.fillRect(x + 1, y + 2, 1, 3)
  ctx.fillStyle = petal
  ctx.fillRect(x, y, 3, 3)
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.fillRect(x, y + 2, 3, 1)
  ctx.fillStyle = center
  ctx.fillRect(x + 1, y + 1, 1, 1)
}

function tuft(ctx: Ctx, x: number, y: number, dark: string, light: string) {
  ctx.fillStyle = dark
  ctx.fillRect(x, y + 1, 1, 3); ctx.fillRect(x + 2, y, 1, 4); ctx.fillRect(x + 4, y + 1, 1, 3)
  ctx.fillStyle = light
  ctx.fillRect(x + 2, y, 1, 1); ctx.fillRect(x, y + 1, 1, 1)
}

function stamp(ctx: Ctx, name: string, cx: number, by: number) {
  const art = decorCanvas(name)
  if (art) ctx.drawImage(art, Math.round(cx - art.width / 2), Math.round(by - art.height))
}

/** Small things on the ground: tufts, flowers, mushrooms, pebbles, lily pads. */
function decorate(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number) {
  const t = tileAt(map, tx, ty)
  const r = hash(tx, ty, 31)
  const px = ox + 2 + Math.floor(hash(tx, ty, 32) * 10)
  const py = oy + 3 + Math.floor(hash(tx, ty, 33) * 9)
  const forest = map.area === 'forest'
  const dark = forest ? '#3a7f36' : '#4f9a40'
  const light = forest ? '#7fc463' : '#a6e07f'
  if (t === '.' || t === 'F') {
    const rocky = map.area === 'mountain' || map.outside === 'rock'
    if (r < 0.32) tuft(ctx, px, py, dark, light)
    else if (r < 0.37) { if (!rocky) { const [p, c] = flowerColors[Math.floor(hash(tx, ty, 34) * flowerColors.length)]; flower(ctx, px, py, p, c) } }
    else if (r < (forest ? 0.44 : map.area === 'route' ? 0.38 : 0.373)) stamp(ctx, ['mushroom', 'orangeshroom', 'blueshroom'][Math.floor(hash(tx, ty, 35) * 3)], px + 3, py + 7)
    else if (r < (forest ? 0.47 : rocky ? 0.43 : 0.4)) stamp(ctx, 'rock', px + 4, py + 7)
    else if (forest && r < 0.48) stamp(ctx, 'stump', ox + 8, oy + 15)
    if (hash(tx, ty, 36) < 0.25) tuft(ctx, ox + Math.floor(hash(tx, ty, 37) * 12), oy + Math.floor(hash(tx, ty, 38) * 12), dark, light)
  } else if (t === 'f') {
    const [p, c] = flowerColors[Math.floor(hash(tx, ty, 7) * flowerColors.length)]
    const [p2, c2] = flowerColors[Math.floor(hash(tx, ty, 8) * flowerColors.length)]
    for (const [fx, fy, alt] of [[2, 2, 0], [9, 1, 1], [5, 7, 1], [11, 8, 0], [2, 11, 1], [8, 12, 0]] as Array<[number, number, number]>) {
      if (hash(tx * 7 + fx, ty, fy) < 0.18) continue
      flower(ctx, ox + fx, oy + fy, alt ? p2 : p, alt ? c2 : c)
    }
  } else if (t === 's') {
    if (r < 0.05) { ctx.fillStyle = '#ffffff'; ctx.fillRect(px, py, 2, 1); ctx.fillStyle = '#ffc2d6'; ctx.fillRect(px, py + 1, 2, 1) }
    else if (r < 0.08) stamp(ctx, 'rock', px + 4, py + 7)
  } else if (t === '~') {
    const open = ['~', 'P'].includes(tileAt(map, tx - 1, ty)) && ['~', 'P'].includes(tileAt(map, tx + 1, ty)) && ['~', 'P'].includes(tileAt(map, tx, ty - 1)) && ['~', 'P'].includes(tileAt(map, tx, ty + 1))
    if (open && r < 0.07 && map.area !== 'beach' && map.outside !== 'water') stamp(ctx, r < 0.025 ? 'lilyflower' : 'lily', px + 5, py + 8)
  } else if (t === 'T') {
    if (r < 0.3) { ctx.fillStyle = forest ? '#356e30' : '#468a3a'; ctx.fillRect(px, py, 2, 1); ctx.fillRect(px + 5, py + 3, 1, 1) }
  }
}

function cliffColors(map: GameMap) {
  return map.area === 'mountain' || map.outside === 'rock'
    ? { face: '#a88a74', light: '#c6a88e', dark: '#7e6656', deep: '#5a4638', ink: '#3a2c24' }
    : { face: '#b8743e', light: '#d08e52', dark: '#8e5430', deep: '#62361e', ink: '#3e2214' }
}

/** Cliffs: a rock tile with open ground below is a face; with rock below, the grassy top of a plateau. */
function cliff(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number) {
  const rock = (x: number, y: number) => tileAt(map, x, y) === '#'
  const c = cliffColors(map)
  const grassTop = map.area === 'forest' ? '#62ad50' : map.area === 'mountain' || map.outside === 'rock' ? '#a0c262' : '#86cb5e'
  const grassLight = map.area === 'forest' ? '#86c86a' : map.area === 'mountain' || map.outside === 'rock' ? '#c4dc84' : '#a8e07c'
  const left = rock(tx - 1, ty)
  const right = rock(tx + 1, ty)
  if (rock(tx, ty + 1)) {
    if (map.outside === 'rock') {
      // High ground in the mountains: bare rock with cracks and the odd tuft.
      ctx.fillStyle = c.light
      ctx.fillRect(ox, oy, 16, 16)
      for (let i = 0; i < 6; i += 1) {
        ctx.fillStyle = i % 2 ? c.face : '#d6bca2'
        ctx.fillRect(ox + Math.floor(hash(tx, ty, 40 + i) * 13), oy + Math.floor(hash(tx, ty, 50 + i) * 13), 2 + (i % 3), 1 + (i % 2))
      }
      if (hash(tx, ty, 60) < 0.3) { ctx.fillStyle = c.dark; ctx.fillRect(ox + 4, oy + 9, 5, 1); ctx.fillRect(ox + 8, oy + 10, 3, 1) }
      if (hash(tx, ty, 61) < 0.25) { ctx.fillStyle = '#8cb156'; ctx.fillRect(ox + 10, oy + 4, 1, 2); ctx.fillRect(ox + 12, oy + 3, 1, 3) }
    } else {
      ctx.fillStyle = 'rgba(255,255,240,0.07)'
      ctx.fillRect(ox, oy, 16, 16)
    }
    if (!rock(tx, ty - 1)) { ctx.fillStyle = c.ink; ctx.fillRect(ox, oy, 16, 1); ctx.fillStyle = grassLight; ctx.fillRect(ox, oy + 1, 16, 1) }
    if (!left) { ctx.fillStyle = c.dark; ctx.fillRect(ox, oy, 3, 16); ctx.fillStyle = c.ink; ctx.fillRect(ox, oy, 1, 16); ctx.fillStyle = grassLight; ctx.fillRect(ox + 3, oy, 1, 16) }
    if (!right) { ctx.fillStyle = c.dark; ctx.fillRect(ox + 13, oy, 3, 16); ctx.fillStyle = c.ink; ctx.fillRect(ox + 15, oy, 1, 16) }
    return
  }
  // A face: rock columns with light edges, a jagged grass lip, a dark foot.
  ctx.fillStyle = c.face
  ctx.fillRect(ox, oy, 16, 16)
  for (let x = 0; x < 16; x += 1) {
    const col = Math.floor((x + tx * 16 + Math.floor(hash(tx, 0, 3) * 4)) / 4)
    const inCol = (x + tx * 16 + Math.floor(hash(tx, 0, 3) * 4)) % 4
    const breakY = 5 + Math.floor(hash(col, ty, 4) * 8)
    ctx.fillStyle = inCol === 0 ? c.light : inCol === 3 ? c.dark : c.face
    ctx.fillRect(ox + x, oy + 3, 1, 12)
    if (inCol === 3 || hash(col, ty, 5) > 0.6) { ctx.fillStyle = c.dark; ctx.fillRect(ox + x, oy + breakY, 1, 1) }
    if (inCol === 1 && hash(col, ty, 6) > 0.5) { ctx.fillStyle = c.light; ctx.fillRect(ox + x, oy + breakY + 1, 1, 2) }
  }
  ctx.fillStyle = c.deep
  ctx.fillRect(ox, oy + 14, 16, 2)
  ctx.fillStyle = c.ink
  ctx.fillRect(ox, oy + 15, 16, 1)
  // Grass lip with drips.
  ctx.fillStyle = c.ink
  for (let x = 0; x < 16; x += 1) { const drip = hash(tx * 16 + x, ty, 9) > 0.55 ? 1 : 0; ctx.fillRect(ox + x, oy + 3 + drip, 1, 1) }
  ctx.fillStyle = grassTop
  for (let x = 0; x < 16; x += 1) { const drip = hash(tx * 16 + x, ty, 9) > 0.55 ? 1 : 0; ctx.fillRect(ox + x, oy, 1, 3 + drip) }
  ctx.fillStyle = grassLight
  ctx.fillRect(ox, oy, 16, 1)
  if (!left) { ctx.fillStyle = c.ink; ctx.fillRect(ox, oy, 1, 16); ctx.fillStyle = c.deep; ctx.fillRect(ox + 1, oy + 4, 1, 11) }
  if (!right) { ctx.fillStyle = c.ink; ctx.fillRect(ox + 15, oy, 1, 16); ctx.fillStyle = c.deep; ctx.fillRect(ox + 14, oy + 4, 1, 11) }
  // A soft shadow on the ground at the cliff's foot.
  ctx.fillStyle = 'rgba(30, 20, 10, 0.22)'
  ctx.fillRect(ox, oy + 16, 16, 3)
  ctx.fillStyle = 'rgba(30, 20, 10, 0.12)'
  ctx.fillRect(ox, oy + 19, 16, 2)
}

/** A one-way ledge: a short cliff you can only hop down. */
function ledge(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number) {
  const c = cliffColors(map)
  const left = tileAt(map, tx - 1, ty) === 'L'
  const right = tileAt(map, tx + 1, ty) === 'L'
  const x0 = left ? 0 : 1
  const x1 = right ? 16 : 15
  ctx.fillStyle = c.face
  ctx.fillRect(ox + x0, oy + 6, x1 - x0, 9)
  // Lighter at the top, darker below, with a few cracks: rock, not a picket fence.
  ctx.fillStyle = c.light
  ctx.fillRect(ox + x0, oy + 7, x1 - x0, 2)
  ctx.fillStyle = c.dark
  ctx.fillRect(ox + x0, oy + 11, x1 - x0, 2)
  for (let x = x0; x < x1; x += 1) {
    const gx = tx * 16 + x
    if (hash(gx, ty, 3) < 0.16) { ctx.fillStyle = c.deep; ctx.fillRect(ox + x, oy + 8 + Math.floor(hash(gx, ty, 4) * 2), 1, 3 + Math.floor(hash(gx, ty, 5) * 3)) }
    else if (hash(gx, ty, 6) < 0.1) { ctx.fillStyle = c.light; ctx.fillRect(ox + x, oy + 9, 1, 2) }
  }
  ctx.fillStyle = c.deep
  ctx.fillRect(ox + x0, oy + 13, x1 - x0, 2)
  ctx.fillStyle = c.ink
  ctx.fillRect(ox + x0, oy + 15, x1 - x0, 1)
  const grassTop = map.area === 'forest' ? '#62ad50' : '#86cb5e'
  for (let x = x0; x < x1; x += 1) {
    const drip = hash(tx * 16 + x, ty, 11) > 0.55 ? 1 : 0
    ctx.fillStyle = grassTop
    ctx.fillRect(ox + x, oy + 4, 1, 3 + drip)
    ctx.fillStyle = c.ink
    ctx.fillRect(ox + x, oy + 7 + drip, 1, 1)
  }
  ctx.fillStyle = c.ink
  if (!left) ctx.fillRect(ox + x0, oy + 5, 1, 11)
  if (!right) ctx.fillRect(ox + x1 - 1, oy + 5, 1, 11)
  ctx.fillStyle = 'rgba(30, 20, 10, 0.22)'
  ctx.fillRect(ox + x0, oy + 16, x1 - x0, 3)
}

function pier(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number, bridge = false) {
  const pierAt = (x: number, y: number) => tileAt(map, x, y) === (bridge ? 'b' : 'P')
  const horizontal = pierAt(tx - 1, ty) || pierAt(tx + 1, ty)
  ctx.fillStyle = 'rgba(20, 40, 80, 0.3)'
  ctx.fillRect(ox + 2, oy + 3, 16, 16)
  ctx.fillStyle = '#5e3a20'
  ctx.fillRect(ox, oy, 16, 16)
  for (let i = 0; i < 4; i += 1) {
    ctx.fillStyle = (i + tx + ty) % 2 ? '#c8904e' : '#b98244'
    if (horizontal) ctx.fillRect(ox, oy + i * 4, 16, 3)
    else ctx.fillRect(ox + i * 4, oy, 3, 16)
    ctx.fillStyle = '#e2ad6e'
    if (horizontal) ctx.fillRect(ox, oy + i * 4, 16, 1)
    else ctx.fillRect(ox + i * 4, oy, 1, 16)
  }
  ctx.fillStyle = '#4a2c18'
  if (!pierAt(tx, ty + 1)) { ctx.fillRect(ox + 1, oy + 14, 3, 4); ctx.fillRect(ox + 12, oy + 14, 3, 4) }
}
