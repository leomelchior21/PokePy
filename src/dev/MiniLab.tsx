// Development only (?mini=flappy&concept=var&tier=2): one mini-game in a battle-sized panel.
import { useState } from 'react'
import { ChallengeView } from '../battle/ChallengeView'
import { createChallenge } from '../battle/challenges'
import { randomRng } from '../lib/rng'
import type { ChallengeKind, Concept, Tier } from '../types'

export default function MiniLab() {
  const params = new URLSearchParams(window.location.search)
  const kind = (params.get('mini') ?? 'catch') as ChallengeKind
  const concept = (params.get('concept') ?? 'print') as Concept
  const tier = Number(params.get('tier') ?? 2) as Tier
  const [round, setRound] = useState(0)
  const [challenge, setChallenge] = useState(() => createChallenge(concept, kind, tier, randomRng()))
  return <div className="battle battle--mini" style={{ height: '100%' }}>
    <div className="battle__stage" />
    <div className="battle__panel battle__panel--challenge">
      <ChallengeView key={round} challenge={challenge} title={`Lab · ${kind}`} lenses={2} ducks={2} onUseItem={() => undefined} hero={{ species: 'sparkit', shiny: false }}
        onDone={() => { setChallenge(createChallenge(concept, kind, tier, randomRng())); setRound(round + 1) }} />
    </div>
  </div>
}
