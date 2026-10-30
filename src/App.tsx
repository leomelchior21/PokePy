import { useState } from 'react'
import { audio } from './engine/audio'
import { saveCloud } from './save/cloud'
import type { SaveState } from './types'
import { GameScreen } from './ui/GameScreen'
import { Title } from './ui/Title'

export default function App() {
  const [save, setSave] = useState<SaveState | null>(null)
  return save
    ? <GameScreen key={save.createdAt} initial={save} onQuit={() => setSave(null)} onRestart={setSave} />
    : <Title onStart={(next) => {
      audio.setMusic(next.settings.music)
      audio.sfxOn = next.settings.sfx
      saveCloud(next, true)
      setSave(next)
    }} />
}
