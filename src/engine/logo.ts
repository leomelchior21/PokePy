// The PYXIES logo, drawn as pixel art: chunky gold letters with a purple extrusion, a rim of light,
// a shine that sweeps across now and then, and twinkling sparks. No image or font files.

type Ctx = CanvasRenderingContext2D

const glyphs: Record<string, string[]> = {
  P: ['#######.', '########', '###..###', '###..###', '###..###', '########', '#######.', '###.....', '###.....', '###.....', '###.....', '###.....'],
  Y: ['###...###', '###...###', '###...###', '###...###', '####.####', '.#######.', '..#####..', '...###...', '...###...', '...###...', '...###...', '...###...'],
  X: ['###...###', '###...###', '###...###', '.###.###.', '..#####..', '...###...', '...###...', '..#####..', '.###.###.', '###...###', '###...###', '###...###'],
  I: ['#####', '#####', '.###.', '.###.', '.###.', '.###.', '.###.', '.###.', '.###.', '.###.', '#####', '#####'],
  E: ['########', '########', '###.....', '###.....', '###.....', '#######.', '#######.', '###.....', '###.....', '###.....', '########', '########'],
  S: ['.#######', '########', '###.....', '###.....', '###.....', '#######.', '.#######', '.....###', '.....###', '.....###', '########', '#######.'],
}

const WORD = 'PYXIES'
const GAP = 1
const LEFT = 5
const TOP = 6
const DEPTH = 2
const ROWS = 12
const face = ['#fff6c0', '#fff0a0', '#ffe878', '#ffe060', '#ffd84a', '#ffd23f', '#ffc838', '#ffbe32', '#ffb22e', '#ffa62b', '#f99a2a', '#f28c28']
const sides = ['#6a2fb8', '#45208c']
const OUTLINE = '#170b30'

const letterX: number[] = []
let wordWidth = 0
for (const letter of WORD) { letterX.push(wordWidth); wordWidth += glyphs[letter][0].length + GAP }
wordWidth -= GAP

export const LOGO_W = wordWidth + LEFT * 2
export const LOGO_H = ROWS + TOP + DEPTH + 4

const sparks: Array<[number, number, number]> = [[2, 4, 0], [LOGO_W - 4, 3, 1.7], [LOGO_W - 2, LOGO_H - 7, 3.1], [1, LOGO_H - 6, 4.4], [Math.round(LOGO_W * 0.52), 1, 2.4]]

function filled(letter: string, x: number, y: number): boolean {
  const rows = glyphs[letter]
  return y >= 0 && y < ROWS && x >= 0 && x < rows[0].length && rows[y][x] === '#'
}

/** Paints one frame of the logo. `t` is in seconds; the letters bob in a slow wave. */
export function drawLogo(ctx: Ctx, t: number) {
  ctx.clearRect(0, 0, LOGO_W, LOGO_H)
  const px = (color: string, x: number, y: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, 1, 1) }
  const sweep = (t % 5) * 34 - 20
  WORD.split('').forEach((letter, i) => {
    const rows = glyphs[letter]
    const w = rows[0].length
    const ox = LEFT + letterX[i]
    const oy = TOP + Math.round(Math.sin(t * 2.2 - i * 0.7) * 0.9)
    // A soft drop shadow, then a thick outline that also wraps the extrusion.
    ctx.fillStyle = 'rgba(10, 4, 24, 0.35)'
    for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < w; x += 1) if (filled(letter, x, y)) ctx.fillRect(ox + x + 1, oy + y + DEPTH + 2, 1, 1)
    for (let d = 0; d <= DEPTH; d += 1) for (let y = -1; y <= ROWS; y += 1) for (let x = -1; x <= w; x += 1) {
      if (filled(letter, x, y) || filled(letter, x - 1, y) || filled(letter, x + 1, y) || filled(letter, x, y - 1) || filled(letter, x, y + 1)) px(OUTLINE, ox + x, oy + y + d)
    }
    for (let d = DEPTH; d >= 1; d -= 1) for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < w; x += 1) if (filled(letter, x, y)) px(sides[d - 1], ox + x, oy + y + d)
    for (let y = 0; y < ROWS; y += 1) for (let x = 0; x < w; x += 1) {
      if (!filled(letter, x, y)) continue
      let color = face[y]
      // Light from above: the top edge of every stroke catches it.
      if (!filled(letter, x, y - 1)) color = y < 4 ? '#ffffff' : face[Math.max(0, y - 4)]
      const band = ox + x + y * 0.6 - sweep
      if (band > 0 && band < 2.5) color = '#ffffff'
      px(color, ox + x, oy + y)
    }
  })
  for (const [x, y, phase] of sparks) {
    const k = Math.sin(t * 2.4 + phase)
    if (k < 0.2) continue
    px('#ffffff', x, y)
    if (k > 0.6) { px('#ffe680', x - 1, y); px('#ffe680', x + 1, y); px('#ffe680', x, y - 1); px('#ffe680', x, y + 1) }
  }
}
