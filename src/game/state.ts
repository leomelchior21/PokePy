// The save file and every change to it. Functions return a new save, so React re-renders
// and the cloud sync sees a fresh object.
import { healPyxie, isFainted, statsFor, TEAM_SIZE } from '../battle/engine'
import { START } from '../world/maps'
import type { AvatarChoice, OwnedPyxie, SaveState } from '../types'

export const SAVE_VERSION = 1 as const

export function newSave(username: string, displayName: string, avatar: AvatarChoice): SaveState {
  return {
    version: SAVE_VERSION,
    username,
    displayName,
    avatar,
    createdAt: Date.now(),
    playMs: 0,
    map: START.map,
    x: START.x,
    y: START.y,
    facing: START.facing,
    team: [],
    box: [],
    bag: {},
    bits: 300,
    trainerXp: 0,
    badges: [],
    flags: [],
    seen: [],
    caught: [],
    defeated: [],
    respawn: { map: 'home', x: 7, y: 5 },
    stats: { battles: 0, wins: 0, challenges: 0, correct: 0, bestStreak: 0, streak: 0, steps: 0, catches: 0, codeDuels: 0, codeTestsPassed: 0 },
    settings: { music: true, sfx: true, textSpeed: 'normal' },
  }
}

export const hasFlag = (save: SaveState, flag: string) => save.flags.includes(flag)

export function setFlag(save: SaveState, flag: string): SaveState {
  return hasFlag(save, flag) ? save : { ...save, flags: [...save.flags, flag] }
}

export function giveItem(save: SaveState, item: string, count = 1): SaveState {
  return { ...save, bag: { ...save.bag, [item]: (save.bag[item] ?? 0) + count } }
}

export function takeItem(save: SaveState, item: string, count = 1): SaveState {
  const left = (save.bag[item] ?? 0) - count
  const bag = { ...save.bag }
  if (left > 0) bag[item] = left
  else delete bag[item]
  return { ...save, bag }
}

export const itemCount = (save: SaveState, item: string) => save.bag[item] ?? 0

export function addPyxie(save: SaveState, pyxie: OwnedPyxie): { save: SaveState; where: 'team' | 'box' } {
  const caught = save.caught.includes(pyxie.species) ? save.caught : [...save.caught, pyxie.species]
  const seen = save.seen.includes(pyxie.species) ? save.seen : [...save.seen, pyxie.species]
  if (save.team.length < TEAM_SIZE) return { save: { ...save, team: [...save.team, pyxie], caught, seen }, where: 'team' }
  return { save: { ...save, box: [...save.box, pyxie], caught, seen }, where: 'box' }
}

export function markSeen(save: SaveState, species: string): SaveState {
  return save.seen.includes(species) ? save : { ...save, seen: [...save.seen, species] }
}

export function healTeam(save: SaveState): SaveState {
  return { ...save, team: save.team.map((pyxie) => healPyxie(pyxie)) }
}

export function replacePyxie(save: SaveState, pyxie: OwnedPyxie): SaveState {
  return { ...save, team: save.team.map((item) => item.uid === pyxie.uid ? pyxie : item) }
}

export function teamAlive(save: SaveState): boolean {
  return save.team.some((pyxie) => !isFainted(pyxie))
}

export function firstAlive(save: SaveState): OwnedPyxie | undefined {
  return save.team.find((pyxie) => !isFainted(pyxie))
}

export function addBadge(save: SaveState, badge: string): SaveState {
  return save.badges.includes(badge) ? save : setFlag({ ...save, badges: [...save.badges, badge] }, `badge-${badge}`)
}

export function markDefeated(save: SaveState, trainerId: string): SaveState {
  return save.defeated.includes(trainerId) ? save : { ...save, defeated: [...save.defeated, trainerId] }
}

/** After every pyxie faints: back to the last charging station, healed, with half the bits. */
export function blackout(save: SaveState): SaveState {
  return healTeam({ ...save, map: save.respawn.map, x: save.respawn.x, y: save.respawn.y, facing: 'up', bits: Math.floor(save.bits / 2) })
}

/** Moves a pyxie between the team and the Cloud Box. The team keeps at least one. */
export function swapWithBox(save: SaveState, teamUid: string | null, boxUid: string | null): SaveState {
  const team = [...save.team]
  const box = [...save.box]
  const fromTeam = teamUid ? team.findIndex((pyxie) => pyxie.uid === teamUid) : -1
  const fromBox = boxUid ? box.findIndex((pyxie) => pyxie.uid === boxUid) : -1
  if (fromTeam >= 0 && fromBox >= 0) {
    const out = team[fromTeam]
    team[fromTeam] = box[fromBox]
    box[fromBox] = out
  } else if (fromTeam >= 0 && team.length > 1) {
    box.push(team.splice(fromTeam, 1)[0])
  } else if (fromBox >= 0 && team.length < TEAM_SIZE) {
    team.push(box.splice(fromBox, 1)[0])
  }
  return { ...save, team, box }
}

export function moveToFront(save: SaveState, uid: string): SaveState {
  const index = save.team.findIndex((pyxie) => pyxie.uid === uid)
  if (index <= 0) return save
  const team = [...save.team]
  const [pyxie] = team.splice(index, 1)
  return { ...save, team: [pyxie, ...team] }
}

/** Makes an old or damaged save safe to load: every number in range, every list a list. */
export function repairSave(raw: unknown, username: string, displayName: string): SaveState | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Partial<SaveState>
  if (data.version !== SAVE_VERSION || !Array.isArray(data.team)) return null
  const base = newSave(username, displayName, data.avatar ?? { hair: 0, skin: 0, outfit: 0, style: 'cap' })
  const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
  const pyxies = (value: unknown) => Array.isArray(value) ? value.filter((item): item is OwnedPyxie => Boolean(item) && typeof item === 'object' && typeof (item as OwnedPyxie).species === 'string').map(fixPyxie).filter((item): item is OwnedPyxie => item !== null) : []
  return {
    ...base,
    ...data,
    username,
    displayName,
    team: pyxies(data.team),
    box: pyxies(data.box),
    flags: list(data.flags),
    badges: list(data.badges),
    seen: list(data.seen),
    caught: list(data.caught),
    defeated: list(data.defeated),
    bag: data.bag && typeof data.bag === 'object' ? Object.fromEntries(Object.entries(data.bag).filter(([, n]) => Number.isInteger(n) && n > 0)) : {},
    bits: Math.max(0, Math.floor(Number(data.bits) || 0)),
    trainerXp: Math.max(0, Math.floor(Number(data.trainerXp) || 0)),
    playMs: Math.max(0, Number(data.playMs) || 0),
    stats: { ...base.stats, ...(data.stats ?? {}) },
    settings: { ...base.settings, ...(data.settings ?? {}) },
    respawn: data.respawn ?? base.respawn,
  }
}

function fixPyxie(pyxie: OwnedPyxie): OwnedPyxie | null {
  try {
    const { maxHp } = statsFor(pyxie.species, pyxie.level)
    return { ...pyxie, hp: Math.max(0, Math.min(maxHp, Math.floor(pyxie.hp))), moves: Array.isArray(pyxie.moves) ? pyxie.moves.slice(0, 4) : [] }
  } catch {
    return null
  }
}
