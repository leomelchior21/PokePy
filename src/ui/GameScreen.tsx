import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BattleScreen } from '../battle/BattleScreen'
import { DuelPanel, runDuel } from '../battle/CodeDuel'
import { createPyxie, wildLevel } from '../battle/engine'
import type { BattleOutcome, BattleSpec } from '../battle/types'
import { duels } from '../data/duels'
import { itemName } from '../data/items'
import { badges } from '../data/progression'
import { audio } from '../engine/audio'
import { hasCanvas } from '../engine/pixels'
import { WorldRuntime } from '../game/runtime'
import { resolveScript, rivalTeam, type ScriptContext, type ScriptUI } from '../game/scripts'
import { addBadge, blackout, giveItem, hasFlag, markDefeated, markSeen, setFlag } from '../game/state'
import { randomRng } from '../lib/rng'
import { flushCloud, onSync, saveCloud, saveLocal } from '../save/cloud'
import type { Direction, SaveState } from '../types'
import type { GameMap, NpcDef, TrainerDef } from '../world/types'
import { cutFlag, itemFlag } from '../world/world'
import { CloudBox } from './CloudBox'
import { Credits } from './Credits'
import { ChoiceBox, DialogBox } from './Dialog'
import { Menu } from './Menu'
import { Shop } from './Shop'
import { BadgeIcon } from './Badge'

type Overlay =
  | { type: 'dialog'; lines: string[]; speaker?: string; resolve: () => void }
  | { type: 'choice'; prompt: string; options: string[]; speaker?: string; resolve: (index: number) => void }
  | { type: 'battle'; spec: BattleSpec; resolve: (outcome: BattleOutcome) => void }
  | { type: 'shop'; tier: number; resolve: () => void }
  | { type: 'box'; resolve: () => void }
  | { type: 'credits'; resolve: () => void }
  | { type: 'duel'; duelId: string; title: string; resolve: (won: boolean) => void }
  | { type: 'badge'; badge: string; resolve: () => void }

const keyDir: Record<string, Direction> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }

export function GameScreen({ initial, onQuit }: { initial: SaveState; onQuit: () => void }) {
  const saveRef = useRef(initial)
  const [save, setSave] = useState(initial)
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [menu, setMenu] = useState(false)
  const [banner, setBanner] = useState<{ text: string; id: number } | null>(null)
  const [flash, setFlash] = useState(false)
  const [sync, setSync] = useState<'saved' | 'saving' | 'offline'>('saved')
  const [toast, setToast] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runtimeRef = useRef<WorldRuntime | null>(null)
  const lastClose = useRef(0)
  const rng = useRef(randomRng()).current

  const get = useCallback(() => saveRef.current, [])
  const set = useCallback((update: (current: SaveState) => SaveState) => {
    const next = update(saveRef.current)
    if (next === saveRef.current) return
    saveRef.current = next
    setSave(next)
    saveCloud(next)
  }, [])

  const closeOverlay = useCallback(() => { setOverlay(null); lastClose.current = performance.now() }, [])

  const ui: ScriptUI = useMemo(() => ({
    say: (lines, speaker) => new Promise<void>((resolve) => setOverlay({ type: 'dialog', lines: Array.isArray(lines) ? lines : [lines], speaker, resolve })),
    choose: (prompt, options, speaker) => new Promise<number>((resolve) => setOverlay({ type: 'choice', prompt, options, speaker, resolve })),
    starter: () => Promise.resolve('sparkit'),
    battle: (spec) => new Promise<BattleOutcome>((resolve) => setOverlay({ type: 'battle', spec, resolve })),
    shop: (tier) => new Promise<void>((resolve) => setOverlay({ type: 'shop', tier, resolve })),
    box: () => new Promise<void>((resolve) => setOverlay({ type: 'box', resolve })),
    credits: () => new Promise<void>((resolve) => setOverlay({ type: 'credits', resolve })),
    duel: (duelId, title) => new Promise<boolean>((resolve) => setOverlay({ type: 'duel', duelId, title, resolve })),
    sfx: (name) => audio.sfx(name),
    flash: async () => { setFlash(true); await new Promise((r) => window.setTimeout(r, 500)); setFlash(false) },
  }), [])

  const say = ui.say

  /** Runs a story moment: the world freezes until it ends. */
  const run = useCallback(async (task: () => Promise<void>) => {
    const runtime = runtimeRef.current
    if (!runtime || runtime.busy) return
    runtime.busy = true
    runtime.clearInput()
    try {
      await task()
    } finally {
      closeOverlay()
      runtime.busy = false
      runtime.invalidate()
      audio.play(runtime.map.music)
    }
  }, [closeOverlay])

  const toTitle = useCallback((text: string) => { setToast(text); window.setTimeout(() => setToast(null), 2200) }, [])

  const blackoutNow = useCallback(async () => {
    set((current) => blackout(current))
    const s = get()
    runtimeRef.current?.place(s.map, s.x, s.y, 'up')
    await say(['You hurried back to safety and recharged your team.', 'You dropped half your bits on the way…'])
  }, [get, say, set])

  const trainerBattle = useCallback(async (trainer: TrainerDef, name: string): Promise<boolean> => {
    const current = get()
    const team = (trainer.id === 'rival4' ? rivalTeam(4, current) : trainer.team).map(([species, level]) => ({ ...createPyxie(species, level, rng, 'trainer'), shiny: false }))
    const map = runtimeRef.current!.map
    const outcome = await ui.battle({ kind: 'trainer', trainer, name, team, bg: map.battleBg ?? map.area })
    closeOverlay()
    if (outcome !== 'win') {
      await blackoutNow()
      return false
    }
    set((s) => {
      let next = markDefeated({ ...s, bits: s.bits + trainer.bits }, trainer.id)
      if (trainer.setFlag) next = setFlag(next, trainer.setFlag)
      return next
    })
    if (trainer.lose) await say(trainer.lose, name)
    if (trainer.bits) { audio.sfx('item'); await say(`You got ${trainer.bits} bits for winning!`) }
    if (trainer.badge) {
      set((s) => addBadge(s, trainer.badge!))
      audio.sfx('fanfare')
      await new Promise<void>((resolve) => setOverlay({ type: 'badge', badge: trainer.badge!, resolve }))
    }
    for (const [item, count] of Object.entries(trainer.reward ?? {})) {
      set((s) => giveItem(s, item, count))
      audio.sfx('item')
      await say(`${name} gave you ${itemName(item, count)}!`)
    }
    return true
  }, [blackoutNow, closeOverlay, get, rng, say, set, ui])

  const runScript = useCallback((id: string) => run(async () => {
    const found = resolveScript(id)
    if (!found) return
    const runtime = runtimeRef.current!
    const ctx: ScriptContext = {
      ui, rng, get, set, arg: found.arg,
      pushBack: () => runtime.pushBack(),
      teleport: (map, x, y, facing) => runtime.transition(() => runtime.place(map, x, y, facing)),
      trainerBattle,
      hallOfFame: () => saveCloud(get(), true),
    }
    await found.script(ctx)
  }), [get, rng, run, set, trainerBattle, ui])

  const trainerEncounter = useCallback(async (npc: NpcDef, spotted: boolean) => {
    const trainer = npc.trainer!
    const runtime = runtimeRef.current!
    if (spotted) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, 650))
      await new Promise<void>((resolve) => runtime.approach(npc, resolve))
    }
    if (trainer.intro) await say(trainer.intro, npc.name)
    await trainerBattle(trainer, npc.name)
  }, [say, trainerBattle])

  const wildEncounter = useCallback((map: GameMap) => run(async () => {
    const table = map.encounters!.table
    const total = table.reduce((sum, slot) => sum + slot.weight, 0)
    let roll = rng.next() * total
    const slot = table.find((item) => (roll -= item.weight) < 0) ?? table[0]
    const enemy = createPyxie(slot.species, wildLevel([slot.min, slot.max], rng), rng)
    set((s) => markSeen(s, enemy.species))
    const outcome = await ui.battle({ kind: 'wild', enemy, canRun: true, canCatch: true, bg: map.battleBg ?? map.area })
    closeOverlay()
    if (outcome === 'lose') await blackoutNow()
  }), [blackoutNow, closeOverlay, rng, run, set, ui])

  // The world runtime and its drawing loop.
  useEffect(() => {
    const runtime = new WorldRuntime({
      getSave: () => saveRef.current,
      onMoved: (map, x, y, facing, steps) => {
        saveRef.current = { ...saveRef.current, map, x, y, facing, stats: { ...saveRef.current.stats, steps: saveRef.current.stats.steps + steps } }
      },
      onEnterMap: (map) => {
        setBanner({ text: map.name, id: Date.now() })
        audio.play(map.music)
        if (!hasFlag(saveRef.current, `visited:${map.id}`)) set((s) => setFlag(s, `visited:${map.id}`))
      },
      onBlockedDoor: (message) => void run(() => say(message)),
      onTrigger: (trigger) => void runScript(trigger.script),
      onInteractNpc: (npc) => {
        if (performance.now() - lastClose.current < 250) return
        const trainer = npc.trainer
        if (trainer) {
          if (saveRef.current.defeated.includes(trainer.id)) { if (trainer.after) void run(() => say(trainer.after, npc.name)); return }
          void run(() => trainerEncounter(npc, false))
          return
        }
        if (npc.script) { void runScript(npc.script); return }
        if (npc.talk) void run(() => say(npc.talk!, npc.name))
      },
      onSpotted: (npc) => void run(() => trainerEncounter(npc, true)),
      onSign: (sign) => { if (performance.now() - lastClose.current >= 250) void run(() => say(sign.text)) },
      onItem: (item) => {
        if (performance.now() - lastClose.current < 250) return
        void run(async () => {
          set((s) => setFlag(giveItem(s, item.item, item.count), itemFlag(item.id)))
          audio.sfx('item')
          await say(`${item.hidden ? 'You found a hidden' : 'You found'} ${itemName(item.item, item.count)}!`)
        })
      },
      onThing: (thing) => { if (performance.now() - lastClose.current >= 250) void runScript(thing.script) },
      onCardboard: (x, y) => {
        if (performance.now() - lastClose.current < 250) return
        void run(async () => {
          if (!(saveRef.current.bag.boxcutter ?? 0)) { await say(['A wall of cardboard boxes, taped together very well.', 'If only you had a Box Cutter…']); return }
          const pick = await ui.choose('A cardboard wall. Use the Box Cutter?', ['Cut it!', 'Leave it'])
          if (pick !== 0) return
          audio.sfx('break')
          set((s) => setFlag(s, cutFlag(runtime.map.id, x, y)))
          runtime.invalidate()
          await say('You cut through the cardboard. Always cut away from your body!')
        })
      },
      onWildEncounter: (map) => void wildEncounter(map),
      onTalkTile: (text) => { if (performance.now() - lastClose.current >= 250) void run(() => say(text)) },
      sfx: (name) => audio.sfx(name),
    })
    runtimeRef.current = runtime
    audio.play(runtime.map.music)
    setBanner({ text: runtime.map.name, id: Date.now() })
    const canvas = canvasRef.current
    const ctx = canvas && hasCanvas() ? canvas.getContext('2d') : null
    let frame = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(50, now - last)
      last = now
      runtime.update(dt)
      if (ctx && canvas) {
        const dpr = window.devicePixelRatio || 1
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) { canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr) }
        runtime.render(ctx, canvas.width, canvas.height)
      }
      frame = requestAnimationFrame(loop)
    }
    frame = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(frame)
    // The runtime lives for the whole game session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Saves position and play time every few seconds.
  useEffect(() => {
    let last = performance.now()
    const id = window.setInterval(() => {
      const now = performance.now()
      const elapsed = document.visibilityState === 'visible' ? now - last : 0
      last = now
      // Position and play time stay on the device; the next real change carries them to the cloud.
      const next = { ...saveRef.current, playMs: saveRef.current.playMs + elapsed }
      saveRef.current = next
      setSave(next)
      saveLocal(next)
    }, 5000)
    return () => window.clearInterval(id)
  }, [set])

  useEffect(() => onSync(setSync), [])

  // Development only: lets automated screenshots jump straight into a battle or a script.
  useEffect(() => {
    if (!import.meta.env.DEV) return
    const target = window as unknown as Record<string, unknown>
    target.__pyxies = {
      wild: (species: string, level: number) => void run(async () => {
        const outcome = await ui.battle({ kind: 'wild', enemy: createPyxie(species, level, rng), canRun: true, canCatch: true, bg: runtimeRef.current!.map.area })
        closeOverlay()
        if (outcome === 'lose') await blackoutNow()
      }),
      script: (id: string) => void runScript(id),
      trainer: (mapNpc: string) => {
        const npc = runtimeRef.current?.map.npcs?.find((item) => item.id === mapNpc)
        if (npc?.trainer) void run(() => trainerEncounter(npc, false))
      },
      place: (map: string, x: number, y: number) => runtimeRef.current?.place(map, x, y, 'down'),
    }
  }, [blackoutNow, closeOverlay, rng, run, runScript, trainerEncounter, ui])

  // The welcome scene on a brand-new save.
  useEffect(() => {
    if (hasFlag(saveRef.current, 'intro_done')) return
    const id = window.setTimeout(() => void run(async () => {
      await say([`${saveRef.current.displayName.split(' ')[0]}! Wake up!`, 'Today is the day: Leo Maker wants to see you at the Makerspace.', 'Move with the arrows (or the D-pad). Talk with A, Enter or Space. Open the menu with MENU or Esc.'], 'Mom')
      set((s) => setFlag(s, 'intro_done'))
    }), 600)
    return () => window.clearTimeout(id)
  }, [run, say, set])

  // Keyboard.
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      audio.unlock()
      const runtime = runtimeRef.current
      if (!runtime) return
      if (event.key === 'Escape' || event.key === 'm' || event.key === 'M') {
        if (!overlay && !runtime.busy) { setMenu((open) => !open); audio.sfx('select') }
        return
      }
      if (menu || overlay) return
      const dir = keyDir[event.key]
      if (dir) { event.preventDefault(); runtime.press(dir); return }
      if (event.key === 'Shift') runtime.running = true
      if (['Enter', ' ', 'z', 'Z'].includes(event.key) && performance.now() - lastClose.current > 250) { event.preventDefault(); runtime.interact() }
    }
    const up = (event: KeyboardEvent) => {
      const runtime = runtimeRef.current
      if (!runtime) return
      const dir = keyDir[event.key]
      if (dir) runtime.release(dir)
      if (event.key === 'Shift') runtime.running = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [menu, overlay])

  useEffect(() => {
    if (runtimeRef.current) runtimeRef.current.busy = Boolean(overlay) || menu || runtimeRef.current.busy
  }, [menu, overlay])

  const touch = (dir: Direction, on: boolean) => {
    audio.unlock()
    const runtime = runtimeRef.current
    if (!runtime) return
    if (on) runtime.press(dir)
    else runtime.release(dir)
  }

  const closeMenu = () => {
    setMenu(false)
    if (runtimeRef.current) runtimeRef.current.busy = false
    lastClose.current = performance.now()
  }

  const quit = async () => {
    set((s) => ({ ...s, ...saveRef.current }))
    await flushCloud()
    audio.stop()
    onQuit()
  }

  const badgeInfo = overlay?.type === 'badge' ? badges.find((b) => b.id === overlay.badge) : null

  return <div className="game">
    <canvas ref={canvasRef} className="game__canvas" aria-label="The Castanho Valley" />
    {banner && <div key={banner.id} className="map-banner">{banner.text}</div>}
    <div className="hud">
      <span className="hud__chip" title="Trainer XP">⭐ {save.trainerXp} XP</span>
      <span className="hud__chip" title="Badges">🏅 {save.badges.length}/6</span>
      <span className="hud__chip" title="Bits">◈ {save.bits}</span>
      <span className={`hud__sync is-${sync}`} title={sync === 'offline' ? 'Saved on this device. Cloud sync is waiting.' : 'Saved'}>{sync === 'saving' ? '⟳' : sync === 'offline' ? '☁︎✕' : '☁︎✓'}</span>
      <button className="hud__menu" onClick={() => { if (!overlay && !runtimeRef.current?.busy) { setMenu(true); audio.sfx('select') } }}>MENU</button>
    </div>

    <div className="pad" aria-hidden={Boolean(overlay) || menu}>
      <div className="pad__dirs">
        {(['up', 'left', 'right', 'down'] as Direction[]).map((dir) => <button key={dir} className={`pad__dir pad__dir--${dir}`} aria-label={`Move ${dir}`}
          onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); touch(dir, true) }} onPointerUp={() => touch(dir, false)} onPointerCancel={() => touch(dir, false)} onPointerLeave={() => touch(dir, false)}>
          {dir === 'up' ? '▲' : dir === 'down' ? '▼' : dir === 'left' ? '◀' : '▶'}
        </button>)}
      </div>
      <div className="pad__actions">
        <button className="pad__btn pad__btn--b" aria-label="Run (hold)" onPointerDown={() => { if (runtimeRef.current) runtimeRef.current.running = true }} onPointerUp={() => { if (runtimeRef.current) runtimeRef.current.running = false }} onPointerLeave={() => { if (runtimeRef.current) runtimeRef.current.running = false }}>B</button>
        <button className="pad__btn pad__btn--a" aria-label="Talk or interact" onClick={() => { audio.unlock(); if (performance.now() - lastClose.current > 250) runtimeRef.current?.interact() }}>A</button>
      </div>
    </div>

    {flash && <div className="screen-flash" />}
    {toast && <div className="toast">{toast}</div>}

    {menu && !overlay && <Menu get={get} set={set} onClose={closeMenu} onQuit={quit} onSaved={() => toTitle('Game saved!')} />}

    {overlay?.type === 'dialog' && <div className="overlay overlay--dialog"><DialogBox key={overlay.lines.join('|')} lines={overlay.lines} speaker={overlay.speaker} speed={save.settings.textSpeed} onDone={() => { const r = overlay.resolve; closeOverlay(); r() }} /></div>}
    {overlay?.type === 'choice' && <div className="overlay overlay--dialog"><ChoiceBox prompt={overlay.prompt} options={overlay.options} speaker={overlay.speaker} onPick={(index) => { const r = overlay.resolve; closeOverlay(); r(index) }} /></div>}
    {overlay?.type === 'battle' && <div className="overlay overlay--battle"><BattleScreen spec={overlay.spec} get={get} set={set} onEnd={(outcome) => { const r = overlay.resolve; closeOverlay(); r(outcome) }} /></div>}
    {overlay?.type === 'shop' && <div className="overlay"><Shop tier={overlay.tier} get={get} set={set} onClose={() => { const r = overlay.resolve; closeOverlay(); r() }} /></div>}
    {overlay?.type === 'box' && <div className="overlay"><CloudBox get={get} set={set} onClose={() => { const r = overlay.resolve; closeOverlay(); r() }} /></div>}
    {overlay?.type === 'credits' && <div className="overlay overlay--battle"><Credits save={save} onClose={() => { const r = overlay.resolve; closeOverlay(); r() }} /></div>}
    {overlay?.type === 'badge' && badgeInfo && <div className="overlay overlay--badge" onClick={() => { const r = overlay.resolve; closeOverlay(); r() }}>
      <div className="badge-award"><BadgeIcon id={badgeInfo.id} size={140} /><small>{badgeInfo.lab.toUpperCase()}</small><h2>{badgeInfo.name}!</h2><p>{badgeInfo.master} recognizes your code.</p><button className="btn btn--primary" autoFocus>AWESOME!</button></div>
    </div>}
    {overlay?.type === 'duel' && <div className="overlay overlay--battle"><div className="solo-duel">
      <h2>{overlay.title}</h2>
      <DuelPanel duel={duels[overlay.duelId]} busy={false} onAttack={async (code) => {
        const result = await runDuel(duels[overlay.duelId], code)
        audio.sfx(result.broken === result.total ? 'fanfare' : 'wrong')
        if (result.broken === result.total) { const r = overlay.resolve; window.setTimeout(() => { closeOverlay(); r(true) }, 600) }
        return result
      }} footer={<button className="btn btn--small" onClick={() => { const r = overlay.resolve; closeOverlay(); r(false) }}>LEAVE</button>} />
    </div></div>}
  </div>
}
