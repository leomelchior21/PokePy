import type { Direction } from '../types'

/**
 * Outdoor tiles: . grass  , tall grass  : dirt  = paved  s sand  f flowers  T tree  t bush
 * ~ water  # rock  r boulder  L ledge (jump south)  F fence  P pier  C cardboard barricade
 * Indoor tiles: _ wood floor  - lab floor  R rug  W wall  K shelf  B bed  D desk  X counter
 * V screen/PC  3 3D printer  G plant  A arduino bench  m exit mat  c cave floor  l laser
 */
export type Area = 'town' | 'route' | 'forest' | 'beach' | 'cave' | 'house' | 'lab' | 'academy' | 'mountain'

export interface Look {
  hair: string
  skin: string
  shirt: string
  pants: string
  style: 'cap' | 'short' | 'long' | 'spiky' | 'bald' | 'bun'
  extra?: 'glasses' | 'beard' | 'goggles' | 'apron' | 'coat' | 'helmet'
  cap?: string
}

export interface Requirement {
  xp?: number
  badges?: number
  flag?: string
  item?: string
  message: string
}

export interface Building {
  x: number
  y: number
  w: number
  h: number
  kind: 'house' | 'station' | 'mart' | 'lab' | 'makerspace' | 'academy' | 'cave' | 'tower'
  roof: string
  label?: string
  to: string
  /** Where the door lands inside. */
  tx: number
  ty: number
  requires?: Requirement
}

export interface Warp { x: number; y: number; to: string; tx: number; ty: number; facing?: Direction; requires?: Requirement }

export interface Edge { side: Direction; to: string; offset: number }

export interface TrainerDef {
  id: string
  title: string
  kind: 'trainer' | 'master' | 'rival' | 'villain' | 'champion'
  team: Array<[species: string, level: number]>
  /** Code duels the master's pyxies fight with, one per pyxie. */
  duels?: string[]
  bits: number
  sight: number
  intro: string
  lose: string
  after: string
  badge?: string
  reward?: Record<string, number>
  setFlag?: string
}

export interface NpcDef {
  id: string
  name: string
  look: Look
  x: number
  y: number
  facing: Direction
  move?: 'still' | 'wander' | 'spin'
  talk?: string[]
  /** A script id instead of plain lines. */
  script?: string
  trainer?: TrainerDef
  showIf?: string
  hideIf?: string
  /** A pyxie standing in the world instead of a person. */
  pyxie?: string
}

export interface SignDef { x: number; y: number; text: string[]; kind?: 'sign' | 'board' | 'statue' }

export interface ItemDef { id: string; x: number; y: number; item: string; count: number; hidden?: boolean }

export interface Trigger { x: number; y: number; w?: number; h?: number; script: string; ifFlag?: string; unlessFlag?: string }

export interface EncounterSlot { species: string; min: number; max: number; weight: number }

export interface Encounters { rate: number; table: EncounterSlot[] }

/** Something to interact with on a tile, like the starter pods or a PC. */
export interface Thing { x: number; y: number; script: string; showIf?: string; hideIf?: string; sprite?: string }

export interface GameMap {
  id: string
  name: string
  area: Area
  music: string
  rows: string[]
  outside: 'tree' | 'water' | 'void' | 'rock'
  buildings?: Building[]
  warps?: Warp[]
  edges?: Edge[]
  npcs?: NpcDef[]
  signs?: SignDef[]
  items?: ItemDef[]
  triggers?: Trigger[]
  things?: Thing[]
  encounters?: Encounters
  dark?: boolean
  /** Battles in this map use this backdrop. */
  battleBg?: Area
  /** Floor color for labs. */
  tint?: string
}
