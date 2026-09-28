import { FormEvent, useEffect, useState } from 'react'

type Workspace = { id: string; name: string; role: string }
type Session = { access_token: string; user: { name: string; email: string }; workspaces: Workspace[] }
type Dashboard = { workspace_name: string; revenue_at_risk: number; stalled_quotes: number; stalled_leads: number; unanswered_customers: number; pending_approvals: number; recovered_this_month: number }

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!session?.workspaces[0]) return
    fetch(`${API}/api/v1/dashboard`, { headers: { Authorization: `Bearer ${session.access_token}`, 'X-Workspace-ID': session.workspaces[0].id } })
      .then(async response => { if (!response.ok) throw new Error('Could not load the workspace dashboard.'); return response.json() })
      .then(setDashboard).catch(() => setError('Could not connect to ReviveAI. Check that the API is running.'))
  }, [session, refreshKey])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setBusy(true)
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '')
    const route = mode === 'register' ? 'register' : 'login'
    const payload = mode === 'register'
      ? { name: value('name'), email: value('email'), password: value('password'), workspace_name: value('workspace') }
      : { email: value('email'), password: value('password') }
    try {
      const response = await fetch(`${API}/api/v1/auth/${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail ?? 'Unable to sign in.')
      setSession(result)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to connect to ReviveAI.') }
    finally { setBusy(false) }
  }

  if (!session) return <main className="auth-shell"><section className="auth-panel"><a className="brand" href="#home"><span className="brand-icon">R</span> revive<span>ai</span></a><div className="auth-copy"><div className="eyebrow"><i /> REVENUE RECOVERY, REIMAGINED</div><h1>Bring good<br />opportunities<br /><em>back to life.</em></h1><p>Find the follow-ups that slip through the cracks. Keep every opportunity moving.</p></div><div className="auth-foot"><span>● &nbsp;Your revenue deserves a second look.</span><span>01 — 04</span></div></section><section className="form-panel"><div className="form-wrap"><div className="form-heading"><div className="eyebrow">YOUR WORKSPACE STARTS HERE</div><h2>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2><p>{mode === 'register' ? 'Set up your ReviveAI workspace in a few steps.' : 'Sign in to see what needs your attention.'}</p></div><form onSubmit={submit}>{mode === 'register' && <><label>Your name<input name="name" autoComplete="name" placeholder="Asha Rao" required maxLength={120} /></label><label>Business name<input name="workspace" placeholder="Asha Consulting" required maxLength={160} /></label></>}<label>Work email<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></label><label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder="At least 10 characters" required minLength={mode === 'register' ? 10 : 1} /></label>{error && <div className="error" role="alert">{error}</div>}<button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create workspace' : 'Sign in'} <span>↗</span></button></form><div className="switch-mode">{mode === 'register' ? 'Already have an account?' : 'New to ReviveAI?'} <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}>{mode === 'register' ? 'Sign in' : 'Create an account'}</button></div><div className="secure-note"><span>✳</span> Your business data stays private to your workspace.</div></div></section></main>

  const metrics = dashboard ?? { workspace_name: session.workspaces[0]?.name ?? 'Workspace', revenue_at_risk: 0, stalled_quotes: 0, stalled_leads: 0, unanswered_customers: 0, pending_approvals: 0, recovered_this_month: 0 }
}
