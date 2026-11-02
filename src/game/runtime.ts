// The overworld: free analog movement, NPCs, encounters and drawing. React owns dialogs and
// battles; the runtime only says "this happened" through its hooks. The rules stay tile-based
// (world.ts), so doors, triggers, trainers and tall grass work exactly as the tests expect, while
// the player glides in any direction with a joystick or the keyboard.
import { avatarLook } from '../world/looks'
import { getMap } from '../world/maps'
import type { GameMap, ItemDef, NpcDef, SignDef, Thing, Trigger } from '../world/types'
import { buildingAt, cutFlag, delta, facingToward, isGrass, itemFlag, mapHeight, mapWidth, npcsIn, opposite, spottedBy, step, thingsIn, tileAt, visible, walkable, warpAt, type Arrival, type NpcPositions } from '../world/world'
import { objectCanvas, personCanvas, pyxieCanvas } from '../engine/art'
import { Ambient, type View } from '../engine/ambient'
import { hasCanvas, makeCanvas } from '../engine/pixels'
import { boulderCanvas, bushCanvas, drawFence, TREE_SIZE, tallGrassCanvas, treeCanvas, treeKindFor } from '../engine/props'
import { buildGround, hash, isOutdoor } from '../engine/terrain'
import { drawScreenTile, drawSunbeams } from '../engine/interior'
import { drawBuilding, drawTile } from '../engine/tiles'
import type { Direction, SaveState } from '../types'
import { randomRng, type Rng } from '../lib/rng'

export interface RuntimeHooks {
  getSave: () => SaveState
  /** Moves the player in the save (map and tile), without re-rendering the world. */
  onMoved: (map: string, x: number, y: number, facing: Direction, steps: number) => void
  onEnterMap: (map: GameMap) => void
  onBlockedDoor: (message: string) => void
  onTrigger: (trigger: Trigger) => void
  onInteractNpc: (npc: NpcDef) => void
  onSpotted: (npc: NpcDef) => void
  onSign: (sign: SignDef) => void
  onItem: (item: ItemDef) => void
  onThing: (thing: Thing) => void
  onCardboard: (x: number, y: number) => void
  onWildEncounter: (map: GameMap) => void
  onTalkTile: (text: string) => void
  sfx: (name: string) => void
}

interface Mover { x: number; y: number; fromX: number; fromY: number; t: number; duration: number; jump: boolean }
interface Hop { fromX: number; fromY: number; toX: number; toY: number; t: number; duration: number }

const WALK = 84
const RUN = 148
const NPC_WALK_MS = 270
/** Feet box around the player's position: half width, and how far it reaches up and down. */
const BOX = { half: 5, up: 4, down: 3 }
const PAD = 10
const FEET = 11

const unit: Record<Direction, [number, number]> = delta

export class WorldRuntime {
  map: GameMap
  /** The tile the player stands on. */
  x: number
  y: number
  /** The player's feet, in world pixels. */
  px: number
  py: number
  facing: Direction
  held: Direction[] = []
  stick = { x: 0, y: 0 }
  running = false
  /** True while a dialog, menu or battle owns the screen. */
  busy = false
  stepCount = 0
  npcPos: NpcPositions = {}
  npcFacing: Record<string, Direction> = {}
  npcMove: Record<string, Mover | null> = {}
  npcTimer: Record<string, number> = {}
  bubble: { npc: string; until: number } | null = null
  fade = 0
  private hop: Hop | null = null
  private moving = false
  private walked = 0
  private lastTile = { x: 0, y: 0 }
  private trail: Array<{ x: number; y: number }> = []
  private fadeTarget = 0
  private pendingArrival: (() => void) | null = null
  private time = 0
  private ground: { key: string; canvas: HTMLCanvasElement } | null = null
  private rng: Rng = randomRng()
  private hooks: RuntimeHooks
  private encounterCooldown = 0
  private ambient: Ambient
  private cam = { x: 0, y: 0, ready: false }
  private hint: { x: number; y: number } | null = null
  private lastBump = 0
  private dustTimer = 0
  private stride = 0
  private lastRustle = 0
  private frameDt = 16
  private buffer: HTMLCanvasElement | null = null
  private exitCache: { id: string; list: Array<{ x: number; y: number; dir: Direction }> } | null = null
  private exitArt: HTMLCanvasElement | null = null

  constructor(hooks: RuntimeHooks) {
    this.hooks = hooks
    const save = hooks.getSave()
    this.map = getMap(save.map)
    this.x = save.x
    this.y = save.y
    this.px = save.x * 16 + 8
    this.py = save.y * 16 + FEET
    this.facing = save.facing
    this.lastTile = { x: save.x, y: save.y }
    this.ambient = new Ambient(this.map, isOutdoor(this.map))
    this.resetNpcs()
  }

  private flags(): ReadonlySet<string> {
    return new Set(this.hooks.getSave().flags)
  }

  private resetNpcs() {
    this.npcPos = {}
    this.npcFacing = {}
    this.npcMove = {}
    for (const npc of this.map.npcs ?? []) {
      this.npcPos[npc.id] = { x: npc.x, y: npc.y }
      this.npcFacing[npc.id] = npc.facing
      this.npcTimer[npc.id] = 1000 + Math.random() * 2500
    }
    this.trail = []
    this.ground = null
  }

  /** Jumps to a map position right away: new game, warps from scripts, blackouts. */
  place(mapId: string, x: number, y: number, facing: Direction) {
    const changed = mapId !== this.map.id
    this.map = getMap(mapId)
    this.x = x
    this.y = y
    this.px = x * 16 + 8
    this.py = y * 16 + FEET
    this.lastTile = { x, y }
    this.facing = facing
    this.hop = null
    if (changed) {
      this.resetNpcs()
      this.ambient = new Ambient(this.map, isOutdoor(this.map))
    }
    this.trail = []
    this.cam.ready = false
    this.hooks.onMoved(mapId, x, y, facing, 0)
    if (changed) this.hooks.onEnterMap(this.map)
  }

  invalidate() {
    this.ground = null
  }

  press(dir: Direction) {
    if (!this.held.includes(dir)) this.held = [dir, ...this.held]
  }

  release(dir: Direction) {
    this.held = this.held.filter((item) => item !== dir)
  }

  /** Analog input from the touch joystick, each axis from -1 to 1. */
  setStick(x: number, y: number) {
    this.stick = { x, y }
  }

  clearInput() {
    this.held = []
    this.stick = { x: 0, y: 0 }
  }

  /** The point just in front of the player, where talking and reading happens. */
  private probe(): { x: number; y: number } {
    const [dx, dy] = unit[this.facing]
    return { x: this.px + dx * 13, y: this.py - 4 + dy * 13 }
  }

  /** What the A button would reach right now. */
  private target(flags: ReadonlySet<string>) {
    const p = this.probe()
    let tx = Math.floor(p.x / 16)
    let ty = Math.floor(p.y / 16)
    // Someone standing on the tile in front, or walking right past it.
    const npc = npcsIn(this.map, flags).find((item) => {
      const at = this.npcPos[item.id] ?? item
      if (at.x === tx && at.y === ty) return true
      const pixel = this.npcPixel(item)
      return Boolean(this.npcMove[item.id]) && Math.hypot(pixel.x + 8 - p.x, pixel.y + FEET - p.y) < 10
    })
    if (npc) return { kind: 'npc' as const, npc, x: this.npcPixel(npc).x + 8, y: this.npcPixel(npc).y }
    const [dx, dy] = unit[this.facing]
    // Talk across counters.
    if (tileAt(this.map, tx, ty) === 'X') {
      tx += dx
      ty += dy
      const behind = npcsIn(this.map, flags).find((item) => { const at = this.npcPos[item.id] ?? item; return at.x === tx && at.y === ty })
      if (behind) return { kind: 'npc' as const, npc: behind, x: tx * 16 + 8, y: ty * 16 }
    }
    const sign = this.map.signs?.find((item) => item.x === tx && item.y === ty)
    if (sign) return { kind: 'sign' as const, sign, x: tx * 16 + 8, y: ty * 16 }
    const item = this.map.items?.find((entry) => entry.x === tx && entry.y === ty && !flags.has(itemFlag(entry.id)))
    if (item) return { kind: 'item' as const, item, x: tx * 16 + 8, y: ty * 16 + (item.hidden ? 8 : 0) }
    const thing = thingsIn(this.map, flags).find((entry) => entry.x === tx && entry.y === ty)
    if (thing) return { kind: 'thing' as const, thing, x: tx * 16 + 8, y: ty * 16 }
    const tile = tileAt(this.map, tx, ty)
    if (tile === 'C' && !flags.has(cutFlag(this.map.id, tx, ty))) return { kind: 'cardboard' as const, tx, ty, x: tx * 16 + 8, y: ty * 16 }
    if (tile === '~' || tile === 'l') return { kind: 'tile' as const, tile, x: tx * 16 + 8, y: ty * 16 }
    return null
  }

  /** The A button: talk, read, pick up. */
  interact() {
    if (this.busy || this.hop) return
    const flags = this.flags()
    const found = this.target(flags)
    if (!found) return
    switch (found.kind) {
      case 'npc':
        if (!found.npc.pyxie) this.npcFacing[found.npc.id] = opposite[this.facing]
        return this.hooks.onInteractNpc(found.npc)
      case 'sign': return this.hooks.onSign(found.sign)
      case 'item': return this.hooks.onItem(found.item)
      case 'thing': return this.hooks.onThing(found.thing)
      case 'cardboard': return this.hooks.onCardboard(found.tx, found.ty)
      case 'tile':
        if (found.tile === '~') return this.hooks.onTalkTile('The water is calm. A Quotie splashes somewhere far away.')
        return this.hooks.onTalkTile('A laser beam! Don\'t touch it.')
    }
  }

  /** Steps the player back to the tile they came from, used when a script or a locked door blocks the way. */
  pushBack() {
    const back = this.lastTile.x !== this.x || this.lastTile.y !== this.y ? this.lastTile : null
    if (back && walkable(this.map, back.x, back.y, this.flags(), this.npcPos)) {
      this.x = back.x
      this.y = back.y
    } else {
      const result = step(this.map, this.x, this.y, opposite[this.facing], this.flags(), this.npcPos)
      if (result.type !== 'move') return
      this.x = result.x
      this.y = result.y
    }
    this.px = this.x * 16 + 8
    this.py = this.y * 16 + FEET
    this.hooks.onMoved(this.map.id, this.x, this.y, this.facing, 0)
  }

  /** Walks a trainer up to the player, then calls back. */
  approach(npc: NpcDef, done: () => void) {
    const at = this.npcPos[npc.id] ?? { x: npc.x, y: npc.y }
    const target = { x: this.x, y: this.y }
    const dir = facingToward(at, target)
    const [dx, dy] = delta[dir]
    const walkOne = () => {
      const pos = this.npcPos[npc.id]
      const nx = pos.x + dx
      const ny = pos.y + dy
      if (nx === target.x && ny === target.y) {
        this.facing = opposite[dir]
        done()
        return
      }
      this.npcMove[npc.id] = { x: nx, y: ny, fromX: pos.x, fromY: pos.y, t: 0, duration: 190, jump: false }
      this.npcPos[npc.id] = { x: nx, y: ny }
      window.setTimeout(walkOne, 200)
    }
    this.npcFacing[npc.id] = dir
    walkOne()
  }

  // ------------------------------------------------------------- MOVEMENT

  private solidTile(x: number, y: number, flags: ReadonlySet<string>): boolean {
    if (x < 0 || y < 0 || x >= mapWidth(this.map) || y >= mapHeight(this.map)) {
      const side: Direction | null = x < 0 ? 'left' : x >= mapWidth(this.map) ? 'right' : y < 0 ? 'up' : 'down'
      return !this.map.edges?.some((edge) => edge.side === side)
    }
    if (tileAt(this.map, x, y) === 'L') return true
    return !walkable(this.map, x, y, flags, this.npcPos)
  }

  private collides(px: number, py: number, flags: ReadonlySet<string>): boolean {
    const x0 = Math.floor((px - BOX.half) / 16)
    const x1 = Math.floor((px + BOX.half) / 16)
    const y0 = Math.floor((py - BOX.up) / 16)
    const y1 = Math.floor((py + BOX.down) / 16)
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) if (this.solidTile(x, y, flags)) return true
    // Walking NPCs block both the tile they leave and the one they enter.
    for (const npc of npcsIn(this.map, flags)) {
      const mover = this.npcMove[npc.id]
      if (!mover) continue
      if (mover.fromX >= x0 && mover.fromX <= x1 && mover.fromY >= y0 && mover.fromY <= y1) return true
    }
    return false
  }

  /** The direction the input points to, from the joystick or the keys. */
  private input(): { x: number; y: number; strength: number } {
    const raw = Math.hypot(this.stick.x, this.stick.y)
    if (raw > 0.18) return { x: this.stick.x / raw, y: this.stick.y / raw, strength: Math.min(1, raw) }
    let x = 0
    let y = 0
    if (this.held.includes('left')) x -= 1
    if (this.held.includes('right')) x += 1
    if (this.held.includes('up')) y -= 1
    if (this.held.includes('down')) y += 1
    const m = Math.hypot(x, y)
    return m ? { x: x / m, y: y / m, strength: 1 } : { x: 0, y: 0, strength: 0 }
  }

  private move(dt: number) {
    const flags = this.flags()
    const want = this.input()
    this.moving = false
    if (!want.strength) return
    // Face the stronger axis, with a little stickiness so diagonals don't flicker.
    const ax = Math.abs(want.x)
    const ay = Math.abs(want.y)
    const horizontal = this.facing === 'left' || this.facing === 'right'
    if (ax > ay * (horizontal ? 0.8 : 1.25)) this.facing = want.x > 0 ? 'right' : 'left'
    else if (ay > 0) this.facing = want.y > 0 ? 'down' : 'up'
    const run = this.running || (want.strength > 0.92 && Math.hypot(this.stick.x, this.stick.y) > 0.18)
    const speed = (run ? RUN : WALK) * Math.max(0.45, want.strength)
    const s = Math.min(dt, 50) / 1000
    const dx = want.x * speed * s
    const dy = want.y * speed * s
    // Ledges: walking down onto one hops over it.
    if (dy > 0) {
      const ahead = Math.floor((this.py + BOX.down + dy) / 16)
      const col = Math.floor(this.px / 16)
      if (tileAt(this.map, col, ahead) === 'L' && Math.abs(this.px - (col * 16 + 8)) < 6 && walkable(this.map, col, ahead + 1, flags, this.npcPos)) {
        this.hop = { fromX: this.px, fromY: this.py, toX: col * 16 + 8, toY: (ahead + 1) * 16 + FEET, t: 0, duration: 360 }
        this.facing = 'down'
        this.hooks.sfx('jump')
        return
      }
    }
    let moved = false
    const tryAxis = (mx: number, my: number) => {
      if (!this.collides(this.px + mx, this.py + my, flags)) { this.px += mx; this.py += my; return true }
      // Corner assist: slide around the corner if a small sideways nudge frees the way.
      const len = Math.abs(mx + my)
      for (const nudge of [2, 4, 6, 8]) {
        for (const sign of [1, -1]) {
          const nx = my !== 0 ? sign * nudge : 0
          const ny = mx !== 0 ? sign * nudge : 0
          if (!this.collides(this.px + mx + nx, this.py + my + ny, flags) && !this.collides(this.px + Math.sign(nx) * len, this.py + Math.sign(ny) * len, flags)) {
            this.px += Math.sign(nx) * Math.min(len, nudge)
            this.py += Math.sign(ny) * Math.min(len, nudge)
            return true
          }
        }
      }
      return false
    }
    if (dx) moved = tryAxis(dx, 0) || moved
    if (dy) moved = tryAxis(0, dy) || moved
    if (!moved) {
      if (this.time - this.lastBump > 450) { this.hooks.sfx('bump'); this.lastBump = this.time }
      return
    }
    this.moving = true
    this.walked += Math.hypot(dx, dy)
    const last = this.trail[0]
    if (!last || Math.hypot(last.x - this.px, last.y - this.py) > 2) this.trail = [{ x: this.px, y: this.py }, ...this.trail].slice(0, 24)
    if (run) {
      this.dustTimer -= dt
      if (this.dustTimer <= 0) { this.dustTimer = 140; this.ambient.burst('dust', this.px, this.py + 2, 1) }
    }
    const stride = Math.floor(this.walked / 12)
    if (stride !== this.stride) { this.stride = stride; this.footstep(run) }
    this.checkEdge()
    const tx = Math.floor(this.px / 16)
    const ty = Math.floor(this.py / 16)
    if (tx !== this.x || ty !== this.y) this.enterTile(tx, ty)
  }

  /** The ground answers every step: grass parts and shakes, dust and sand kick up, prints stay behind. */
  private footstep(run: boolean) {
    const tx = Math.floor(this.px / 16)
    const ty = Math.floor(this.py / 16)
    const t = tileAt(this.map, tx, ty)
    // Left foot, right foot: prints sit a little to each side of the path.
    const [fx, fy] = unit[this.facing]
    const side = this.stride % 2 ? 3 : -3
    const footX = this.px + (fy !== 0 ? side : 0) - 1
    const footY = this.py + 1 + (fx !== 0 ? side / 2 : 0)
    if (t === ',') {
      this.ambient.rustle(tx, ty)
      this.ambient.burst('blade', this.px, this.py - 3, run ? 3 : 2)
      if (this.time - this.lastRustle > 260) { this.lastRustle = this.time; this.hooks.sfx('rustle') }
    } else if (t === '.' || t === 'f') {
      this.ambient.footprint('grass', footX, footY)
      if (this.stride % 3 === 0 || run) this.ambient.burst('blade', this.px, this.py, 1)
      this.hooks.sfx('step-grass')
    } else if (t === 's') {
      this.ambient.footprint('sand', footX, footY)
      this.ambient.burst('sand', this.px, this.py, run ? 3 : 2)
      this.hooks.sfx('step-dirt')
    } else if (t === ':' || t === 'c') {
      this.ambient.footprint('dirt', footX, footY)
      this.ambient.burst('dust', this.px, this.py + 1, run ? 2 : 1)
      this.hooks.sfx('step-dirt')
    } else if (t !== '~') this.hooks.sfx('step-floor')
  }

  /** Walking off the side of the map onto the next one. */
  private checkEdge() {
    const w = mapWidth(this.map) * 16
    const h = mapHeight(this.map) * 16
    const dir: Direction | null = this.px < 0 ? 'left' : this.px >= w ? 'right' : this.py < 0 ? 'up' : this.py >= h ? 'down' : null
    if (!dir) return
    const result = step(this.map, Math.max(0, Math.min(mapWidth(this.map) - 1, Math.floor(this.px / 16) - unit[dir][0])), Math.max(0, Math.min(mapHeight(this.map) - 1, Math.floor(this.py / 16) - unit[dir][1])), dir, this.flags())
    if (result.type === 'edge') {
      this.clearInputSoft()
      this.transition(() => this.arriveAt(result.map, result.x, result.y, dir))
      this.busyUntilArrive = true
    } else {
      this.px = Math.max(1, Math.min(w - 1, this.px))
      this.py = Math.max(1, Math.min(h - 1, this.py))
    }
  }

  private busyUntilArrive = false

  private clearInputSoft() {
    this.trail = []
  }

  private enterTile(tx: number, ty: number) {
    this.lastTile = { x: this.x, y: this.y }
    this.x = tx
    this.y = ty
    this.stepCount += 1
    this.hooks.onMoved(this.map.id, tx, ty, this.facing, 1)
    if (isGrass(this.map, tx, ty)) this.ambient.burst('leaf', this.px, this.py - 2, 2)
    const flags = this.flags()
    const warp = warpAt(this.map, tx, ty)
    if (warp) return this.useWarp(warp)
    const trigger = this.triggerHere(flags)
    if (trigger) { this.clearInput(); return this.hooks.onTrigger(trigger) }
    const save = this.hooks.getSave()
    const spotter = spottedBy(this.map, tx, ty, flags, this.npcPos, this.npcFacing, new Set(save.defeated))
    if (spotter) {
      this.bubble = { npc: spotter.id, until: this.time + 900 }
      this.hooks.sfx('alert')
      this.clearInput()
      this.px = tx * 16 + 8
      this.py = ty * 16 + FEET
      this.hooks.onSpotted(spotter)
      return
    }
    if (isGrass(this.map, tx, ty) && this.map.encounters && save.team.length && this.encounterCooldown <= 0) {
      if (this.rng.chance(this.map.encounters.rate)) {
        this.encounterCooldown = 1200
        this.clearInput()
        this.hooks.onWildEncounter(this.map)
      }
    }
  }

  update(dt: number) {
    this.time += dt
    this.frameDt = dt
    this.encounterCooldown = Math.max(0, this.encounterCooldown - dt)
    this.updateFade(dt)
    this.updateNpcs(dt)
    if (this.hop) {
      this.hop.t += dt
      const k = Math.min(1, this.hop.t / this.hop.duration)
      this.px = this.hop.fromX + (this.hop.toX - this.hop.fromX) * k
      this.py = this.hop.fromY + (this.hop.toY - this.hop.fromY) * k
      if (k >= 1) {
        this.hop = null
        this.ambient.burst('dust', this.px, this.py + 2, 4)
        const tx = Math.floor(this.px / 16)
        const ty = Math.floor(this.py / 16)
        if (tx !== this.x || ty !== this.y) this.enterTile(tx, ty)
      }
      return
    }
    this.moving = false
    if (this.busy || this.fadeTarget > 0 || this.busyUntilArrive) return
    this.move(dt)
    const found = this.target(this.flags())
    this.hint = found ? { x: found.x, y: found.y } : null
  }

  private triggerHere(flags: ReadonlySet<string>): Trigger | undefined {
    return this.map.triggers?.find((item) => this.x >= item.x && this.x < item.x + (item.w ?? 1) && this.y >= item.y && this.y < item.y + (item.h ?? 1)
      && (!item.ifFlag || flags.has(item.ifFlag)) && (!item.unlessFlag || !flags.has(item.unlessFlag)))
  }

  /** Arriving through a door onto a story tile starts the story too. */
  private arriveAt(map: string, x: number, y: number, facing: Direction) {
    this.busyUntilArrive = false
    this.place(map, x, y, facing)
    const trigger = this.triggerHere(this.flags())
    if (trigger) window.setTimeout(() => this.hooks.onTrigger(trigger), 350)
  }

  private useWarp(warp: Arrival) {
    const save = this.hooks.getSave()
    const req = warp.requires
    if (req) {
      const ok = (req.xp === undefined || save.trainerXp >= req.xp) && (req.badges === undefined || save.badges.length >= req.badges)
        && (!req.flag || save.flags.includes(req.flag)) && (!req.item || (save.bag[req.item] ?? 0) > 0)
      if (!ok) {
        this.clearInput()
        this.pushBack()
        const extra = req.xp !== undefined ? ` (You have ${save.trainerXp} XP.)` : req.badges !== undefined ? ` (You have ${save.badges.length}.)` : ''
        this.hooks.onBlockedDoor(req.message + extra)
        return
      }
    }
    this.hooks.sfx('door')
    this.clearInput()
    this.busyUntilArrive = true
    this.transition(() => this.arriveAt(warp.map, warp.x, warp.y, warp.facing))
  }

  /** Fades to black, runs the change, fades back in. */
  transition(change: () => void) {
    this.fadeTarget = 1
    this.pendingArrival = change
  }

  private updateFade(dt: number) {
    const speed = dt / 160
    if (this.fadeTarget === 1) {
      this.fade = Math.min(1, this.fade + speed)
      if (this.fade >= 1 && this.pendingArrival) {
        const change = this.pendingArrival
        this.pendingArrival = null
        change()
        this.fadeTarget = 0
      }
    } else this.fade = Math.max(0, this.fade - speed)
  }

  /** Tiles the player's feet touch, so wandering NPCs keep out. */
  private playerTiles(): Array<{ x: number; y: number }> {
    const out: Array<{ x: number; y: number }> = []
    for (let y = Math.floor((this.py - BOX.up) / 16); y <= Math.floor((this.py + BOX.down) / 16); y += 1) for (let x = Math.floor((this.px - BOX.half) / 16); x <= Math.floor((this.px + BOX.half) / 16); x += 1) out.push({ x, y })
    return out
  }

  private updateNpcs(dt: number) {
    const flags = this.flags()
    for (const npc of npcsIn(this.map, flags)) {
      const mover = this.npcMove[npc.id]
      if (mover) {
        mover.t += dt
        if (mover.t >= mover.duration) this.npcMove[npc.id] = null
        continue
      }
      if (this.busy || !npc.move || npc.move === 'still') continue
      this.npcTimer[npc.id] = (this.npcTimer[npc.id] ?? 2000) - dt
      if (this.npcTimer[npc.id] > 0) continue
      this.npcTimer[npc.id] = 1500 + Math.random() * 2500
      const dir = (['up', 'down', 'left', 'right'] as Direction[])[Math.floor(Math.random() * 4)]
      this.npcFacing[npc.id] = dir
      if (npc.move !== 'wander') continue
      const pos = this.npcPos[npc.id]
      const [dx, dy] = delta[dir]
      const nx = pos.x + dx
      const ny = pos.y + dy
      if (Math.abs(nx - npc.x) > 2 || Math.abs(ny - npc.y) > 2) continue
      const playerThere = this.playerTiles().some((t) => t.x === nx && t.y === ny)
      if (playerThere || warpAt(this.map, nx, ny) || tileAt(this.map, nx, ny) === ',') continue
      const others = { ...this.npcPos }
      delete others[npc.id]
      if (!walkable(this.map, nx, ny, flags, others)) continue
      this.npcMove[npc.id] = { x: nx, y: ny, fromX: pos.x, fromY: pos.y, t: 0, duration: NPC_WALK_MS * 2, jump: false }
      this.npcPos[npc.id] = { x: nx, y: ny }
    }
  }

  /** The top-left of the player's 16-wide sprite cell, for code that still thinks in tiles. */
  playerPixel(): { x: number; y: number; lift: number } {
    const lift = this.hop ? Math.sin(Math.min(1, this.hop.t / this.hop.duration) * Math.PI) * 9 : 0
    return { x: this.px - 8, y: this.py - FEET, lift }
  }

  // ------------------------------------------------------------- DRAWING

  private groundLayer(): { canvas: HTMLCanvasElement; pad: number } {
    const flags = this.flags()
    const key = `${this.map.id}:${[...flags].filter((flag) => flag.startsWith('cut:') || flag === 'segfault1').join(',')}`
    if (this.ground?.key === key) return { canvas: this.ground.canvas, pad: PAD }
    let canvas: HTMLCanvasElement
    if (isOutdoor(this.map)) canvas = buildGround(this.map, flags, PAD)
    else {
      const w = mapWidth(this.map)
      const h = mapHeight(this.map)
      canvas = makeCanvas((w + PAD * 2) * 16, (h + PAD * 2) * 16)
      const ctx = canvas.getContext('2d')!
      for (let y = -PAD; y < h + PAD; y += 1) for (let x = -PAD; x < w + PAD; x += 1) {
        const t = tileAt(this.map, x, y)
        if (t === 'l' || t === 'V' || t === '3' || t === 'A') continue
        drawTile(ctx, this.map, x, y, (x + PAD) * 16, (y + PAD) * 16, 0, flags)
      }
      for (const building of this.map.buildings ?? []) drawBuilding(ctx, building, (building.x + PAD) * 16, (building.y + PAD) * 16, 0)
      drawSunbeams(ctx, this.map, PAD)
      // Soft shadows where walls and furniture meet the floor.
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        const t = tileAt(this.map, x, y)
        const below = tileAt(this.map, x, y + 1)
        const solid = 'WKBDXV3GAl#'.includes(t)
        if (!solid || 'WKBDXV3GAl# '.includes(below)) continue
        const sx = (x + PAD) * 16
        const sy = (y + 1 + PAD) * 16
        ctx.fillStyle = t === 'W' || t === '#' ? 'rgba(30, 16, 40, 0.28)' : 'rgba(30, 16, 40, 0.2)'
        ctx.fillRect(sx, sy, 16, 3)
        ctx.fillStyle = 'rgba(30, 16, 40, 0.1)'
        ctx.fillRect(sx, sy + 3, 16, 3)
      }
    }
    this.ground = { key, canvas }
    return { canvas, pad: PAD }
  }

  render(screen: CanvasRenderingContext2D, width: number, height: number) {
    const save = this.hooks.getSave()
    const flags = this.flags()
    const scale = Math.max(2, Math.floor(Math.min(width / (18 * 16), height / (10.5 * 16))))
    const viewW = width / scale
    const viewH = height / scale
    const mapW = mapWidth(this.map) * 16
    const mapH = mapHeight(this.map) * 16
    const outdoor = isOutdoor(this.map)
    // Smooth camera that looks a little ahead of where the player walks.
    const [fx, fy] = unit[this.facing]
    const lead = this.moving ? 10 : 0
    let tx = this.px + fx * lead - viewW / 2
    let ty = this.py - 8 + fy * lead - viewH / 2
    const margin = outdoor ? 24 : 0
    tx = mapW + margin * 2 <= viewW ? (mapW - viewW) / 2 : Math.max(-margin, Math.min(mapW + margin - viewW, tx))
    ty = mapH + margin * 2 <= viewH ? (mapH - viewH) / 2 : Math.max(-margin, Math.min(mapH + margin - viewH, ty))
    if (!this.cam.ready) { this.cam = { x: tx, y: ty, ready: true } } else { this.cam.x += (tx - this.cam.x) * 0.14; this.cam.y += (ty - this.cam.y) * 0.14 }
    const camX = Math.round(this.cam.x * scale) / scale
    const camY = Math.round(this.cam.y * scale) / scale
    const view: View = { x: camX, y: camY, w: viewW, h: viewH }
    this.ambient.update(this.frameDt, view, { x: this.px, y: this.py })
    // The world is drawn at one pixel per art pixel into a small buffer, then scaled up once:
    // crisp pixels, and far less work for slow school laptops.
    const bufW = Math.ceil(viewW) + 2
    const bufH = Math.ceil(viewH) + 2
    if (!this.buffer || this.buffer.width !== bufW || this.buffer.height !== bufH) this.buffer = makeCanvas(bufW, bufH)
    const ctx = this.buffer.getContext('2d')!
    const ix = Math.floor(camX)
    const iy = Math.floor(camY)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#0b0912'
    ctx.fillRect(0, 0, bufW, bufH)
    ctx.save()
    ctx.translate(-ix, -iy)
    const { canvas, pad } = this.groundLayer()
    ctx.drawImage(canvas, -pad * 16, -pad * 16)
    const x0 = Math.floor(camX / 16) - 2
    const x1 = Math.ceil((camX + viewW) / 16) + 2
    const y0 = Math.floor(camY / 16) - 1
    const y1 = Math.ceil((camY + viewH) / 16) + 3
    if (outdoor) this.drawWater(ctx, x0, x1, y0, y1)
    else this.drawAnimatedTiles(ctx, x0, x1, y0, y1, flags)
    this.ambient.drawGround(ctx)

    // Everything that stands, sorted by where its feet touch the ground.
    type Drawable = { y: number; draw: () => void }
    const drawables: Drawable[] = []
    const shadows: Array<[number, number, number]> = []
    const sway = (x: number, y: number) => Math.round(Math.sin(this.time / 900 + x * 0.45 + y * 0.25) * 0.7 + 0.2)
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const t = tileAt(this.map, x, y)
      if (t === 'T' && outdoor) {
        const roll = hash(x, y, 51)
        const art = treeCanvas(treeKindFor(this.map.area, roll), this.map.area, Math.floor(hash(x, y, 55) * 4))
        if (!art) continue
        const jx = Math.round((hash(x, y, 52) - 0.5) * 4)
        const left = x * 16 + 8 - TREE_SIZE / 2 + jx
        const top = y * 16 + 17 - TREE_SIZE + Math.round((hash(x, y, 56) - 0.5) * 3)
        shadows.push([x * 16 + 9 + jx, y * 16 + 14, 12])
        const s = sway(x, y)
        drawables.push({ y: y * 16 + 13, draw: () => {
          const split = Math.round(TREE_SIZE * 0.7)
          ctx.drawImage(art, 0, 0, TREE_SIZE, split, left + s, top, TREE_SIZE, split)
          ctx.drawImage(art, 0, split, TREE_SIZE, TREE_SIZE - split, left, top + split, TREE_SIZE, TREE_SIZE - split)
        } })
      } else if (t === 't' && outdoor) {
        const art = bushCanvas(hash(x, y, 53) < 0.25 ? 1 : 0)
        if (art) { shadows.push([x * 16 + 8, y * 16 + 14, 8]); drawables.push({ y: y * 16 + 12, draw: () => ctx.drawImage(art, x * 16 - 2, y * 16 - 3) }) }
      } else if (t === 'r' && outdoor) {
        const art = boulderCanvas()
        if (art) { shadows.push([x * 16 + 8, y * 16 + 14, 8]); drawables.push({ y: y * 16 + 12, draw: () => ctx.drawImage(art, x * 16 - 1, y * 16 - 2) }) }
      } else if (t === 'F' && outdoor) {
        const f = (a: number, b: number) => tileAt(this.map, a, b) === 'F'
        drawables.push({ y: y * 16 + 12, draw: () => drawFence(ctx, x * 16, y * 16, f(x - 1, y), f(x + 1, y), f(x, y - 1), f(x, y + 1)) })
      } else if (t === ',') {
        // Pushed-through grass shakes fast for a moment, then settles back into the breeze.
        const shake = this.ambient.rustleAt(x, y)
        const frame = shake > 0 ? Math.floor(this.time / 70) % 3 : Math.floor(this.time / 380 + x * 0.7 + y * 0.3) % 3
        const jx = shake > 0 ? Math.round(Math.sin(this.time / 35 + x) * 1.6 * shake) : 0
        const art = tallGrassCanvas(hash(x, y, 54) < 0.5 ? 0 : 1, frame, this.map.area)
        if (art) drawables.push({ y: y * 16 + 15, draw: () => ctx.drawImage(art, x * 16 + jx, y * 16 - 2) })
      } else if (t === 'C' && !flags.has(cutFlag(this.map.id, x, y))) {
        drawables.push({ y: y * 16 + 12, draw: () => drawCardboard(ctx, x * 16, y * 16) })
      } else if (t === 'C') {
        drawables.push({ y: y * 16, draw: () => { ctx.fillStyle = '#b88f55'; ctx.fillRect(x * 16 + 3, y * 16 + 11, 4, 2); ctx.fillRect(x * 16 + 9, y * 16 + 12, 3, 2) } })
      }
    }
    for (const sign of this.map.signs ?? []) {
      const art = objectCanvas(sign.kind ?? 'sign')
      if (art) drawables.push({ y: sign.y * 16 + 12, draw: () => ctx.drawImage(art, sign.x * 16, sign.y * 16) })
    }
    for (const item of this.map.items ?? []) {
      if (item.hidden || flags.has(itemFlag(item.id))) continue
      const art = objectCanvas('capsule')
      shadows.push([item.x * 16 + 8, item.y * 16 + 12, 5])
      drawables.push({ y: item.y * 16 + 10, draw: () => { if (art) ctx.drawImage(art, item.x * 16, item.y * 16 - 2 + Math.round(Math.sin(this.time / 300 + item.x) * 1.5)) } })
    }
    for (const thing of thingsIn(this.map, flags)) {
      if (!thing.sprite) continue
      drawables.push({ y: thing.y * 16 + 12, draw: () => this.drawThing(ctx, thing) })
    }
    for (const npc of npcsIn(this.map, flags)) {
      const pos = this.npcPixel(npc)
      shadows.push([pos.x + 8, pos.y + FEET + 1, 6])
      drawables.push({ y: pos.y + FEET, draw: () => this.drawNpc(ctx, npc, pos) })
    }
    for (const bird of this.ambient.groundBirds()) drawables.push({ y: bird.y, draw: () => bird.draw(ctx) })
    const lead2 = save.team.find((pyxie) => pyxie.hp > 0)
    const follow = this.followPoint()
    if (lead2 && follow && this.map.area !== 'house') {
      const art = pyxieCanvas(lead2.species, lead2.shiny, 24)
      shadows.push([follow.x, follow.y + 1, 6])
      const bob = this.moving ? Math.round(Math.abs(Math.sin(this.time / 110)) * 2) : Math.round(Math.sin(this.time / 500))
      const flip = this.px < follow.x - 1
      drawables.push({ y: follow.y - 0.5, draw: () => {
        if (!art) return
        if (flip) { ctx.save(); ctx.scale(-1, 1); ctx.drawImage(art, -(follow.x + 12), follow.y - 23 - bob); ctx.restore() } else ctx.drawImage(art, follow.x - 12, follow.y - 23 - bob)
      } })
    }
    const player = this.playerPixel()
    shadows.push([this.px, this.py + 1, 6])
    drawables.push({ y: this.py, draw: () => {
      const look = avatarLook(save.avatar)
      const frame = this.moving ? Math.floor(this.walked / 6) % 4 : this.hop ? 1 : 0
      const art = personCanvas(look, this.facing, frame)
      const bob = frame % 2 ? -1 : 0
      if (art) ctx.drawImage(art, Math.round(player.x), Math.round(this.py - 22 + bob - player.lift))
    } })
    ctx.fillStyle = 'rgba(20, 12, 30, 0.26)'
    for (const [sx, sy, r] of shadows) { ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.38, 0, 0, Math.PI * 2); ctx.fill() }
    drawables.sort((a, b) => a.y - b.y).forEach((item) => item.draw())
    if (outdoor) this.ambient.drawClouds(ctx)
    this.ambient.drawAir(ctx)
    this.drawExits(ctx)

    if (this.bubble && this.bubble.until > this.time) {
      const npc = this.map.npcs?.find((item) => item.id === this.bubble?.npc)
      if (npc) {
        const pos = this.npcPixel(npc)
        drawBubble(ctx, pos.x + 8, pos.y - 14, '!', '#e8483f')
      }
    } else if (this.hint && !this.busy) {
      drawBubble(ctx, this.hint.x, this.hint.y - 12 + Math.round(Math.sin(this.time / 220)), 'A', '#7b3fd6')
    }
    ctx.restore()
    screen.imageSmoothingEnabled = false
    screen.drawImage(this.buffer, Math.round(-(camX - ix) * scale), Math.round(-(camY - iy) * scale), bufW * scale, bufH * scale)
    const top = screen

    if (this.map.dark) {
      const cx = (this.px - camX) * scale
      const cy = (this.py - 8 - camY) * scale
      const gradient = top.createRadialGradient(cx, cy, scale * 18, cx, cy, scale * 76)
      gradient.addColorStop(0, 'rgba(8,4,16,0)')
      gradient.addColorStop(1, 'rgba(8,4,16,0.93)')
      top.fillStyle = gradient
      top.fillRect(0, 0, width, height)
    }
    this.ambient.drawScreen(top, width, height)
    if (this.fade > 0) {
      top.fillStyle = `rgba(11,9,18,${this.fade})`
      top.fillRect(0, 0, width, height)
    }
  }

  /** Every way out of the map along its edges, worked out once per map: the middle of each open stretch. */
  private exitsFor(): Array<{ x: number; y: number; dir: Direction }> {
    if (this.exitCache?.id === this.map.id) return this.exitCache.list
    const list: Array<{ x: number; y: number; dir: Direction }> = []
    const w = mapWidth(this.map)
    const h = mapHeight(this.map)
    const flags = this.flags()
    for (const edge of this.map.edges ?? []) {
      const across = edge.side === 'up' || edge.side === 'down'
      let run: number[] = []
      const flush = () => {
        if (!run.length) return
        const mid = (run[0] + run[run.length - 1]) / 2
        const x = across ? mid : edge.side === 'left' ? 0 : w - 1
        const y = across ? (edge.side === 'up' ? 0 : h - 1) : mid
        const [dx, dy] = unit[edge.side]
        // One tile in from the edge, so the arrow sits on the path and not under the trees.
        list.push({ x: x * 16 + 8 - dx * 14, y: y * 16 + 8 - dy * 14, dir: edge.side })
        run = []
      }
      for (let i = 0; i < (across ? w : h); i += 1) {
        const x = across ? i : edge.side === 'left' ? 0 : w - 1
        const y = across ? (edge.side === 'up' ? 0 : h - 1) : i
        if (walkable(this.map, x, y, flags)) run.push(i)
        else flush()
      }
      flush()
    }
    this.exitCache = { id: this.map.id, list }
    return list
  }

  /** Bobbing arrows at every way out, so students can see where the path continues. */
  private drawExits(ctx: CanvasRenderingContext2D) {
    if (!this.exitArt) this.exitArt = exitArrow()
    const art = this.exitArt
    if (!art) return
    const bob = Math.round((Math.sin(this.time / 200) + 1) * 1.5)
    const angle: Record<Direction, number> = { up: 0, right: Math.PI / 2, down: Math.PI, left: -Math.PI / 2 }
    for (const exit of this.exitsFor()) {
      const [dx, dy] = unit[exit.dir]
      ctx.save()
      ctx.translate(Math.round(exit.x + dx * bob), Math.round(exit.y + dy * bob))
      ctx.rotate(angle[exit.dir])
      ctx.drawImage(art, -6, -6)
      ctx.restore()
    }
  }

  /** Where the lead pyxie walks: a few steps behind, along the path the player took. */
  private followPoint(): { x: number; y: number } | null {
    if (!this.trail.length) {
      // Before the first step: just behind the player and a little to the side, never on their head.
      const [fx, fy] = unit[this.facing]
      return { x: this.px - fx * 16 + (fy !== 0 ? 13 : 0), y: this.py - fy * 6 + (fx !== 0 ? 1 : 0) }
    }
    let dist = 0
    let prev = { x: this.px, y: this.py }
    for (const point of this.trail) {
      const d = Math.hypot(point.x - prev.x, point.y - prev.y)
      if (dist + d >= 16) {
        const k = (16 - dist) / (d || 1)
        return { x: prev.x + (point.x - prev.x) * k, y: prev.y + (point.y - prev.y) * k }
      }
      dist += d
      prev = point
    }
    return prev
  }

  /** Water sparkles and drifting highlights, drawn over the painted water each frame. */
  private drawWater(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number) {
    const t = this.time / 1000
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      if (tileAt(this.map, x, y) !== '~') continue
      const open = tileAt(this.map, x, y - 1) === '~' && tileAt(this.map, x, y + 1) === '~' && tileAt(this.map, x - 1, y) === '~' && tileAt(this.map, x + 1, y) === '~'
      if (!open) continue
      const phase = hash(x, y, 61) * 6
      const shift = Math.round(((t * 4 + phase * 3) % 12))
      ctx.fillStyle = 'rgba(200, 236, 255, 0.55)'
      ctx.fillRect(x * 16 + (shift % 12), y * 16 + 4 + Math.round(phase), 4, 1)
      ctx.fillRect(x * 16 + ((shift + 6) % 12), y * 16 + 11, 3, 1)
      if (Math.sin(t * 3 + phase * 4) > 0.94) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x * 16 + 3 + Math.round(phase), y * 16 + 7, 1, 1) }
    }
  }

  /** Indoor screens, printers and lasers blink, so they are drawn every frame. */
  private drawAnimatedTiles(ctx: CanvasRenderingContext2D, x0: number, x1: number, y0: number, y1: number, flags: ReadonlySet<string>) {
    const frame = Math.floor(this.time / 420) % 3
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
      const t = tileAt(this.map, x, y)
      if (t === 'V' && this.map.area !== 'cave') drawScreenTile(ctx, this.map, x, y, x * 16, y * 16, this.map.tint ?? (this.map.id === 'hall' ? '#e9ddff' : '#e6eef7'), this.time)
      else if (t === 'l' || t === 'V' || t === '3' || t === 'A') drawTile(ctx, this.map, x, y, x * 16, y * 16, frame, flags)
    }
  }

  private npcPixel(npc: NpcDef): { x: number; y: number } {
    const pos = this.npcPos[npc.id] ?? { x: npc.x, y: npc.y }
    const mover = this.npcMove[npc.id]
    if (!mover) return { x: pos.x * 16, y: pos.y * 16 }
    const k = Math.min(1, mover.t / mover.duration)
    return { x: (mover.fromX + (mover.x - mover.fromX) * k) * 16, y: (mover.fromY + (mover.y - mover.fromY) * k) * 16 }
  }

  private drawNpc(ctx: CanvasRenderingContext2D, npc: NpcDef, pos: { x: number; y: number }) {
    if (npc.pyxie) {
      const art = pyxieCanvas(npc.pyxie, false, 32, Math.floor(this.time / 160) % 22 === 0)
      const bob = Math.round(Math.sin(this.time / 250) * 2)
      if (art) ctx.drawImage(art, pos.x - 8, pos.y - 14 + bob)
      return
    }
    const moving = this.npcMove[npc.id]
    const frame = moving ? (moving.t / moving.duration < 0.5 ? 1 : 3) : 0
    const art = personCanvas(npc.look, this.npcFacing[npc.id] ?? npc.facing, frame)
    if (art) ctx.drawImage(art, pos.x, pos.y + FEET - 22 + (frame % 2 ? -1 : 0))
  }

  private drawThing(ctx: CanvasRenderingContext2D, thing: Thing) {
    const [kind, arg] = (thing.sprite ?? '').split(':')
    if (kind === 'pod') {
      const pod = objectCanvas('pod')
      if (pod) ctx.drawImage(pod, thing.x * 16, thing.y * 16 - 4)
      const art = pyxieCanvas(arg, false, 24)
      if (art) ctx.drawImage(art, thing.x * 16 - 1, thing.y * 16 - 9 + Math.round(Math.sin(this.time / 300 + thing.x) * 1.5), 18, 18)
      return
    }
    const art = objectCanvas(kind)
    if (art) ctx.drawImage(art, thing.x * 16, thing.y * 16)
  }

  hidesBuildingAt(x: number, y: number): boolean {
    return Boolean(buildingAt(this.map, x, y))
  }

  isVisible(entity: { showIf?: string; hideIf?: string }): boolean {
    return visible(entity, this.flags())
  }
}

function drawCardboard(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.fillStyle = 'rgba(20, 12, 30, 0.25)'; ctx.fillRect(x + 1, y + 13, 16, 3)
  ctx.fillStyle = '#3a2416'; ctx.fillRect(x, y - 2, 16, 17)
  ctx.fillStyle = '#c4925a'; ctx.fillRect(x + 1, y - 1, 14, 7)
  ctx.fillStyle = '#e0b07a'; ctx.fillRect(x + 1, y - 1, 14, 1)
  ctx.fillStyle = '#a8743a'; ctx.fillRect(x + 1, y + 7, 14, 7)
  ctx.fillStyle = '#e8d3a2'; ctx.fillRect(x + 1, y + 2, 14, 2); ctx.fillRect(x + 1, y + 10, 14, 2)
  ctx.fillStyle = '#5a3a1a'; ctx.fillRect(x + 7, y - 1, 1, 15); ctx.fillRect(x + 1, y + 6, 14, 1)
}

/** A little speech bubble: ! when a trainer spots you, A when something can be used. */
function drawBubble(ctx: CanvasRenderingContext2D, cx: number, by: number, text: '!' | 'A', color: string) {
  const x = Math.round(cx - 5)
  const y = Math.round(by - 10)
  ctx.fillStyle = '#1b1626'
  ctx.fillRect(x, y + 1, 11, 8); ctx.fillRect(x + 1, y, 9, 10); ctx.fillRect(x + 4, y + 10, 3, 1)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(x + 1, y + 1, 9, 8); ctx.fillRect(x + 5, y + 9, 1, 1)
  ctx.fillStyle = color
  if (text === '!') { ctx.fillRect(x + 5, y + 2, 1, 4); ctx.fillRect(x + 5, y + 7, 1, 1) } else {
    ctx.fillRect(x + 4, y + 2, 3, 1); ctx.fillRect(x + 3, y + 3, 1, 5); ctx.fillRect(x + 7, y + 3, 1, 5); ctx.fillRect(x + 4, y + 5, 3, 1)
  }
}

/** A chunky yellow arrow pointing up, 13 pixels square; it is rotated for the other directions. */
function exitArrow(): HTMLCanvasElement | null {
  if (!hasCanvas()) return null
  const shape = ['......#......', '.....###.....', '....#####....', '...#######...', '..#########..', '.###########.', '....#####....', '....#####....', '....#####....', '....#####....']
  const canvas = makeCanvas(13, 13)
  const ctx = canvas.getContext('2d')!
  const on = (x: number, y: number) => shape[y]?.[x] === '#'
  ctx.fillStyle = '#1b1626'
  for (let y = -1; y <= shape.length; y += 1) for (let x = -1; x <= 13; x += 1) if (on(x, y) || on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) ctx.fillRect(x, y + 1, 1, 1)
  for (let y = 0; y < shape.length; y += 1) for (let x = 0; x < 13; x += 1) if (on(x, y)) { ctx.fillStyle = y < 3 || !on(x, y - 1) ? '#fff3a8' : '#ffd23f'; ctx.fillRect(x, y + 1, 1, 1) }
  return canvas
}
