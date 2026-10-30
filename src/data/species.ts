import type { Concept } from '../types'

export interface Species {
  id: string
  dex: number
  name: string
  concept: Concept
  /** Base stats: hit points, attack, defense, speed. */
  base: { hp: number; atk: number; def: number; spd: number }
  evolves?: { to: string; level: number }
  /** Moves learned on reaching each level. */
  learnset: Array<[level: number, move: string]>
  catchRate: number
  xpYield: number
  entry: string
  /** Shown in the codex when the pyxie has not been caught yet. */
  habitat: string
  legendary?: boolean
}

const s = (species: Species) => species

export const speciesList: Species[] = [
  // Starters: the three pyxies Leo Maker's 3D printer hatched.
  s({ id: 'sparkit', dex: 1, name: 'Sparkit', concept: 'print', base: { hp: 44, atk: 52, def: 42, spd: 60 }, evolves: { to: 'sparkoon', level: 14 },
    learnset: [[1, 'echo'], [1, 'truth-ping'], [6, 'spark'], [11, 'quote-jab'], [17, 'shout'], [24, 'fork-kick'], [31, 'lumen-beam']], catchRate: 0.2, xpYield: 60,
    entry: 'A spark of light that blinks whatever it hears. Sparkit learned to talk by reading print() lines.', habitat: 'Hatched in the Makerspace 3D printer.' }),
  s({ id: 'sparkoon', dex: 2, name: 'Sparkoon', concept: 'print', base: { hp: 58, atk: 68, def: 54, spd: 76 }, evolves: { to: 'lumiprint', level: 30 },
    learnset: [[17, 'shout'], [22, 'glue-gun'], [27, 'else-edge'], [31, 'lumen-beam']], catchRate: 0.1, xpYield: 120,
    entry: 'Its tail is a long glowing ribbon. Each feather shows one line of output.', habitat: 'Evolves from Sparkit.' }),
  s({ id: 'lumiprint', dex: 3, name: 'Lumiprint', concept: 'print', base: { hp: 76, atk: 92, def: 70, spd: 96 }, learnset: [[31, 'lumen-beam'], [36, 'calc-flare'], [40, 'nested-nova']], catchRate: 0.05, xpYield: 210,
    entry: 'A phoenix of pure light. When Lumiprint sings, every screen in the valley flickers with its message.', habitat: 'Evolves from Sparkoon.' }),

  s({ id: 'boxlet', dex: 4, name: 'Boxlet', concept: 'var', base: { hp: 52, atk: 46, def: 56, spd: 44 }, evolves: { to: 'cratebit', level: 14 },
    learnset: [[1, 'box-bash'], [1, 'echo'], [6, 'plus-punch'], [11, 'swap-slam'], [17, 'memory-lock'], [24, 'truth-ping'], [31, 'vault-crush']], catchRate: 0.2, xpYield: 60,
    entry: 'A cardboard cube with a name tag. Whatever you put inside, Boxlet remembers it until you swap it.', habitat: 'Hatched in the Makerspace 3D printer.' }),
  s({ id: 'cratebit', dex: 5, name: 'Cratebit', concept: 'var', base: { hp: 70, atk: 60, def: 74, spd: 54 }, evolves: { to: 'vaultron', level: 30 },
    learnset: [[17, 'memory-lock'], [22, 'mod-drill'], [27, 'compare-claw'], [31, 'vault-crush']], catchRate: 0.1, xpYield: 120,
    entry: 'Wooden crates stack on its back. Each crate holds a value with a label written in chalk.', habitat: 'Evolves from Boxlet.' }),
  s({ id: 'vaultron', dex: 6, name: 'Vaultron', concept: 'var', base: { hp: 96, atk: 80, def: 98, spd: 64 }, learnset: [[31, 'vault-crush'], [36, 'verdict'], [40, 'nested-nova']], catchRate: 0.05, xpYield: 210,
    entry: 'A walking steel vault. Nothing is ever lost inside it, unless someone reassigns it.', habitat: 'Evolves from Cratebit.' }),

  s({ id: 'plusling', dex: 7, name: 'Plusling', concept: 'math', base: { hp: 46, atk: 56, def: 44, spd: 54 }, evolves: { to: 'sumflare', level: 14 },
    learnset: [[1, 'plus-punch'], [1, 'echo'], [6, 'box-bash'], [11, 'times-tackle'], [17, 'mod-drill'], [24, 'truth-ping'], [31, 'calc-flare']], catchRate: 0.2, xpYield: 60,
    entry: 'A baby dragon with a + on its forehead. It counts its own steps and never loses track.', habitat: 'Hatched in the Makerspace 3D printer.' }),
  s({ id: 'sumflare', dex: 8, name: 'Sumflare', concept: 'math', base: { hp: 62, atk: 74, def: 56, spd: 68 }, evolves: { to: 'calcudrake', level: 30 },
    learnset: [[17, 'mod-drill'], [22, 'quote-jab'], [27, 'compare-claw'], [31, 'calc-flare']], catchRate: 0.1, xpYield: 120,
    entry: 'Its flames burn in the shape of numbers. Hotter flames mean bigger results.', habitat: 'Evolves from Plusling.' }),
  s({ id: 'calcudrake', dex: 9, name: 'Calcudrake', concept: 'math', base: { hp: 80, atk: 100, def: 72, spd: 84 }, learnset: [[31, 'calc-flare'], [36, 'verdict'], [40, 'nested-nova']], catchRate: 0.05, xpYield: 210,
    entry: 'It solves a whole equation in one breath of fire, always multiplying before adding.', habitat: 'Evolves from Sumflare.' }),

  // Wild pyxies.
  s({ id: 'echobat', dex: 10, name: 'Echobat', concept: 'print', base: { hp: 40, atk: 44, def: 38, spd: 62 }, evolves: { to: 'shoutbat', level: 18 },
    learnset: [[1, 'echo'], [8, 'spark'], [18, 'shout']], catchRate: 0.55, xpYield: 40,
    entry: 'Echobat repeats any word it hears, exactly as written. Even the typos.', habitat: 'Tall grass on Print Path.' }),
  s({ id: 'shoutbat', dex: 11, name: 'Shoutbat', concept: 'print', base: { hp: 60, atk: 66, def: 54, spd: 84 },
    learnset: [[18, 'shout'], [26, 'lumen-beam']], catchRate: 0.3, xpYield: 100,
    entry: 'Its shout prints three lines at once. Cave walls in the valley are covered in its output.', habitat: 'Evolves from Echobat. Seen in caves.' }),
  s({ id: 'quotie', dex: 12, name: 'Quotie', concept: 'text', base: { hp: 42, atk: 46, def: 44, spd: 52 }, evolves: { to: 'stringra', level: 20 },
    learnset: [[1, 'quote-jab'], [10, 'string-whip'], [20, 'glue-gun']], catchRate: 0.5, xpYield: 44,
    entry: 'A tiny snake shaped like a quote mark. Two Quoties together make a string.', habitat: 'Beaches of Quote Coast and Print Path.' }),
  s({ id: 'stringra', dex: 13, name: 'Stringra', concept: 'text', base: { hp: 64, atk: 70, def: 60, spd: 72 },
    learnset: [[20, 'glue-gun'], [28, 'concat-storm']], catchRate: 0.28, xpYield: 104,
    entry: 'A long serpent made of glued words. It hisses when you try to add a number to it.', habitat: 'Evolves from Quotie.' }),
  s({ id: 'memoth', dex: 14, name: 'Memoth', concept: 'var', base: { hp: 56, atk: 44, def: 54, spd: 36 }, evolves: { to: 'memammoth', level: 22 },
    learnset: [[1, 'box-bash'], [10, 'swap-slam'], [22, 'memory-lock']], catchRate: 0.5, xpYield: 46,
    entry: 'A woolly calf that never forgets a value. It carries labels on its tusks.', habitat: 'Meadows of Variable Valley.' }),
  s({ id: 'memammoth', dex: 15, name: 'Memammoth', concept: 'var', base: { hp: 92, atk: 70, def: 80, spd: 40 },
    learnset: [[22, 'memory-lock'], [30, 'vault-crush']], catchRate: 0.25, xpYield: 112,
    entry: 'Its memory is so big that a whole town stores its variables in its fur.', habitat: 'Evolves from Memoth.' }),
  s({ id: 'modmole', dex: 16, name: 'Modmole', concept: 'math', base: { hp: 48, atk: 54, def: 50, spd: 40 }, evolves: { to: 'divimole', level: 24 },
    learnset: [[1, 'plus-punch'], [12, 'times-tackle'], [24, 'mod-drill']], catchRate: 0.48, xpYield: 50,
    entry: 'It digs tunnels in exact divisions. Whatever is left over, it keeps as a pebble: the remainder.', habitat: 'Sum Canyon and the Laser Cutter Cave.' }),
  s({ id: 'divimole', dex: 17, name: 'Divimole', concept: 'math', base: { hp: 70, atk: 82, def: 70, spd: 52 },
    learnset: [[24, 'mod-drill'], [32, 'calc-flare']], catchRate: 0.25, xpYield: 116,
    entry: 'Its claws split boulders into equal parts. It never shares the remainder.', habitat: 'Evolves from Modmole.' }),
  s({ id: 'booly', dex: 18, name: 'Booly', concept: 'logic', base: { hp: 46, atk: 50, def: 46, spd: 58 }, evolves: { to: 'truthowl', level: 26 },
    learnset: [[1, 'truth-ping'], [14, 'compare-claw'], [26, 'bool-beam']], catchRate: 0.45, xpYield: 54,
    entry: 'One eye says True and the other says False. It blinks the right one when you ask it a comparison.', habitat: 'Truth Fields.' }),
  s({ id: 'truthowl', dex: 19, name: 'Truthowl', concept: 'logic', base: { hp: 68, atk: 78, def: 68, spd: 80 },
    learnset: [[26, 'bool-beam'], [34, 'verdict']], catchRate: 0.22, xpYield: 120,
    entry: 'The judge of the forest. Truthowl never lies, but it answers only in True or False.', habitat: 'Evolves from Booly.' }),
  s({ id: 'forkit', dex: 20, name: 'Forkit', concept: 'branch', base: { hp: 50, atk: 54, def: 52, spd: 50 }, evolves: { to: 'splitroot', level: 28 },
    learnset: [[1, 'fork-kick'], [16, 'else-edge'], [28, 'split-path']], catchRate: 0.42, xpYield: 58,
    entry: 'A sprout with two branches. At every crossroad it chooses one path, never both.', habitat: 'Forking Path and Branchwood.' }),
  s({ id: 'splitroot', dex: 21, name: 'Splitroot', concept: 'branch', base: { hp: 82, atk: 80, def: 78, spd: 56 },
    learnset: [[28, 'split-path'], [36, 'nested-nova']], catchRate: 0.2, xpYield: 126,
    entry: 'An old tree whose branches split inside branches. Getting lost in it is a lesson in nested ifs.', habitat: 'Evolves from Forkit.' }),

  // Secrets.
  s({ id: 'arduinix', dex: 22, name: 'Arduinix', concept: 'logic', legendary: true, base: { hp: 100, atk: 110, def: 96, spd: 104 },
    learnset: [[1, 'verdict'], [1, 'nested-nova'], [1, 'calc-flare'], [1, 'lumen-beam']], catchRate: 0.12, xpYield: 300,
    entry: 'A legend of the Makerspace. Its wings are circuit boards and its heart blinks like an LED on pin 13.', habitat: '???' }),
  s({ id: 'nullwing', dex: 23, name: 'Nullwing', concept: 'branch', legendary: true, base: { hp: 104, atk: 112, def: 92, spd: 100 },
    learnset: [[1, 'nested-nova'], [1, 'concat-storm'], [1, 'vault-crush'], [1, 'split-path']], catchRate: 0.1, xpYield: 300,
    entry: 'Born from a program that never ended. Dr. Segfault tried to control it. Nobody controls an infinite loop.', habitat: '???' }),
]

export const speciesById: Record<string, Species> = Object.fromEntries(speciesList.map((species) => [species.id, species]))

export function getSpecies(id: string): Species {
  const species = speciesById[id]
  if (!species) throw new Error(`Unknown species ${id}`)
  return species
}

export const starterIds = ['sparkit', 'boxlet', 'plusling'] as const

/** Brian grabs the starter right next to yours on the workbench. */
export const rivalStarterFor: Record<string, string> = { sparkit: 'boxlet', boxlet: 'plusling', plusling: 'sparkit' }
