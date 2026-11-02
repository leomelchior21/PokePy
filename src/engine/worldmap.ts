// The Castanho Valley as an illustrated pixel map: two coasts, the mountains of Sum Canyon and
// Veritas Peak, the Forking Path forest, flower fields, the road between every town and route,
// little houses for towns and the Academy's purple castle at the top. Painted once and cached.
import { mapById } from '../world/maps'
import { mapNodes } from '../world/valley'
import { hasCanvas, makeCanvas } from './pixels'

type Ctx = CanvasRenderingContext2D

/** Art pixels per board cell. The board is 10 cells wide and 9.4 tall. */
export const UNIT = 26
export const MAP_W = 10 * UNIT
export const MAP_H = Math.round(9.4 * UNIT)
const INK = '#1b1626'

export const nodePixel = (node: { x: number; y: number }) => ({ x: (node.x + 1) * UNIT, y: Math.round((node.y + 0.5) * UNIT) })

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x), Math.round(y), w, h)
}

function noise(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/** The west coast (by the harbor) and the east coast (Quote Coast). */
function seaAt(x: number, y: number): number {
  // Echo Harbor sits right on the west shore.
  const west = 2.95 * UNIT + Math.sin(y / 9) * 4 + Math.sin(y / 23) * 5
  const westOn = y > 4.6 * UNIT - Math.sin(x / 7) * 4
  const east = 8.75 * UNIT + Math.sin(y / 8 + 2) * 4 + Math.sin(y / 19) * 6
  const eastOn = y > 3.4 * UNIT && y < 7.1 * UNIT + Math.sin(x / 6) * 3
  // Positive out at sea, negative on land: how far a pixel is from the nearest shore.
  let best = -99
  if (westOn) best = Math.max(best, west - x)
  if (eastOn) best = Math.max(best, x - east)
  // A lake in the south, between Vila Maker and Boxford.
  const lake = 1 - ((x - 6.1 * UNIT) / (1.15 * UNIT)) ** 2 - ((y - 8.3 * UNIT) / (0.6 * UNIT)) ** 2
  if (lake > -0.3) best = Math.max(best, lake * 16)
  return best
}

function distToRoad(x: number, y: number): number {
  let best = Infinity
  for (let i = 0; i < mapNodes.length - 1; i += 1) {
    const a = nodePixel(mapNodes[i])
    const b = nodePixel(mapNodes[i + 1])
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)))
    best = Math.min(best, Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)))
  }
  return best
}

function nearestArea(x: number, y: number): string {
  let best = Infinity
  let area = 'route'
  for (const node of mapNodes) {
    const p = nodePixel(node)
    const d = Math.hypot(p.x - x, p.y - y)
    if (d < best) { best = d; area = mapById[node.id].outside === 'rock' ? 'mountain' : mapById[node.id].area }
  }
  return y < 0.9 * UNIT ? 'academy' : area
}

function tree(ctx: Ctx, x: number, y: number, dark = false) {
  px(ctx, '#5a3a1a', x, y, 1, 3)
  const [d, m, l] = dark ? ['#174024', '#2e7d45', '#4c9a58'] : ['#1d5c34', '#3f9d52', '#7cc86a']
  px(ctx, INK, x - 3, y - 6, 7, 6); px(ctx, INK, x - 2, y - 7, 5, 8)
  px(ctx, d, x - 2, y - 6, 5, 6); px(ctx, m, x - 2, y - 6, 4, 4); px(ctx, l, x - 1, y - 5, 2, 1)
}

function pine(ctx: Ctx, x: number, y: number) {
  px(ctx, '#5a3a1a', x, y, 1, 2)
  for (let k = 0; k < 7; k += 1) { const half = Math.floor(k / 2); px(ctx, INK, x - half - 1, y - 7 + k, half * 2 + 3, 1) }
  for (let k = 0; k < 6; k += 1) { const half = Math.floor(k / 2); px(ctx, k % 2 ? '#2e7d45' : '#3f9d52', x - half, y - 6 + k, half * 2 + 1, 1) }
}

function mountain(ctx: Ctx, x: number, y: number, s: number) {
  for (let k = 0; k <= s; k += 1) {
    const half = Math.round(k * 0.9)
    px(ctx, INK, x - half - 1, y - s + k, half * 2 + 3, 1)
  }
  for (let k = 1; k <= s; k += 1) {
    const half = Math.round(k * 0.9)
    px(ctx, '#a89cc0', x - half, y - s + k, half, 1)
    px(ctx, '#7a6e90', x, y - s + k, half + 1, 1)
    if (k < s * 0.35) { px(ctx, '#ffffff', x - half, y - s + k, half, 1); px(ctx, '#d8d0ec', x, y - s + k, half + 1, 1) }
  }
}

function palm(ctx: Ctx, x: number, y: number) {
  px(ctx, '#8a5a32', x, y - 5, 1, 6); px(ctx, '#8a5a32', x + 1, y - 7, 1, 3)
  for (const [dx, dy] of [[-3, 0], [-2, -1], [2, -1], [3, 0], [-1, -2], [1, -2], [0, -2]]) px(ctx, '#2e8546', x + 1 + dx, y - 8 + dy, 1, 1)
  px(ctx, '#3f9d52', x - 1, y - 9, 5, 1)
}

function house(ctx: Ctx, x: number, y: number, roof: string) {
  px(ctx, 'rgba(20, 30, 20, 0.35)', x - 7, y + 5, 15, 2)
  px(ctx, INK, x - 6, y - 2, 13, 8)
  px(ctx, '#fff4dc', x - 5, y - 1, 11, 6)
  px(ctx, '#3a2a20', x - 1, y + 1, 3, 4)
  px(ctx, '#ffe680', x - 4, y, 2, 2); px(ctx, '#ffe680', x + 3, y, 2, 2)
  for (let k = 0; k < 6; k += 1) px(ctx, k === 0 ? INK : roof, x - 7 + k, y - 3 - k, 15 - k * 2, 1)
  px(ctx, INK, x - 8, y - 3, 17, 1)
}

function castle(ctx: Ctx, x: number, y: number) {
  px(ctx, 'rgba(20, 30, 20, 0.35)', x - 11, y + 6, 23, 2)
  px(ctx, INK, x - 10, y - 4, 21, 11)
  px(ctx, '#ffe680', x - 9, y - 3, 19, 9)
  px(ctx, '#e8c85a', x - 9, y + 4, 19, 2)
  for (const tx of [-10, 6]) { px(ctx, INK, x + tx, y - 10, 5, 7); px(ctx, '#fff3a8', x + tx + 1, y - 9, 3, 6); for (let k = 0; k < 3; k += 1) px(ctx, k === 0 ? INK : '#6a2fb8', x + tx - 1 + k, y - 11 - k, 7 - k * 2, 1) }
  px(ctx, INK, x - 3, y - 13, 7, 10); px(ctx, '#fff3a8', x - 2, y - 12, 5, 9)
  for (let k = 0; k < 4; k += 1) px(ctx, k === 0 ? INK : '#6a2fb8', x - 4 + k, y - 14 - k, 9 - k * 2, 1)
  px(ctx, INK, x, y - 22, 1, 5); px(ctx, '#ffd23f', x + 1, y - 22, 4, 2); px(ctx, '#6a2fb8', x + 1, y - 20, 4, 1)
  px(ctx, '#6a2fb8', x - 1, y + 1, 3, 5)
  px(ctx, '#ffffff', x - 7, y - 1, 2, 2); px(ctx, '#ffffff', x + 6, y - 1, 2, 2)
}

function marker(ctx: Ctx, x: number, y: number) {
  px(ctx, INK, x - 3, y - 2, 7, 5); px(ctx, INK, x - 2, y - 3, 5, 7)
  px(ctx, '#ffd23f', x - 2, y - 2, 5, 5)
  px(ctx, '#fff3a8', x - 1, y - 2, 2, 1)
}

const roofs: Record<string, string> = { vila: '#d9473f', harbor: '#2fb8b8', boxford: '#3d7be0', stringhaven: '#ff6fae', abacus: '#f28c28', veritas: '#5fd17a', branchwood: '#8a5a32' }

let cached: HTMLCanvasElement | null = null

export function worldMapCanvas(): HTMLCanvasElement | null {
  if (cached) return cached
  if (!hasCanvas()) return null
  const canvas = makeCanvas(MAP_W, MAP_H)
  const ctx = canvas.getContext('2d')!
  // Land and water, pixel by pixel.
  const image = ctx.createImageData(MAP_W, MAP_H)
  const set = (x: number, y: number, hex: string) => { const n = parseInt(hex.slice(1), 16); const o = (y * MAP_W + x) * 4; image.data[o] = n >> 16; image.data[o + 1] = (n >> 8) & 255; image.data[o + 2] = n & 255; image.data[o + 3] = 255 }
  for (let y = 0; y < MAP_H; y += 1) for (let x = 0; x < MAP_W; x += 1) {
    const sea = seaAt(x, y)
    const n = noise(x >> 1, y >> 1, 3)
    if (sea > 6) set(x, y, n > 0.97 ? '#e6f6ff' : sea > 16 ? '#3f8fdc' : '#4aa3df')
    else if (sea > 0) set(x, y, '#7cc8ff')
    else if (sea > -3) set(x, y, n > 0.5 ? '#f3df9e' : '#ead28a')
    else {
      const area = nearestArea(x, y)
      const base = area === 'mountain' ? ['#a0b070', '#94a668', '#aabb7a'] : area === 'forest' ? ['#4f9a48', '#468f42', '#5aa652'] : area === 'academy' ? ['#86c862', '#7cc25a', '#94d470'] : ['#8fd06a', '#86c862', '#9ad874']
      set(x, y, base[n < 0.2 ? 1 : n > 0.85 ? 2 : 0])
    }
  }
  ctx.putImageData(image, 0, 0)
  // The road, stamped square by square so it stays crisp.
  for (const [r, color] of [[3, '#8a6a4a'], [2, '#e9cf94']] as Array<[number, string]>) {
    for (let i = 0; i < mapNodes.length - 1; i += 1) {
      const a = nodePixel(mapNodes[i])
      const b = nodePixel(mapNodes[i + 1])
      const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
      for (let s = 0; s <= steps; s += 1) px(ctx, color, a.x + ((b.x - a.x) * s) / steps - r, a.y + ((b.y - a.y) * s) / steps - r, r * 2 + 1, r * 2 + 1)
    }
  }
  for (let i = 0; i < mapNodes.length - 1; i += 1) {
    const a = nodePixel(mapNodes[i])
    const b = nodePixel(mapNodes[i + 1])
    const steps = Math.max(Math.abs(b.x - a.x), Math.abs(b.y - a.y))
    for (let s = 0; s <= steps; s += 1) if (s % 6 < 3) px(ctx, '#c9a35a', a.x + ((b.x - a.x) * s) / steps, a.y + ((b.y - a.y) * s) / steps)
  }
  // Scenery, from the back row to the front, never on the road or on a town.
  const props: Array<{ y: number; draw: () => void }> = []
  for (let gy = 4; gy < MAP_H - 2; gy += 6) for (let gx = 3; gx < MAP_W - 3; gx += 6) {
    const x = gx + Math.round((noise(gx, gy, 7) - 0.5) * 5)
    const y = gy + Math.round((noise(gx, gy, 8) - 0.5) * 5)
    if (seaAt(x, y) > -5 || distToRoad(x, y) < 9) continue
    if (mapNodes.some((node) => { const p = nodePixel(node); return Math.hypot(p.x - x, p.y - y) < (node.town ? 15 : 9) })) continue
    const area = nearestArea(x, y)
    const roll = noise(x, y, 9)
    const nearSea = seaAt(x, y) > -14
    if (area === 'mountain' && roll < 0.42) props.push({ y, draw: () => mountain(ctx, x, y, 7 + Math.floor(noise(x, y, 10) * 6)) })
    else if (area === 'forest' && roll < 0.8) props.push({ y, draw: () => (noise(x, y, 11) < 0.4 ? pine(ctx, x, y) : tree(ctx, x, y, true)) })
    else if (nearSea && area === 'beach' && roll < 0.3) props.push({ y, draw: () => palm(ctx, x, y) })
    else if (area === 'mountain' && roll < 0.55) props.push({ y, draw: () => pine(ctx, x, y) })
    else if (roll < 0.17) props.push({ y, draw: () => tree(ctx, x, y) })
    else if (roll < 0.26) props.push({ y, draw: () => { for (let k = 0; k < 4; k += 1) px(ctx, ['#ffd23f', '#ffffff', '#ff8fb8', '#b98cff'][k], x + (k % 2) * 2 - 1, y + Math.floor(k / 2) * 2 - 1) } })
  }
  // The Laser Cutter Cave, in the side of Sum Canyon.
  const cave = { x: Math.round(5.7 * UNIT), y: Math.round(5.0 * UNIT) }
  props.push({ y: cave.y, draw: () => { mountain(ctx, cave.x, cave.y + 2, 12); px(ctx, INK, cave.x - 3, cave.y - 4, 7, 6); px(ctx, '#2a1f1a', cave.x - 2, cave.y - 3, 5, 5); px(ctx, '#ff3b3b', cave.x - 2, cave.y - 1, 5, 1) } })
  for (const node of mapNodes) {
    const p = nodePixel(node)
    if (node.id === 'academy') props.push({ y: p.y + 6, draw: () => castle(ctx, p.x, p.y) })
    else if (node.town) props.push({ y: p.y + 5, draw: () => house(ctx, p.x, p.y, roofs[node.id] ?? '#e8483f') })
    else props.push({ y: p.y, draw: () => marker(ctx, p.x, p.y) })
  }
  props.sort((a, b) => a.y - b.y).forEach((prop) => prop.draw())
  // A compass in the corner.
  const cx = MAP_W - 16
  const cy = MAP_H - 18
  px(ctx, INK, cx - 1, cy - 9, 3, 19); px(ctx, INK, cx - 9, cy - 1, 19, 3)
  px(ctx, '#ffffff', cx, cy - 8, 1, 8); px(ctx, '#e8483f', cx, cy - 8, 1, 4); px(ctx, '#fff4dc', cx, cy, 1, 9); px(ctx, '#fff4dc', cx - 8, cy, 17, 1)
  px(ctx, INK, cx - 2, cy - 15, 5, 5); px(ctx, '#ffffff', cx - 1, cy - 14, 3, 3); px(ctx, INK, cx, cy - 14, 1, 3)
  cached = canvas
  return canvas
}
