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
  m('echo', 'Echo', 'print', 'catch', 1, 35, 'Outputs rain from the sky. Catch the one the print shows.'),
  m('spark', 'Spark Print', 'print', 'build', 1, 40, 'Build a print line from pieces.'),
  m('shout', 'Shout', 'print', 'sling', 2, 55, 'Launch at the tower that shows what the prints really print.'),
  m('lumen-beam', 'Lumen Beam', 'print', 'blocks', 3, 80, 'Snap code blocks into place so the screen shows the target.'),

  m('quote-jab', 'Quote Jab', 'text', 'predict', 1, 35, 'Glue texts with + and predict the result.'),
  m('string-whip', 'String Whip', 'text', 'build', 2, 55, 'Build a print that glues texts into the target.'),
  m('glue-gun', 'Hot Glue Gun', 'text', 'match', 2, 55, 'Crush rows of glued texts that spell the same word.'),
  m('concat-storm', 'Concat Storm', 'text', 'fix', 3, 80, 'Find and fix the line that breaks the text.'),

  m('box-bash', 'Box Bash', 'var', 'flappy', 1, 35, 'Fly through each line of code, picking the new value of the box.'),
  m('swap-slam', 'Swap Slam', 'var', 'trace', 2, 55, 'Values change. Track the box to the last line.'),
  m('memory-lock', 'Memory Lock', 'var', 'blocks', 2, 55, 'Build the program block by block, every box ready in time.'),
  m('vault-crush', 'Vault Crush', 'var', 'fix', 3, 80, 'A box is used wrong. Find it and fix it.'),

  m('plus-punch', 'Plus Punch', 'math', 'fill', 1, 35, 'Choose the operator that makes the math true.'),
  m('times-tackle', 'Times Tackle', 'math', 'match', 2, 55, 'Line up three calculations with the same result.'),
  m('mod-drill', 'Mod Drill', 'math', 'catch', 2, 55, 'Remainders and whole division: catch the right result.'),
  m('calc-flare', 'Calc Flare', 'math', 'predict', 3, 80, 'Order of operations, all in one line.'),

  m('truth-ping', 'Truth Ping', 'logic', 'truefalse', 1, 35, 'True or False? Answer fast.'),
  m('compare-claw', 'Compare Claw', 'logic', 'jump', 2, 55, 'Bounce up on the comparisons that are True.'),
  m('bool-beam', 'Bool Beam', 'logic', 'predict', 2, 55, 'Print a comparison and predict the answer.'),
  m('verdict', 'Verdict', 'logic', 'fill', 3, 80, 'Choose the comparator that gives the target answer.'),

  m('fork-kick', 'Fork Kick', 'branch', 'path', 1, 35, 'Which print runs? Tap the path.'),
  m('else-edge', 'Else Edge', 'branch', 'sling', 2, 55, 'An if/else at the limit. Launch at the output it prints.'),
  m('split-path', 'Split Path', 'branch', 'jump', 3, 70, 'Climb on the conditions an if would accept.'),
  m('nested-nova', 'Nested Nova', 'branch', 'blocks', 3, 80, 'Build an if/else that passes both tests.'),
]

export const moveById: Record<string, Move> = Object.fromEntries(moves.map((move) => [move.id, move]))

export function getMove(id: string): Move {
  const move = moveById[id]
  if (!move) throw new Error(`Unknown move ${id}`)
  return move
}
