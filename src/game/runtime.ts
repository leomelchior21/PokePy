// The overworld: movement, NPCs, encounters and drawing. React owns dialogs and battles;
// the runtime only says "this happened" through its hooks.
import { avatarLook } from '../world/looks'
import { getMap } from '../world/maps'
import type { GameMap, ItemDef, NpcDef, SignDef, Thing, Trigger } from '../world/types'
import { buildingAt, cutFlag, delta, facingToward, isGrass, itemFlag, mapHeight, mapWidth, npcsIn, opposite, spottedBy, step, thingsIn, tileAt, visible, walkable, warpAt, type Arrival, type NpcPositions } from '../world/world'
import { objectCanvas, personCanvas, pyxieCanvas } from '../engine/art'
import { makeCanvas } from '../engine/pixels'
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

const WALK_MS = 170
const RUN_MS = 95

export class WorldRuntime {
  map: GameMap
  x: number
  y: number
  facing: Direction
  mover: Mover | null = null
  held: Direction[] = []
  running = false
  /** True while a dialog, menu or battle owns the screen. */
  busy = false
  stepCount = 0
  walkFrame = 0
  trail: Array<{ x: number; y: number; facing: Direction }> = []
  npcPos: NpcPositions = {}
  npcFacing: Record<string, Direction> = {}
  npcMove: Record<string, Mover | null> = {}
  npcTimer: Record<string, number> = {}
  bubble: { npc: string; until: number } | null = null
  fade = 0
  private fadeTarget = 0
  private pendingArrival: (() => void) | null = null
  private time = 0
  private layerCache = new Map<string, HTMLCanvasElement>()
  private rng: Rng = randomRng()
  private hooks: RuntimeHooks
  private encounterCooldown = 0
  private turnHold = 0

  constructor(hooks: RuntimeHooks) {
    this.hooks = hooks
    const save = hooks.getSave()
    this.map = getMap(save.map)
    this.x = save.x
    this.y = save.y
    this.facing = save.facing
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
    this.layerCache.clear()
  }

  /** Jumps to a map position right away: new game, warps from scripts, blackouts. */
  place(mapId: string, x: number, y: number, facing: Direction) {
    const changed = mapId !== this.map.id
    this.map = getMap(mapId)
    this.x = x
    this.y = y
    this.facing = facing
    this.mover = null
    if (changed) this.resetNpcs()
    this.trail = []
    this.hooks.onMoved(mapId, x, y, facing, 0)
    if (changed) this.hooks.onEnterMap(this.map)
  }

  invalidate() {
    this.layerCache.clear()
  }

  press(dir: Direction) {
    if (!this.held.includes(dir)) this.held = [dir, ...this.held]
  }

  release(dir: Direction) {
    this.held = this.held.filter((item) => item !== dir)
  }

  clearInput() {
    this.held = []
  }

  /** The A button: talk, read, pick up. */
  interact() {
    if (this.busy || this.mover) return
    const flags = this.flags()
    const [dx, dy] = delta[this.facing]
    let tx = this.x + dx
    let ty = this.y + dy
    // Talk across counters.
    if (tileAt(this.map, tx, ty) === 'X') { tx += dx; ty += dy }
    const npc = npcsIn(this.map, flags).find((item) => {
      const at = this.npcPos[item.id] ?? item
      return at.x === tx && at.y === ty
    })
    if (npc) {
      if (!npc.pyxie) this.npcFacing[npc.id] = opposite[this.facing]
      this.hooks.onInteractNpc(npc)
      return
    }
    const sign = this.map.signs?.find((item) => item.x === tx && item.y === ty)
    if (sign) return this.hooks.onSign(sign)
    const item = this.map.items?.find((entry) => entry.x === tx && entry.y === ty && !flags.has(itemFlag(entry.id)))
    if (item) return this.hooks.onItem(item)
    const thing = thingsIn(this.map, flags).find((entry) => entry.x === tx && entry.y === ty)
    if (thing) return this.hooks.onThing(thing)
    const tile = tileAt(this.map, tx, ty)
    if (tile === 'C' && !flags.has(cutFlag(this.map.id, tx, ty))) return this.hooks.onCardboard(tx, ty)
    if (tile === '~') return this.hooks.onTalkTile('The water is calm. A Quotie splashes somewhere far away.')
    if (tile === 'l') return this.hooks.onTalkTile('A laser beam! Don\'t touch it.')
  }

  /** Steps the player back one tile, used when a script blocks the way. */
  pushBack() {
    const back = opposite[this.facing]
    const result = step(this.map, this.x, this.y, back, this.flags(), this.npcPos)
    if (result.type === 'move') {
      this.x = result.x
      this.y = result.y
      this.hooks.onMoved(this.map.id, this.x, this.y, this.facing, 0)
    }
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
      this.npcMove[npc.id] = { x: nx, y: ny, fromX: pos.x, fromY: pos.y, t: 0, duration: WALK_MS, jump: false }
      this.npcPos[npc.id] = { x: nx, y: ny }
      window.setTimeout(walkOne, WALK_MS + 10)
    }
    this.npcFacing[npc.id] = dir
    walkOne()
  }

  update(dt: number) {
    this.time += dt
    this.encounterCooldown = Math.max(0, this.encounterCooldown - dt)
    this.updateFade(dt)
    this.updateNpcs(dt)
    if (this.mover) {
      this.mover.t += dt
      if (this.mover.t >= this.mover.duration) this.arrive()
      return
    }
    if (this.busy || this.fadeTarget > 0) return
    const dir = this.held[0]
    if (!dir) { this.turnHold = 0; return }
    // A quick tap turns in place; holding the direction walks.
    if (this.facing !== dir) { this.facing = dir; this.turnHold = 90; return }
    if (this.turnHold > 0) { this.turnHold -= dt; return }
    this.tryStep(dir)
  }

  private tryStep(dir: Direction) {
    const flags = this.flags()
    this.facing = dir
    const result = step(this.map, this.x, this.y, dir, flags, this.npcPos)
    if (result.type === 'blocked') {
      if (this.time - this.lastBump > 320) { this.hooks.sfx('bump'); this.lastBump = this.time }
      return
    }
    this.trail = [{ x: this.x, y: this.y, facing: this.facing }, ...this.trail].slice(0, 3)
    if (result.type === 'edge') {
      this.transition(() => this.place(result.map, result.x, result.y, dir))
      return
    }
    const duration = (this.running ? RUN_MS : WALK_MS) * (result.jump ? 1.6 : 1)
    this.mover = { x: result.x, y: result.y, fromX: this.x, fromY: this.y, t: 0, duration, jump: Boolean(result.jump) }
    if (result.jump) this.hooks.sfx('jump')
    this.walkFrame = (this.walkFrame + 1) % 2
  }

  private lastBump = 0

  private arrive() {
    if (!this.mover) return
    this.x = this.mover.x
    this.y = this.mover.y
    this.mover = null
    this.stepCount += 1
    this.hooks.onMoved(this.map.id, this.x, this.y, this.facing, 1)
    const flags = this.flags()
    const warp = warpAt(this.map, this.x, this.y)
    if (warp) return this.useWarp(warp)
    const trigger = this.map.triggers?.find((item) => this.x >= item.x && this.x < item.x + (item.w ?? 1) && this.y >= item.y && this.y < item.y + (item.h ?? 1)
      && (!item.ifFlag || flags.has(item.ifFlag)) && (!item.unlessFlag || !flags.has(item.unlessFlag)))
    if (trigger) return this.hooks.onTrigger(trigger)
    const save = this.hooks.getSave()
    const spotter = spottedBy(this.map, this.x, this.y, flags, this.npcPos, this.npcFacing, new Set(save.defeated))
    if (spotter) {
      this.bubble = { npc: spotter.id, until: this.time + 900 }
      this.hooks.sfx('alert')
      this.held = []
      this.hooks.onSpotted(spotter)
      return
    }
    if (isGrass(this.map, this.x, this.y) && this.map.encounters && save.team.length && this.encounterCooldown <= 0) {
      if (this.rng.chance(this.map.encounters.rate)) {
        this.encounterCooldown = 1200
        this.held = []
        this.hooks.onWildEncounter(this.map)
      }
    }
  }

  private useWarp(warp: Arrival) {
    const save = this.hooks.getSave()
    const req = warp.requires
    if (req) {
      const ok = (req.xp === undefined || save.trainerXp >= req.xp) && (req.badges === undefined || save.badges.length >= req.badges)
        && (!req.flag || save.flags.includes(req.flag)) && (!req.item || (save.bag[req.item] ?? 0) > 0)
      if (!ok) {
        this.pushBack()
        const extra = req.xp !== undefined ? ` (You have ${save.trainerXp} XP.)` : req.badges !== undefined ? ` (You have ${save.badges.length}.)` : ''
        this.hooks.onBlockedDoor(req.message + extra)
        return
      }
    }
    this.hooks.sfx('door')
    this.transition(() => this.place(warp.map, warp.x, warp.y, warp.facing))
  }

  /** Fades to black, runs the change, fades back in. */
  transition(change: () => void) {
    this.fadeTarget = 1
    this.pendingArrival = change
  }

  private updateFade(dt: number) {
    const speed = dt / 140
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
      const playerThere = (nx === this.x && ny === this.y) || (this.mover && nx === this.mover.x && ny === this.mover.y)
      if (playerThere || warpAt(this.map, nx, ny) || tileAt(this.map, nx, ny) === ',') continue
      const others = { ...this.npcPos }
      delete others[npc.id]
      if (!walkable(this.map, nx, ny, flags, others)) continue
      this.npcMove[npc.id] = { x: nx, y: ny, fromX: pos.x, fromY: pos.y, t: 0, duration: WALK_MS * 1.6, jump: false }
      this.npcPos[npc.id] = { x: nx, y: ny }
    }
  }

  /** The player's position in pixels, mid-step included. */
  playerPixel(): { x: number; y: number; lift: number } {
    if (!this.mover) return { x: this.x * 16, y: this.y * 16, lift: 0 }
    const k = Math.min(1, this.mover.t / this.mover.duration)
    const lift = this.mover.jump ? Math.sin(k * Math.PI) * 8 : 0
    return { x: (this.mover.fromX + (this.mover.x - this.mover.fromX) * k) * 16, y: (this.mover.fromY + (this.mover.y - this.mover.fromY) * k) * 16, lift }
  }

  private staticLayer(frame: number): HTMLCanvasElement {
    const flags = this.flags()
    const key = `${this.map.id}:${frame}:${[...flags].filter((flag) => flag.startsWith('cut:') || flag === 'segfault1').join(',')}`
    const cached = this.layerCache.get(key)
    if (cached) return cached
    const w = mapWidth(this.map)
    const h = mapHeight(this.map)
    const pad = 12
    const canvas = makeCanvas((w + pad * 2) * 16, (h + pad * 2) * 16)
    const ctx = canvas.getContext('2d')!
    for (let y = -pad; y < h + pad; y += 1) for (let x = -pad; x < w + pad; x += 1) drawTile(ctx, this.map, x, y, (x + pad) * 16, (y + pad) * 16, frame, flags)
    for (const building of this.map.buildings ?? []) drawBuilding(ctx, building, (building.x + pad) * 16, (building.y + pad) * 16, frame)
    for (const sign of this.map.signs ?? []) {
      const art = objectCanvas(sign.kind ?? 'sign')
      if (art) ctx.drawImage(art, (sign.x + pad) * 16, (sign.y + pad) * 16)
    }
    this.layerCache.set(key, canvas)
    return canvas
  }

  render(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const save = this.hooks.getSave()
    const flags = this.flags()
    const scale = Math.max(2, Math.floor(Math.min(width / (15 * 16), height / (10 * 16))))
    const viewW = width / scale
    const viewH = height / scale
    const player = this.playerPixel()
    const mapW = mapWidth(this.map) * 16
    const mapH = mapHeight(this.map) * 16
    let camX = player.x + 8 - viewW / 2
    let camY = player.y + 8 - viewH / 2
    if (this.map.outside === 'void') {
      camX = mapW <= viewW ? (mapW - viewW) / 2 : Math.max(0, Math.min(mapW - viewW, camX))
      camY = mapH <= viewH ? (mapH - viewH) / 2 : Math.max(0, Math.min(mapH - viewH, camY))
    }
    camX = Math.round(camX * scale) / scale
    camY = Math.round(camY * scale) / scale
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = '#0b0912'
    ctx.fillRect(0, 0, width, height)
    ctx.save()
    ctx.scale(scale, scale)
    ctx.translate(-camX, -camY)
    const frame = Math.floor(this.time / 420) % 3
    const pad = 12
    ctx.drawImage(this.staticLayer(frame), -pad * 16, -pad * 16)

    // Everything that stands on the map, drawn top to bottom so nearer things overlap.
    type Drawable = { y: number; draw: () => void }
    const drawables: Drawable[] = []
    for (const item of this.map.items ?? []) {
      if (item.hidden || flags.has(itemFlag(item.id))) continue
      const art = objectCanvas('capsule')
      drawables.push({ y: item.y * 16, draw: () => { if (art) ctx.drawImage(art, item.x * 16, item.y * 16 + Math.sin(this.time / 300 + item.x) * 1) } })
    }
    for (const thing of thingsIn(this.map, flags)) {
      if (!thing.sprite) continue
      drawables.push({ y: thing.y * 16, draw: () => this.drawThing(ctx, thing) })
    }
    for (const npc of npcsIn(this.map, flags)) {
      const pos = this.npcPixel(npc)
      drawables.push({ y: pos.y, draw: () => this.drawNpc(ctx, npc, pos) })
    }
    const lead = save.team.find((pyxie) => pyxie.hp > 0)
    const follow = this.trail[0]
    if (lead && follow && this.map.area !== 'house' && !this.mover?.jump) {
      const k = this.mover ? Math.min(1, this.mover.t / this.mover.duration) : 1
      const from = this.trail[1] ?? follow
      const fx = (from.x + (follow.x - from.x) * k) * 16
      const fy = (from.y + (follow.y - from.y) * k) * 16
      const art = pyxieCanvas(lead.species, lead.shiny)
      drawables.push({ y: fy - 1, draw: () => {
        this.shadow(ctx, fx, fy)
        const bob = Math.abs(Math.sin(this.time / 160)) * 1.5
        if (art) ctx.drawImage(art, fx, fy - 3 - bob)
        this.grassOver(ctx, fx, fy, follow.x, follow.y, frame)
      } })
    }
    drawables.push({ y: player.y + 0.5, draw: () => {
      const look = avatarLook(save.avatar)
      const walking = this.mover ? (this.mover.t / this.mover.duration < 0.5 ? 1 + this.walkFrame : 0) : 0
      const art = personCanvas(look, this.facing, walking)
      this.shadow(ctx, player.x, player.y)
      if (art) ctx.drawImage(art, player.x, player.y - 4 - player.lift)
      if (!this.mover || !this.mover.jump) this.grassOver(ctx, player.x, player.y, this.mover?.x ?? this.x, this.mover?.y ?? this.y, frame)
    } })
    drawables.sort((a, b) => a.y - b.y).forEach((item) => item.draw())

    if (this.bubble && this.bubble.until > this.time) {
      const npc = this.map.npcs?.find((item) => item.id === this.bubble?.npc)
      if (npc) {
        const pos = this.npcPixel(npc)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(pos.x + 4, pos.y - 17, 9, 11)
        ctx.strokeStyle = '#1b1626'
        ctx.lineWidth = 1
        ctx.strokeRect(pos.x + 4.5, pos.y - 16.5, 8, 10)
        ctx.fillStyle = '#e8483f'
        ctx.fillRect(pos.x + 8, pos.y - 15, 1, 5)
        ctx.fillRect(pos.x + 8, pos.y - 9, 1, 1)
      }
    }
    ctx.restore()

    if (this.map.dark) {
      const cx = (player.x + 8 - camX) * scale
      const cy = (player.y + 6 - camY) * scale
      const gradient = ctx.createRadialGradient(cx, cy, scale * 18, cx, cy, scale * 70)
      gradient.addColorStop(0, 'rgba(8,4,16,0)')
      gradient.addColorStop(1, 'rgba(8,4,16,0.93)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)
    }
    if (this.fade > 0) {
      ctx.fillStyle = `rgba(11,9,18,${this.fade})`
      ctx.fillRect(0, 0, width, height)
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
    this.shadow(ctx, pos.x, pos.y)
    if (npc.pyxie) {
      const art = pyxieCanvas(npc.pyxie)
      const bob = Math.sin(this.time / 250) * 2
      if (art) ctx.drawImage(art, pos.x, pos.y - 6 + bob)
      return
    }
    const moving = this.npcMove[npc.id]
    const frame = moving ? (moving.t / moving.duration < 0.5 ? 1 : 2) : 0
    const art = personCanvas(npc.look, this.npcFacing[npc.id] ?? npc.facing, frame)
    if (art) ctx.drawImage(art, pos.x, pos.y - 4)
  }

  private drawThing(ctx: CanvasRenderingContext2D, thing: Thing) {
    const [kind, arg] = (thing.sprite ?? '').split(':')
    if (kind === 'pod') {
      const pod = objectCanvas('pod')
      if (pod) ctx.drawImage(pod, thing.x * 16, thing.y * 16 - 4)
      const art = pyxieCanvas(arg)
      if (art) ctx.drawImage(art, thing.x * 16 + 3, thing.y * 16 - 1 + Math.sin(this.time / 300 + thing.x) * 1, 10, 10)
      return
    }
    const art = objectCanvas(kind)
    if (art) ctx.drawImage(art, thing.x * 16, thing.y * 16)
  }

  private shadow(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.fillStyle = 'rgba(20,12,30,0.28)'
    ctx.beginPath()
    ctx.ellipse(x + 8, y + 14, 5, 2, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  /** Tall grass hides the feet of whoever stands in it. */
  private grassOver(ctx: CanvasRenderingContext2D, x: number, y: number, tx: number, ty: number, frame: number) {
    if (tileAt(this.map, tx, ty) !== ',') return
    ctx.save()
    ctx.beginPath()
    ctx.rect(tx * 16, ty * 16 + 9, 16, 7)
    ctx.clip()
    drawTile(ctx, this.map, tx, ty, tx * 16, ty * 16, frame, this.flags())
    ctx.restore()
    void x
    void y
  }

  hidesBuildingAt(x: number, y: number): boolean {
    return Boolean(buildingAt(this.map, x, y))
  }

  isVisible(entity: { showIf?: string; hideIf?: string }): boolean {
    return visible(entity, this.flags())
  }
}
