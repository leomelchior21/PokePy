import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { PythonCode } from '../components/PythonCode'
import { items } from '../data/items'
import type { Recipe } from '../data/recipes'
import { audio } from '../engine/audio'
import { ItemIcon } from './Sprite'

interface Step {
  code: string[]
  question: string
  options: string[]
  answer: number
  explain: string
  /** After a right answer: false means the program stops here, because something is missing. */
  enough: boolean
}

const shuffle = <T,>(list: T[], seed: number): T[] => list.map((item, i) => ({ item, k: Math.sin(seed * 31 + i * 17) })).sort((a, b) => a.k - b.k).map(({ item }) => item)

/** The questions for one build, worked out from what is in the bag right now. */
function stepsFor(recipe: Recipe, bag: Record<string, number>): Step[] {
  const [[first, need1], [second, need2]] = recipe.needs
  const have1 = bag[first] ?? 0
  const have2 = bag[second] ?? 0
  const steps: Step[] = []
  steps.push({
    code: [`${first} = ${have1}`, `print(${first} >= ${need1})`],
    question: 'Is there enough? What does this print?',
    options: ['True', 'False'],
    answer: have1 >= need1 ? 0 : 1,
    explain: `${first} is ${have1}. ${have1} >= ${need1} is ${have1 >= need1 ? 'True' : 'False'}: >= means "at least".`,
    enough: have1 >= need1,
  })
  const conditions = shuffle([`${second} >= ${need2}`, `${second} < ${need2}`, `${second} == 0`], have1 + have2)
  steps.push({
    code: [`${second} = ${have2}`, 'if ___:', `    print("Enough ${second}!")`],
    question: `Which condition means "at least ${need2} ${second}"?`,
    options: conditions,
    answer: conditions.indexOf(`${second} >= ${need2}`),
    explain: `>= means "at least": ${second} >= ${need2}. With ${have2} ${second}, that is ${have2 >= need2 ? 'True' : 'False'}.`,
    enough: have2 >= need2,
  })
  const left = have1 - need1
  const numbers = [...new Set([left, have1, have1 + need1, need1].map(String))]
  const options = shuffle(numbers, have1 * 7 + have2)
  steps.push({
    code: [`${first} = ${have1}`, `${second} = ${have2}`, `${first} = ${first} - ${need1}`, `${second} = ${second} - ${need2}`, `print(${first})`],
    question: `Building uses the materials. How much ${first} is left?`,
    options,
    answer: options.indexOf(String(left)),
    explain: `${first} - ${need1} takes ${need1} away: ${have1} - ${need1} is ${left}.`,
    enough: true,
  })
  if (recipe.finale) {
    const finale = recipe.finale
    const choices = shuffle(finale.options, have1 + 3)
    steps.push({ code: finale.code, question: finale.question, options: choices, answer: choices.indexOf(finale.answer), explain: finale.explain, enough: true })
  }
  return steps
}

/**
 * The Maker Bench: the bag becomes Python variables, and the player reads the code that checks the
 * materials and pays for the build. A wrong answer explains itself and can be tried again.
 */
export function CraftBench({ recipe, bag, onDone }: { recipe: Recipe; bag: Record<string, number>; onDone: (built: boolean) => void }) {
  const steps = useMemo(() => stepsFor(recipe, bag), [recipe, bag])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [missing, setMissing] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const step = steps[index]
  useEffect(() => { audio.sfx('select') }, [])

  const choose = (option: number) => {
    if (picked === step.answer) return
    setPicked(option)
    if (option !== step.answer) { audio.sfx('wrong'); return }
    audio.sfx('right')
    window.setTimeout(() => {
      if (!step.enough) {
        const [item, need] = recipe.needs[index]
        setMissing(`${item} >= ${need} is False, so the build stops here. You have ${bag[item] ?? 0} ${item} and need ${need}. ${recipe.where[item]}`)
        return
      }
      if (index + 1 < steps.length) { setIndex(index + 1); setPicked(null) } else setReady(true)
    }, 900)
  }

  return createPortal(<div className="bench" role="dialog" aria-label={`Maker Bench: ${recipe.name}`}>
    <div className="bench__card">
      <header className="bench__head">
        <span className="showcase__tag">MAKER BENCH</span>
        <h2>{recipe.name}</h2>
        <p>{recipe.text}</p>
      </header>
      <ul className="bench__needs">
        {recipe.needs.map(([item, need]) => {
          const have = bag[item] ?? 0
          return <li key={item} className={have >= need ? 'is-ok' : ''}>
            <ItemIcon icon={items[item].icon} size={56} />
            <b>{items[item].name}</b>
            <span>{have} / {need} {have >= need ? '✓' : ''}</span>
          </li>
        })}
      </ul>
      {!ready && !missing && <section className="bench__step">
        <small>STEP {index + 1} OF {steps.length}</small>
        <div className="cv-code">{step.code.map((line, i) => <div key={i} className="cv-code__line"><span className="cv-code__n">{i + 1}</span><PythonCode code={line} /></div>)}</div>
        <p className="bench__question">{step.question}</p>
        <div className="bench__options">{step.options.map((option, i) => <button key={option} className={`bench__option ${picked === i ? (i === step.answer ? 'is-right' : 'is-wrong') : ''}`} onClick={() => choose(i)}><PythonCode code={option} /></button>)}</div>
        {picked !== null && <p className={`bench__explain ${picked === step.answer ? 'is-right' : 'is-wrong'}`}>{picked === step.answer ? '✓ ' : '✗ Try again! '}{step.explain}</p>}
      </section>}
      {missing && <section className="bench__step"><p className="bench__explain is-wrong">{missing}</p></section>}
      {ready && <section className="bench__step"><p className="bench__explain is-right">✓ The code checks out. Everything is ready!</p></section>}
      <footer className="bench__actions">
        {ready ? <button className="btn btn--primary" autoFocus onClick={() => onDone(true)}>🔨 BUILD IT!</button>
          : <button className="btn" onClick={() => onDone(false)}>{missing ? 'I\'LL GO GET IT' : 'NOT NOW'}</button>}
      </footer>
    </div>
  </div>, document.body)
}
