import type { Concept } from '../types'

export interface ConceptInfo {
  id: Concept
  label: string
  glyph: string
  color: string
  dark: string
  /** What the concept is, in one line a student can read mid-battle. */
  meaning: string
}

export const concepts: Record<Concept, ConceptInfo> = {
  print: { id: 'print', label: 'PRINT', glyph: '✦', color: '#ffd23f', dark: '#9c7a00', meaning: 'print() shows a value on the screen.' },
  var: { id: 'var', label: 'VAR', glyph: '▣', color: '#4fa3ff', dark: '#1d4f94', meaning: 'A variable is a named box that keeps a value.' },
  text: { id: 'text', label: 'TEXT', glyph: '❝', color: '#ff6fae', dark: '#a12b63', meaning: 'Text lives inside quotes, and + glues texts together.' },
  math: { id: 'math', label: 'MATH', glyph: '✚', color: '#ff8b3d', dark: '#a8460b', meaning: 'Python calculates with + - * and /.' },
  logic: { id: 'logic', label: 'LOGIC', glyph: '◑', color: '#5fd17a', dark: '#22753a', meaning: 'Comparisons like > == != answer True or False.' },
  branch: { id: 'branch', label: 'BRANCH', glyph: '⑂', color: '#a57bff', dark: '#5a34b8', meaning: 'if/else picks one path, depending on a condition.' },
}

export const conceptOrder: Concept[] = ['print', 'text', 'var', 'math', 'logic', 'branch']

/**
 * The type ring: each concept beats the next one around the ring.
 * print → text → var → math → logic → branch → print
 */
export function effectiveness(attack: Concept, defend: Concept): number {
  const a = conceptOrder.indexOf(attack)
  const d = conceptOrder.indexOf(defend)
  if ((a + 1) % conceptOrder.length === d) return 1.5
  if ((d + 1) % conceptOrder.length === a) return 0.7
  return 1
}

export function effectivenessText(multiplier: number): string | null {
  if (multiplier > 1) return 'Super effective!'
  if (multiplier < 1) return 'Not very effective…'
  return null
}
