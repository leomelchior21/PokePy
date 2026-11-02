import { useEffect, useState, type FormEvent } from 'react'
import { audio } from '../engine/audio'
import { newSave, repairSave } from '../game/state'
import { loadCloud, loadLocal, login, newestSave, rememberedSession, rememberSession, type Login } from '../save/cloud'
import type { AvatarChoice, SaveState } from '../types'
import { avatarLook, hairColors, looks, outfitColors, skinTones } from '../world/looks'
import { DialogBox } from './Dialog'
import { PersonImg, PyxieImg } from './Sprite'
import { Logo, TitleScene } from './TitleScene'

type Stage = 'splash' | 'login' | 'loading' | 'continue' | 'intro' | 'avatar' | 'outro'

export function Title({ onStart }: { onStart: (save: SaveState) => void }) {
  const [stage, setStage] = useState<Stage>('splash')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [user, setUser] = useState<Login | null>(() => rememberedSession())
  const [existing, setExisting] = useState<SaveState | null>(null)
  const [avatar, setAvatar] = useState<AvatarChoice>({ hair: 1, skin: 1, outfit: 0, style: 'cap' })
  const [secret, setSecret] = useState('')
  const [maker, setMaker] = useState(false)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (stage === 'splash' && ['Enter', ' '].includes(event.key)) begin()
      if (event.key.length === 1) {
        const typed = (secret + event.key.toLowerCase()).slice(-5)
        setSecret(typed)
        // Easter egg: type MAKER on the title screen.
        if (typed === 'maker' && !maker) { setMaker(true); audio.unlock(); audio.sfx('fanfare') }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const begin = () => {
    audio.unlock()
    audio.play('title')
    audio.sfx('select')
    setStage(user ? 'loading' : 'login')
    if (user) void loadSaves(user)
  }

  const loadSaves = async (who: Login) => {
    setStage('loading')
    const local = loadLocal(who.username)
    const cloud = await loadCloud(who.username)
    const save = repairSave(newestSave(local, cloud), who.username, who.displayName)
    setExisting(save)
    setStage(save ? 'continue' : 'intro')
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setStage('loading')
    try {
      const who = await login(name)
      rememberSession(who)
      setUser(who)
      await loadSaves(who)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Login failed.')
      setStage('login')
    }
  }

  const logout = () => { rememberSession(null); setUser(null); setExisting(null); setStage('login') }
  const start = () => { if (user) onStart(newSave(user.username, user.displayName, avatar)) }
  const first = user?.displayName.split(' ')[0] ?? ''

  return <div className={`title ${maker ? 'is-maker' : ''}`}>
    <TitleScene />
    <div className="title__shade" aria-hidden="true" />

    <div className="title__content">
      <h1 className="logo" aria-label="Pyxies"><Logo /></h1>
      <div className="title__ribbon"><span>A PYTHON ADVENTURE</span></div>
      <p className="title__tag">in the Castanho Valley</p>
      {maker && <p className="title__secret">🛠 Leo Maker approves. Keep building! 🛠</p>}

      {stage === 'splash' && <button className="press-start" onClick={begin}>▶ PRESS START</button>}
      {stage === 'splash' && <p className="title__hint">Tap to begin · best with sound on 🔊</p>}

      {stage === 'login' && <form className="login-card" onSubmit={submit}>
        <label htmlFor="login">Your first name + last name</label>
        <input id="login" autoFocus autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="anasilva" value={name} onChange={(e) => setName(e.target.value)} />
        {error && <p className="login-card__error">{error}</p>}
        <button className="btn btn--primary" type="submit" disabled={!name.trim()}>ENTER THE VALLEY</button>
        <small>Same login as PixPy.</small>
      </form>}

      {stage === 'loading' && <p className="title__loading">Connecting to the valley…</p>}

      {stage === 'continue' && existing && <div className="login-card">
        <p className="login-card__hello">Welcome back, <b>{first}</b>!</p>
        <div className="save-slot">
          <PersonImg look={avatarLook(existing.avatar)} size={64} />
          <div><b>{existing.displayName}</b><small>🏅 {existing.badges.length}/6 · ⭐ {existing.trainerXp} XP · {Math.floor(existing.playMs / 60000)} min</small>
            <span className="save-slot__team">{existing.team.map((p) => <PyxieImg key={p.uid} species={p.species} shiny={p.shiny} size={30} />)}</span></div>
        </div>
        <button className="btn btn--primary" autoFocus onClick={() => onStart(existing)}>CONTINUE ▶</button>
        <button className="btn btn--small" onClick={() => { if (window.confirm('Start over? Your current adventure will be replaced.')) setStage('intro') }}>NEW GAME</button>
        <button className="btn btn--small btn--ghost" onClick={logout}>Not you? Log out</button>
      </div>}

      {stage === 'intro' && <div className="intro">
        <PersonImg look={looks.leoMaker} size={128} />
        <DialogBox lines={[`Hello there, ${first}! Welcome to the Castanho Valley!`, 'My name is Leo Maker. People call me the valley\'s maker. I build robots, lamps, and cardboard castles.', 'This valley is home to PYXIES: creatures made of Python code.', 'Some print. Some remember values. Some decide which path to take.', 'You will train them by reading and writing real code.', 'But first… let me see you properly. What do you look like?']} speaker="Leo Maker" onDone={() => setStage('avatar')} />
      </div>}

      {stage === 'avatar' && <div className="avatar-maker">
        <div className="avatar-maker__preview">
          {(['down', 'right', 'up', 'left'] as const).map((dir) => <PersonImg key={dir} look={avatarLook(avatar)} dir={dir} size={72} />)}
        </div>
        <Picker label="Style" options={['cap', 'short', 'long', 'spiky', 'bun']} value={avatar.style} onPick={(style) => setAvatar({ ...avatar, style: style as AvatarChoice['style'] })} />
        <Swatches label="Hair" colors={hairColors} value={avatar.hair} onPick={(hair) => setAvatar({ ...avatar, hair })} />
        <Swatches label="Skin" colors={skinTones} value={avatar.skin} onPick={(skin) => setAvatar({ ...avatar, skin })} />
        <Swatches label="Outfit" colors={outfitColors} value={avatar.outfit} onPick={(outfit) => setAvatar({ ...avatar, outfit })} />
        <button className="btn btn--primary" onClick={() => setStage('outro')}>THAT'S ME!</button>
      </div>}

      {stage === 'outro' && <div className="intro">
        <PersonImg look={avatarLook(avatar)} size={128} />
        <DialogBox lines={['Excellent! A true maker, ready to build.', 'Your adventure starts at home, in Vila Maker.', 'Come see me at the Makerspace. I have a surprise for you…', 'Let\'s build something great!']} speaker="Leo Maker" onDone={start} />
      </div>}
    </div>
    <footer className="title__foot">Made for the makers of Escola Lourenço Castanho 💜💛</footer>
  </div>
}

function Picker({ label, options, value, onPick }: { label: string; options: string[]; value: string; onPick: (value: string) => void }) {
  return <div className="picker"><span>{label}</span>{options.map((option) => <button key={option} className={value === option ? 'is-on' : ''} onClick={() => { onPick(option); audio.sfx('blip') }}>{option}</button>)}</div>
}

function Swatches({ label, colors, value, onPick }: { label: string; colors: string[]; value: number; onPick: (value: number) => void }) {
  return <div className="picker"><span>{label}</span>{colors.map((color, i) => <button key={color} className={`swatch ${value === i ? 'is-on' : ''}`} style={{ background: color }} aria-label={`${label} ${i + 1}`} onClick={() => { onPick(i); audio.sfx('blip') }} />)}</div>
}
