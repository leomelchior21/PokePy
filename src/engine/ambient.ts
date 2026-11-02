// Life in the valley: birds that peck and scatter, flocks overhead with shadows below, butterflies,
// falling leaves, fireflies, chimney smoke, drifting cloud shadows, light rays and fish ripples.
// Everything lives in world pixels and only near the camera, so it costs almost nothing.
import type { GameMap } from '../world/types'
import { doorOf, tileAt } from '../world/world'

type Ctx = CanvasRenderingContext2D

export interface View { x: number; y: number; w: number; h: number }

interface Bird { x: number; y: number; z: number; vx: number; vy: number; vz: number; state: 'ground' | 'fly'; t: number; color: string; peck: number }
interface Flyer { kind: 'butterfly' | 'leaf' | 'firefly'; x: number; y: number; t: number; vx: number; vy: number; color: string; seed: number }
interface Puff { x: number; y: number; r: number; life: number; max: number; vx: number; vy: number; color: string; kind: 'smoke' | 'dust' | 'leaf' | 'ripple' | 'sparkle' }
interface Cloud { x: number; y: number; rx: number; ry: number; v: number }

const rand = (a: number, b: number) => a + Math.random() * (b - a)

export class Ambient {
  private map: GameMap
  private birds: Bird[] = []
  private flock: Bird[] = []
  private flockTimer = rand(2000, 7000)
  private flyers: Flyer[] = []
  private puffs: Puff[] = []
  private clouds: Cloud[] = []
  private chimneys: Array<{ x: number; y: number; t: number }> = []
  private birdTimer = 0
  private time = 0
  private outdoor: boolean

  constructor(map: GameMap, outdoor: boolean) {
    this.map = map
    this.outdoor = outdoor
    for (const building of map.buildings ?? []) {
      if (building.kind === 'house' || building.kind === 'makerspace') this.chimneys.push({ x: (building.x + building.w) * 16 - 10, y: building.y * 16 - 11, t: rand(0, 600) })
    }
    if (outdoor) for (let i = 0; i < 3; i += 1) this.clouds.push({ x: rand(-200, map.rows[0].length * 16), y: rand(-100, map.rows.length * 16), rx: rand(70, 130), ry: rand(30, 55), v: rand(5, 9) })
  }

  private get area() { return this.map.area }
  private get birdColor() { return this.area === 'beach' || this.map.outside === 'water' ? '#f4f4f8' : this.area === 'mountain' ? '#6a5a7a' : '#8a5a3a' }

  /** A place on the ground where a bird could land, near the view. */
  private landingSpot(view: View, avoid: { x: number; y: number }): { x: number; y: number } | null {
    for (let tries = 0; tries < 12; tries += 1) {
      const x = rand(view.x + 16, view.x + view.w - 16)
      const y = rand(view.y + 16, view.y + view.h - 16)
      const t = tileAt(this.map, Math.floor(x / 16), Math.floor(y / 16))
      if (!['.', ':', '=', 's', 'f'].includes(t)) continue
      if (Math.hypot(x - avoid.x, y - avoid.y) < 70) continue
      return { x, y }
    }
    return null
  }

  burst(kind: 'dust' | 'leaf' | 'sparkle', x: number, y: number, count = 3) {
    for (let i = 0; i < count; i += 1) {
      const leaf = kind === 'leaf'
      this.puffs.push({
        x: x + rand(-4, 4), y: y + rand(-3, 1), r: leaf ? 1 : rand(1.5, 3), life: 0, max: leaf ? rand(400, 700) : rand(300, 500),
        vx: rand(-20, 20), vy: leaf ? rand(-40, -20) : rand(-12, -4), kind, color: leaf ? (Math.random() < 0.5 ? '#5aa646' : '#86cb5e') : kind === 'sparkle' ? '#fff6b0' : 'rgba(230, 210, 170, 0.7)',
      })
    }
  }

  update(dt: number, view: View, player: { x: number; y: number }) {
    this.time += dt
    const s = dt / 1000
    if (this.outdoor) {
      // Ground birds peck around and take off when someone walks close.
      this.birdTimer -= dt
      const wanted = this.area === 'route' || this.area === 'town' || this.area === 'beach' || this.area === 'academy' ? 4 : this.area === 'forest' ? 2 : 1
      if (this.birdTimer <= 0 && this.birds.filter((b) => b.state === 'ground').length < wanted) {
        this.birdTimer = rand(1500, 4000)
        const spot = this.landingSpot(view, player)
        if (spot) {
          const from = Math.random() < 0.5 ? -1 : 1
          this.birds.push({ x: spot.x - from * 120, y: spot.y - 40, z: 60, vx: from * 120 / 1.4, vy: 40 / 1.4, vz: -60 / 1.4, state: 'fly', t: 1400, color: this.birdColor, peck: rand(0, 1000) })
        }
      }
      for (const bird of this.birds) {
        if (bird.state === 'fly') {
          bird.x += bird.vx * s; bird.y += bird.vy * s; bird.z = Math.max(0, bird.z + bird.vz * s)
          bird.t -= dt
          if (bird.t <= 0 && bird.vz < 0) { bird.state = 'ground'; bird.z = 0; bird.vx = 0; bird.vy = 0; bird.vz = 0 }
        } else {
          bird.peck += dt
          if (Math.random() < s * 0.6) bird.x += rand(-3, 3)
          if (Math.hypot(bird.x - player.x, bird.y - player.y) < 40) {
            const away = Math.atan2(bird.y - player.y, bird.x - player.x)
            bird.state = 'fly'; bird.t = 99999
            bird.vx = Math.cos(away) * rand(90, 130); bird.vy = Math.sin(away) * 60 - 40; bird.vz = rand(50, 80)
          }
        }
      }
      this.birds = this.birds.filter((b) => b.state === 'ground' || (b.x > view.x - 200 && b.x < view.x + view.w + 200 && b.y > view.y - 250 && b.y < view.y + view.h + 200))
      // A flock crossing the sky now and then.
      this.flockTimer -= dt
      if (this.flockTimer <= 0 && !this.flock.length) {
        this.flockTimer = rand(9000, 18000)
        const dir = Math.random() < 0.5 ? 1 : -1
        const baseY = rand(view.y + 20, view.y + view.h - 20)
        const n = 3 + Math.floor(Math.random() * 3)
        for (let i = 0; i < n; i += 1) this.flock.push({ x: (dir > 0 ? view.x - 30 : view.x + view.w + 30) - dir * i * 14, y: baseY + (i % 2 ? 9 : -9) * Math.ceil(i / 2), z: 70, vx: dir * 70, vy: -8, vz: 0, state: 'fly', t: i * 120, color: this.birdColor, peck: 0 })
      }
      for (const bird of this.flock) { bird.x += bird.vx * s; bird.y += bird.vy * s; bird.t += dt }
      if (this.flock.length && this.flock.every((b) => b.x < view.x - 80 || b.x > view.x + view.w + 80)) this.flock = []
      for (const cloud of this.clouds) {
        cloud.x += cloud.v * s
        if (cloud.x - cloud.rx > view.x + view.w + 100) { cloud.x = view.x - cloud.rx - rand(50, 300); cloud.y = rand(view.y - 40, view.y + view.h + 40) }
      }
      // Fish ripples.
      if (Math.random() < s * 0.8) {
        const x = rand(view.x, view.x + view.w)
        const y = rand(view.y, view.y + view.h)
        if (tileAt(this.map, Math.floor(x / 16), Math.floor(y / 16)) === '~') this.puffs.push({ x, y, r: 1, life: 0, max: 1400, vx: 0, vy: 0, kind: 'ripple', color: '#e6f6ff' })
      }
    }
    // Butterflies over grass and flowers, leaves in the woods, fireflies at night and in caves.
    const butterflies = this.outdoor && ['route', 'town', 'academy', 'forest'].includes(this.area) ? 4 : 0
    const leaves = this.area === 'forest' ? 8 : this.outdoor && this.area !== 'beach' ? 2 : 0
    const fireflies = this.area === 'forest' ? 8 : this.map.dark ? 14 : 0
    const want = { butterfly: butterflies, leaf: leaves, firefly: fireflies }
    const counts = { butterfly: 0, leaf: 0, firefly: 0 }
    for (const f of this.flyers) counts[f.kind] += 1
    const spawn = (kind: keyof typeof want) => {
      const color = kind === 'leaf' ? ['#e8a23a', '#d9673a', '#86cb5e', '#5aa646'][Math.floor(Math.random() * 4)] : kind === 'firefly' ? '#fff59a' : ['#ffffff', '#ffd23f', '#8fd0ff', '#ff9fd0', '#c79bff'][Math.floor(Math.random() * 5)]
      const x = rand(view.x, view.x + view.w)
      const y = kind === 'leaf' ? view.y - 10 : rand(view.y, view.y + view.h)
      this.flyers.push({ kind, x, y, t: 0, vx: kind === 'leaf' ? rand(-14, -4) : rand(-15, 15), vy: kind === 'leaf' ? rand(12, 22) : rand(-10, 10), color, seed: Math.random() * 100 })
    }
    for (const kind of Object.keys(want) as Array<keyof typeof want>) if (counts[kind] < want[kind] && Math.random() < s * 3) spawn(kind)
    for (const f of this.flyers) {
      f.t += dt
      if (f.kind === 'leaf') { f.x += (f.vx + Math.sin(f.t / 400 + f.seed) * 14) * s; f.y += f.vy * s }
      else if (f.kind === 'firefly') { f.x += Math.sin(f.t / 900 + f.seed) * 8 * s; f.y += Math.cos(f.t / 1100 + f.seed) * 6 * s }
      else {
        if (Math.random() < s * 1.5) { f.vx = rand(-20, 20); f.vy = rand(-14, 14) }
        f.x += f.vx * s; f.y += f.vy * s + Math.sin(f.t / 160 + f.seed) * 0.3
      }
    }
    this.flyers = this.flyers.filter((f) => f.x > view.x - 40 && f.x < view.x + view.w + 40 && f.y > view.y - 40 && f.y < view.y + view.h + 40)
    // Chimney smoke.
    for (const chimney of this.chimneys) {
      chimney.t -= dt
      if (chimney.t <= 0) {
        chimney.t = rand(380, 620)
        this.puffs.push({ x: chimney.x + rand(-1, 1), y: chimney.y, r: 2, life: 0, max: rand(2200, 3000), vx: rand(4, 9), vy: rand(-14, -10), kind: 'smoke', color: '#f2eef6' })
      }
    }
    for (const p of this.puffs) {
      p.life += dt
      p.x += p.vx * s; p.y += p.vy * s
      if (p.kind === 'smoke') p.r += s * 2.2
      if (p.kind === 'leaf') p.vy += 90 * s
    }
    this.puffs = this.puffs.filter((p) => p.life < p.max)
  }

  /** Under everything that stands: bird shadows and ripples. */
  drawGround(ctx: Ctx) {
    ctx.fillStyle = 'rgba(20, 20, 40, 0.18)'
    for (const bird of [...this.birds, ...this.flock]) {
      if (bird.z <= 1) continue
      ctx.beginPath(); ctx.ellipse(Math.round(bird.x), Math.round(bird.y + 1), 3, 1.2, 0, 0, Math.PI * 2); ctx.fill()
    }
    for (const p of this.puffs) {
      if (p.kind !== 'ripple') continue
      const k = p.life / p.max
      ctx.strokeStyle = `rgba(230, 246, 255, ${0.7 * (1 - k)})`
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.ellipse(Math.round(p.x), Math.round(p.y), 2 + k * 7, 1 + k * 3, 0, 0, Math.PI * 2); ctx.stroke()
    }
  }

  /** Ground birds stand among people, so the runtime sorts them with everyone else. */
  groundBirds(): Array<{ y: number; draw: (ctx: Ctx) => void }> {
    return this.birds.filter((b) => b.state === 'ground').map((bird) => ({ y: bird.y, draw: (ctx: Ctx) => drawBird(ctx, bird.x, bird.y, bird.color, 'ground', Math.floor(bird.peck / 300) % 4 === 0) }))
  }

  /** Above everything: flying birds, butterflies, leaves, smoke, fireflies, dust. */
  drawAir(ctx: Ctx) {
    for (const p of this.puffs) {
      const k = p.life / p.max
      if (p.kind === 'smoke') { ctx.fillStyle = `rgba(242, 238, 246, ${0.55 * (1 - k)})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill() }
      if (p.kind === 'dust') { ctx.fillStyle = `rgba(232, 214, 176, ${0.7 * (1 - k)})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.ceil(p.r * (1 - k * 0.5)), Math.ceil(p.r * (1 - k * 0.5))) }
      if (p.kind === 'leaf') { ctx.fillStyle = p.color; ctx.fillRect(Math.round(p.x), Math.round(p.y), 2, 1) }
      if (p.kind === 'sparkle') { ctx.fillStyle = `rgba(255, 246, 176, ${1 - k})`; ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1) }
    }
    for (const bird of this.birds) if (bird.state === 'fly') drawBird(ctx, bird.x, bird.y - bird.z, bird.color, Math.floor(this.time / 90) % 2 ? 'up' : 'down', false)
    for (const bird of this.flock) drawBird(ctx, bird.x, bird.y - bird.z, bird.color, Math.floor((this.time + bird.t) / 140) % 2 ? 'up' : 'down', false)
    for (const f of this.flyers) {
      const x = Math.round(f.x)
      const y = Math.round(f.y)
      if (f.kind === 'leaf') { ctx.fillStyle = f.color; ctx.fillRect(x, y, 2, 1); ctx.fillRect(x + (Math.sin(f.t / 200) > 0 ? 1 : 0), y + 1, 1, 1) }
      else if (f.kind === 'firefly') {
        const glow = 0.5 + 0.5 * Math.sin(f.t / 300 + f.seed)
        ctx.fillStyle = `rgba(255, 245, 150, ${0.18 * glow})`
        ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
        ctx.fillStyle = `rgba(255, 250, 190, ${0.5 + 0.5 * glow})`
        ctx.fillRect(x, y, 1, 1)
      } else {
        const open = Math.floor(f.t / 110) % 2 === 0
        ctx.fillStyle = 'rgba(20, 20, 40, 0.15)'
        ctx.fillRect(x, y + 8, 2, 1)
        ctx.fillStyle = f.color
        if (open) { ctx.fillRect(x - 1, y, 1, 2); ctx.fillRect(x + 1, y, 1, 2) } else { ctx.fillRect(x - 1, y + 1, 1, 1); ctx.fillRect(x + 1, y + 1, 1, 1) }
        ctx.fillStyle = '#2b2230'
        ctx.fillRect(x, y, 1, 2)
      }
    }
  }

  /** Big soft cloud shadows that drift across the ground. */
  drawClouds(ctx: Ctx) {
    for (const cloud of this.clouds) {
      const g = ctx.createRadialGradient(cloud.x, cloud.y, 0, cloud.x, cloud.y, cloud.rx)
      g.addColorStop(0, 'rgba(30, 40, 70, 0.13)')
      g.addColorStop(0.7, 'rgba(30, 40, 70, 0.08)')
      g.addColorStop(1, 'rgba(30, 40, 70, 0)')
      ctx.fillStyle = g
      ctx.save()
      ctx.translate(cloud.x, cloud.y)
      ctx.scale(1, cloud.ry / cloud.rx)
      ctx.translate(-cloud.x, -cloud.y)
      ctx.beginPath(); ctx.arc(cloud.x, cloud.y, cloud.rx, 0, Math.PI * 2); ctx.fill()
      ctx.restore()
    }
  }

  private light: { key: string; rays: HTMLCanvasElement | null; vignette: HTMLCanvasElement | null } | null = null

  /** Rays and vignette are painted once per screen size, then reused every frame. */
  private lightLayers(width: number, height: number) {
    const key = `${width}x${height}:${this.area}:${this.outdoor}`
    if (this.light?.key === key) return this.light
    const make = () => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c }
    let rays: HTMLCanvasElement | null = null
    const count = this.outdoor ? (this.area === 'forest' ? 4 : this.area === 'beach' ? 0 : 3) : 0
    if (count) {
      rays = make()
      const ctx = rays.getContext('2d')!
      for (let i = 0; i < count; i += 1) {
        const x = width * (0.08 + i * 0.22)
        const w = width * (0.05 + (i % 2) * 0.035)
        const g = ctx.createLinearGradient(0, 0, 0, height)
        g.addColorStop(0, `rgba(255, 244, 200, ${this.area === 'forest' ? 0.075 : 0.05})`)
        g.addColorStop(1, 'rgba(255, 244, 200, 0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.moveTo(x, 0); ctx.lineTo(x + w, 0); ctx.lineTo(x + w + height * 0.55, height); ctx.lineTo(x + height * 0.55, height)
        ctx.fill()
      }
    }
    const vignette = make()
    const v = vignette.getContext('2d')!
    const g = v.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.45, width / 2, height / 2, Math.max(width, height) * 0.75)
    g.addColorStop(0, 'rgba(10, 6, 24, 0)')
    g.addColorStop(1, `rgba(10, 6, 24, ${this.outdoor ? 0.32 : 0.22})`)
    v.fillStyle = g
    v.fillRect(0, 0, width, height)
    this.light = { key, rays, vignette }
    return this.light
  }

  /** Screen-space light: sun rays through the trees, a warm grade and a soft vignette. */
  drawScreen(ctx: Ctx, width: number, height: number) {
    const layers = this.lightLayers(width, height)
    if (layers.rays) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.globalAlpha = 0.75 + 0.25 * Math.sin(this.time / 2500)
      ctx.drawImage(layers.rays, Math.sin(this.time / 4000) * width * 0.03, 0)
      ctx.restore()
    }
    if (this.outdoor) {
      ctx.fillStyle = this.area === 'forest' ? 'rgba(40, 90, 60, 0.06)' : 'rgba(255, 200, 120, 0.04)'
      ctx.fillRect(0, 0, width, height)
    }
    if (layers.vignette) ctx.drawImage(layers.vignette, 0, 0)
  }

  /** Lantern glow near doors, for dark maps. */
  doorLights(): Array<{ x: number; y: number }> {
    return (this.map.buildings ?? []).map((b) => { const d = doorOf(b); return { x: d.x * 16 + 8, y: d.y * 16 } })
  }
}

/** A 5×4 bird: two flying frames and a pecking pose. */
function drawBird(ctx: Ctx, x: number, y: number, color: string, pose: 'up' | 'down' | 'ground', peck: boolean) {
  const bx = Math.round(x)
  const by = Math.round(y)
  const dark = color === '#f4f4f8' ? '#8a90a0' : '#3a2a2a'
  ctx.fillStyle = dark
  if (pose === 'ground') {
    ctx.fillStyle = 'rgba(20, 20, 40, 0.2)'; ctx.fillRect(bx - 2, by + 1, 5, 1)
    ctx.fillStyle = color; ctx.fillRect(bx - 2, by - 3, 4, 3)
    ctx.fillStyle = dark; ctx.fillRect(bx - 3, by - 3, 1, 2)
    ctx.fillRect(bx + (peck ? 2 : 1), by - (peck ? 1 : 4), 2, 2)
    ctx.fillStyle = '#ffb84d'; ctx.fillRect(bx + (peck ? 3 : 3), by - (peck ? 0 : 3), 1, 1)
    return
  }
  ctx.fillStyle = color
  ctx.fillRect(bx - 1, by, 3, 2)
  ctx.fillStyle = dark
  if (pose === 'up') { ctx.fillRect(bx - 3, by - 2, 2, 2); ctx.fillRect(bx + 2, by - 2, 2, 2) } else { ctx.fillRect(bx - 4, by + 1, 3, 1); ctx.fillRect(bx + 2, by + 1, 3, 1) }
}
