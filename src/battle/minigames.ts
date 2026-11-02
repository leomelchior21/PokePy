// Arcade mini-games, always about Python. Like the quizzes, every answer comes from running the
// code through the classroom tracer, never typed by hand.
//   catch   Output Catcher: values rain down, catch the one the code prints.
//   sling   Print Slingshot: launch at the tower that shows the real output.
//   flappy  Trace Flight: each gate is one line of code; fly through the variable's new value.
//   jump    True Jump: bounce only on platforms whose condition is True.
//   match   Value Crush: swap expressions until three in a row have the same value.
//   blocks  Code Builder: snap blocks into slots, indentation and all, then run the tests.
import type { Rng } from '../lib/rng'
import type { Concept, Tier } from '../types'
import { choice, choiceFor, greetings, names, rules, run, screen, things, words, type Base, type ChoiceChallenge } from './challenges'

export type CatchChallenge = Base & { kind: 'catch'; code: string[]; focus?: string; options: string[]; answer: number; need: number; seconds: number }
export type SlingChallenge = Base & { kind: 'sling'; code: string[]; focus?: string; options: string[]; answer: number; shots: number }
export interface Gate { line: number; options: string[]; answer: number }
export type FlappyChallenge = Base & { kind: 'flappy'; code: string[]; focus: string; gates: Gate[]; hearts: number }
export interface Platform { expr: string; value: boolean }
export type JumpChallenge = Base & { kind: 'jump'; setup: string[]; rows: Array<[Platform, Platform]>; strikes: number; seconds: number }
export interface Tile { expr: string; value: string }
export type MatchChallenge = Base & { kind: 'match'; setup: string[]; pool: Tile[]; goal: number; moves: number; size: number }
export interface Slot { indent: number; fixed?: string }
export interface BlockTest { setup: string[]; expect: string; label: string }
export type BlocksChallenge = Base & { kind: 'blocks'; slots: Slot[]; pieces: string[]; solution: string[]; tests: BlockTest[]; runs: number }

export type MiniChallenge = CatchChallenge | SlingChallenge | FlappyChallenge | JumpChallenge | MatchChallenge | BlocksChallenge
export type MiniKind = MiniChallenge['kind']

export const miniKinds: MiniKind[] = ['catch', 'sling', 'flappy', 'jump', 'match', 'blocks']
export const isMini = (kind: string): kind is MiniKind => (miniKinds as string[]).includes(kind)

export const miniLabel: Record<MiniKind, string> = {
  catch: 'OUTPUT CATCHER', sling: 'PRINT SLINGSHOT', flappy: 'TRACE FLIGHT', jump: 'TRUE JUMP', match: 'VALUE CRUSH', blocks: 'CODE BUILDER',
}

// ------------------------------------------------------------------ CATCH / SLING

/** A choice question whose options fit on a falling bubble or a tower sign. */
function compactChoice(concept: Concept, tier: Tier, rng: Rng, maxLines: number): ChoiceChallenge {
  let best: ChoiceChallenge | null = null
  for (let tries = 0; tries < 80; tries += 1) {
    const candidate = choiceFor(concept, tier, rng)
    best = candidate
    if (candidate.options.every((option) => option.split('\n').length <= maxLines && option.length <= 26)) return candidate
  }
  return best!
}

function catchGame(concept: Concept, tier: Tier, rng: Rng): CatchChallenge {
  const source = compactChoice(concept, tier, rng, 1)
  const code = source.focus ? [...source.code, `print(${source.focus})`] : source.code
  return {
    kind: 'catch', concept, tier, code, focus: source.focus, options: source.options, answer: source.answer, need: 3, seconds: 34,
    prompt: 'Read the code, then catch what it prints. Dodge the wrong values!', explain: source.explain,
  }
}

function slingGame(concept: Concept, tier: Tier, rng: Rng): SlingChallenge {
  // One printed line per sign: a sign that wraps reads like two answers on an iPad.
  const source = compactChoice(concept, tier, rng, 1)
  const code = source.focus ? [...source.code, `print(${source.focus})`] : source.code
  return {
    kind: 'sling', concept, tier, code, focus: source.focus, options: source.options, answer: source.answer, shots: 3,
    prompt: 'Pull back and launch at the tower that shows the real output.', explain: source.explain,
  }
}

// ------------------------------------------------------------------ FLAPPY

function flappyGame(concept: Concept, tier: Tier, rng: Rng): FlappyChallenge {
  const v = rng.pick(things).name
  const start = rng.int(2, 9)
  const steps = tier === 1 ? 3 : 4
  const ops = tier === 1
    ? [() => `${v} = ${v} + ${rng.int(1, 6)}`, () => `${v} = ${v} - ${rng.int(1, 3)}`, () => `${v} = ${v} * 2`, () => `${v} = ${rng.int(10, 20)}`]
    : [() => `${v} = ${v} + ${rng.int(2, 9)}`, () => `${v} = ${v} * ${rng.int(2, 3)}`, () => `${v} = ${v} // 2`, () => `${v} = ${v} % ${rng.int(3, 5)} + ${rng.int(1, 4)}`, () => `${v} = ${v} - ${rng.int(1, 5)}`]
  const code = [`${v} = ${start}`]
  while (code.length <= steps) {
    const line = rng.pick(ops)()
    const value = Number(screen([...code, line, `print(${v})`]))
    if (value < 0 || value > 99 || code.includes(line)) continue
    code.push(line)
  }
  const gates: Gate[] = code.map((_, line) => {
    const now = screen([...code.slice(0, line + 1), `print(${v})`])
    const before = line ? screen([...code.slice(0, line), `print(${v})`]) : String(start + 1)
    const numbers = (code[line].match(/\d+/g) ?? []).filter((n) => n !== now)
    const pool = [before, ...numbers, String(Number(now) + 1), String(Number(now) - 1), String(Number(now) * 2)]
    const { options, answer } = choice(rng, now, pool, () => String(Number(now) + rng.pick([2, 3, -2, 5])))
    const keep = tier === 1 ? 2 : 3
    const trimmed = [options[answer], ...options.filter((_, i) => i !== answer).slice(0, keep - 1)]
    const shuffled = rng.shuffle(trimmed)
    return { line, options: shuffled, answer: shuffled.indexOf(now) }
  })
  return {
    kind: 'flappy', concept, tier, code, focus: v, gates, hearts: 3,
    prompt: `Each gate runs one line. Fly through the new value of ${v}!`,
    explain: 'A variable keeps only its newest value. Each line uses the value from the line before it.',
  }
}

// ------------------------------------------------------------------ JUMP

const ops = ['>', '<', '>=', '<=', '==', '!=']

function condition(concept: Concept, tier: Tier, rng: Rng, setup: string[]): string {
  if (concept === 'branch' || (tier >= 2 && setup.length)) {
    const [name, raw] = setup[0].split(' = ')
    const value = Number(raw)
    const limit = value + rng.pick([-6, -2, -1, 0, 0, 1, 2, 6])
    return `${name} ${rng.pick(ops)} ${limit}`
  }
  if (concept === 'math') {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    return rng.pick([`${a} + ${b} == ${a + b + rng.pick([0, 0, 1, -1])}`, `${a * b} % 2 == 0`, `${a * b} // ${b} == ${a + rng.pick([0, 0, 1])}`, `${a} * ${b} > ${rng.int(10, 40)}`])
  }
  if (rng.chance(0.2)) {
    const word = rng.pick(['cat', 'robot', 'yes', 'pixel'])
    return `"${word}" == "${rng.pick([word, word.toUpperCase(), word[0].toUpperCase() + word.slice(1)])}"`
  }
  const a = rng.int(1, 20)
  return `${a} ${rng.pick(ops)} ${rng.pick([a, a + rng.int(1, 4), a - rng.int(1, 4)])}`
}

function jumpGame(concept: Concept, tier: Tier, rng: Rng): JumpChallenge {
  const rule = rng.pick(rules)
  const setup = concept === 'branch' ? [`${rule.v} = ${rule.limit + rng.pick([-3, -1, 0, 1, 3])}`] : tier >= 2 ? [`${rng.pick(things).name} = ${rng.int(3, 15)}`] : []
  const truth = (expr: string) => screen([...setup, `print(${expr})`]) === 'True'
  const rows: Array<[Platform, Platform]> = []
  let guard = 0
  while (rows.length < 7 && guard++ < 400) {
    let yes = ''
    let no = ''
    for (let tries = 0; tries < 40 && (!yes || !no); tries += 1) {
      const expr = condition(concept, tier, rng, setup)
      if (truth(expr)) { if (!yes) yes = expr } else if (!no) no = expr
    }
    if (!yes || !no || rows.some(([a, b]) => a.expr === yes || b.expr === yes)) continue
    const pair: [Platform, Platform] = rng.chance(0.5) ? [{ expr: yes, value: true }, { expr: no, value: false }] : [{ expr: no, value: false }, { expr: yes, value: true }]
    rows.push(pair)
  }
  return {
    kind: 'jump', concept, tier, setup, rows, strikes: 3, seconds: 70,
    prompt: 'Bounce up on the True platforms. False ones crumble under you!',
    explain: '>= and <= include the number itself. == compares, != means "not equal", and capitals matter in text.',
  }
}

// ------------------------------------------------------------------ MATCH

function mathTiles(rng: Rng, setup: string[]): Tile[] {
  const values = rng.shuffle([4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18]).slice(0, 4)
  const vars = setup.map((line) => line.split(' = '))
  const tiles: Tile[] = []
  for (const v of values) {
    const forms = new Set<string>([String(v)])
    for (let tries = 0; tries < 60 && forms.size < 6; tries += 1) {
      const a = rng.int(1, v - 1)
      const k = rng.int(2, 4)
      const candidates = [`${a} + ${v - a}`, `${v + k} - ${k}`, `${v * k} // ${k}`, `${v * k + 1} // ${k}`, `${v + k * 3} - ${k * 3}`]
      if (v % 2 === 0) candidates.push(`2 * ${v / 2}`, `${v / 2} + ${v / 2}`)
      if (v % 3 === 0) candidates.push(`3 * ${v / 3}`)
      for (const [name, raw] of vars) { const n = Number(raw); if (v - n > 0) candidates.push(`${name} + ${v - n}`); if (n - v > 0) candidates.push(`${name} - ${n - v}`); if (v % n === 0 && v / n > 1) candidates.push(`${name} * ${v / n}`) }
      forms.add(rng.pick(candidates))
    }
    for (const expr of forms) tiles.push({ expr, value: screen([...setup, `print(${expr})`]) })
  }
  return tiles
}

function textTiles(rng: Rng): Tile[] {
  const picks = rng.shuffle(['Pyxie', 'Maker', 'Robot', 'Pixel', 'Laser', 'Rocket', 'Codex']).slice(0, 4)
  const tiles: Tile[] = []
  for (const word of picks) {
    const forms = new Set<string>([`"${word}"`])
    for (let cut = 1; cut < word.length; cut += 1) forms.add(`"${word.slice(0, cut)}" + "${word.slice(cut)}"`)
    if (word.length >= 5) forms.add(`"${word.slice(0, 1)}" + "${word.slice(1, 3)}" + "${word.slice(3)}"`)
    for (const expr of [...forms].slice(0, 6)) tiles.push({ expr, value: screen([`print(${expr})`]) })
  }
  return tiles
}

function matchGame(concept: Concept, tier: Tier, rng: Rng): MatchChallenge {
  const setup = concept === 'var' || tier >= 3 ? [`${rng.pick(['a', 'x', 'n'])} = ${rng.int(2, 6)}`] : []
  const pool = concept === 'text' ? textTiles(rng) : mathTiles(rng, setup)
  return {
    kind: 'match', concept, tier, setup, pool, goal: 4, moves: 18, size: 6,
    prompt: 'Swap two neighbors to line up three tiles with the SAME value. Work them out like Python!',
    explain: concept === 'text' ? '+ glues texts in order, with nothing in between. Different pieces can glue into the same word.' : 'Python does * // and % before + and -. // drops the decimals. Many expressions share one value.',
  }
}

// ------------------------------------------------------------------ BLOCKS

/** The program a set of placed pieces makes, fixed lines included. */
export function assemble(challenge: BlocksChallenge, placed: Array<string | null>): string[] {
  let k = 0
  return challenge.slots.map((slot) => {
    const text = slot.fixed ?? placed[k++] ?? ''
    return `${'    '.repeat(slot.indent)}${text}`
  })
}

export interface BlockResult { test: BlockTest; output: string; pass: boolean; error?: string }

/** Runs every test: the setup lines replace the program's first line. */
export function runBlocks(challenge: BlocksChallenge, placed: Array<string | null>): BlockResult[] {
  const program = assemble(challenge, placed)
  return challenge.tests.map((test) => {
    const lines = test.setup.length ? [...test.setup, ...program.slice(test.setup.length)] : program
    const result = run(lines)
    const output = result.outputs.join('\n')
    return { test, output, pass: !result.error && output === test.expect, error: result.error ? `${result.error.type}: ${result.error.message}` : undefined }
  })
}

function blocksGame(concept: Concept, tier: Tier, rng: Rng): BlocksChallenge {
  if (concept === 'branch' || concept === 'logic') {
    const rule = rng.pick(rules)
    const yesValue = rule.op.startsWith('>') ? rule.limit + rng.int(1, 9) : rule.limit - rng.int(1, 9)
    const noValue = rule.op.startsWith('>') ? rule.limit - rng.int(1, 9) : rule.limit + rng.int(1, 9)
    const flip: Record<string, string> = { '>': '<', '>=': '<', '<': '>', '<=': '>' }
    const solution = [`if ${rule.v} ${rule.op} ${rule.limit}:`, `print("${rule.yes}")`, 'else:', `print("${rule.no}")`]
    const pieces = rng.shuffle([...solution, `if ${rule.v} = ${rule.limit}:`, `print(${rule.yes.split(' ')[0]})`, `if ${rule.v} ${flip[rule.op]} ${rule.limit}`])
    return {
      kind: 'blocks', concept, tier, solution, pieces, runs: 2,
      slots: [{ indent: 0, fixed: `${rule.v} = ${yesValue}` }, { indent: 0 }, { indent: 1 }, { indent: 0 }, { indent: 1 }],
      tests: [
        { setup: [`${rule.v} = ${yesValue}`], expect: rule.yes, label: `${rule.v} = ${yesValue}` },
        { setup: [`${rule.v} = ${noValue}`], expect: rule.no, label: `${rule.v} = ${noValue}` },
      ],
      prompt: `Build the decision. It must work for BOTH tests: ${rule.v} = ${yesValue} shows "${rule.yes}" and ${rule.v} = ${noValue} shows "${rule.no}".`,
      explain: 'if needs a condition and a colon. The indented line runs only when the condition is True; else: catches everything else.',
    }
  }
  const name = rng.pick(names)
  const greet = rng.pick(greetings)
  const variants: Record<string, () => { solution: string[]; distractors: string[] }> = {
    print: () => {
      const word = rng.pick(words)
      return { solution: [`print("${greet}, ${name}!")`, `print(${rng.int(2, 5)} * ${rng.int(2, 5)})`, `print("I like ${word}s")`], distractors: [`print(${greet})`, `print("${rng.int(2, 5)} * ${rng.int(2, 5)}")`] }
    },
    var: () => {
      const price = rng.int(2, 9)
      return { solution: [`price = ${price}`, `total = price * ${rng.int(2, 5)}`, 'print(total)'], distractors: ['print("total")', `total = Price * ${rng.int(2, 5)}`] }
    },
    text: () => ({ solution: [`name = "${name}"`, `msg = "${greet} " + name`, 'print(msg)'], distractors: [`msg = "${greet}" + "name"`, 'print("msg")'] }),
    math: () => {
      const candy = rng.int(13, 29)
      const kids = rng.int(3, 5)
      return { solution: [`candy = ${candy}`, `each = candy // ${kids}`, 'print(each)'], distractors: [`each = candy / ${kids}`, 'print(candy // each)'] }
    },
  }
  const { solution, distractors } = variants[concept]()
  const target = screen(solution)
  return {
    kind: 'blocks', concept, tier, solution, runs: 2,
    pieces: rng.shuffle([...solution, ...distractors]),
    slots: solution.map(() => ({ indent: 0 })),
    tests: [{ setup: [], expect: target, label: 'the program' }],
    prompt: 'Snap the blocks into the slots, top to bottom, so the screen shows the target. Some blocks are traps!',
    explain: 'Python runs from top to bottom. A variable must get its value before a line uses it, and text needs quotes.',
  }
}

// ------------------------------------------------------------------ REGISTRY

export function createMini(concept: Concept, kind: MiniKind, tier: Tier, rng: Rng): MiniChallenge {
  switch (kind) {
    case 'catch': return catchGame(concept, tier, rng)
    case 'sling': return slingGame(concept, tier, rng)
    case 'flappy': return flappyGame(concept, tier, rng)
    case 'jump': return jumpGame(concept, tier, rng)
    case 'match': return matchGame(concept, tier, rng)
    case 'blocks': return blocksGame(concept, tier, rng)
  }
}

/**
 * The same challenge as a plain question with options, for screens without a canvas (and for
 * the robot tests). The question stays honest: the right option is computed, not copied.
 */
export function toQuiz(challenge: MiniChallenge, rng: Rng): ChoiceChallenge {
  const base = { concept: challenge.concept, tier: challenge.tier, explain: challenge.explain }
  switch (challenge.kind) {
    case 'catch':
    case 'sling':
      return { ...base, kind: 'predict', code: challenge.code, options: challenge.options, answer: challenge.answer, prompt: 'What appears on the screen?' }
    case 'flappy': {
      const last = challenge.gates[challenge.gates.length - 1]
      const right = last.options[last.answer]
      const { options, answer } = choice(rng, right, [...last.options, String(Number(right) + 1), String(Number(right) - 1)], () => String(Number(right) + 2))
      return { ...base, kind: 'trace', code: challenge.code, focus: challenge.focus, options, answer, prompt: `What is inside ${challenge.focus} after the last line?` }
    }
    case 'jump': {
      const yes = challenge.rows[0].find((p) => p.value)!.expr
      const no = [...new Set(challenge.rows.map((row) => row.find((p) => !p.value)!.expr))]
      const options = rng.shuffle([yes, ...no.slice(0, 3)])
      return { ...base, kind: 'predict', code: challenge.setup.length ? challenge.setup : ['# no variables'], options, answer: options.indexOf(yes), prompt: 'Which condition is True?' }
    }
    case 'match': {
      const target = challenge.pool[0]
      const others = challenge.pool.filter((tile) => tile.value !== target.value)
      const right = challenge.pool.find((tile) => tile.value === target.value && tile.expr !== target.expr) ?? target
      const options = rng.shuffle([right.expr, ...rng.shuffle(others).slice(0, 3).map((tile) => tile.expr)])
      return { ...base, kind: 'predict', code: [...challenge.setup, `target = ${target.value.match(/^-?\d/) ? target.value : `"${target.value}"`}`], options, answer: options.indexOf(right.expr), prompt: `Which expression has the same value as target?` }
    }
    case 'blocks': {
      const right = assemble(challenge, challenge.solution).join('\n')
      const candidates: string[][] = [[...challenge.solution].reverse(), [challenge.solution[1], challenge.solution[0], ...challenge.solution.slice(2)]]
      for (const piece of challenge.pieces) {
        if (challenge.solution.includes(piece)) continue
        challenge.solution.forEach((_, i) => candidates.push(challenge.solution.map((line, j) => (j === i ? piece : line))))
      }
      const wrong = [...new Set(rng.shuffle(candidates).filter((placed) => runBlocks(challenge, placed).some((r) => !r.pass)).map((placed) => assemble(challenge, placed).join('\n')))].filter((text) => text !== right)
      const options = rng.shuffle([right, ...wrong.slice(0, 3)])
      return { ...base, kind: 'predict', code: [`# ${challenge.tests.map((t) => `${t.label} → ${t.expect}`).join(' | ')}`], options, answer: options.indexOf(right), prompt: 'Which program passes every test?' }
    }
  }
}
