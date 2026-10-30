import { useEffect, useRef, useState } from 'react'
import { audio } from '../engine/audio'

const speeds = { slow: 38, normal: 20, fast: 7 }

/** The dialog box: types each line out, then waits for A, Enter, Space or a tap. */
export function DialogBox({ lines, speaker, speed = 'normal', onDone }: { lines: string[]; speaker?: string; speed?: keyof typeof speeds; onDone: () => void }) {
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  const line = lines[index] ?? ''
  const full = shown >= line.length
  const doneRef = useRef(onDone)
  useEffect(() => { doneRef.current = onDone }, [onDone])

  useEffect(() => {
    if (full) return
    const id = window.setTimeout(() => {
      setShown((value) => Math.min(line.length, value + (speed === 'fast' ? 3 : 1)))
      if (shown % 3 === 0) audio.sfx('type')
    }, speeds[speed])
    return () => window.clearTimeout(id)
  }, [shown, full, line, speed])

  const advance = () => {
    if (!full) { setShown(line.length); return }
    audio.sfx('blip')
    if (index < lines.length - 1) { setIndex(index + 1); setShown(0) } else doneRef.current()
  }
  const advanceRef = useRef(advance)
  useEffect(() => { advanceRef.current = advance })

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (['Enter', ' ', 'z', 'Z', 'x', 'X', 'Escape'].includes(event.key)) { event.preventDefault(); advanceRef.current() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return <div className="dialog" role="dialog" aria-live="polite" onClick={advance}>
    {speaker && <span className="dialog__speaker">{speaker}</span>}
    <p>{line.slice(0, shown)}<span className="dialog__ghost">{line.slice(shown)}</span></p>
    {full && <span className="dialog__next" aria-hidden="true">▼</span>}
  </div>
}

export function ChoiceBox({ prompt, options, speaker, onPick }: { prompt: string; options: string[]; speaker?: string; onPick: (index: number) => void }) {
  const [focus, setFocus] = useState(0)
  const pickRef = useRef(onPick)
  const focusRef = useRef(0)
  useEffect(() => { pickRef.current = onPick }, [onPick])
  useEffect(() => { focusRef.current = focus }, [focus])
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 's') { setFocus((value) => (value + 1) % options.length); audio.sfx('blip') }
      if (event.key === 'ArrowUp' || event.key === 'w') { setFocus((value) => (value - 1 + options.length) % options.length); audio.sfx('blip') }
      if (event.key === 'Enter' || event.key === ' ' || event.key === 'z') { event.preventDefault(); audio.sfx('select'); pickRef.current(focusRef.current) }
      if (event.key === 'Escape' || event.key === 'x') { audio.sfx('back'); pickRef.current(options.length - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [options.length])
  return <div className="dialog dialog--choice" role="dialog">
    {speaker && <span className="dialog__speaker">{speaker}</span>}
    <p>{prompt}</p>
    <div className="choice-list" role="listbox">
      {options.map((option, index) => <button key={option} role="option" aria-selected={focus === index} className={focus === index ? 'is-focus' : ''} onMouseEnter={() => setFocus(index)} onClick={() => { audio.sfx('select'); onPick(index) }}>{option}</button>)}
    </div>
  </div>
}
