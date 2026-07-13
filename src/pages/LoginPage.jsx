import { useState } from 'react'
import { Compass } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { enterDemoMode } from '../lib/demoClient'
import foxIcon from '../assets/foxIcon.png'

export default function LoginPage() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  function startDemo() {
    enterDemoMode()
    // Neu laden, damit der localStorage-Client die Supabase-Anbindung ersetzt
    window.location.reload()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const action =
      mode === 'signin'
        ? supabase.auth.signInWithPassword({ email, password })
        : supabase.auth.signUp({ email, password })
    const { error: authError } = await action
    if (authError) setError(authError.message)
    setBusy(false)
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <img src={foxIcon} alt="Pathfinder Fuchs" />
        <h1>Pathfinder</h1>
        <p className="tagline">Your little guide through the big woods</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <input
              type="email"
              placeholder="E-Mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-row">
            <input
              type="password"
              placeholder="Passwort"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <div className="form-row">
            <button type="submit" className="btn-primary" style={{ width: '100%' }} disabled={busy}>
              {mode === 'signin' ? 'Anmelden' : 'Konto erstellen'}
            </button>
          </div>
        </form>

        <button
          type="button"
          className="btn-ghost btn-sm"
          onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
        >
          {mode === 'signin' ? 'Noch kein Konto? Registrieren' : 'Zurück zur Anmeldung'}
        </button>

        <div className="login-demo">
          <button type="button" className="btn-ghost btn-sm" onClick={startDemo}>
            <Compass size={16} /> Ohne Konto ausprobieren
          </button>
          <p>
            Im Demo-Modus bleiben alle Daten in diesem Browser (localStorage) —
            es wird nichts in der Datenbank gespeichert.
          </p>
        </div>
      </div>
    </div>
  )
}
