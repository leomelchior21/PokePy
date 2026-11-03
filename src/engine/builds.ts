// The things players build at the Maker Bench, drawn in code: the climbing tower on the Route 2
// cliff, the catapult on Hackathon Road, and the Academy gate it opens. Each one can be drawn part
// built (progress from 0 to 1), so the runtime can animate the build instead of popping it in.
type Ctx = CanvasRenderingContext2D

const INK = '#1b1626'
const WOOD = { dark: '#5e3a20', mid: '#8a5a32', base: '#b07a44', light: '#d29a5e', shine: '#ecc08a' }
const ROPE = '#e2cf9a'

const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)) }
const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
/** How far along one part of a build is, when the whole build runs from 0 to 1. */
export const stage = (progress: number, from: number, to: number) => clamp01((progress - from) / (to - from))
/** Ease out with a little bounce: parts drop into place and settle. */
const settle = (k: number) => (k >= 1 ? 1 : 1 - Math.pow(1 - k, 3) * Math.cos(k * 4))

/** A wooden post with an ink outline and a lit left edge. */
function post(ctx: Ctx, x: number, y: number, w: number, h: number) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, INK)
  rect(ctx, x, y, w, h, WOOD.mid)
  rect(ctx, x, y, 1, h, WOOD.light)
  rect(ctx, x + w - 1, y, 1, h, WOOD.dark)
}

/** A plank lying across, with grain and nail heads. */
function plank(ctx: Ctx, x: number, y: number, w: number, h = 3, tone = 0) {
  rect(ctx, x - 1, y - 1, w + 2, h + 2, INK)
  rect(ctx, x, y, w, h, tone ? WOOD.base : WOOD.light)
  rect(ctx, x, y, w, 1, WOOD.shine)
  rect(ctx, x, y + h - 1, w, 1, WOOD.mid)
  rect(ctx, x + 1, y + 1, 1, 1, '#4a3a30')
  rect(ctx, x + w - 2, y + 1, 1, 1, '#4a3a30')
}

/** A diagonal brace from (x0, y0) to (x1, y1), two pixels thick. */
function brace(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))
  for (let i = 0; i <= steps; i += 1) {
    const x = Math.round(x0 + ((x1 - x0) * i) / steps)
    const y = Math.round(y0 + ((y1 - y0) * i) / steps)
    rect(ctx, x, y, 2, 2, WOOD.dark)
    rect(ctx, x, y, 1, 1, WOOD.base)
  }
}

/**
 * The climbing tower: a wooden scaffold against the cliff with stair treads up the middle.
 * (x, y) is the top-left of the site, w and h its size in pixels. It grows from the ground up.
 */
export function drawTower(ctx: Ctx, x: number, y: number, w: number, h: number, progress = 1) {
  if (progress <= 0) return
  const bottom = y + h
  const top = bottom - (h + 6) * progress
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - 6, top, w + 12, bottom - top + 8)
  ctx.clip()
  // Shadow on the rock behind the scaffold.
  ctx.fillStyle = 'rgba(20, 12, 8, 0.35)'
  ctx.fillRect(x + 2, y - 2, w, h + 2)
  // Stone footings.
  for (const fx of [x - 3, x + w - 5]) { rect(ctx, fx - 1, bottom - 4, 10, 7, INK); rect(ctx, fx, bottom - 3, 8, 5, '#9a948c'); rect(ctx, fx, bottom - 3, 8, 1, '#c8c2b8') }
  // Back braces, one X per level.
  const levels = Math.max(1, Math.round(h / 16))
  for (let i = 0; i < levels; i += 1) {
    const ly = y + i * 16
    brace(ctx, x + 2, ly + 2, x + w - 4, ly + 14)
    brace(ctx, x + w - 4, ly + 2, x + 2, ly + 14)
  }
  // Stair treads up the middle: the way students climb.
  for (let ty = bottom - 5; ty > y - 4; ty -= 4) plank(ctx, x + 5, ty, w - 10, 2, Math.round((bottom - ty) / 4) % 2)
  // Side rails and level beams.
  post(ctx, x, y - 6, 3, h + 6)
  post(ctx, x + w - 3, y - 6, 3, h + 6)
  for (let i = 0; i <= levels; i += 1) {
    const ly = y + i * 16 - (i === 0 ? 4 : 2)
    rect(ctx, x - 1, ly - 1, 5, 4, INK); rect(ctx, x, ly, 3, 2, WOOD.light)
    rect(ctx, x + w - 4, ly - 1, 5, 4, INK); rect(ctx, x + w - 3, ly, 3, 2, WOOD.light)
  }
  // Rope lashings at every joint.
  for (let i = 0; i <= levels; i += 1) for (const rx of [x, x + w - 3]) rect(ctx, rx, y + i * 16 - 3, 3, 1, ROPE)
  // The landing on top, resting on the grass above the cliff.
  plank(ctx, x - 2, y - 7, w + 4, 3)
  ctx.restore()
  // While it is going up, the next plank hangs in the air above the top.
  if (progress < 1) {
    const k = (progress * levels * 4) % 1
    plank(ctx, x + 5, top - 10 + k * 6, w - 10, 2)
  }
}

/** The empty site: the old stairs' broken stumps, survey stakes with flags, and a chalk outline. */
export function drawTowerSite(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const bottom = y + h
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.setLineDash([3, 2])
  ctx.lineWidth = 1
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3)
  ctx.setLineDash([])
  // Snapped stumps of the old stairs.
  for (const [sx, sh] of [[x + 2, 7], [x + w - 6, 4]] as Array<[number, number]>) { rect(ctx, sx - 1, bottom - sh - 1, 5, sh + 2, INK); rect(ctx, sx, bottom - sh, 3, sh, WOOD.mid); rect(ctx, sx, bottom - sh, 3, 1, WOOD.shine) }
  // Stakes with red flags at the foot.
  for (const sx of [x - 2, x + w]) {
    rect(ctx, sx - 1, bottom - 2, 3, 12, INK); rect(ctx, sx, bottom - 1, 1, 10, WOOD.light)
    rect(ctx, sx + 1, bottom - 1, 5, 4, INK); rect(ctx, sx + 1, bottom, 4, 2, '#e8483f')
  }
  // A broken plank on the ground.
  rect(ctx, x + 6, bottom + 5, 13, 4, INK); rect(ctx, x + 7, bottom + 6, 11, 2, WOOD.base); rect(ctx, x + 7, bottom + 6, 11, 1, WOOD.light)
}

function wheel(ctx: Ctx, cx: number, cy: number, r: number, spin: number) {
  ctx.fillStyle = INK
  ctx.beginPath(); ctx.arc(cx, cy, r + 1, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = WOOD.mid
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = WOOD.dark
  ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, Math.PI * 2); ctx.fill()
  for (let i = 0; i < 4; i += 1) {
    const a = spin + (i * Math.PI) / 2
    rect(ctx, cx + Math.cos(a) * (r - 2) - 0.5, cy + Math.sin(a) * (r - 2) - 0.5, 1.5, 1.5, WOOD.light)
  }
  rect(ctx, cx - 1, cy - 1, 2, 2, '#c8c2b8')
}

/** One rock, for the catapult's bucket, the throws and the basket. */
export function drawRock(ctx: Ctx, cx: number, cy: number, size = 4) {
  rect(ctx, cx - size / 2 - 1, cy - size / 2 - 1, size + 2, size + 2, INK)
  rect(ctx, cx - size / 2, cy - size / 2, size, size, '#9a948c')
  rect(ctx, cx - size / 2, cy - size / 2, size - 1, 1, '#d4cec4')
  rect(ctx, cx + size / 2 - 1, cy - size / 2 + 1, 1, size - 1, '#6e6862')
}

/** Cocked (0), the bucket rests low behind; thrown (1), it has swung up over the top. */
const armAngle = (arm: number) => Math.PI * (0.92 - arm * 0.62)

/** Where the catapult's bucket is, so a thrown rock can start from it. */
export function catapultBucket(x: number, y: number, arm: number): { x: number; y: number } {
  const angle = armAngle(arm)
  return { x: x + 14 + Math.cos(angle) * 17, y: y - 2 - Math.sin(angle) * 17 * 0.8 }
}

/**
 * The catapult, about 34 by 30 pixels. (x, y) is the top-left of its two ground tiles. Parts drop
 * in one by one as progress goes from 0 to 1. arm: 0 is cocked back with a rock, 1 is thrown.
 */
export function drawCatapult(ctx: Ctx, x: number, y: number, progress = 1, arm = 0, loaded = true) {
  const drop = (from: number, to: number) => (1 - settle(stage(progress, from, to))) * -14
  const shown = (from: number) => progress > from
  const base = y + 12
  // Base frame and wheels.
  if (shown(0)) {
    const d = drop(0, 0.25)
    rect(ctx, x + 1, base - 4 + d, 30, 6, INK)
    rect(ctx, x + 2, base - 3 + d, 28, 4, WOOD.base)
    rect(ctx, x + 2, base - 3 + d, 28, 1, WOOD.light)
    wheel(ctx, x + 7, base + 2 + d, 4, progress * 6)
    wheel(ctx, x + 25, base + 2 + d, 4, progress * 6)
  }
  // The A-frame that holds the arm's axle.
  const ax = x + 14
  const ay = base - 14
  if (shown(0.25)) {
    const d = drop(0.25, 0.5)
    brace(ctx, x + 8, base - 4 + d, ax, ay + d)
    brace(ctx, x + 22, base - 4 + d, ax, ay + d)
    rect(ctx, ax - 3, ay - 2 + d, 7, 4, INK)
    rect(ctx, ax - 2, ay - 1 + d, 5, 2, WOOD.light)
  }
  // The throwing arm: a counterweight box on the short end, a bucket on the long end.
  if (shown(0.5)) {
    const d = drop(0.5, 0.75)
    const angle = armAngle(arm)
    const short = 7
    const bucket = catapultBucket(x, y, arm)
    const bx = bucket.x
    const by = bucket.y + d
    const wx = ax - Math.cos(angle) * short
    const wy = ay + d + Math.sin(angle) * short * 0.8
    ctx.strokeStyle = INK
    ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(bx, by); ctx.stroke()
    ctx.strokeStyle = WOOD.light
    ctx.lineWidth = 2
    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(bx, by); ctx.stroke()
    rect(ctx, wx - 4, wy - 3, 8, 7, INK)
    rect(ctx, wx - 3, wy - 2, 6, 5, '#7a746c')
    rect(ctx, wx - 3, wy - 2, 6, 1, '#a8a29a')
    if (shown(0.75)) {
      rect(ctx, bx - 4, by - 3, 8, 5, INK)
      rect(ctx, bx - 3, by - 2, 6, 3, WOOD.mid)
      if (loaded) drawRock(ctx, bx, by - 3, 4)
    }
  }
  // The rope that holds the arm down until it's released.
  if (shown(0.75) && arm < 0.05) {
    ctx.strokeStyle = ROPE
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(x + 4, base - 3); ctx.lineTo(ax - 12, ay + 9); ctx.stroke()
  }
}

/**
 * The Academy gate on Hackathon Road: two stone towers, a portcullis between them, and a pulley
 * whose rope runs to a basket on the right. (x, y) is the top-left of the left tower's tile; the
 * gate spans four tiles. lift: 0 shut, 1 fully raised.
 */
export function drawGate(ctx: Ctx, x: number, y: number, lift: number) {
  const towerH = 30
  // The portcullis, behind the beam: iron bars with spikes, raised by up to 22 pixels.
  const gx = x + 16
  const gy = y + 4 - Math.round(lift * 22)
  ctx.save()
  ctx.beginPath(); ctx.rect(gx, y - 4, 32, towerH + 4); ctx.clip()
  for (let i = 0; i < 6; i += 1) {
    const bx = gx + 2 + i * 5
    rect(ctx, bx - 1, gy - 1, 4, 27, INK)
    rect(ctx, bx, gy, 2, 25, '#5a5a6a')
    rect(ctx, bx, gy, 1, 25, '#8a8a9a')
    rect(ctx, bx, gy + 25, 2, 2, '#3a3a48')
  }
  for (const ry of [gy + 5, gy + 14, gy + 22]) { rect(ctx, gx, ry - 1, 32, 4, INK); rect(ctx, gx + 1, ry, 30, 2, '#6a6a7a'); rect(ctx, gx + 1, ry, 30, 1, '#9a9aaa') }
  ctx.restore()
  // Stone towers with battlements.
  for (const tx of [x, x + 48]) {
    rect(ctx, tx - 1, y - 6, 18, towerH + 7, INK)
    rect(ctx, tx, y - 5, 16, towerH + 5, '#a8a29a')
    for (let row = 0; row < 6; row += 1) {
      const ry = y - 3 + row * 5
      rect(ctx, tx, ry + 4, 16, 1, '#6e6862')
      rect(ctx, tx + (row % 2 ? 4 : 10), ry, 1, 4, '#6e6862')
      rect(ctx, tx + 1, ry, 14, 1, '#cec8be')
    }
    for (let i = 0; i < 3; i += 1) { rect(ctx, tx + i * 6 - 1, y - 10, 6, 5, INK); rect(ctx, tx + i * 6, y - 9, 4, 4, '#bcb6ac') }
  }
  // The beam across the top, with the pulley wheel on the right tower.
  rect(ctx, x + 12, y - 4, 42, 6, INK)
  rect(ctx, x + 13, y - 3, 40, 4, WOOD.base)
  rect(ctx, x + 13, y - 3, 40, 1, WOOD.light)
  wheel(ctx, x + 62, y - 6, 4, lift * 8)
  // Rope from the portcullis over the beam and the wheel, down the outside of the right tower.
  if (gy > y - 4) rect(ctx, x + 31, y - 4, 2, gy - y + 4, ROPE)
  rect(ctx, x + 33, y - 6, 29, 1, ROPE)
  // A sign on the left tower.
  rect(ctx, x + 2, y + 8, 12, 8, INK); rect(ctx, x + 3, y + 9, 10, 6, '#ffd23f'); rect(ctx, x + 5, y + 11, 6, 2, '#7b3fd6')
}

/**
 * The counterweight basket hanging from the gate's pulley. (cx, ropeTop) is where the rope leaves
 * the wheel; the basket hangs `hang` pixels below and holds `rocks` rocks.
 */
export function drawBasket(ctx: Ctx, cx: number, ropeTop: number, hang: number, rocks: number) {
  const top = ropeTop + hang
  rect(ctx, cx, ropeTop, 1, hang, ROPE)
  rect(ctx, cx - 5, top - 1, 1, 3, ROPE); rect(ctx, cx + 5, top - 1, 1, 3, ROPE)
  rect(ctx, cx - 5, top - 1, 11, 1, ROPE)
  // Rocks sit inside, heaped.
  const spots: Array<[number, number]> = [[-3, 1], [2, 1], [-1, -1], [3, -2], [-4, -2]]
  for (let i = 0; i < Math.min(rocks, spots.length); i += 1) drawRock(ctx, cx + spots[i][0], top + spots[i][1] + 2, 4)
  rect(ctx, cx - 7, top + 2, 15, 9, INK)
  rect(ctx, cx - 6, top + 3, 13, 7, '#c49a5a')
  for (let i = 0; i < 13; i += 2) rect(ctx, cx - 6 + i, top + 3 + (i % 4 ? 0 : 1), 1, 6, '#9a7440')
  rect(ctx, cx - 6, top + 3, 13, 1, '#e2c088')
  rect(ctx, cx - 6, top + 7, 13, 1, '#9a7440')
}
