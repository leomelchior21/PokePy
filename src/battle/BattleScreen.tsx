import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { concepts } from '../data/concepts'
import { duels, shieldsFor } from '../data/duels'
import { items } from '../data/items'
import { getMove } from '../data/moves'
import { getSpecies } from '../data/species'
import { audio } from '../engine/audio'
import { addPyxie, giveItem, markSeen, replacePyxie, takeItem } from '../game/state'
import { randomRng } from '../lib/rng'
import type { OwnedPyxie, SaveState } from '../types'
import { Bar, ConceptTag, PyxieImg } from '../ui/Sprite'
import { createChallenge, createDodge, type Challenge } from './challenges'
import { BattleBackdrop } from './BattleBackdrop'
import { ChallengeView, type ChallengeResult } from './ChallengeView'
import { DuelPanel, runDuel, type DuelRun } from './CodeDuel'
import { catchChance, displayName, enemyDamage, gainXp, isFainted, moveDamage, pickEnemyMove, statsFor, trainerXpReward, xpReward } from './engine'
import type { BattleOutcome, BattleSpec } from './types'

type Action = { type: 'move'; id: string } | { type: 'bag' } | { type: 'switch' } | { type: 'run' }

type View =
  | { kind: 'none' }
  | { kind: 'message'; text: string }
  | { kind: 'menu' }
  | { kind: 'challenge'; challenge: Challenge; title: string; quick: boolean; id: number }
  | { kind: 'switch'; forced: boolean; revive?: boolean }
  | { kind: 'bag' }
  | { kind: 'duel'; duelId: string; enemyIndex: number }
  | { kind: 'evolve'; from: string; to: string; stage: number }

interface Popup { id: number; side: 'enemy' | 'player'; text: string; tone: 'dmg' | 'good' | 'info' }

type BannerTone = 'start' | 'super' | 'combo' | 'perfect' | 'bug' | 'dodge' | 'ko' | 'level' | 'catch' | 'victory' | 'defeat' | 'firewall' | 'weak'
interface Banner { id: number; text: string; sub?: string; tone: BannerTone }
interface Fx { id: number; kind: 'spark' | 'confetti' | 'shot'; side: 'enemy' | 'player'; color: string; glyph: string; angle: number; dist: number; delay: number }

interface Props {
  spec: BattleSpec
  get: () => SaveState
  set: (update: (save: SaveState) => SaveState) => void
  onEnd: (outcome: BattleOutcome) => void
}

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

export function BattleScreen({ spec, get, set, onEnd }: Props) {
  const rng = useRef(randomRng()).current
  const enemies = useRef<OwnedPyxie[]>(spec.kind === 'wild' ? [spec.enemy] : spec.team)
  const enemyIndex = useRef(0)
  const activeUid = useRef<string>(get().team.find((p) => !isFainted(p))?.uid ?? '')
  const streak = useRef(0)
  const resolver = useRef<((value: unknown) => void) | null>(null)
  const started = useRef(false)
  const [view, setView] = useState<View>({ kind: 'none' })
  const [, setTick] = useState(0)
  const [anim, setAnim] = useState({ enemy: 'enter', player: 'enter', flash: '', cube: '' })
  const [popups, setPopups] = useState<Popup[]>([])
  const [shields, setShields] = useState<{ total: number; broken: number } | null>(null)
  const [intro, setIntro] = useState(true)
  const [banner, setBanner] = useState<Banner | null>(null)
  const [fx, setFx] = useState<Fx[]>([])
  const [mood, setMood] = useState<'' | 'victory' | 'defeat'>('')
  const rerender = () => setTick((value) => value + 1)
  const duelBattle = spec.kind === 'trainer' && Boolean(spec.trainer.duels?.length)

  const enemy = () => enemies.current[enemyIndex.current]
  const active = () => get().team.find((p) => p.uid === activeUid.current) ?? get().team[0]
  const askCount = useRef(0)
  const ask = <T,>(next: View) => new Promise<T>((resolve) => {
    resolver.current = resolve as (value: unknown) => void
    askCount.current += 1
    setView(next.kind === 'challenge' ? { ...next, id: askCount.current } : next)
  })
  const answer = (value: unknown) => { const r = resolver.current; resolver.current = null; r?.(value) }

  const say = useCallback((text: string) => new Promise<void>((resolve) => {
    resolver.current = () => resolve()
    setView({ kind: 'message', text })
  }), [])

  /** A big slammed-in word over the stage: SUPER EFFECTIVE!, VICTORY!, BUG! */
  const shout = (text: string, tone: BannerTone, sub?: string, ms = 1100) => {
    const id = Date.now() + Math.random()
    setBanner({ id, text, sub, tone })
    window.setTimeout(() => setBanner((current) => current?.id === id ? null : current), ms)
    return wait(Math.min(ms, 650))
  }
  /** Particles bursting from a pyxie, colored by concept. */
  const burst = (side: Fx['side'], concept: string, count = 12, kind: Fx['kind'] = 'spark') => {
    const info = concepts[concept as keyof typeof concepts] ?? concepts.print
    const batch: Fx[] = Array.from({ length: count }, (_, i) => ({ id: Date.now() + Math.random() + i, kind, side, color: kind === 'confetti' ? ['#ffd23f', '#a57bff', '#5fd17a', '#ff6fae', '#4fa3ff'][i % 5] : info.color, glyph: info.glyph, angle: (360 / count) * i + Math.random() * 20, dist: 60 + Math.random() * 70, delay: kind === 'confetti' ? Math.random() * 400 : 0 }))
    setFx((list) => [...list, ...batch])
    window.setTimeout(() => setFx((list) => list.filter((item) => !batch.includes(item))), kind === 'confetti' ? 2200 : 900)
  }
  /** A glyph flying from the attacker to the target. */
  const shoot = async (from: Fx['side'], concept: string) => {
    const info = concepts[concept as keyof typeof concepts] ?? concepts.print
    const id = Date.now() + Math.random()
    setFx((list) => [...list, { id, kind: 'shot', side: from, color: info.color, glyph: info.glyph, angle: 0, dist: 0, delay: 0 }])
    await wait(380)
    setFx((list) => list.filter((item) => item.id !== id))
  }

  const pop = (side: Popup['side'], text: string, tone: Popup['tone']) => {
    const id = Date.now() + Math.random()
    setPopups((list) => [...list, { id, side, text, tone }])
    window.setTimeout(() => setPopups((list) => list.filter((item) => item.id !== id)), 1200)
  }

  const flashAnim = async (key: 'enemy' | 'player', value: string, ms: number) => {
    setAnim((current) => ({ ...current, [key]: value }))
    await wait(ms)
    setAnim((current) => ({ ...current, [key]: '' }))
  }

  const updateActive = (pyxie: OwnedPyxie) => set((save) => replacePyxie(save, pyxie))
  const stat = (update: (stats: SaveState['stats']) => Partial<SaveState['stats']>) => set((save) => ({ ...save, stats: { ...save.stats, ...update(save.stats) } }))

  /** Gives experience to the team and plays every level-up, new move and evolution. */
  const reward = async (defeated: OwnedPyxie) => {
    const trainer = spec.kind === 'trainer'
    const amount = Math.floor(xpReward(defeated, trainer) * (duelBattle ? 1.2 : 1))
    const txp = trainerXpReward(defeated, trainer)
    set((save) => ({ ...save, trainerXp: save.trainerXp + txp }))
    for (const member of get().team) {
      if (isFainted(member)) continue
      const share = member.uid === activeUid.current ? amount : Math.floor(amount / 2)
      if (!share) continue
      const { pyxie, events } = gainXp(member, share)
      updateActive(pyxie)
      rerender()
      if (member.uid === activeUid.current) await say(`${displayName(member)} gained ${share} XP! Trainer XP +${txp}.`)
      for (const event of events) {
        if (event.type === 'level') { audio.sfx('level'); if (member.uid === activeUid.current) burst('player', getSpecies(member.species).concept, 14, 'confetti'); await shout('LEVEL UP!', 'level', `${displayName(member)} → Lv ${event.level}`, 1300); await say(`${displayName(member)} grew to level ${event.level}!`) }
        if (event.type === 'forgot') await say(`${displayName(member)} forgot ${getMove(event.forgot!).name} to make room…`)
        if (event.type === 'move') { audio.sfx('item'); await say(`${displayName(member)} learned ${getMove(event.move!).name}!`) }
        if (event.type === 'evolve') {
          await say(`What? ${getSpecies(event.from!).name} is evolving!`)
          audio.sfx('evolve')
          for (let stage = 0; stage < 8; stage += 1) { setView({ kind: 'evolve', from: event.from!, to: event.to!, stage }); await wait(260 - stage * 20) }
          audio.sfx('fanfare')
          set((save) => markSeen({ ...save, caught: save.caught.includes(event.to!) ? save.caught : [...save.caught, event.to!] }, event.to!))
          await say(`${getSpecies(event.from!).name} evolved into ${getSpecies(event.to!).name}!`)
        }
      }
    }
  }

  const enemyFainted = async (): Promise<boolean> => {
    audio.sfx('faint')
    burst('enemy', getSpecies(enemy().species).concept, 16)
    void shout('K.O.!', 'ko', undefined, 1000)
    await flashAnim('enemy', 'faint', 700)
    setAnim((current) => ({ ...current, enemy: 'gone' }))
    await say(`${spec.kind === 'wild' ? 'The wild ' : ''}${displayName(enemy())} fainted!`)
    await reward(enemy())
    if (enemyIndex.current < enemies.current.length - 1) {
      enemyIndex.current += 1
      set((save) => markSeen(save, enemy().species))
      streak.current = 0
      setShields(null)
      setAnim((current) => ({ ...current, enemy: 'enter' }))
      rerender()
      await say(`${spec.kind === 'trainer' ? spec.name : ''} sent out ${displayName(enemy())}!`)
      return false
    }
    return true
  }

  /** Returns false when the whole team has fainted. */
  const playerFainted = async (): Promise<boolean> => {
    audio.sfx('faint')
    await flashAnim('player', 'faint', 700)
    await say(`${displayName(active())} fainted!`)
    if (!get().team.some((p) => !isFainted(p))) return false
    const uid = await ask<string>({ kind: 'switch', forced: true })
    activeUid.current = uid
    setAnim((current) => ({ ...current, player: 'enter' }))
    rerender()
    await say(`Go, ${displayName(active())}!`)
    return true
  }

  const hitPlayer = async (damage: number, multiplier = 1) => {
    const me = active()
    const hp = Math.max(0, me.hp - damage)
    updateActive({ ...me, hp })
    audio.sfx(multiplier > 1 ? 'super' : 'hit')
    pop('player', `-${damage}`, 'dmg')
    setAnim((current) => ({ ...current, flash: multiplier > 1 ? 'super' : 'hit' }))
    await flashAnim('player', 'hurt', 450)
    setAnim((current) => ({ ...current, flash: '' }))
    rerender()
  }

  const enemyTurn = async (): Promise<'ok' | 'lost'> => {
    const foe = enemy()
    const moveId = pickEnemyMove(foe, rng)
    const move = getMove(moveId)
    await say(`${spec.kind === 'wild' ? 'Wild ' : 'Foe '}${displayName(foe)} used ${move.name}!`)
    const dodge = createDodge(getSpecies(foe.species).concept, rng)
    const result = await ask<ChallengeResult>({ kind: 'challenge', challenge: dodge, title: 'DODGE!', quick: true, id: 0 })
    void flashAnim('enemy', 'attack', 300)
    await shoot('enemy', move.concept)
    const hit = enemyDamage(foe, active(), moveId, result.correct, rng)
    burst('player', move.concept, result.correct ? 6 : 12)
    await hitPlayer(hit.damage, hit.multiplier)
    if (result.correct) await shout('DODGED!', 'dodge', 'Only a scratch', 900)
    else if (hit.multiplier > 1) await shout('SUPER EFFECTIVE!', 'super', 'Ouch!')
    if (isFainted(active())) return (await playerFainted()) ? 'ok' : 'lost'
    return 'ok'
  }

  const castMove = async (moveId: string): Promise<'ok' | 'won' | 'lost'> => {
    const move = getMove(moveId)
    const me = active()
    const challenge = createChallenge(move.concept, move.kind, move.tier, rng)
    const result = await ask<ChallengeResult>({ kind: 'challenge', challenge, title: `${displayName(me)} · ${move.name}`, quick: false, id: 0 })
    stat((s) => ({ challenges: s.challenges + 1, correct: s.correct + (result.correct ? 1 : 0) }))
    if (result.correct) {
      streak.current += 1
      stat((s) => ({ streak: streak.current, bestStreak: Math.max(s.bestStreak, streak.current) }))
      await shout(streak.current >= 3 ? `COMBO ×${streak.current}!` : result.aided === 'duck' ? 'QUACK!' : ['PERFECT!', 'NICE CODE!', 'GREAT!', 'BRILLIANT!'][Math.floor(Math.random() * 4)], streak.current >= 3 ? 'combo' : 'perfect', undefined, 800)
      await say(`${displayName(me)} used ${move.name}!`)
      void flashAnim('player', 'attack', 300)
      await shoot('player', move.concept)
      const hit = moveDamage(me, enemy(), moveId, streak.current, rng)
      const foe = enemy()
      enemies.current[enemyIndex.current] = { ...foe, hp: Math.max(0, foe.hp - hit.damage) }
      audio.sfx(hit.multiplier > 1 ? 'super' : 'hit')
      burst('enemy', move.concept, hit.multiplier > 1 ? 18 : 12)
      pop('enemy', `-${hit.damage}`, 'dmg')
      if (hit.combo) pop('enemy', `COMBO ×${streak.current}`, 'good')
      setAnim((current) => ({ ...current, flash: hit.multiplier > 1 ? 'super' : 'hit' }))
      await flashAnim('enemy', 'hurt', 450)
      setAnim((current) => ({ ...current, flash: '' }))
      rerender()
      if (hit.multiplier > 1) await shout('SUPER EFFECTIVE!', 'super', `${concepts[move.concept].label} beats ${concepts[getSpecies(enemy().species).concept].label}`)
      else if (hit.multiplier < 1) await shout('NOT VERY EFFECTIVE', 'weak')
      if (isFainted(enemies.current[enemyIndex.current])) return (await enemyFainted()) ? 'won' : 'ok'
    } else {
      streak.current = 0
      stat(() => ({ streak: 0 }))
      audio.sfx('miss')
      await shout('BUG!', 'bug', 'The move fizzled', 900)
      await say(`${displayName(me)}'s ${move.name} missed! The code had a bug.`)
    }
    return (await enemyTurn()) === 'lost' ? 'lost' : 'ok'
  }

  const throwCube = async (cube: string): Promise<'caught' | 'ok' | 'lost'> => {
    if (spec.kind !== 'wild' || !spec.canCatch) { await say('You can\'t catch another trainer\'s pyxie!'); return 'ok' }
    set((save) => takeItem(save, cube))
    const foe = enemy()
    const compile = createDodge(getSpecies(foe.species).concept, rng)
    const compiled = await ask<ChallengeResult>({ kind: 'challenge', challenge: { ...compile, prompt: 'COMPILE THE CUBE! A right answer makes it stronger.' }, title: `Throwing a ${items[cube].name}`, quick: true, id: 0 })
    const chance = catchChance(getSpecies(foe.species), foe.hp, statsFor(foe.species, foe.level).maxHp, cube, compiled.correct)
    audio.sfx('throw')
    setAnim((current) => ({ ...current, cube: 'throw' }))
    await wait(500)
    setAnim((current) => ({ ...current, cube: 'shake', enemy: 'inside' }))
    let shakes = 0
    const roll = Math.cbrt(chance)
    for (let i = 0; i < 3; i += 1) {
      await wait(520)
      audio.sfx('shake')
      if (rng.next() > roll) break
      shakes += 1
    }
    await wait(400)
    if (shakes === 3) {
      audio.sfx('catch')
      setAnim((current) => ({ ...current, cube: 'caught' }))
      burst('enemy', getSpecies(foe.species).concept, 36, 'confetti')
      await shout('GOTCHA!', 'catch', `${getSpecies(foe.species).name} joins you`, 1600)
      await say(`Gotcha! ${getSpecies(foe.species).name} was caught!`)
      const { save: next, where } = addPyxie(get(), { ...foe, caughtAt: get().map })
      set(() => ({ ...next, stats: { ...next.stats, catches: next.stats.catches + 1 } }))
      if (where === 'box') await say('Your team is full, so it was sent to the Cloud Box.')
      return 'caught'
    }
    audio.sfx('break')
    setAnim((current) => ({ ...current, cube: '', enemy: 'enter' }))
    await say(['Oh no! It broke free!', 'Argh! Almost had it!', 'So close!'][Math.min(2, shakes)])
    return (await enemyTurn()) === 'lost' ? 'lost' : 'ok'
  }

  const spendItem = async (item: string): Promise<'ok' | 'lost' | 'caught'> => {
    const info = items[item]
    if (info.use === 'cube') return throwCube(item)
    if (info.use === 'revive') {
      const uid = await ask<string | null>({ kind: 'switch', forced: false, revive: true })
      if (!uid) return 'ok'
      const target = get().team.find((p) => p.uid === uid)!
      set((save) => replacePyxie(takeItem(save, item), { ...target, hp: Math.ceil(statsFor(target.species, target.level).maxHp / 2) }))
      audio.sfx('heal')
      await say(`${displayName(target)} rebooted!`)
    } else {
      const me = active()
      const maxHp = statsFor(me.species, me.level).maxHp
      const healed = Math.min(maxHp, me.hp + (info.power ?? 0))
      set((save) => replacePyxie(takeItem(save, item), { ...me, hp: healed }))
      audio.sfx('heal')
      pop('player', `+${healed - me.hp}`, 'good')
      rerender()
      await say(`${displayName(me)} recovered ${healed - me.hp} HP!`)
    }
    return (await enemyTurn()) === 'lost' ? 'lost' : 'ok'
  }

  /** Master battles: every enemy pyxie hides behind a firewall that only real code breaks. */
  const duelRound = async (): Promise<'won' | 'lost' | 'next'> => {
    const duelId = spec.kind === 'trainer' ? spec.trainer.duels![enemyIndex.current] : ''
    const duel = duels[duelId]
    setShields({ total: shieldsFor(duel), broken: 0 })
    const outcome = await ask<'won' | 'fainted' | 'switch'>({ kind: 'duel', duelId, enemyIndex: enemyIndex.current })
    if (outcome === 'switch') {
      const uid = await ask<string | null>({ kind: 'switch', forced: false })
      if (uid) { activeUid.current = uid; setAnim((c) => ({ ...c, player: 'enter' })); rerender(); await say(`Go, ${displayName(active())}!`) }
      return 'next'
    }
    if (outcome === 'fainted') return (await playerFainted()) ? 'next' : 'lost'
    stat((s) => ({ codeDuels: s.codeDuels + 1 }))
    enemies.current[enemyIndex.current] = { ...enemy(), hp: 0 }
    return (await enemyFainted()) ? 'won' : 'next'
  }

  const duelAttack = async (code: string): Promise<DuelRun> => {
    const duel = duels[(spec as Extract<BattleSpec, { kind: 'trainer' }>).trainer.duels![enemyIndex.current]]
    const total = shieldsFor(duel)
    setShields({ total, broken: 0 })
    let broken = 0
    await flashAnim('player', 'attack', 250)
    const run = await runDuel(duel, code, async (_, pass) => {
      if (pass) { broken += 1; setShields({ total, broken }); audio.sfx('shield') }
    })
    stat((s) => ({ codeTestsPassed: s.codeTestsPassed + run.broken }))
    const foe = enemy()
    const maxHp = statsFor(foe.species, foe.level).maxHp
    enemies.current[enemyIndex.current] = { ...foe, hp: Math.max(1, Math.round(maxHp * (1 - run.broken / total))) }
    if (run.broken > 0) { pop('enemy', `${run.broken}/${total} SHIELDS`, 'good'); await flashAnim('enemy', 'hurt', 400) }
    rerender()
    if (run.broken === total) {
      audio.sfx('super')
      burst('enemy', 'logic', 20)
      await shout('FIREWALL DOWN!', 'firewall', `All ${total} tests passed`, 1300)
      answer('won')
      return run
    }
    // Every failing test hits back.
    await shout(run.broken ? `${run.broken}/${total} SHIELDS` : 'BLOCKED!', run.broken ? 'combo' : 'bug', `${run.failed} test${run.failed === 1 ? '' : 's'} failed`, 1000)
    const me = active()
    const damage = Math.max(1, Math.floor(statsFor(me.species, me.level).maxHp * 0.13)) * Math.max(1, run.failed)
    await flashAnim('enemy', 'attack', 300)
    await hitPlayer(damage)
    if (isFainted(active())) answer('fainted')
    return run
  }

  useEffect(() => {
    if (started.current) return
    started.current = true
    const runBattle = async () => {
      audio.play(spec.kind === 'wild' ? (spec.legendary ? 'legend' : 'battle') : spec.trainer.kind === 'trainer' ? 'trainer' : 'master')
      audio.sfx('encounter')
      set((save) => markSeen({ ...save, stats: { ...save.stats, battles: save.stats.battles + 1 } }, enemy().species))
      await wait(900)
      setIntro(false)
      if (spec.kind === 'trainer') await shout('VS', 'start', `${spec.trainer.title} ${spec.name}`, 1500)
      else await shout(spec.legendary ? 'LEGENDARY!' : 'WILD PYXIE!', 'start', displayName(enemy()), 1300)
      if (spec.kind === 'wild') await say(`${spec.legendary ? 'The legendary' : 'A wild'} ${displayName(enemy())} appeared!`)
      else {
        await say(`${spec.trainer.title} ${spec.name} wants to battle!`)
        await say(`${spec.name} sent out ${displayName(enemy())}!`)
        if (duelBattle) await say('This pyxie is protected by a FIREWALL! Only real Python code can break its shields.')
      }
      setAnim((current) => ({ ...current, enemy: '', player: 'enter' }))
      await say(`Go, ${displayName(active())}!`)
      setAnim((current) => ({ ...current, player: '' }))
      let outcome: BattleOutcome | null = null
      while (!outcome) {
        if (duelBattle) {
          const round = await duelRound()
          if (round === 'won') outcome = 'win'
          if (round === 'lost') outcome = 'lose'
          continue
        }
        const action = await ask<Action>({ kind: 'menu' })
        if (action.type === 'move') {
          const result = await castMove(action.id)
          if (result === 'won') outcome = 'win'
          if (result === 'lost') outcome = 'lose'
        } else if (action.type === 'run') {
          if (spec.kind === 'trainer') { await say('You can\'t run from a trainer battle!'); continue }
          if (spec.legendary && rng.chance(0.3)) { await say('The legendary pyxie blocks your way!'); if ((await enemyTurn()) === 'lost') outcome = 'lose'; continue }
          audio.sfx('back')
          await say('Got away safely!')
          outcome = 'run'
        } else if (action.type === 'switch') {
          const uid = await ask<string | null>({ kind: 'switch', forced: false })
          if (!uid || uid === activeUid.current) continue
          activeUid.current = uid
          setAnim((c) => ({ ...c, player: 'enter' }))
          rerender()
          await say(`Go, ${displayName(active())}!`)
          if ((await enemyTurn()) === 'lost') outcome = 'lose'
        } else if (action.type === 'bag') {
          const item = await ask<string | null>({ kind: 'bag' })
          if (!item) continue
          const result = await spendItem(item)
          if (result === 'caught') outcome = 'caught'
          if (result === 'lost') outcome = 'lose'
        }
      }
      if (outcome === 'win') {
        audio.play('win')
        setMood('victory')
        burst('enemy', 'print', 40, 'confetti')
        await shout('VICTORY!', 'victory', spec.kind === 'trainer' ? `You beat ${spec.name}!` : undefined, 2000)
        stat((s) => ({ wins: s.wins + 1 }))
        if (spec.kind === 'wild' && rng.chance(0.15)) {
          set((save) => giveItem(save, 'patch'))
          await say('It dropped a Patch!')
        }
      }
      if (outcome === 'lose') { setMood('defeat'); await shout('DEFEATED…', 'defeat', 'Every pyxie fainted', 1800); await say('Your whole team fainted…') }
      onEnd(outcome)
    }
    void runBattle()
  })

  // Keyboard: Enter or Space continues messages.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (view.kind === 'message' && ['Enter', ' ', 'z', 'Z'].includes(event.key)) { event.preventDefault(); audio.sfx('blip'); answer(undefined) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view])

  const foe = enemy()
  const me = active()
  const foeStats = statsFor(foe.species, foe.level)
  const meStats = statsFor(me.species, me.level)
  const foeSpecies = getSpecies(foe.species)
  const meSpecies = getSpecies(me.species)
  const save = get()
  const bg = spec.bg
  const xpFrom = Math.floor(me.level ** 3 * 0.6)
  const xpTo = Math.floor((me.level + 1) ** 3 * 0.6)

  return <div className={`battle battle--${bg} ${intro ? 'is-intro' : ''} ${anim.flash ? `flash-${anim.flash}` : ''} ${mood ? `is-${mood}` : ''}`}>
    <div className="battle__stage">
      {banner && <div key={banner.id} className={`banner banner--${banner.tone}`} aria-live="assertive"><b>{banner.text}</b>{banner.sub && <small>{banner.sub}</small>}</div>}
      {mood === 'victory' && <div className="rays" aria-hidden="true" />}
      {fx.map((item) => item.kind === 'shot'
        ? <span key={item.id} className={`fx-shot fx-shot--${item.side}`} style={{ '--c': item.color } as CSSProperties}>{item.glyph}</span>
        : <span key={item.id} className={`fx-${item.kind} fx--${item.side}`} style={{ '--c': item.color, '--a': `${item.angle}deg`, '--d': `${item.dist}px`, '--delay': `${item.delay}ms` } as CSSProperties}>{item.kind === 'spark' ? item.glyph : ''}</span>)}
      <BattleBackdrop area={bg} />
      <div className="battle__sky" aria-hidden="true"><i /><i /><i /></div>
      <section className="battle__foe">
        <div className="hpcard hpcard--foe">
          <div className="hpcard__top"><b>{displayName(foe)}{foe.shiny && ' ✨'}</b><span>Lv{foe.level}</span></div>
          <ConceptTag concept={foeSpecies.concept} small />
          <Bar value={foe.hp} max={foeStats.maxHp} />
          {spec.kind === 'trainer' && <div className="hpcard__team">{enemies.current.map((p, i) => <i key={p.uid} className={i < enemyIndex.current || isFainted(p) ? 'is-out' : ''} />)}</div>}
          {spec.kind === 'wild' && save.caught.includes(foe.species) && <small className="hpcard__caught">● CAUGHT BEFORE</small>}
        </div>
        <div className={`battle__mon battle__mon--foe is-${anim.enemy}`}>
          <span className="battle__platform" />
          <PyxieImg species={foe.species} shiny={foe.shiny} size={136} />
          {shields && <div className="shields" aria-label={`${shields.total - shields.broken} shields left`}>{Array.from({ length: shields.total }, (_, i) => <i key={i} className={i < shields.broken ? 'is-broken' : ''} />)}</div>}
          {anim.cube && <span className={`cube cube--${anim.cube}`} aria-hidden="true" />}
          {popups.filter((p) => p.side === 'enemy').map((p) => <span key={p.id} className={`popup popup--${p.tone}`}>{p.text}</span>)}
        </div>
      </section>
      <section className="battle__me">
        <div className={`battle__mon battle__mon--me is-${anim.player}`}>
          <span className="battle__platform" />
          <PyxieImg species={me.species} shiny={me.shiny} size={150} className="is-back" />
          {popups.filter((p) => p.side === 'player').map((p) => <span key={p.id} className={`popup popup--${p.tone}`}>{p.text}</span>)}
        </div>
        <div className="hpcard hpcard--me">
          <div className="hpcard__top"><b>{displayName(me)}</b><span>Lv{me.level}</span></div>
          <ConceptTag concept={meSpecies.concept} small />
          <Bar value={me.hp} max={meStats.maxHp} />
          <div className="hpcard__nums">{me.hp} / {meStats.maxHp}</div>
          <Bar value={me.xp - xpFrom} max={xpTo - xpFrom} kind="xp" />
          {streak.current >= 2 && <span className="hpcard__streak">🔥 {streak.current} in a row</span>}
        </div>
      </section>
    </div>

    <div className={`battle__panel battle__panel--${view.kind}`}>
      {view.kind === 'message' && <button className="battle__msg" onClick={() => { audio.sfx('blip'); answer(undefined) }}><span>{view.text}</span><i>▼</i></button>}
      {view.kind === 'menu' && <div className="battle__menu">
        <p className="battle__ask">What will <b>{displayName(me)}</b> do?</p>
        <div className="moves">{me.moves.map((id) => {
          const move = getMove(id)
          const info = concepts[move.concept]
          return <button key={id} className="move" style={{ '--c': info.color, '--cd': info.dark } as CSSProperties} onClick={() => { audio.sfx('select'); answer({ type: 'move', id }) }}>
            <b>{move.name}</b><small>{info.glyph} {info.label} · {move.kind.toUpperCase()}</small><em>PWR {move.power}</em>
          </button>
        })}</div>
        <div className="battle__side">
          <button className="btn" onClick={() => answer({ type: 'bag' })}>🎒 BAG</button>
          <button className="btn" onClick={() => answer({ type: 'switch' })}>⇄ PYXIES</button>
          <button className="btn" onClick={() => answer({ type: 'run' })}>🏃 RUN</button>
        </div>
      </div>}
      {view.kind === 'challenge' && <ChallengeView key={view.id} challenge={view.challenge} title={view.title} quick={view.quick}
        lenses={save.bag.hintlens ?? 0} ducks={save.bag.debugduck ?? 0}
        onUseItem={(item) => set((s) => takeItem(s, item))}
        onDone={(result) => answer(result)} />}
      {view.kind === 'switch' && <div className="battle__list">
        <p className="battle__ask">{view.revive ? 'Reboot which pyxie?' : view.forced ? 'Choose the next pyxie!' : 'Switch to which pyxie?'}</p>
        <div className="team-pick">{save.team.map((p) => {
          const st = statsFor(p.species, p.level)
          const fainted = isFainted(p)
          const enabled = view.revive ? fainted : !fainted && p.uid !== activeUid.current
          return <button key={p.uid} disabled={!enabled} className="team-pick__item" onClick={() => answer(p.uid)}>
            <PyxieImg species={p.species} shiny={p.shiny} size={48} /><span><b>{displayName(p)}</b><small>Lv{p.level} · {p.hp}/{st.maxHp} HP</small><Bar value={p.hp} max={st.maxHp} /></span>
          </button>
        })}</div>
        {!view.forced && <button className="btn" onClick={() => answer(null)}>BACK</button>}
      </div>}
      {view.kind === 'bag' && <div className="battle__list">
        <p className="battle__ask">Use which item?</p>
        <div className="bag-pick">{Object.entries(save.bag).filter(([id]) => ['heal', 'revive', 'cube'].includes(items[id]?.use)).map(([id, count]) => (
          <button key={id} className="bag-pick__item" disabled={items[id].use === 'cube' && spec.kind !== 'wild'} onClick={() => answer(id)}><b>{items[id].name}</b><small>×{count}</small><em>{items[id].text}</em></button>
        ))}</div>
        {!Object.keys(save.bag).some((id) => ['heal', 'revive', 'cube'].includes(items[id]?.use)) && <p className="battle__empty">Nothing useful in the bag right now.</p>}
        <button className="btn" onClick={() => answer(null)}>BACK</button>
      </div>}
      {view.kind === 'duel' && <DuelPanel key={view.enemyIndex} duel={duels[view.duelId]} busy={false} onAttack={duelAttack}
        footer={<button className="btn btn--small" onClick={() => answer('switch')}>⇄ SWITCH</button>} />}
      {view.kind === 'evolve' && <div className="evolve">
        <div className={`evolve__mon ${view.stage % 2 ? 'is-new' : ''}`}><PyxieImg species={view.stage % 2 ? view.to : view.from} size={140} /></div>
      </div>}
    </div>
  </div>
}
