// Challenge generators. Every answer is computed by running the code through the classroom
// Python tracer, never typed by hand, so a challenge can never lie to a student.
import { runDecisionProgram, type DecisionRun } from '../lib/decisionTracer'
import type { Rng } from '../lib/rng'
import type { ChallengeKind, Concept, Tier } from '../types'
import { createMini, type MiniChallenge } from './minigames'

export interface Base { concept: Concept; tier: Tier; prompt: string; explain: string }

export type ChoiceChallenge = Base & { kind: 'predict' | 'trace' | 'fill'; code: string[]; options: string[]; answer: number; focus?: string }
export type TrueFalseChallenge = Base & { kind: 'truefalse'; code: string[]; claim?: string; answer: boolean; seconds: number }
export type BuildChallenge = Base & { kind: 'build'; before: string[]; target: string; tokens: string[]; solution: string[] }
export type FixChallenge = Base & { kind: 'fix'; code: string[]; bugLine: number; options: string[]; answer: number; target: string[] }
export type OrderChallenge = Base & { kind: 'order'; lines: string[]; target: string }
export type PathChallenge = Base & { kind: 'path'; code: string[]; answerLine: number }

export type QuizChallenge = ChoiceChallenge | TrueFalseChallenge | BuildChallenge | FixChallenge | OrderChallenge | PathChallenge
export type Challenge = QuizChallenge | MiniChallenge

export const names = ['Ana', 'Leo', 'Bia', 'Theo', 'Maya', 'Kai', 'Lia', 'Brian', 'Nina', 'Davi', 'Iris', 'Rafa']
export const words = ['robot', 'laser', 'pizza', 'pixel', 'rocket', 'cookie', 'drone', 'magnet', 'cactus', 'banana', 'circuit', 'arduino']
export const greetings = ['Hi', 'Hello', 'Hey', 'Welcome', 'Bye', 'Good job']
export const things = [
  { name: 'coins', unit: 'coins' }, { name: 'score', unit: 'points' }, { name: 'battery', unit: '%' },
  { name: 'level', unit: '' }, { name: 'lives', unit: '' }, { name: 'speed', unit: 'km/h' }, { name: 'leds', unit: '' },
]

export function run(lines: string[]): DecisionRun {
  return runDecisionProgram(lines, [])
}

/** What the screen shows, line by line. */
export function screen(lines: string[]): string {
  const result = run(lines)
  if (result.error) throw new Error(`Generator produced broken code: ${result.error.type} ${result.error.message}\n${lines.join('\n')}`)
  return result.outputs.join('\n')
}

function q(text: string): string {
  return `"${text}"`
}

/** Shuffles the right answer in among distinct distractors. */
export function choice(rng: Rng, correct: string, distractors: string[], fallback: () => string): { options: string[]; answer: number } {
  const pool: string[] = []
  for (const item of distractors) if (item !== correct && !pool.includes(item) && item.trim() !== '') pool.push(item)
  let guard = 0
  while (pool.length < 3 && guard++ < 50) {
    const extra = fallback()
    if (extra !== correct && !pool.includes(extra)) pool.push(extra)
  }
  const options = rng.shuffle([correct, ...rng.shuffle(pool).slice(0, 3)])
  return { options, answer: options.indexOf(correct) }
}

const nearNumber = (rng: Rng, value: number) => () => String(value + rng.pick([-3, -2, -1, 1, 2, 3, 10]))

// ------------------------------------------------------------------ PRINT

function printPredict(rng: Rng, tier: Tier): ChoiceChallenge {
  if (tier === 1) {
    const a = rng.int(2, 9)
    const b = rng.int(2, 9)
    const word = rng.pick(words)
    const variant = rng.int(0, 2)
    const code = variant === 0 ? [`print(${a} + ${b})`] : variant === 1 ? [`print("${a} + ${b}")`] : [`print("${word}")`]
    const correct = screen(code)
    const distractors = variant === 2 ? [`"${word}"`, word.toUpperCase(), `print(${word})`] : [String(a + b), `${a} + ${b}`, `"${a} + ${b}"`, `${a}${b}`]
    return { kind: 'predict', concept: 'print', tier, code, prompt: 'What appears on the screen?', explain: variant === 0 ? 'Without quotes, Python calculates first, then prints the result.' : 'Inside quotes it is text: Python prints it exactly, quotes not included.', ...choice(rng, correct, distractors, nearNumber(rng, a + b)) }
  }
  // Tier 2: several prints in a row, mixing text, numbers and commas.
  const a = rng.int(2, 6)
  const b = rng.int(2, 6)
  const name = rng.pick(names)
  const greet = rng.pick(greetings)
  const code = rng.shuffle([`print("${greet}", "${name}")`, `print(${a} * ${b})`, `print("${a} * ${b}")`]).slice(0, rng.int(2, 3))
  const correct = screen(code)
  const lines = correct.split('\n')
  const wrong = [
    lines.map((line) => line === String(a * b) ? `${a} * ${b}` : line).join('\n'),
    lines.map((line) => line === `${greet} ${name}` ? `${greet}${name}` : line).join('\n'),
    [...lines].reverse().join('\n'),
    lines.join(' '),
    lines.map((line) => line === `${a} * ${b}` ? String(a * b) : line).join('\n'),
  ]
  return { kind: 'predict', concept: 'print', tier, code, prompt: 'Each print makes a new line. What is on the screen?', explain: 'Every print() starts a new line. A comma inside print() adds a space between the values.', ...choice(rng, correct, wrong, () => lines.join(', ')) }
}

function printBuild(rng: Rng): BuildChallenge {
  const greet = rng.pick(greetings)
  const name = rng.pick(names)
  const target = `${greet} ${name}`
  const tokens = rng.shuffle(['print(', ')', q(target), target, q(greet), q(name), ',', q(`${greet}${name}`)])
  return { kind: 'build', concept: 'print', tier: 1, before: [], target, tokens, solution: ['print(', q(target), ')'], prompt: `Build a line that shows: ${target}`, explain: 'Text needs quotes. print("...") shows exactly what is inside. A comma also works: it adds one space.' }
}

function printOrder(rng: Rng): OrderChallenge {
  const name = rng.pick(names)
  const word = rng.pick(words)
  const greet = rng.pick(greetings)
  const lines = [`name = "${name}"`, `print("${greet}")`, `print(name)`, `print("Do you like ${word}s?")`]
  return { kind: 'order', concept: 'print', tier: 3, lines, target: screen(lines), prompt: 'Drag the lines into order so the screen matches the target.', explain: 'Python runs from top to bottom. A variable must get its value before a line uses it.' }
}

// ------------------------------------------------------------------- TEXT

function textPredict(rng: Rng): ChoiceChallenge {
  const name = rng.pick(names)
  const greet = rng.pick(greetings)
  const variant = rng.int(0, 2)
  const code = variant === 0 ? [`name = "${name}"`, `print("${greet} " + name)`]
    : variant === 1 ? [`name = "${name}"`, `print("${greet}" + name)`]
    : [`a = "${rng.pick(['Py', 'Mak', 'Rob', 'Pix'])}"`, `b = "${rng.pick(['xie', 'er', 'ot', 'el'])}"`, 'print(b + a)']
  const correct = screen(code)
  const distractors = variant === 2
    ? [screen([code[0], code[1], 'print(a + b)']), `${code[1].slice(5, -1)} + ${code[0].slice(5, -1)}`, 'b + a', screen([code[0], code[1], 'print(a, b)'])]
    : [`${greet} ${name}`, `${greet}${name}`, `${greet} + name`, `${greet} name`, `"${greet} " + ${name}`]
  return { kind: 'predict', concept: 'text', tier: 1, code, prompt: 'The + glues texts. What appears?', explain: variant === 1 ? '+ glues texts with no space. The space must be inside the quotes.' : '+ glues the texts in the order you write them, with nothing added in between.', ...choice(rng, correct, distractors, () => `${name}${greet}`) }
}

function textBuild(rng: Rng): BuildChallenge {
  const name = rng.pick(names)
  const greet = rng.pick(greetings)
  const end = rng.pick(['!', '?', '...'])
  const before = [`name = "${name}"`]
  const target = `${greet} ${name}${end}`
  const tokens = rng.shuffle(['print(', ')', q(`${greet} `), 'name', '+', q(end), '+', q(greet), q('name'), ','])
  return { kind: 'build', concept: 'text', tier: 2, before, target, tokens, solution: ['print(', q(`${greet} `), '+', 'name', '+', q(end), ')'], prompt: `name holds "${name}". Build a print that shows: ${target}`, explain: 'Glue texts with +. The variable name has no quotes: Python looks inside the box.' }
}

function textFill(rng: Rng): ChoiceChallenge {
  const word = rng.pick(['Maker', 'Python', 'Pixel', 'Laser', 'Robot', 'Rocket'])
  const cut = rng.int(2, word.length - 2)
  const head = word.slice(0, cut)
  const tail = word.slice(cut)
  const code = [`print("${head}" + ___)`]
  const correct = q(tail)
  const options = [correct, tail, q(` ${tail}`), q(tail.toUpperCase()), q(head)]
  const distinct = options.filter((option) => option === correct || produces([`print("${head}" + ${option})`]) !== word)
  return { kind: 'fill', concept: 'text', tier: 2, code, prompt: `Fill the gap so the screen shows: ${word}`, explain: 'Text glued with + must be text too, with quotes. A space inside the quotes shows up on screen.', ...choice(rng, correct, distinct, () => q(tail + tail)) }
}

/** Output of a program, or a marker when it crashes. */
export function produces(lines: string[]): string {
  const result = run(lines)
  return result.error ? `!${result.error.type}` : result.outputs.join('\n')
}

function textFix(rng: Rng): FixChallenge {
  const name = rng.pick(names)
  const age = rng.int(9, 15)
  const variant = rng.int(0, 2)
  if (variant === 0) {
    const good = [`age = ${age}`, 'print("I am " + str(age))']
    const options = ['print("I am " + str(age))', 'print("I am " + age)', 'print("I am" + str(age))', 'print("I am " + "age")']
    return fix(rng, 'text', good, 1, 'print("I am " + age)', options, 'Python cannot glue text and a number. str() turns the number into text first.')
  }
  if (variant === 1) {
    const good = [`name = "${name}"`, 'print("Hi " + name)']
    return fix(rng, 'text', good, 0, `name = ${name}`, [`name = "${name}"`, `name = ${name}`, `"name" = ${name}`, `name == "${name}"`], 'Text values need quotes. Without them Python looks for a variable with that name.')
  }
  const good = [`a = "${name}"`, 'b = "rocks"', 'print(a + " " + b)']
  return fix(rng, 'text', good, 2, 'print(a + " " b)', ['print(a + " " + b)', 'print(a + " " b)', 'print(a " " + b)', 'print(a + b)'], 'Every piece needs a + between it and the next one.')
}

// -------------------------------------------------------------------- VAR

function varTrace(rng: Rng, tier: Tier): ChoiceChallenge {
  const thing = rng.pick(things)
  const v = thing.name
  let code: string[]
  if (tier === 1) {
    const a = rng.int(2, 9)
    const b = rng.int(10, 20)
    const add = rng.int(1, 5)
    code = rng.chance(0.5) ? [`${v} = ${a}`, `${v} = ${b}`] : [`${v} = ${a}`, `${v} = ${v} + ${add}`]
  } else {
    const a = rng.int(3, 9)
    const b = rng.int(10, 20)
    code = rng.pick([
      [`a = ${a}`, 'b = a', `a = ${b}`],
      [`${v} = ${a}`, `${v} = ${v} * 2`, `${v} = ${v} - ${rng.int(1, 4)}`],
      [`a = ${a}`, `b = ${b}`, 'a = b', `b = ${rng.int(30, 40)}`],
    ])
  }
  const focus = tier === 2 && code[0].startsWith('a = ') ? (code.length === 3 ? 'b' : 'a') : v
  const correct = screen([...code, `print(${focus})`])
  const numbers = code.flatMap((line) => line.match(/\d+/g) ?? [])
  return { kind: 'trace', concept: 'var', tier, code, focus, prompt: `What is inside ${focus} after the last line?`, explain: 'A box keeps only its newest value. b = a copies the value at that moment, not the box itself.', ...choice(rng, correct, [...numbers, String(Number(correct) + 1)], nearNumber(rng, Number(correct))) }
}

function varOrder(rng: Rng): OrderChallenge {
  const a = rng.int(2, 8)
  const lines = rng.pick([
    [`price = ${a}`, 'total = price * 3', 'print(total)'],
    [`lives = ${a}`, 'lives = lives - 1', 'print("Lives:", lives)'],
    [`name = "${rng.pick(names)}"`, 'label = "Player: " + name', 'print(label)'],
  ])
  return { kind: 'order', concept: 'var', tier: 2, lines, target: screen(lines), prompt: 'Order the lines so the program works and shows the target.', explain: 'A variable has to be created before any line reads it.' }
}

function varFix(rng: Rng): FixChallenge {
  const coins = rng.int(3, 9)
  const variant = rng.int(0, 2)
  if (variant === 0) {
    const good = [`coins = ${coins}`, 'coins = coins + 5', 'print(coins)']
    return fix(rng, 'var', good, 2, 'print(Coins)', ['print(coins)', 'print(Coins)', 'print("coins")', 'print(coin)'], 'Names must match exactly. coins and Coins are two different boxes.')
  }
  if (variant === 1) {
    const good = [`score = ${coins}`, 'bonus = 10', 'print(score + bonus)']
    return fix(rng, 'var', good, 1, 'bonus == 10', ['bonus = 10', 'bonus == 10', '10 = bonus', 'bonus: 10'], 'One = stores a value. Two == only compare.')
  }
  const good = [`x = ${coins}`, 'y = x * 2', 'print(y)']
  return fix(rng, 'var', good, 1, 'y = z * 2', ['y = x * 2', 'y = z * 2', 'y = "x" * 2', 'x * 2 = y'], 'Use the box that exists: x. Python has never heard of z.')
}

// ------------------------------------------------------------------- MATH

const opResult = (a: number, op: string, b: number) => screen([`print(${a} ${op} ${b})`])

function mathFill(rng: Rng, tier: Tier): ChoiceChallenge {
  let a = rng.int(4, 12)
  let b = rng.int(2, 4)
  while (a % b !== 0 || a / b === a - b || a * b === a + b) { a = rng.int(4, 12); b = rng.int(2, 4) }
  const ops = tier === 1 ? ['+', '-', '*', '/'] : ['+', '-', '*', '//', '%']
  const op = rng.pick(ops)
  const target = opResult(a, op, b)
  const code = [`print(${a} ___ ${b})`]
  const valid = ops.filter((item) => opResult(a, item, b) !== target)
  return { kind: 'fill', concept: 'math', tier, code, prompt: `Which operator makes the screen show ${target}?`, explain: '/ always gives a decimal like 4.0. // drops the decimals. % gives what is left over.', ...choice(rng, op, valid, () => '**') }
}

function mathPredict(rng: Rng, tier: Tier): ChoiceChallenge {
  const a = rng.int(2, 9)
  const b = rng.int(2, 6)
  const c = rng.int(2, 5)
  const expr = tier === 2
    ? rng.pick([`${a} + ${b} * ${c}`, `${a * b} // ${b}`, `${a * b + 1} % ${b}`, `${a * 2} / 2`, `(${a} + ${b}) * ${c}`])
    : rng.pick([`(${a} + ${b}) * ${c} - ${c * 2} // 2`, `${a} + ${b} * ${c} - ${a} % 2`, `${a * c} // ${c} + ${b} * 2`, `(${a} - ${b}) * (${c} + 1)`])
  const code = [`print(${expr})`]
  const correct = screen(code)
  const flat = expr.replace(/[()]/g, '')
  const leftToRight = (() => {
    const tokens = flat.split(' ')
    let value = Number(tokens[0])
    for (let i = 1; i < tokens.length; i += 2) {
      const n = Number(tokens[i + 1])
      const op = tokens[i]
      value = op === '+' ? value + n : op === '-' ? value - n : op === '*' ? value * n : op === '//' ? Math.floor(value / n) : op === '%' ? value % n : value / n
    }
    return String(value)
  })()
  const distractors = [leftToRight, produces([`print(${flat})`]), String(Number(correct) + 1), String(Number(correct) - 2)].filter((item) => !item.startsWith('!') && item !== 'NaN')
  return { kind: 'predict', concept: 'math', tier, code, prompt: 'Calculate like Python. What is printed?', explain: 'Python does ( ) first, then * / // %, then + and -. / always gives a decimal.', ...choice(rng, correct, distractors, nearNumber(rng, Number.parseFloat(correct) || 0)) }
}

function mathTrace(rng: Rng): ChoiceChallenge {
  const n = rng.int(11, 39)
  const d = rng.int(3, 7)
  const code = [`candy = ${n}`, `kids = ${d}`, 'each = candy // kids', 'left = candy % kids']
  const focus = rng.pick(['each', 'left'])
  const correct = screen([...code, `print(${focus})`])
  return { kind: 'trace', concept: 'math', tier: 2, code, focus, prompt: `${n} candies shared by ${d} kids. What is in ${focus}?`, explain: '// says how many each kid gets. % says how many are left over.', ...choice(rng, correct, [String(Math.floor(n / d)), String(n % d), String(n - d), (n / d).toFixed(1)], nearNumber(rng, Number(correct))) }
}

// ------------------------------------------------------------------ LOGIC

function compareExpression(rng: Rng, tier: Tier): { code: string[]; expression: string } {
  const a = rng.int(1, 20)
  const b = rng.pick([a, a + rng.int(1, 5), a - rng.int(1, 5)])
  const op = rng.pick(['>', '<', '>=', '<=', '==', '!='])
  if (tier === 1) {
    if (rng.chance(0.2)) {
      const word = rng.pick(['cat', 'robot', 'laser', 'yes'])
      const other = rng.pick([word, word[0].toUpperCase() + word.slice(1), `${word}s`])
      return { code: [`print("${word}" == "${other}")`], expression: `"${word}" == "${other}"` }
    }
    return { code: [`print(${a} ${op} ${b})`], expression: `${a} ${op} ${b}` }
  }
  const thing = rng.pick(things)
  return { code: [`${thing.name} = ${a}`, `print(${thing.name} ${op} ${b})`], expression: `${thing.name} ${op} ${b}` }
}

function logicTrueFalse(rng: Rng, tier: Tier): TrueFalseChallenge {
  const { code } = compareExpression(rng, tier)
  const answer = screen(code) === 'True'
  return { kind: 'truefalse', concept: 'logic', tier, code, answer, seconds: tier === 1 ? 10 : 14, prompt: 'True or False? Be fast!', explain: '>= and <= include the number itself. == compares, and capitals matter in text.' }
}

function logicPredict(rng: Rng): ChoiceChallenge {
  const a = rng.int(2, 12)
  const b = rng.int(2, 12)
  const code = [`a = ${a}`, `b = ${b}`, 'print(a > b)', `print(a + ${b - a + rng.pick([0, 0, 1])} == b)`]
  const correct = screen(code)
  const all = ['True\nTrue', 'True\nFalse', 'False\nTrue', 'False\nFalse']
  return { kind: 'predict', concept: 'logic', tier: 2, code, prompt: 'Each comparison prints True or False. What appears?', explain: 'A comparison is a question. print() shows its answer: True or False.', ...choice(rng, correct, all, () => 'True') }
}

function logicFill(rng: Rng): ChoiceChallenge {
  const ops = ['>', '<', '>=', '<=', '==', '!=']
  for (;;) {
    const a = rng.int(3, 15)
    const b = rng.pick([a, a + rng.int(1, 4), a - rng.int(1, 4)])
    const target = rng.pick(['True', 'False'])
    const good = ops.filter((op) => screen([`print(${a} ${op} ${b})`]) === target)
    const bad = ops.filter((op) => !good.includes(op))
    if (!good.length || bad.length < 3) continue
    const op = rng.pick(good)
    const code = [`x = ${a}`, `y = ${b}`, 'print(x ___ y)']
    return { kind: 'fill', concept: 'logic', tier: 3, code, prompt: `Which comparator makes it print ${target}?`, explain: 'Try the numbers in your head: x is ' + a + ' and y is ' + b + '.', ...choice(rng, op, bad, () => '=') }
  }
}

// ----------------------------------------------------------------- BRANCH

export const rules = [
  { v: 'temp', limit: 30, op: '>', yes: 'Fan ON', no: 'Fan OFF' },
  { v: 'age', limit: 13, op: '>=', yes: 'Welcome in', no: 'Too young' },
  { v: 'coins', limit: 5, op: '>=', yes: 'Snack!', no: 'Need coins' },
  { v: 'battery', limit: 20, op: '<', yes: 'Charge me', no: 'Battery OK' },
  { v: 'score', limit: 50, op: '>=', yes: 'You win!', no: 'Retry' },
  { v: 'light', limit: 30, op: '<', yes: 'Lamp ON', no: 'Lamp OFF' },
]

function decision(rng: Rng, edge: boolean): string[] {
  const rule = rng.pick(rules)
  const value = edge ? rule.limit + rng.pick([-1, 0, 0, 1]) : rule.limit + rng.pick([-12, -7, 6, 11])
  return [`${rule.v} = ${value}`, `if ${rule.v} ${rule.op} ${rule.limit}:`, `    print("${rule.yes}")`, 'else:', `    print("${rule.no}")`]
}

function nested(rng: Rng): string[] {
  const speed = rng.pick([12, 19, 20, 35, 50, 51, 70])
  return [`speed = ${speed}`, 'if speed > 50:', '    print("Too fast!")', 'else:', '    if speed < 20:', '        print("Too slow")', '    else:', '        print("Good speed")']
}

function printedLine(code: string[]): number {
  const result = run(code)
  const event = result.events.find((item) => item.kind === 'print')
  if (!event) throw new Error('decision printed nothing')
  return event.line
}

function branchPath(rng: Rng, tier: Tier): PathChallenge {
  const code = tier === 1 ? decision(rng, false) : nested(rng)
  return { kind: 'path', concept: 'branch', tier, code, answerLine: printedLine(code), prompt: 'Tap the print that runs.', explain: tier === 1 ? 'if runs its block when the condition is True. Otherwise else runs.' : 'The inner if is only asked when the first condition is False.' }
}

function branchPredict(rng: Rng): ChoiceChallenge {
  const code = decision(rng, true)
  const correct = screen(code)
  const yes = code[2].trim().slice(7, -2)
  const no = code[4].trim().slice(7, -2)
  return { kind: 'predict', concept: 'branch', tier: 2, code, prompt: 'Right at the limit! What is printed?', explain: '> leaves the limit out. >= includes it. Check the exact number.', ...choice(rng, correct, [yes, no, `${yes}\n${no}`, '(nothing)'], () => '(nothing)') }
}

function branchFix(rng: Rng): FixChallenge {
  const rule = rng.pick(rules)
  const value = rule.limit + rng.pick([-5, 5])
  const good = [`${rule.v} = ${value}`, `if ${rule.v} ${rule.op} ${rule.limit}:`, `    print("${rule.yes}")`, 'else:', `    print("${rule.no}")`]
  const variant = rng.int(0, 2)
  if (variant === 0) return fix(rng, 'branch', good, 1, `if ${rule.v} ${rule.op} ${rule.limit}`, [good[1], `if ${rule.v} ${rule.op} ${rule.limit}`, `if ${rule.v} ${rule.op} ${rule.limit};`, `if (${rule.v} ${rule.op} ${rule.limit})`], 'Every if line ends with a colon :')
  if (variant === 1) return fix(rng, 'branch', good, 3, `else ${rule.v} ${rule.op} ${rule.limit}:`, ['else:', `else ${rule.v} ${rule.op} ${rule.limit}:`, 'else', 'otherwise:'], 'else never has a condition. It catches everything the if rejected.')
  return fix(rng, 'branch', good, 1, `if ${rule.v} = ${rule.limit}:`, [good[1], `if ${rule.v} = ${rule.limit}:`, `if ${rule.v} => ${rule.limit}:`, `if ${rule.v} === ${rule.limit}:`], 'A condition compares. = stores, == and the other comparators ask.')
}

// ------------------------------------------------------------------- FIX

/** Builds a fix challenge: the program with one broken line, plus candidate replacement lines. */
function fix(rng: Rng, concept: Concept, good: string[], bugLine: number, broken: string, candidates: string[], explain: string): FixChallenge {
  const code = good.map((line, index) => index === bugLine ? leadingSpaces(good[bugLine]) + broken.trim() : line)
  const target = run(good).outputs
  const correct = good[bugLine].trim()
  const wrong = candidates.map((item) => item.trim()).filter((item) => item !== correct && produces(withLine(good, bugLine, item)) !== target.join('\n'))
  const options = rng.shuffle([correct, ...wrong.slice(0, 3)])
  return { kind: 'fix', concept, tier: 3, code, bugLine, options, answer: options.indexOf(correct), target, prompt: 'Tap the broken line, then choose the fix.', explain }
}

function leadingSpaces(line: string): string {
  return line.match(/^ */)?.[0] ?? ''
}

export function withLine(lines: string[], index: number, replacement: string): string[] {
  return lines.map((line, i) => i === index ? leadingSpaces(line) + replacement.trim() : line)
}

// ------------------------------------------------------------------ BUILD

/** Glues tray pieces into a line of Python: print( "Hi" ) becomes print("Hi"). */
export function joinTokens(tokens: string[]): string {
  return tokens.reduce((line, token, index) => {
    if (index === 0) return token
    const previous = tokens[index - 1]
    const tight = previous.endsWith('(') || token === ')' || token === ','
    return `${line}${tight ? '' : ' '}${token}`
  }, '')
}

export function buildWorks(challenge: BuildChallenge, tokens: string[]): boolean {
  if (!tokens.length) return false
  const result = run([...challenge.before, joinTokens(tokens)])
  return !result.error && result.outputs.join('\n') === challenge.target
}

export function orderWorks(challenge: OrderChallenge, lines: string[]): boolean {
  const result = run(lines)
  return !result.error && result.outputs.join('\n') === challenge.target.trim()
}

// --------------------------------------------------------------- REGISTRY

export function createChallenge(concept: Concept, kind: ChallengeKind, tier: Tier, rng: Rng): Challenge {
  switch (`${concept}:${kind}`) {
    case 'print:predict': return printPredict(rng, tier >= 2 ? 2 : 1)
    case 'print:build': return printBuild(rng)
    case 'print:order': return printOrder(rng)
    case 'text:predict': return textPredict(rng)
    case 'text:build': return textBuild(rng)
    case 'text:fill': return textFill(rng)
    case 'text:fix': return textFix(rng)
    case 'var:trace': return varTrace(rng, tier >= 2 ? 2 : 1)
    case 'var:order': return varOrder(rng)
    case 'var:fix': return varFix(rng)
    case 'math:fill': return mathFill(rng, tier)
    case 'math:predict': return mathPredict(rng, tier >= 3 ? 3 : 2)
    case 'math:trace': return mathTrace(rng)
    case 'logic:truefalse': return logicTrueFalse(rng, tier >= 2 ? 2 : 1)
    case 'logic:predict': return logicPredict(rng)
    case 'logic:fill': return logicFill(rng)
    case 'branch:path': return branchPath(rng, tier >= 3 ? 3 : 1)
    case 'branch:predict': return branchPredict(rng)
    case 'branch:fix': return branchFix(rng)
    case `${concept}:catch`: case `${concept}:jump`: case `${concept}:flappy`: case `${concept}:sling`: case `${concept}:match`: case `${concept}:blocks`:
      return createMini(concept, kind as MiniChallenge['kind'], tier, rng)
    default: throw new Error(`No challenge for ${concept}:${kind}`)
  }
}

/** A question with options for a concept, the raw material of several mini-games. */
export function choiceFor(concept: Concept, tier: Tier, rng: Rng): ChoiceChallenge {
  switch (concept) {
    case 'print': return printPredict(rng, tier >= 2 ? 2 : 1)
    case 'text': return textPredict(rng)
    case 'var': return varTrace(rng, tier >= 2 ? 2 : 1)
    case 'math': return rng.chance(0.5) ? mathPredict(rng, tier >= 3 ? 3 : 2) : mathTrace(rng)
    case 'logic': return logicPredict(rng)
    case 'branch': return branchPredict(rng)
  }
}

/**
 * The quick dodge when a wild pyxie attacks: one tap, True or False.
 * Shows a short program of the attacker's concept and claims an output.
 */
export function createDodge(concept: Concept, rng: Rng): TrueFalseChallenge {
  if (concept === 'logic') return { ...logicTrueFalse(rng, 1), prompt: 'DODGE! True or False?', seconds: 8 }
  const source: ChoiceChallenge = concept === 'print' ? printPredict(rng, 1)
    : concept === 'text' ? textPredict(rng)
    : concept === 'var' ? varTrace(rng, 1)
    : concept === 'math' ? mathPredict(rng, 2)
    : branchPredict(rng)
  const truthful = rng.chance(0.5)
  const shown = truthful ? source.options[source.answer] : source.options[(source.answer + 1 + rng.int(0, source.options.length - 2)) % source.options.length]
  const code = source.focus ? [...source.code, `print(${source.focus})`] : source.code
  return { kind: 'truefalse', concept, tier: 1, code, claim: shown, answer: truthful, seconds: 8, prompt: 'DODGE! Is this really the output?', explain: source.explain }
}
