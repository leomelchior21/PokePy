// Story scripts. Each one is a small async play: lines of dialog, choices, gifts and battles.
import { createPyxie, displayName } from '../battle/engine'
import type { BattleOutcome, BattleSpec } from '../battle/types'
import { itemName } from '../data/items'
import { getSpecies, rivalStarterFor, starterIds } from '../data/species'
import type { Rng } from '../lib/rng'
import type { Direction, SaveState } from '../types'
import { looks } from '../world/looks'
import type { TrainerDef } from '../world/types'
import { addPyxie, giveItem, hasFlag, healTeam, itemCount, markSeen, setFlag, takeItem } from './state'

export interface ScriptUI {
  say: (lines: string | string[], speaker?: string) => Promise<void>
  choose: (prompt: string, options: string[], speaker?: string) => Promise<number>
  starter: () => Promise<string>
  battle: (spec: BattleSpec) => Promise<BattleOutcome>
  shop: (tier: number) => Promise<void>
  box: () => Promise<void>
  credits: () => Promise<void>
  duel: (duelId: string, title: string) => Promise<boolean>
  sfx: (name: string) => void
  flash: () => Promise<void>
}

export interface ScriptContext {
  ui: ScriptUI
  rng: Rng
  get: () => SaveState
  set: (update: (save: SaveState) => SaveState) => void
  arg?: string
  pushBack: () => void
  teleport: (map: string, x: number, y: number, facing: Direction) => void
  trainerBattle: (trainer: TrainerDef, name: string) => Promise<boolean>
  /** Records a Hall of Fame entry in the cloud, when available. */
  hallOfFame: () => void
}

export type Script = (ctx: ScriptContext) => Promise<void>

const name = (ctx: ScriptContext) => ctx.get().displayName.split(' ')[0]
const starterOf = (save: SaveState) => save.flags.find((flag) => flag.startsWith('starter:'))?.slice(8) ?? 'sparkit'
const rivalStarter = (save: SaveState) => rivalStarterFor[starterOf(save)]

/** Brian's starter at a level, evolved like the student's would be. */
function evolvedAt(species: string, level: number): string {
  let current = species
  for (let guard = 0; guard < 3; guard += 1) {
    const evolution = getSpecies(current).evolves
    if (!evolution || level < evolution.level) break
    current = evolution.to
  }
  return current
}

export function rivalTeam(stage: 1 | 2 | 3 | 4, save: SaveState): Array<[string, number]> {
  const own = rivalStarter(save)
  if (stage === 1) return [[own, 5]]
  if (stage === 2) return [['echobat', 13], ['quotie', 14], [evolvedAt(own, 16), 16]]
  if (stage === 3) return [['memoth', 25], ['booly', 25], ['modmole', 26], [evolvedAt(own, 28), 28]]
  return [['truthowl', 39], ['splitroot', 39], ['memammoth', 39], [evolvedAt(own, 41), 41]]
}

function rivalDef(id: string, stage: 1 | 2 | 3 | 4, save: SaveState, intro: string, lose: string): TrainerDef {
  return { id, title: 'Rival', kind: 'rival', team: rivalTeam(stage, save), bits: [0, 150, 700, 1400, 2500][stage], sight: 0, intro, lose, after: '', setFlag: id }
}

async function gift(ctx: ScriptContext, item: string, count = 1) {
  ctx.set((save) => giveItem(save, item, count))
  ctx.ui.sfx('item')
  await ctx.ui.say(`${name(ctx)} got ${itemName(item, count)}!`)
}

export const scripts: Record<string, Script> = {
  'leo-stop': async (ctx) => {
    ctx.ui.sfx('alert')
    await ctx.ui.say(['WAIT! Don\'t go into the tall grass!', 'Wild pyxies live there, and you don\'t have one yet.', 'Come to the Makerspace. I have something for you!'], 'Leo Maker')
    ctx.pushBack()
  },

  mom: async (ctx) => {
    if (!hasFlag(ctx.get(), 'got_starter')) {
      await ctx.ui.say([`Good morning, ${name(ctx)}!`, 'Leo Maker called. He wants to see you at the Makerspace.', 'It\'s the building with the orange roof. Don\'t forget your goggles!'], 'Mom')
      return
    }
    await ctx.ui.say(['You look tired! Let me give your pyxies a rest.'], 'Mom')
    ctx.set((save) => ({ ...healTeam(save), respawn: { map: 'home', x: 3, y: 6 } }))
    ctx.ui.sfx('heal')
    await ctx.ui.say(['There! All charged up. Be careful out there, OK?'], 'Mom')
  },

  tv: async (ctx) => ctx.ui.say(['A cooking show. The chef is 3D printing a pizza.', 'It looks… crunchy.']),
  'home-shelf': async (ctx) => ctx.ui.say(['Your bookshelf. "Python for Makers", "Cardboard Engineering" and a comic about robots.']),
  'brian-shelf': async (ctx) => ctx.ui.say(['A shelf of 3D-printed Brians. There are twelve of them.', 'Brian v12 has the best nose. Brian v7 has no ears. Brian v1 is just a cube.']),
  'brian-tv': async (ctx) => ctx.ui.say(['The TV shows a robot competition. A team of kids is winning with a cardboard robot named "BRIAN".']),

  'lab-intro': async (ctx) => {
    ctx.set((save) => setFlag(save, 'lab_intro'))
    await ctx.ui.say([`Ah, ${name(ctx)}! Welcome to the Makerspace!`, 'I am Leo Maker. I build things. Robots, lamps, cardboard castles…', 'And sometimes, things build themselves.', 'Last night my 3D printer was running a Python program. In the morning, three little creatures hatched from it!', 'We call them PYXIES: creatures made of code.', 'Each pyxie is a Python idea. Print, variables, text, math, logic, decisions…', 'When a pyxie battles, YOU write and read the code that powers its moves.', 'Those three pods on the workbench are for you and Brian. Choose one!'], 'Leo Maker')
    await ctx.ui.say(['Hey! I was here first! …But fine, you choose first. I\'m a gentleman.'], 'Brian')
  },

  pod: async (ctx) => {
    const species = getSpecies(ctx.arg ?? 'sparkit')
    if (!hasFlag(ctx.get(), 'lab_intro')) return
    await ctx.ui.say([`It's ${species.name}, the ${species.concept.toUpperCase()} pyxie.`, species.entry])
    const pick = await ctx.ui.choose(`Choose ${species.name}?`, ['Yes!', 'Not yet'])
    if (pick !== 0) return
    const rng = ctx.rng
    const mine = createPyxie(species.id, 5, rng, 'makerspace')
    ctx.set((save) => setFlag(setFlag(addPyxie(markSeen(save, species.id), { ...mine, shiny: false }).save, 'got_starter'), `starter:${species.id}`))
    ctx.ui.sfx('fanfare')
    await ctx.ui.say(`${name(ctx)} chose ${species.name}!`)
    const rival = getSpecies(rivalStarter(ctx.get()))
    ctx.set((save) => markSeen(save, rival.id))
    await ctx.ui.say([`Then I pick ${rival.name}! It was looking at me anyway.`, `${name(ctx)}! Let's see whose pyxie is better. Right now!`], 'Brian')
    await ctx.ui.say(['A battle already? Ha! Perfect, a lesson.', 'Pick a move. Each move is a little coding challenge.', 'Solve it, and your pyxie attacks. Make a mistake, and the move misses.', 'When the enemy attacks, answer the DODGE question quickly to take less damage!'], 'Leo Maker')
    const won = await ctx.trainerBattle(rivalDef('rival1', 1, ctx.get(), 'Let\'s go!', 'Aw, man! I knew I should have picked yours.'), 'Brian')
    if (!won) await ctx.ui.say(['Yes! I won! Don\'t worry, you\'ll get me next time.'], 'Brian')
    ctx.set((save) => healTeam(setFlag(save, 'rival1')))
    await ctx.ui.say(['Splendid! Both of you have the maker spirit.', 'Take this: the CODEX. It records every pyxie you meet.'], 'Leo Maker')
    await gift(ctx, 'codex')
    await ctx.ui.say(['And these: Bytecubes, to catch wild pyxies. Weaken one first, then throw a cube.', 'You also get a few Patches to heal.'], 'Leo Maker')
    await gift(ctx, 'bytecube', 5)
    await gift(ctx, 'patch', 3)
    await ctx.ui.say(['Six Lab Masters guard the valley. Each one tests a Python idea with REAL code.', 'Beat all six, and you can enter the Grand Hackathon at the Lourenço Castanho Academy!', 'But Masters only accept trainers with enough Trainer XP. Battle, catch, and learn.', 'Echo Harbor is north, past Route 1. Off you go!'], 'Leo Maker')
    await ctx.ui.say(['See you at the Hackathon, slowpoke! I\'ll be the champion by then!'], 'Brian')
  },

  'brian-lab': async (ctx) => ctx.ui.say(['Choose already! The pods are getting cold.', 'Can pyxies get cold? I don\'t know. CHOOSE!'], 'Brian'),

  'leo-lab': async (ctx) => {
    const save = ctx.get()
    if (!hasFlag(save, 'got_starter')) {
      await ctx.ui.say(['The three pods on the workbench, there. Pick the one you like!'], 'Leo Maker')
      return
    }
    if (hasFlag(save, 'champion')) {
      await ctx.ui.say(['Champion! You know, I found a hatch in the floor last week…', 'Something in the basement keeps blinking. ON. OFF. ON. OFF.'], 'Leo Maker')
      return
    }
    const tip = save.badges.length >= 6 ? 'All six badges! The Grand Hackathon awaits at Lourenço Castanho, north of Branchwood.'
      : save.badges.length === 0 ? 'Echo Harbor is north. Marina Echo runs the first Lab: print() is her specialty.'
      : `${save.badges.length} badges already! Keep going. Every Master teaches something new.`
    await ctx.ui.say([tip, 'Let me plug your pyxies into the charger.'], 'Leo Maker')
    ctx.set((current) => ({ ...healTeam(current), respawn: { map: 'makerspace', x: 7, y: 5 } }))
    ctx.ui.sfx('heal')
  },

  printer: async (ctx) => ctx.ui.say(ctx.rng.pick([
    ['The 3D printer is printing… a tiny Brian? Again?'],
    ['The 3D printer hums. Layer 47 of 300. Patience is a maker skill.'],
    ['A note on the printer: "Do not print more Brians." - Leo'],
  ])),
  'arduino-bench': async (ctx) => ctx.ui.say(['An Arduino blinks the LED on pin 13. ON. OFF. ON. OFF.', 'Someone wrote on the bench: "Hello World, but with lights."']),
  'laser-cutter': async (ctx) => ctx.ui.say(['The laser cutter. A sign says: MEASURE TWICE, CUT ONCE.', 'Never leave a laser cutter alone while it\'s cutting!']),
  'lab-screen': async (ctx) => ctx.ui.say(['print("Hello, Makerspace!")', 'The screen shows the program that hatched the pyxies. It ends with a smiley face.']),
  'lab-shelf': async (ctx) => ctx.ui.say(['Shelves full of cardboard, hot glue sticks, LEDs, servo motors and one rubber duck.', 'The duck looks wise.']),

  basement: async (ctx) => {
    await ctx.ui.say(['A hatch in the floor. A ladder goes down into the dark…'])
    const go = await ctx.ui.choose('Climb down?', ['Yes', 'No'])
    if (go === 0) ctx.teleport('basement', 4, 4, 'up')
  },
  'basement-note': async (ctx) => ctx.ui.say(['A dusty note: "Arduinix only answers to makers who can blink an LED. Print LED ON and LED OFF, three times each, in order." - L.M.']),

  arduinix: async (ctx) => {
    await ctx.ui.say(['A pyxie made of circuit boards. Its heart blinks like an LED.', 'It looks at you… waiting for a program.'])
    const won = await ctx.ui.duel('blink', 'Blink the LED')
    if (!won) {
      await ctx.ui.say(['Arduinix blinks once and looks away. Try again when your program is ready.'])
      return
    }
    await ctx.ui.say(['Arduinix\'s eyes light up! It wants to battle!'])
    const outcome = await ctx.ui.battle({ kind: 'wild', enemy: { ...createPyxie('arduinix', 45, ctx.rng, 'basement'), shiny: false }, canRun: true, canCatch: true, bg: 'cave', legendary: true })
    if (outcome === 'caught' || outcome === 'win') ctx.set((save) => setFlag(save, 'arduinix_done'))
  },

  nullwing: async (ctx) => {
    await ctx.ui.say(['A pyxie flickers in the dark: Nullwing, born from a program that never ended.', 'It loops… and loops… and loops…'])
    const outcome = await ctx.ui.battle({ kind: 'wild', enemy: { ...createPyxie('nullwing', 46, ctx.rng, 'lasercave'), shiny: false }, canRun: true, canCatch: true, bg: 'cave', legendary: true })
    if (outcome === 'caught' || outcome === 'win') ctx.set((save) => setFlag(save, 'nullwing_done'))
  },

  heal: async (ctx) => {
    await ctx.ui.say(['Welcome to the Charging Station! Shall I recharge your pyxies?'], 'Tech Tina')
    const pick = await ctx.ui.choose('Recharge your team?', ['Yes, please', 'No, thanks'], 'Tech Tina')
    if (pick !== 0) return
    ctx.set((save) => ({ ...healTeam(save), respawn: { map: save.map, x: 5, y: 3 } }))
    ctx.ui.sfx('heal')
    await ctx.ui.flash()
    await ctx.ui.say(['All charged! 100% battery. Come back anytime!'], 'Tech Tina')
  },

  pc: async (ctx) => {
    await ctx.ui.say(['You logged into BrianOS 2.0. (Brian installed it on every PC in the valley.)', 'Opening the Cloud Box…'])
    await ctx.ui.box()
  },

  shop: async (ctx) => {
    await ctx.ui.say(['Welcome to the Maker Mart! What do you need?'], 'Clerk')
    await ctx.ui.shop(Number(ctx.arg) || 1)
  },

  rival2: async (ctx) => {
    await ctx.ui.say([`${name(ctx)}! There you are!`, 'I caught a bunch of pyxies on the beach. Wanna see how strong they got?'], 'Brian')
    const won = await ctx.trainerBattle(rivalDef('rival2', 2, ctx.get(), 'Here I go!', 'What?! My pyxies need more practice…'), 'Brian')
    ctx.set((save) => setFlag(save, 'rival2'))
    await ctx.ui.say(won ? ['You\'re really good. Stringhaven is just north. Lia Quote is tough!', 'Oh, and if you see an Arduino on the beach… it\'s mine. I lost it. Don\'t tell Leo.'] : ['Ha! I win this time! See you up north!'], 'Brian')
  },

  rival3: async (ctx) => {
    await ctx.ui.say(['I knew you\'d come this way. Veritas Peak is right up there.', 'But first: True or False, I\'m going to win this time?'], 'Brian')
    const won = await ctx.trainerBattle(rivalDef('rival3', 3, ctx.get(), 'Let\'s find out!', 'False! It was FALSE! Argh!'), 'Brian')
    ctx.set((save) => setFlag(save, 'rival3'))
    await ctx.ui.say(won ? ['Rumor says Dr. Segfault wants to crash the Grand Hackathon.', 'If that happens, I\'ll never get to beat you there. So… be careful, OK?'] : ['True! I won! See you at the Hackathon!'], 'Brian')
  },

  'brian-arduino': async (ctx) => {
    const save = ctx.get()
    if (itemCount(save, 'lostarduino') > 0) {
      await ctx.ui.say(['MY ARDUINO! You found it! It still blinks!', 'Here, take this. It\'s a Debug Duck. Explain your code to it and it solves a problem for you.', 'Real coders do this, I swear. It\'s called rubber duck debugging.'], 'Brian')
      ctx.set((current) => setFlag(takeItem(current, 'lostarduino'), 'arduino_returned'))
      await gift(ctx, 'debugduck', 2)
      return
    }
    ctx.set((current) => setFlag(current, 'arduino_quest'))
    await ctx.ui.say(['Oh, hey. Have you seen an Arduino? Blue board, says BRIAN on it?', 'I think I dropped it on Quote Coast, north of here. Somewhere near a flower.', 'If you find it… I\'ll give you something cool.'], 'Brian')
  },

  steward: async (ctx) => {
    await ctx.ui.say(['Halt! The road to the Grand Hackathon is only for makers with all six Lab Badges.', `You have ${ctx.get().badges.length}.`], 'Hackathon Steward')
    ctx.pushBack()
  },

  champion: async (ctx) => {
    const save = ctx.get()
    if (!hasFlag(save, 'rival4')) {
      await ctx.ui.say(['Brian is waiting for you. Beat him first, then come up here.'], 'Leo Maker')
      return
    }
    if (hasFlag(save, 'champion')) {
      await ctx.ui.say(['Champion! The valley is safe and the Hackathon is yours.', 'There\'s always more to build. Go explore!'], 'Leo Maker')
      return
    }
    await ctx.ui.say([`${name(ctx)}. You made it.`, 'I watched you start with a single print(). Now you write whole decisions.', 'I am the champion of the Grand Hackathon. My pyxies are the three that hatched in my printer, all grown up.', 'This final battle is all code. Every one of my pyxies fights with a code duel.', 'Show me everything you learned. Let\'s build something great!'], 'Leo Maker')
    const champion: TrainerDef = { id: 'champion', title: 'Champion', kind: 'champion', team: [['lumiprint', 43], ['vaultron', 43], ['calcudrake', 44], ['truthowl', 43]], duels: ['password-hydra', 'discount', 'grade-judge', 'celsius'], bits: 5000, sight: 0, intro: '', lose: 'Magnificent! That\'s the code of a champion!', after: '', setFlag: 'champion' }
    const won = await ctx.trainerBattle(champion, 'Leo Maker')
    if (!won) return
    await ctx.ui.say(['You are the new Grand Hackathon Champion!', 'Take this Maker Cube. Nullwing escaped into the Laser Cutter Cave when Segfault lost control of it.', 'Maybe it just needs a trainer who understands loops.'], 'Leo Maker')
    await gift(ctx, 'makercube', 2)
    ctx.set((current) => setFlag(current, 'champion'))
    ctx.hallOfFame()
    await ctx.ui.credits()
  },
}

/** Scripts have optional arguments after a colon: pod:sparkit, shop:2. */
export function resolveScript(id: string): { script: Script; arg?: string } | null {
  const [key, arg] = id.split(':')
  const script = scripts[key] as Script | undefined
  return script ? { script, arg } : null
}

export function starterNames(): string[] {
  return starterIds.map((id) => getSpecies(id).name)
}

export { displayName, looks }
