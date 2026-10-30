import type { ChallengeKind, Concept, Tier } from '../types'

export interface Move {
  id: string
  name: string
  concept: Concept
  /** The mini-game the student plays to land the move. */
  kind: ChallengeKind
  tier: Tier
  power: number
  text: string
}

const m = (id: string, name: string, concept: Concept, kind: ChallengeKind, tier: Tier, power: number, text: string): Move => ({ id, name, concept, kind, tier, power, text })

export const moves: Move[] = [
  m('echo', 'Echo', 'print', 'predict', 1, 35, 'Read a print and say what appears on screen.'),
  m('spark', 'Spark Print', 'print', 'build', 1, 40, 'Build a print line from pieces.'),
  m('shout', 'Shout', 'print', 'predict', 2, 55, 'Several prints in a row. Predict every line.'),
  m('lumen-beam', 'Lumen Beam', 'print', 'order', 3, 80, 'Put the lines in order so the screen shows the target.'),

  m('quote-jab', 'Quote Jab', 'text', 'predict', 1, 35, 'Glue texts with + and predict the result.'),
  m('string-whip', 'String Whip', 'text', 'build', 2, 55, 'Build a print that glues texts into the target.'),
  m('glue-gun', 'Hot Glue Gun', 'text', 'fill', 2, 55, 'Fill the gap so the texts stick together right.'),
  m('concat-storm', 'Concat Storm', 'text', 'fix', 3, 80, 'Find and fix the line that breaks the text.'),

  m('box-bash', 'Box Bash', 'var', 'trace', 1, 35, 'Follow the box: what is inside at the end?'),
  m('swap-slam', 'Swap Slam', 'var', 'trace', 2, 55, 'Values change. Track the box to the last line.'),
  m('memory-lock', 'Memory Lock', 'var', 'order', 2, 55, 'Order the lines so every box is ready in time.'),
  m('vault-crush', 'Vault Crush', 'var', 'fix', 3, 80, 'A box is used wrong. Find it and fix it.'),

  m('plus-punch', 'Plus Punch', 'math', 'fill', 1, 35, 'Choose the operator that makes the math true.'),
  m('times-tackle', 'Times Tackle', 'math', 'predict', 2, 55, 'Predict a calculation, step by step.'),
  m('mod-drill', 'Mod Drill', 'math', 'trace', 2, 55, 'Remainders and whole division: trace the value.'),
  m('calc-flare', 'Calc Flare', 'math', 'predict', 3, 80, 'Order of operations, all in one line.'),

  m('truth-ping', 'Truth Ping', 'logic', 'truefalse', 1, 35, 'True or False? Answer fast.'),
  m('compare-claw', 'Compare Claw', 'logic', 'truefalse', 2, 55, 'Compare variables: True or False?'),
  m('bool-beam', 'Bool Beam', 'logic', 'predict', 2, 55, 'Print a comparison and predict the answer.'),
  m('verdict', 'Verdict', 'logic', 'fill', 3, 80, 'Choose the comparator that gives the target answer.'),

  m('fork-kick', 'Fork Kick', 'branch', 'path', 1, 35, 'Which print runs? Tap the path.'),
  m('else-edge', 'Else Edge', 'branch', 'predict', 2, 55, 'An if/else at the limit. Predict the output.'),
  m('split-path', 'Split Path', 'branch', 'path', 3, 70, 'An if inside else. Tap the line that runs.'),
  m('nested-nova', 'Nested Nova', 'branch', 'fix', 3, 80, 'A decision is broken. Find it and fix it.'),
]

export const moveById: Record<string, Move> = Object.fromEntries(moves.map((move) => [move.id, move]))

export function getMove(id: string): Move {
  const move = moveById[id]
  if (!move) throw new Error(`Unknown move ${id}`)
  return move
}
