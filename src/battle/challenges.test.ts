import { describe, expect, it } from 'vitest'
import { moves } from '../data/moves'
import { createRng } from '../lib/rng'
import { conceptOrder } from '../data/concepts'
import { buildWorks, createChallenge, createDodge, orderWorks, produces, run, screen, withLine } from './challenges'
import { runBlocks, toQuiz } from './minigames'

const SEEDS = 250

describe('challenge generators', () => {
  for (const move of moves) {
    it(`${move.name} (${move.concept} ${move.kind} tier ${move.tier}) always has exactly one right answer`, () => {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const challenge = createChallenge(move.concept, move.kind, move.tier, createRng(seed * 7919 + move.id.length))
        const where = `${move.id} seed ${seed}`
        switch (challenge.kind) {
          case 'predict':
          case 'trace':
          case 'fill': {
            expect(challenge.options.length, where).toBeGreaterThanOrEqual(3)
            expect(new Set(challenge.options).size, where).toBe(challenge.options.length)
            expect(challenge.answer, where).toBeGreaterThanOrEqual(0)
            const right = challenge.options[challenge.answer]
            if (challenge.kind === 'predict') expect(screen(challenge.code), where).toBe(right)
            if (challenge.kind === 'trace') expect(screen([...challenge.code, `print(${challenge.focus})`]), where).toBe(right)
            if (challenge.kind === 'fill') {
              const fill = (option: string) => produces(challenge.code.map((line) => line.replace('___', option)))
              const target = fill(right)
              expect(target.startsWith('!'), `${where}: ${target}`).toBe(false)
              for (const option of challenge.options) if (option !== right) expect(fill(option), `${where} ${option}`).not.toBe(target)
            }
            break
          }
          case 'truefalse':
            expect(screen(challenge.code) === 'True', where).toBe(challenge.answer)
            break
          case 'build':
            expect(buildWorks(challenge, challenge.solution), `${where}: ${challenge.solution.join(' ')}`).toBe(true)
            for (const token of challenge.solution) expect(challenge.tokens, where).toContain(token)
            break
          case 'fix': {
            expect(run(challenge.code).outputs.join('\n') === challenge.target.join('\n') && !run(challenge.code).error, `${where} broken code already works`).toBe(false)
            const fixed = withLine(challenge.code, challenge.bugLine, challenge.options[challenge.answer])
            expect(produces(fixed), where).toBe(challenge.target.join('\n'))
            challenge.options.forEach((option, index) => {
              if (index !== challenge.answer) expect(produces(withLine(challenge.code, challenge.bugLine, option)), `${where} ${option}`).not.toBe(challenge.target.join('\n'))
            })
            expect(new Set(challenge.options).size, where).toBe(challenge.options.length)
            expect(challenge.options.length, where).toBeGreaterThanOrEqual(3)
            break
          }
          case 'order':
            expect(orderWorks(challenge, challenge.lines), where).toBe(true)
            break
          case 'catch':
          case 'sling':
            expect(new Set(challenge.options).size, where).toBe(challenge.options.length)
            expect(challenge.options.length, where).toBeGreaterThanOrEqual(3)
            expect(screen(challenge.code), where).toBe(challenge.options[challenge.answer])
            break
          case 'flappy':
            expect(challenge.gates.length, where).toBe(challenge.code.length)
            for (const gate of challenge.gates) {
              expect(new Set(gate.options).size, where).toBe(gate.options.length)
              expect(screen([...challenge.code.slice(0, gate.line + 1), `print(${challenge.focus})`]), where).toBe(gate.options[gate.answer])
            }
            break
          case 'jump':
            expect(challenge.rows.length, where).toBe(7)
            for (const row of challenge.rows) {
              expect(row.filter((p) => p.value).length, where).toBe(1)
              for (const p of row) expect(screen([...challenge.setup, `print(${p.expr})`]) === 'True', `${where} ${p.expr}`).toBe(p.value)
            }
            break
          case 'match': {
            const groups = new Map<string, number>()
            for (const tile of challenge.pool) {
              expect(screen([...challenge.setup, `print(${tile.expr})`]), `${where} ${tile.expr}`).toBe(tile.value)
              groups.set(tile.value, (groups.get(tile.value) ?? 0) + 1)
            }
            expect(groups.size, where).toBe(4)
            for (const count of groups.values()) expect(count, where).toBeGreaterThanOrEqual(3)
            break
          }
          case 'blocks':
            expect(runBlocks(challenge, challenge.solution).every((r) => r.pass), `${where}: ${challenge.solution.join(' | ')}`).toBe(true)
            for (const piece of challenge.solution) expect(challenge.pieces, where).toContain(piece)
            expect(challenge.slots.filter((slot) => !slot.fixed).length, where).toBe(challenge.solution.length)
            break
          case 'path': {
            const result = run(challenge.code)
            expect(result.events.some((event) => event.kind === 'print' && event.line === challenge.answerLine), where).toBe(true)
            expect(challenge.code[challenge.answerLine].trim().startsWith('print('), where).toBe(true)
            break
          }
        }
        if (['catch', 'sling', 'flappy', 'jump', 'match', 'blocks'].includes(challenge.kind)) {
          const quiz = toQuiz(challenge as Parameters<typeof toQuiz>[0], createRng(seed))
          expect(quiz.options.length, `${where} quiz`).toBeGreaterThanOrEqual(2)
          expect(new Set(quiz.options).size, `${where} quiz`).toBe(quiz.options.length)
          expect(quiz.answer, `${where} quiz`).toBeGreaterThanOrEqual(0)
          if (challenge.kind === 'catch' || challenge.kind === 'sling') expect(screen(quiz.code), where).toBe(quiz.options[quiz.answer])
          if (challenge.kind === 'flappy') expect(screen([...quiz.code, `print(${quiz.focus})`]), where).toBe(quiz.options[quiz.answer])
        }
      }
    })
  }

  it('makes honest dodges for every concept', () => {
    for (const concept of conceptOrder) {
      for (let seed = 1; seed <= SEEDS; seed += 1) {
        const dodge = createDodge(concept, createRng(seed))
        const shown = screen(dodge.code)
        if (dodge.claim === undefined) expect(shown === 'True').toBe(dodge.answer)
        else expect(shown === dodge.claim, `${concept} seed ${seed}: ${dodge.code.join(' | ')} claims ${dodge.claim}`).toBe(dodge.answer)
      }
    }
  })
})
