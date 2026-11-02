// Procedural tile art. Every tile is painted with rectangles, so the whole valley ships with no images.
// Handheld-style: dithered textures, dark outlines, light from the top left.
import type { Building, GameMap } from '../world/types'
import { doorOf, tileAt } from '../world/world'
import { drawInteriorTile, floorOf } from './interior'
import { shade } from './pixels'

type Ctx = CanvasRenderingContext2D

const C = {
  grass: '#94d470', grassDot: '#7cc25a', grassTuft: '#5aa646', grassLight: '#b9ec92',
  tall: '#47a548', tallDark: '#2c7a34', tallLight: '#7fd165', tallTop: '#a8ea86',
  path: '#efe4c4', pathDot: '#cbbb8f', pathEdge: '#d9c79c', pathLight: '#fbf4dc',
  pave: '#ddd4c2', paveDark: '#b4a78e', paveLight: '#f1ebdd',
  sand: '#f3df9e', sandDot: '#d9bf74', sandLight: '#fff1c4',
  water: '#4b9fe0', waterDark: '#2f74c4', waterLight: '#a7dcff', foam: '#e6f6ff',
  leafDark: '#1d5c34', leaf: '#2e8546', leafMid: '#3f9d52', leafLight: '#6cc06a', leafShine: '#a5e083', trunk: '#6b4423', trunkDark: '#4a2e17',
  rock: '#a0877a', rockDark: '#6e5a4f', rockLight: '#cbb6a7', rockShine: '#efe2d6',
  wood: '#c98a4a', woodDark: '#9c6430', woodLight: '#e2ad6e',
  cave: '#4a3a32', caveDark: '#33271f', caveLight: '#62503f',
  outline: '#1b1626',
}

const font: Record<string, string> = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', ' ': '000000000000000', '!': '010010010000010',
}

/** Crisp 3×5 pixel letters, so signs stay sharp at any zoom. */
export function pixelText(ctx: Ctx, text: string, x: number, y: number, color: string, size = 1): number {
  let cx = x
  for (const raw of text.toUpperCase()) {
    const glyph = font[raw.normalize('NFD').replace(/[̀-ͯ]/g, '')] ?? font[' ']
    for (let i = 0; i < 15; i += 1) if (glyph[i] === '1') px(ctx, color, cx + (i % 3) * size, y + Math.floor(i / 3) * size, size, size)
    cx += 4 * size
  }
  return cx - x - size
}

function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

function px(ctx: Ctx, color: string, x: number, y: number, w = 1, h = 1) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

/** A sparse checker of dots: the classic handheld texture. */
function dither(ctx: Ctx, color: string, ox: number, oy: number, step: number, tx: number, ty: number, salt = 0) {
  for (let y = 0; y < 16; y += step) for (let x = (y / step) % 2 ? step / 2 : 0; x < 16; x += step) {
    if (hash(tx * 16 + x, ty * 16 + y, salt) > 0.55) px(ctx, color, ox + x, oy + y)
  }
}

function grass(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.grass, ox, oy, 16, 16)
  dither(ctx, C.grassDot, ox, oy, 4, tx, ty)
  // Little tufts and the odd pebble.
  for (let i = 0; i < 2; i += 1) {
    if (hash(tx, ty, i + 20) < 0.45) continue
    const x = ox + 2 + Math.floor(hash(tx, ty, i) * 11)
    const y = oy + 3 + Math.floor(hash(tx, ty, i + 9) * 10)
    px(ctx, C.grassTuft, x, y + 1, 1, 2); px(ctx, C.grassTuft, x + 2, y + 1, 1, 2); px(ctx, C.grassTuft, x + 1, y, 1, 3)
    px(ctx, C.grassLight, x + 1, y, 1, 1)
  }
  if (hash(tx, ty, 77) > 0.94) { px(ctx, '#cfc4b6', ox + 9, oy + 10, 3, 2); px(ctx, '#f2ece4', ox + 9, oy + 10, 1, 1) }
}

function tallGrass(ctx: Ctx, ox: number, oy: number, frame: number, tx: number, ty: number) {
  px(ctx, C.tall, ox, oy, 16, 16)
  const sway = (frame + tx + ty) % 2
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 2; col += 1) {
      const bx = ox + col * 8
      const by = oy + row * 8
      // A clump: dark base, blades in an M, bright tips.
      px(ctx, C.tallDark, bx, by + 5, 8, 3)
      for (const [x, h] of [[0, 4], [2, 6], [4, 5], [6, 6]] as Array<[number, number]>) {
        const lean = sway && x % 4 === 2 ? 1 : 0
        px(ctx, C.tallDark, bx + x + lean, by + 8 - h, 2, h)
        px(ctx, C.tallLight, bx + x + lean, by + 8 - h, 1, h - 1)
        px(ctx, C.tallTop, bx + x + lean, by + 8 - h, 1, 1)
      }
    }
  }
}

function water(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, frame: number, map: GameMap) {
  px(ctx, C.water, ox, oy, 16, 16)
  dither(ctx, C.waterDark, ox, oy, 4, tx, ty, 3)
  const wave = (frame + tx * 2 + ty) % 3
  px(ctx, C.waterLight, ox + 1 + wave * 2, oy + 4, 5, 1); px(ctx, C.waterLight, ox + 2 + wave * 2, oy + 3, 3, 1)
  px(ctx, C.waterLight, ox + 9 - wave, oy + 11, 5, 1); px(ctx, C.waterLight, ox + 10 - wave, oy + 10, 3, 1)
  if ((frame + tx + ty * 3) % 5 === 0) px(ctx, '#ffffff', ox + 12, oy + 6, 1, 1)
  const isWater = (x: number, y: number) => ['~', 'P'].includes(tileAt(map, x, y))
  // Foam where water meets land.
  if (!isWater(tx, ty - 1)) { px(ctx, C.foam, ox, oy, 16, 2); px(ctx, C.waterLight, ox, oy + 2, 16, 1) }
  if (!isWater(tx, ty + 1)) px(ctx, C.foam, ox, oy + 14, 16, 2)
  if (!isWater(tx - 1, ty)) px(ctx, C.foam, ox, oy, 2, 16)
  if (!isWater(tx + 1, ty)) px(ctx, C.foam, ox + 14, oy, 2, 16)
}

function tree(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.leafDark, ox, oy, 16, 16)
  px(ctx, C.trunkDark, ox + 6, oy + 12, 4, 4); px(ctx, C.trunk, ox + 7, oy + 12, 2, 4)
  px(ctx, C.leafDark, ox, oy + 1, 16, 12)
  px(ctx, C.leaf, ox + 1, oy + 1, 14, 11)
  px(ctx, C.leaf, ox + 3, oy, 10, 1)
  px(ctx, C.leafMid, ox + 2, oy + 2, 11, 7)
  // Scalloped light leaves.
  for (const [x, y] of [[3, 2], [7, 1], [11, 3], [4, 6], [9, 6]] as Array<[number, number]>) {
    px(ctx, C.leafLight, ox + x, oy + y, 3, 2)
    px(ctx, C.leafShine, ox + x, oy + y, 1, 1)
  }
  for (let i = 0; i < 6; i += 1) px(ctx, C.leafDark, ox + 2 + Math.floor(hash(tx, ty, i) * 12), oy + 3 + Math.floor(hash(tx, ty, i + 5) * 8), 1, 1)
  px(ctx, C.leafDark, ox + 1, oy + 11, 14, 1)
  if (hash(tx, ty, 41) > 0.82) { px(ctx, '#e8483f', ox + 10, oy + 4, 2, 2); px(ctx, '#ffb3a6', ox + 10, oy + 4, 1, 1) }
}

function rock(ctx: Ctx, ox: number, oy: number, tx: number, ty: number, cave = false) {
  if (cave) {
    px(ctx, '#2b1f1a', ox, oy, 16, 16)
    px(ctx, '#3d2e26', ox, oy, 16, 2)
    for (let i = 0; i < 4; i += 1) px(ctx, '#1a120e', ox + Math.floor(hash(tx, ty, i) * 12), oy + 3 + i * 3, 4, 1)
    if (hash(tx, ty, 9) > 0.86) { px(ctx, '#7fe3ff', ox + 6, oy + 7, 2, 3); px(ctx, '#d8f7ff', ox + 6, oy + 7, 1, 1) }
    return
  }
  // Cliff face: blocky stones with bright tops.
  px(ctx, C.rockDark, ox, oy, 16, 16)
  for (const [x, y, w, h] of [[0, 0, 7, 5], [8, 0, 8, 6], [0, 6, 9, 5], [10, 7, 6, 4], [0, 12, 5, 4], [6, 12, 10, 4]] as Array<[number, number, number, number]>) {
    px(ctx, C.rock, ox + x + 1, oy + y + 1, w - 1, h - 1)
    px(ctx, C.rockLight, ox + x + 1, oy + y + 1, w - 1, 1)
    if (hash(tx + x, ty + y) > 0.7) px(ctx, C.rockShine, ox + x + 2, oy + y + 1, 2, 1)
  }
}

function caveFloor(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.cave, ox, oy, 16, 16)
  dither(ctx, C.caveDark, ox, oy, 4, tx, ty, 7)
  for (let i = 0; i < 2; i += 1) px(ctx, C.caveLight, ox + Math.floor(hash(tx, ty, i) * 14), oy + Math.floor(hash(tx, ty, i + 4) * 14), 2, 1)
}

function floorWood(ctx: Ctx, ox: number, oy: number, tx: number, ty: number) {
  px(ctx, C.wood, ox, oy, 16, 16)
  for (let row = 0; row < 4; row += 1) {
    px(ctx, C.woodDark, ox, oy + row * 4 + 3, 16, 1)
    px(ctx, C.woodLight, ox, oy + row * 4, 16, 1)
    const seam = ((tx * 7 + ty * 3 + row * 5) % 12) + 2
    px(ctx, C.woodDark, ox + seam, oy + row * 4, 1, 3)
  }
}

function floorLab(ctx: Ctx, ox: number, oy: number, tint: string, tx: number, ty: number) {
  const odd = (tx + ty) % 2 === 1
  px(ctx, odd ? shade(tint, -0.06) : tint, ox, oy, 16, 16)
  px(ctx, shade(tint, -0.18), ox, oy, 16, 1)
  px(ctx, shade(tint, -0.18), ox, oy, 1, 16)
  px(ctx, shade(tint, 0.5), ox + 2, oy + 2, 4, 1)
  px(ctx, shade(tint, 0.5), ox + 2, oy + 3, 1, 1)
}

function floorBase(ctx: Ctx, map: GameMap, ox: number, oy: number, tx: number, ty: number, tint: string) {
  if (map.area === 'cave') caveFloor(ctx, ox, oy, tx, ty)
  else if (map.outside === 'void') floorOf(ctx, map, ox, oy, tx, ty, tint)
  else if (map.area === 'lab' || map.area === 'academy') floorLab(ctx, ox, oy, tint, tx, ty)
  else floorWood(ctx, ox, oy, tx, ty)
}

/** Paths blend into the grass with a soft, uneven border. */
function pathTile(ctx: Ctx, map: GameMap, ox: number, oy: number, tx: number, ty: number, kind: 'dirt' | 'pave' | 'sand') {
  const base = kind === 'pave' ? C.pave : kind === 'sand' ? C.sand : C.path
  const dot = kind === 'pave' ? C.paveDark : kind === 'sand' ? C.sandDot : C.pathDot
  px(ctx, base, ox, oy, 16, 16)
  if (kind === 'pave') {
    for (let y = 0; y < 16; y += 8) {
      px(ctx, C.paveDark, ox, oy + y + 7, 16, 1)
      const off = ((ty * 2 + y / 8) % 2) * 4
      for (let x = off; x < 16; x += 8) px(ctx, C.paveDark, ox + x, oy + y, 1, 7)
      px(ctx, C.paveLight, ox + 1, oy + y + 1, 5, 1)
    }
  } else {
    for (let i = 0; i < 7; i += 1) {
      const x = Math.floor(hash(tx, ty, i) * 15)
      const y = Math.floor(hash(tx, ty, i + 11) * 15)
      px(ctx, dot, ox + x, oy + y, i % 3 ? 1 : 2, 1)
    }
    px(ctx, kind === 'sand' ? C.sandLight : C.pathLight, ox + Math.floor(hash(tx, ty, 30) * 12), oy + Math.floor(hash(tx, ty, 31) * 12), 2, 1)
  }
  if (kind === 'sand') return
  const grassy = (x: number, y: number) => ['.', ',', 'f', 'T', 't', 'L'].includes(tileAt(map, x, y))
  // Grass creeps over the edges.
  if (grassy(tx, ty - 1)) for (let x = 0; x < 16; x += 2) px(ctx, C.grassDot, ox + x, oy, 2, hash(tx * 16 + x, ty, 1) > 0.5 ? 2 : 1)
  if (grassy(tx, ty + 1)) { px(ctx, C.pathEdge, ox, oy + 15, 16, 1); for (let x = 1; x < 16; x += 3) if (hash(tx * 16 + x, ty, 2) > 0.5) px(ctx, C.grassDot, ox + x, oy + 15, 1, 1) }
  if (grassy(tx - 1, ty)) for (let y = 0; y < 16; y += 2) px(ctx, C.grassDot, ox, oy + y, hash(tx, ty * 16 + y, 3) > 0.5 ? 2 : 1, 2)
  if (grassy(tx + 1, ty)) px(ctx, C.pathEdge, ox + 15, oy, 1, 16)
}

/** Paints the static part of one tile. Animated tiles change with the frame number. */
export function drawTile(ctx: Ctx, map: GameMap, tx: number, ty: number, ox: number, oy: number, frame: number, flags: ReadonlySet<string>) {
  const tile = tileAt(map, tx, ty)
  const tint = map.tint ?? (map.id === 'hall' ? '#e9ddff' : '#e6eef7')
  if (map.outside === 'void' && drawInteriorTile(ctx, map, tx, ty, ox, oy, tint)) return
  switch (tile) {
    case '.': grass(ctx, ox, oy, tx, ty); break
    case ',': tallGrass(ctx, ox, oy, frame, tx, ty); break
    case ':': pathTile(ctx, map, ox, oy, tx, ty, 'dirt'); break
    case '=': pathTile(ctx, map, ox, oy, tx, ty, 'pave'); break
    case 's': pathTile(ctx, map, ox, oy, tx, ty, 'sand'); break
    case 'f': {
      grass(ctx, ox, oy, tx, ty)
      // A little flower bed: four blooms.
      const palettes = [['#ff5f8f', '#ffc2d6'], ['#ffd23f', '#fff4b8'], ['#ffffff', '#ffe3ef'], ['#b77bff', '#e4d1ff']]
      const [petal, light] = palettes[Math.floor(hash(tx, ty, 7) * palettes.length)]
      const bob = (frame + tx) % 2
      for (const [fx, fy] of [[2, 2], [9, 1], [3, 9], [10, 8]] as Array<[number, number]>) {
        px(ctx, C.grassTuft, ox + fx + 1, oy + fy + 3, 1, 3)
        px(ctx, C.outline, ox + fx - 1, oy + fy + bob, 5, 3); px(ctx, C.outline, ox + fx, oy + fy - 1 + bob, 3, 5)
        px(ctx, petal, ox + fx, oy + fy + bob, 3, 3)
        px(ctx, light, ox + fx, oy + fy + bob, 1, 1)
        px(ctx, '#ffe14d', ox + fx + 1, oy + fy + 1 + bob, 1, 1)
      }
      break
    }
    case 'T': tree(ctx, ox, oy, tx, ty); break
    case 't':
      grass(ctx, ox, oy, tx, ty)
      px(ctx, C.leafDark, ox + 1, oy + 4, 14, 11); px(ctx, C.leaf, ox + 2, oy + 4, 12, 9); px(ctx, C.leafLight, ox + 4, oy + 5, 4, 2); px(ctx, C.leafShine, ox + 4, oy + 5, 1, 1)
      break
    case '~': water(ctx, ox, oy, tx, ty, frame, map); break
    case '#': rock(ctx, ox, oy, tx, ty, map.area === 'cave'); break
    case 'r':
      if (map.area === 'cave') caveFloor(ctx, ox, oy, tx, ty)
      else grass(ctx, ox, oy, tx, ty)
      px(ctx, C.outline, ox + 2, oy + 3, 12, 12); px(ctx, C.rockDark, ox + 3, oy + 4, 10, 10); px(ctx, C.rock, ox + 3, oy + 4, 9, 8); px(ctx, C.rockLight, ox + 4, oy + 5, 5, 2); px(ctx, C.rockShine, ox + 5, oy + 5, 2, 1)
      break
    case 'L':
      grass(ctx, ox, oy, tx, ty)
      // A rocky ledge with bright pebbles.
      px(ctx, C.rockDark, ox, oy + 9, 16, 5); px(ctx, C.rock, ox, oy + 9, 16, 3); px(ctx, C.outline, ox, oy + 14, 16, 1)
      for (let x = 1; x < 16; x += 5) { px(ctx, C.rockShine, ox + x, oy + 9, 2, 1); px(ctx, '#ffffff', ox + x, oy + 9, 1, 1) }
      break
    case 'F':
      grass(ctx, ox, oy, tx, ty)
      // White picket fence.
      px(ctx, C.outline, ox, oy + 5, 16, 4); px(ctx, '#e8e4ee', ox, oy + 6, 16, 2)
      px(ctx, C.outline, ox, oy + 10, 16, 3); px(ctx, '#cfc8da', ox, oy + 11, 16, 1)
      for (const x of [1, 9]) { px(ctx, C.outline, ox + x, oy + 2, 6, 13); px(ctx, '#ffffff', ox + x + 1, oy + 3, 4, 11); px(ctx, '#cfc8da', ox + x + 4, oy + 4, 1, 10) }
      break
    case 'P':
      px(ctx, C.wood, ox, oy, 16, 16)
      for (let row = 0; row < 4; row += 1) { px(ctx, C.woodDark, ox, oy + row * 4 + 3, 16, 1); px(ctx, C.woodLight, ox, oy + row * 4, 16, 1) }
      px(ctx, C.woodDark, ox, oy, 1, 16); px(ctx, C.woodDark, ox + 15, oy, 1, 16)
      break
    case 'C':
      grass(ctx, ox, oy, tx, ty)
      if (flags.has(`cut:${map.id}:${tx}:${ty}`)) { px(ctx, '#b88f55', ox + 3, oy + 11, 4, 2); px(ctx, '#b88f55', ox + 9, oy + 12, 3, 2); break }
      px(ctx, C.outline, ox, oy + 1, 16, 15); px(ctx, '#8a5a2a', ox + 1, oy + 2, 14, 13); px(ctx, '#c4925a', ox + 1, oy + 2, 14, 6); px(ctx, '#b88050', ox + 1, oy + 9, 14, 5)
      px(ctx, '#e8d3a2', ox + 1, oy + 4, 14, 2); px(ctx, '#e8d3a2', ox + 1, oy + 11, 14, 2); px(ctx, '#5a3a1a', ox + 7, oy + 2, 1, 13)
      break
    case 'W': {
      const below = tileAt(map, tx, ty + 1)
      const topWall = ty <= 1 && below !== 'W' && below !== ' '
      if (topWall) {
        // Back wall: wallpaper, a baseboard and the odd window.
        const paper = map.area === 'lab' ? '#dfe8f4' : map.area === 'academy' ? '#e6d8ff' : '#f2e3c8'
        px(ctx, paper, ox, oy, 16, 16)
        for (let x = 0; x < 16; x += 4) px(ctx, shade(paper, -0.06), ox + x, oy, 2, 13)
        px(ctx, shade(paper, -0.35), ox, oy + 13, 16, 3)
        px(ctx, shade(paper, 0.4), ox, oy + 13, 16, 1)
        if (tx % 4 === 2) { px(ctx, C.outline, ox + 3, oy + 2, 10, 8); px(ctx, '#9fd8ff', ox + 4, oy + 3, 8, 6); px(ctx, '#ffffff', ox + 5, oy + 4, 2, 2); px(ctx, C.outline, ox + 7, oy + 3, 1, 6) }
      } else {
        px(ctx, '#3a3048', ox, oy, 16, 16)
        px(ctx, '#4a3e5a', ox + 1, oy + 1, 14, 14)
      }
      break
    }
    case '_': floorWood(ctx, ox, oy, tx, ty); break
    case '-': floorLab(ctx, ox, oy, tint, tx, ty); break
    case 'R': {
      const edge = (x: number, y: number) => tileAt(map, x, y) !== 'R'
      px(ctx, '#d9535c', ox, oy, 16, 16)
      for (let i = 0; i < 16; i += 4) px(ctx, '#b83c46', ox + i, oy + ((i / 4) % 2 ? 4 : 10), 2, 2)
      if (edge(tx, ty - 1)) px(ctx, '#ffd23f', ox, oy + 1, 16, 2)
      if (edge(tx, ty + 1)) px(ctx, '#ffd23f', ox, oy + 13, 16, 2)
      if (edge(tx - 1, ty)) px(ctx, '#ffd23f', ox + 1, oy, 2, 16)
      if (edge(tx + 1, ty)) px(ctx, '#ffd23f', ox + 13, oy, 2, 16)
      break
    }
    case 'm':
      if (map.area === 'cave') { caveFloor(ctx, ox, oy, tx, ty); px(ctx, '#140e0a', ox + 2, oy + 4, 12, 12); px(ctx, '#2b1d14', ox + 4, oy + 5, 8, 2); break }
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox + 1, oy + 4, 14, 10); px(ctx, '#3d6fd0', ox + 2, oy + 5, 12, 8); px(ctx, '#5f8fe8', ox + 3, oy + 6, 10, 2)
      break
    case 'c': caveFloor(ctx, ox, oy, tx, ty); break
    case 'K':
      px(ctx, C.outline, ox, oy, 16, 16)
      px(ctx, C.woodDark, ox + 1, oy + 1, 14, 15)
      for (let shelf = 0; shelf < 3; shelf += 1) {
        px(ctx, '#5a3a1a', ox + 1, oy + 5 + shelf * 5, 14, 1)
        for (let b = 0; b < 5; b += 1) px(ctx, ['#e8483f', '#3d7be0', '#36b26b', '#ffd23f', '#9b59d0'][(b + shelf + tx) % 5], ox + 2 + b * 3, oy + 1 + shelf * 5 + (b % 2), 2, 4 - (b % 2))
      }
      break
    case 'B': {
      floorWood(ctx, ox, oy, tx, ty)
      const top = tileAt(map, tx, ty - 1) !== 'B'
      px(ctx, C.outline, ox + 1, oy, 14, 16)
      px(ctx, '#3d7be0', ox + 2, oy, 12, 15)
      if (top) { px(ctx, '#ffffff', ox + 3, oy + 2, 10, 5); px(ctx, '#d8e6ff', ox + 3, oy + 6, 10, 1) }
      px(ctx, '#5f8fe8', ox + 2, oy + (top ? 8 : 0), 12, 2)
      break
    }
    case 'D':
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox, oy + 2, 16, 13); px(ctx, C.woodDark, ox + 1, oy + 3, 14, 10); px(ctx, C.woodLight, ox + 1, oy + 3, 14, 3)
      px(ctx, C.outline, ox + 1, oy + 13, 2, 3); px(ctx, C.outline, ox + 13, oy + 13, 2, 3)
      if (hash(tx, ty, 3) > 0.6) { px(ctx, '#f4f1ea', ox + 4, oy + 2, 5, 3); px(ctx, '#3d7be0', ox + 10, oy + 2, 3, 2) }
      break
    case 'X':
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox, oy + 1, 16, 14); px(ctx, '#e8e2f0', ox, oy + 2, 16, 12); px(ctx, '#ffffff', ox, oy + 2, 16, 3); px(ctx, '#b8acd0', ox, oy + 11, 16, 3)
      break
    case 'V': {
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox + 1, oy + 1, 14, 11)
      const glow = ['#5fd17a', '#72dcff', '#ffd23f'][(frame + tx) % 3]
      px(ctx, '#0e1a2a', ox + 2, oy + 2, 12, 8)
      px(ctx, glow, ox + 3, oy + 3, 6, 1); px(ctx, '#ffffff', ox + 3, oy + 5, 8, 1); px(ctx, glow, ox + 3, oy + 7, 4, 1)
      px(ctx, C.outline, ox + 6, oy + 12, 4, 3)
      break
    }
    case '3':
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox + 1, oy + 1, 14, 14); px(ctx, '#3a3f55', ox + 2, oy + 2, 12, 12); px(ctx, '#d8dde6', ox + 3, oy + 3, 10, 8)
      px(ctx, '#f28c28', ox + 4 + (frame % 3) * 2, oy + 4, 3, 2); px(ctx, '#7b3fd6', ox + 5, oy + 8, 6, 3); px(ctx, '#5fd17a', ox + 12, oy + 12, 1, 1)
      break
    case 'G':
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox + 3, oy + 9, 10, 7); px(ctx, '#b8643a', ox + 4, oy + 10, 8, 5); px(ctx, '#d98a5a', ox + 4, oy + 10, 8, 1)
      px(ctx, C.outline, ox + 1, oy, 14, 11); px(ctx, C.leaf, ox + 2, oy + 1, 12, 9); px(ctx, C.leafLight, ox + 4, oy + 2, 4, 3); px(ctx, C.leafShine, ox + 4, oy + 2, 1, 1)
      break
    case 'A':
      floorBase(ctx, map, ox, oy, tx, ty, tint)
      px(ctx, C.outline, ox, oy + 3, 16, 13); px(ctx, C.woodDark, ox + 1, oy + 4, 14, 11); px(ctx, '#1f6fb8', ox + 2, oy + 5, 12, 7)
      px(ctx, '#d8dde6', ox + 3, oy + 6, 4, 2); px(ctx, '#ffd23f', ox + 8, oy + 9, 4, 1)
      px(ctx, frame % 2 ? '#ff3b3b' : '#5a1a1a', ox + 11, oy + 6, 2, 2)
      break
    case 'l':
      if (map.area !== 'cave') {
        floorBase(ctx, map, ox, oy, tx, ty, tint)
        px(ctx, C.outline, ox, oy + 1, 16, 15); px(ctx, '#3a3f55', ox + 1, oy + 2, 14, 13); px(ctx, '#d8dde6', ox + 2, oy + 3, 12, 4)
        px(ctx, '#ff3b3b', ox + 2 + (frame * 4) % 12, oy + 8, 2, 2); px(ctx, '#7a8396', ox + 2, oy + 11, 12, 3)
        break
      }
      rock(ctx, ox, oy, tx, ty, true)
      if (map.id === 'lasercave' && flags.has('segfault1')) break
      px(ctx, frame % 2 ? '#ff3b3b' : '#ff7a7a', ox, oy + 7, 16, 2)
      px(ctx, '#ffd0d0', ox, oy + 7 + (frame % 2), 16, 1)
      break
    default:
      px(ctx, '#0b0912', ox, oy, 16, 16)
  }
}

/** Buildings are painted whole, over the ground they stand on: shingled roofs, timber walls, a door with an awning. */
export function drawBuilding(ctx: Ctx, building: Building, ox: number, oy: number, frame: number) {
  const w = building.w * 16
  const h = building.h * 16
  const door = doorOf(building)
  const dx = ox + (door.x - building.x) * 16
  if (building.kind === 'cave') {
    // A rocky mound with a dark arch, like a hole in the cliff.
    const rock = '#a88a74'
    ctx.fillStyle = 'rgba(30, 20, 10, 0.25)'
    ctx.fillRect(ox + 2, oy + h - 2, w, 4)
    px(ctx, '#3a2c24', ox, oy + 6, w, h - 6)
    px(ctx, '#3a2c24', ox + 4, oy + 1, w - 8, 6)
    px(ctx, rock, ox + 1, oy + 7, w - 2, h - 8)
    px(ctx, rock, ox + 5, oy + 2, w - 10, 6)
    for (let x = 2; x < w - 2; x += 4) { px(ctx, '#c6a88e', ox + x, oy + 8, 1, h - 12); px(ctx, '#7e6656', ox + x + 3, oy + 8, 1, h - 12) }
    px(ctx, '#86cb5e', ox + 5, oy + 1, w - 10, 3)
    px(ctx, '#a8e07c', ox + 6, oy + 1, w - 12, 1)
    px(ctx, '#3a2c24', dx + 1, oy + h - 14, 14, 14)
    px(ctx, '#3a2c24', dx + 3, oy + h - 16, 10, 2)
    px(ctx, '#120c0a', dx + 2, oy + h - 13, 12, 13)
    px(ctx, '#120c0a', dx + 4, oy + h - 15, 8, 2)
    px(ctx, '#2b1d14', dx + 4, oy + h - 11, 8, 2)
    return
  }
  const academy = building.kind === 'academy'
  const roofH = Math.min(h - 22, Math.max(20, Math.floor(h * (academy ? 0.4 : 0.52))))
  const wallH = h - roofH
  const wallColor = academy ? '#fff2c2' : building.kind === 'lab' ? '#eef3fa' : building.kind === 'station' ? '#fff3f0' : building.kind === 'mart' ? '#eef4ff' : building.kind === 'makerspace' ? '#ffeccc' : '#f6e6c8'
  const ink = '#2a1a22'
  // Ground shadow to the bottom right.
  ctx.fillStyle = 'rgba(20, 30, 20, 0.26)'
  ctx.fillRect(ox + 4, oy + h - 1, w, 4)
  ctx.fillRect(ox + w, oy + roofH, 4, wallH + 2)
  // Walls: planks, timber corners, a stone foundation.
  px(ctx, ink, ox, oy + roofH - 2, w, wallH + 2)
  px(ctx, wallColor, ox + 1, oy + roofH - 1, w - 2, wallH)
  for (let y = oy + roofH + 2; y < oy + h - 4; y += 4) { px(ctx, shade(wallColor, -0.08), ox + 1, y, w - 2, 1); px(ctx, shade(wallColor, 0.35), ox + 1, y + 1, w - 2, 1) }
  const timber = academy ? '#6a2fb8' : '#8a5a32'
  for (const tx of [ox + 1, ox + w - 4]) { px(ctx, timber, tx, oy + roofH - 1, 3, wallH - 3); px(ctx, shade(timber, 0.3), tx, oy + roofH - 1, 1, wallH - 3) }
  px(ctx, '#8e8884', ox + 1, oy + h - 5, w - 2, 4)
  for (let x = 0; x < w - 2; x += 5) { px(ctx, '#b4aea8', ox + 2 + x + ((x / 5) % 2) * 2, oy + h - 5, 3, 1); px(ctx, '#6a6460', ox + 1 + x, oy + h - 3, 1, 2) }
  px(ctx, ink, ox, oy + h - 1, w, 1)
  // Chimney.
  if (building.kind === 'house' || building.kind === 'makerspace') {
    const cx = ox + w - 14
    px(ctx, ink, cx - 1, oy - 9, 9, 14); px(ctx, '#b0533a', cx, oy - 8, 7, 12); px(ctx, '#d97a5a', cx, oy - 8, 2, 12)
    for (let y = oy - 6; y < oy + 3; y += 3) px(ctx, '#8a3a26', cx, y, 7, 1)
    px(ctx, ink, cx - 2, oy - 10, 11, 3); px(ctx, '#6a6460', cx - 1, oy - 9, 9, 1)
  }
  // Roof: overhanging eaves, scalloped shingle rows lit from above, a ridge cap.
  const roof = building.roof
  const rx = ox - 3
  const rw = w + 6
  px(ctx, shade(roof, -0.62), rx - 1, oy - 2, rw + 2, roofH + 3)
  for (let y = 0; y < roofH; y += 1) {
    const row = Math.floor(y / 5)
    const inRow = y % 5
    const tone = shade(roof, 0.14 - (y / roofH) * 0.3)
    px(ctx, tone, rx, oy - 1 + y, rw, 1)
    if (inRow === 0) px(ctx, shade(tone, 0.22), rx, oy - 1 + y, rw, 1)
    if (inRow === 4) for (let x = (row % 2) * 2; x < rw; x += 4) { px(ctx, shade(tone, -0.28), rx + x, oy - 1 + y, 1, 1); px(ctx, shade(tone, -0.18), rx + x + 1, oy - 1 + y, 2, 1) }
  }
  px(ctx, shade(roof, -0.3), rx, oy - 1, 2, roofH)
  px(ctx, shade(roof, -0.3), rx + rw - 2, oy - 1, 2, roofH)
  px(ctx, shade(roof, 0.38), rx + 2, oy - 1, rw - 4, 2)
  px(ctx, shade(roof, -0.5), rx, oy + roofH - 3, rw, 2)
  px(ctx, shade(roof, -0.62), rx - 1, oy + roofH - 1, rw + 2, 1)
  ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
  ctx.fillRect(ox + 1, oy + roofH, w - 2, 3)
  if (academy) {
    // Purple roof, yellow trim, a clock tower and banners: the school colors.
    px(ctx, '#ffd23f', rx, oy + roofH - 5, rw, 2)
    const cx = ox + w / 2
    px(ctx, ink, cx - 13, oy - 14, 26, 18); px(ctx, '#ffd23f', cx - 12, oy - 13, 24, 16); px(ctx, '#e0b020', cx - 12, oy + 1, 24, 2)
    px(ctx, ink, cx - 7, oy - 10, 14, 11); px(ctx, '#ffffff', cx - 6, oy - 9, 12, 9)
    px(ctx, ink, cx, oy - 8, 1, 4); px(ctx, ink, cx, oy - 5, 3, 1)
    px(ctx, ink, cx - 15, oy - 18, 30, 5); px(ctx, '#6a2fb8', cx - 14, oy - 17, 28, 3)
    for (let x = 10; x < w - 10; x += 18) { px(ctx, '#e8dcff', ox + x, oy + roofH + 2, 5, wallH - 8); px(ctx, '#c9b8f0', ox + x + 4, oy + roofH + 2, 1, wallH - 8) }
    for (const bx of [ox + 7, ox + w - 15]) { px(ctx, ink, bx, oy + roofH + 2, 8, 16); px(ctx, '#6a2fb8', bx + 1, oy + roofH + 3, 6, 14); px(ctx, '#ffd23f', bx + 1, oy + roofH + 9, 6, 2); px(ctx, '#6a2fb8', bx + 2, oy + roofH + 17, 4, 1) }
  }
  // Windows: frames, sky reflections, shutters and flower boxes.
  const slots = Math.max(1, Math.floor(building.w / 2))
  for (let i = 0; i < slots; i += 1) {
    const wx = Math.round(ox + 6 + i * ((w - 12) / slots) + ((w - 12) / slots - 10) / 2)
    if (Math.abs(wx + 5 - (dx + 8)) < 13) continue
    const wy = oy + roofH + 4
    if (building.kind === 'house') { px(ctx, shade(roof, -0.15), wx - 4, wy, 3, 10); px(ctx, shade(roof, -0.15), wx + 11, wy, 3, 10); px(ctx, shade(roof, 0.15), wx - 4, wy, 1, 10); px(ctx, shade(roof, 0.15), wx + 11, wy, 1, 10) }
    px(ctx, ink, wx - 1, wy - 1, 12, 11)
    px(ctx, '#fbf6ee', wx, wy, 10, 9)
    const lit = (frame + i) % 7 === 0
    px(ctx, lit ? '#fff2b0' : '#8fd0ff', wx + 1, wy + 1, 8, 7)
    px(ctx, lit ? '#ffe080' : '#6fb4ec', wx + 1, wy + 5, 8, 3)
    px(ctx, '#ffffff', wx + 2, wy + 2, 1, 2); px(ctx, '#ffffff', wx + 3, wy + 1, 1, 1)
    px(ctx, '#fbf6ee', wx + 5, wy + 1, 1, 7); px(ctx, '#fbf6ee', wx + 1, wy + 4, 8, 1)
    if (building.kind === 'house' || academy || building.kind === 'makerspace') {
      px(ctx, ink, wx - 2, wy + 9, 14, 4); px(ctx, '#8a5a32', wx - 1, wy + 10, 12, 2)
      for (const [fx, c] of [[0, '#ff5f8f'], [3, '#ffd23f'], [6, '#ffffff'], [9, '#ff5f8f']] as Array<[number, string]>) { px(ctx, '#3f9a46', wx - 1 + fx, wy + 9, 3, 1); px(ctx, c, wx + fx, wy + 8, 1, 1) }
    }
  }
  // Door: frame, planks, a knob, an awning and a lantern.
  const doorColor = building.kind === 'station' ? '#e8483f' : building.kind === 'mart' ? '#3d7be0' : building.kind === 'lab' ? shade(building.roof, -0.2) : academy ? '#6a2fb8' : '#9a6232'
  px(ctx, ink, dx + 1, oy + h - 17, 14, 17)
  px(ctx, '#6e4424', dx + 2, oy + h - 16, 12, 16)
  px(ctx, doorColor, dx + 3, oy + h - 15, 10, 13)
  for (const lx of [dx + 5, dx + 8, dx + 11]) px(ctx, shade(doorColor, -0.18), lx, oy + h - 14, 1, 12)
  px(ctx, shade(doorColor, 0.3), dx + 3, oy + h - 15, 10, 1)
  px(ctx, '#bfe8ff', dx + 5, oy + h - 13, 6, 3)
  px(ctx, '#ffd23f', dx + 11, oy + h - 8, 1, 2)
  px(ctx, shade(roof, -0.6), dx - 1, oy + h - 20, 18, 4)
  px(ctx, roof, dx, oy + h - 19, 16, 2)
  px(ctx, shade(roof, 0.3), dx, oy + h - 19, 16, 1)
  for (let x = 0; x < 16; x += 4) px(ctx, shade(roof, -0.3), dx + x + 1, oy + h - 17, 2, 1)
  const glow = frame % 2 ? 0.32 : 0.26
  ctx.fillStyle = `rgba(255, 220, 120, ${glow})`
  ctx.beginPath(); ctx.arc(dx + 17, oy + h - 11, 5, 0, Math.PI * 2); ctx.fill()
  px(ctx, ink, dx + 15, oy + h - 14, 4, 6); px(ctx, '#ffe680', dx + 16, oy + h - 13, 2, 4)
  px(ctx, '#b4aea8', dx + 2, oy + h - 1, 12, 2)
  // Signs above the door.
  if (building.kind === 'station') { px(ctx, ink, dx + 2, oy + roofH - 12, 12, 11); px(ctx, '#ffffff', dx + 3, oy + roofH - 11, 10, 9); px(ctx, '#e8483f', dx + 7, oy + roofH - 10, 2, 7); px(ctx, '#e8483f', dx + 5, oy + roofH - 8, 6, 3) }
  if (building.kind === 'mart') { px(ctx, ink, dx - 2, oy + roofH - 12, 20, 11); px(ctx, '#ffffff', dx - 1, oy + roofH - 11, 18, 9); pixelText(ctx, 'MART', dx + 1, oy + roofH - 9, '#3d7be0') }
  if (building.label) {
    const size = academy ? 2 : 1
    const textW = building.label.length * 4 * size - size
    const ly = academy ? oy + roofH - 19 : oy + roofH - 12
    const lx = ox + Math.floor((w - textW) / 2)
    px(ctx, ink, lx - 4, ly - 3, textW + 8, 5 * size + 6)
    px(ctx, academy ? '#6a2fb8' : '#2b2230', lx - 3, ly - 2, textW + 6, 5 * size + 4)
    px(ctx, academy ? '#ffd23f' : '#5a4a6a', lx - 3, ly - 2, textW + 6, 1)
    pixelText(ctx, building.label, lx, ly, academy ? '#ffd23f' : '#ffffff', size)
  }
  if (building.kind === 'makerspace') {
    const gx = ox + 10
    const gy = oy + 6
    px(ctx, ink, gx - 1, gy + 1, 12, 8); px(ctx, ink, gx + 1, gy - 1, 8, 12)
    px(ctx, '#ffd23f', gx, gy + 2, 10, 6); px(ctx, '#ffd23f', gx + 2, gy, 6, 10); px(ctx, '#f28c28', gx + 3, gy + 3, 4, 4); px(ctx, ink, gx + 4, gy + 4, 2, 2)
  }
}
