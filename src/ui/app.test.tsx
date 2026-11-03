import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { useRef, useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BattleScreen } from '../battle/BattleScreen'
import { createPyxie } from '../battle/engine'
import type { BattleOutcome } from '../battle/types'
import { addPyxie, newSave } from '../game/state'
import { createRng } from '../lib/rng'
import type { SaveState } from '../types'

vi.mock('../save/cloud', async (original) => {
  const real = await original<typeof import('../save/cloud')>()
  return { ...real, loadCloud: async () => null, saveCloud: (save: SaveState) => real.saveLocal(save), flushCloud: async () => undefined, hallOfFame: async () => [] }
})

const { default: App } = await import('../App')

function testSave(): SaveState {
  const rng = createRng(5)
  let save = newSave('guest', 'Test Player', { hair: 1, skin: 1, outfit: 2, style: 'cap' })
  save = addPyxie(save, { ...createPyxie('sparkit', 12, rng), shiny: false }).save
  return { ...save, map: 'vila', x: 12, y: 7, flags: ['intro_done', 'got_starter', 'starter:sparkit'], bag: { patch: 2, bytecube: 3 } }
}

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('Pyxies screens', () => {
  it('opens on the title, then asks for the classroom login', async () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Pyxies' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('▶ PRESS START'))
    expect(await screen.findByLabelText('Your first name + last name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ENTER THE VALLEY' })).toBeDisabled()
  })

  it('continues a saved adventure into the valley, with the HUD and the menu', async () => {
    localStorage.setItem('pyxies.session', JSON.stringify({ username: 'guest', displayName: 'Test Player', isTeacher: false }))
    localStorage.setItem('pyxies.save.guest', JSON.stringify(testSave()))
    render(<App />)
    fireEvent.click(screen.getByText('▶ PRESS START'))
    fireEvent.click(await screen.findByText('CONTINUE ▶'))
    expect(await screen.findByLabelText('The Castanho Valley')).toBeInTheDocument()
    expect(screen.getByText('Vila Maker')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'MENU' }))
    expect(screen.getByText('LEAD')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'CODEX' }))
    expect(screen.getByText(/Caught 1 · Total 23/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'TRAINER' }))
    expect(screen.getByText(/Next: Marina Echo at Echo Harbor Arena needs 120 XP/)).toBeInTheDocument()
  })
})

function BattleHarness({ onEnd }: { onEnd: (outcome: BattleOutcome) => void }) {
  const saveRef = useRef(testSave())
  const [, setSave] = useState(saveRef.current)
  const enemy = useRef({ ...createPyxie('echobat', 3, createRng(9)), shiny: false })
  return <BattleScreen spec={{ kind: 'wild', enemy: enemy.current, canRun: true, canCatch: true, bg: 'route' }}
    get={() => saveRef.current} set={(update) => { saveRef.current = update(saveRef.current); setSave(saveRef.current) }} onEnd={onEnd} />
}

describe('a battle through the screen', () => {
  it('plays turns with challenges and dodges until the battle ends', async () => {
    const onEnd = vi.fn()
    render(<BattleHarness onEnd={onEnd} />)
    // Click whatever the battle asks for, answering every challenge with its first option.
    // Battles are random and the first option is often wrong, so allow plenty of turns.
    for (let i = 0; i < 450 && !onEnd.mock.calls.length; i += 1) {
      await act(async () => { await new Promise((r) => setTimeout(r, 60)) })
      const message = document.querySelector('.battle__msg')
      if (message) { fireEvent.click(message); continue }
      const move = document.querySelector('.move')
      if (move) { fireEvent.click(move); continue }
      const result = screen.queryByRole('button', { name: 'CONTINUE ▶' })
      if (result) { fireEvent.click(result); continue }
      const answer = document.querySelector('.cv-option, .cv-tf__btn, .token, .cv-code__line.is-tappable')
      if (answer) {
        fireEvent.click(answer)
        const run = within(document.body).queryByRole('button', { name: '▶ RUN' })
        if (run && !(run as HTMLButtonElement).disabled) fireEvent.click(run)
        continue
      }
    }
    expect(onEnd).toHaveBeenCalled()
    expect(['win', 'lose']).toContain(onEnd.mock.calls[0][0])
  }, 60_000)
})
