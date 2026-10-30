// The Trainer XP each Lab Master asks for. Tuned with the long-run simulation in progression.test.ts
// so a class that answers most challenges right reaches the end in about three hours.
export const labGates = {
  echo: 120,
  box: 560,
  quote: 1500,
  sum: 3100,
  truth: 5300,
  fork: 8000,
} as const

export interface BadgeInfo { id: string; name: string; lab: string; master: string; concept: string; color: string; shape: string }

export const badges: BadgeInfo[] = [
  { id: 'echo', name: 'Echo Badge', lab: 'Echo Harbor Lab', master: 'Marina Echo', concept: 'print', color: '#ffd23f', shape: 'star' },
  { id: 'box', name: 'Box Badge', lab: 'Boxford Lab', master: 'Otto Box', concept: 'var', color: '#4fa3ff', shape: 'square' },
  { id: 'quote', name: 'Quote Badge', lab: 'Stringhaven Lab', master: 'Lia Quote', concept: 'text', color: '#ff6fae', shape: 'quote' },
  { id: 'sum', name: 'Sum Badge', lab: 'Abacus City Lab', master: 'Rafa Sum', concept: 'math', color: '#ff8b3d', shape: 'plus' },
  { id: 'truth', name: 'Truth Badge', lab: 'Veritas Peak Lab', master: 'Bruna Bool', concept: 'logic', color: '#5fd17a', shape: 'half' },
  { id: 'fork', name: 'Fork Badge', lab: 'Branchwood Lab', master: 'Igor Fork', concept: 'branch', color: '#a57bff', shape: 'fork' },
]
