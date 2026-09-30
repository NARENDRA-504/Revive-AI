import { FormEvent, useEffect, useState } from 'react'

type Workspace = { id: string; name: string; role: string }
type Session = {
  access_token: string
  user: { name: string; email: string }
  workspaces: Workspace[]
}
type Dashboard = {
  workspace_name: string
  revenue_at_risk: number
  stalled_quotes: number
  stalled_leads: number
  unanswered_customers: number
  pending_approvals: number
  recovered_this_month: number
}

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)

  useEffect(() => {
    const workspace = session?.workspaces[0]
    if (!session || !workspace) return

    const controller = new AbortController()
    setLoadingDashboard(true)
    fetch(`${API}/api/v1/dashboard`, {
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'X-Workspace-ID': workspace.id,
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load the workspace dashboard.')
        return (await response.json()) as Dashboard
      })
      .then((data) => {
        setDashboard(data)
        setError('')
      })
      .catch((cause: unknown) => {
        if (cause instanceof DOMException && cause.name === 'AbortError') return
        setError(cause instanceof Error ? cause.message : 'Could not load your workspace.')
      })
      .finally(() => setLoadingDashboard(false))

    return () => controller.abort()
  }, [session])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const value = (key: string) => String(form.get(key) ?? '')
    const route = mode === 'register' ? 'register' : 'login'
    const payload = mode === 'register'
      ? {
          name: value('name'),
          email: value('email'),
          password: value('password'),
          workspace_name: value('workspace'),
        }
      : { email: value('email'), password: value('password') }

    try {
      const response = await fetch(`${API}/api/v1/auth/${route}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail ?? 'Unable to sign in.')
      setDashboard(null)
      setSession(result as Session)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to connect to ReviveAI.')
    } finally {
      setBusy(false)
    }
  }

  function signOut() {
    setSession(null)
    setDashboard(null)
    setError('')
    setMode('login')
  }

  if (!session) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <a className="brand" href="#home"><span className="brand-icon">R</span> revive<span>ai</span></a>
          <div className="auth-copy">
            <div className="eyebrow"><i /> REVENUE RECOVERY, REIMAGINED</div>
            <h1>Bring good<br />opportunities<br /><em>back to life.</em></h1>
            <p>Find the follow-ups that slip through the cracks. Keep every opportunity moving.</p>
          </div>
          <div className="auth-foot"><span>● &nbsp;Your revenue deserves a second look.</span><span>01 — 04</span></div>
        </section>
        <section className="form-panel">
          <div className="form-wrap">
            <div className="form-heading">
              <div className="eyebrow">YOUR WORKSPACE STARTS HERE</div>
              <h2>{mode === 'register' ? 'Create your account' : 'Welcome back'}</h2>
              <p>{mode === 'register' ? 'Set up your ReviveAI workspace in a few steps.' : 'Sign in to see what needs your attention.'}</p>
            </div>
            <form onSubmit={submit}>
              {mode === 'register' && <>
                <label>Your name<input name="name" autoComplete="name" placeholder="Asha Rao" required maxLength={120} /></label>
                <label>Business name<input name="workspace" placeholder="Asha Consulting" required maxLength={160} /></label>
              </>}
              <label>Work email<input name="email" type="email" autoComplete="email" placeholder="you@company.com" required /></label>
              <label>Password<input name="password" type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'} required minLength={mode === 'register' ? 10 : 1} /></label>
              {error && <div className="error" role="alert">{error}</div>}
              <button className="primary" disabled={busy}>{busy ? 'Please wait…' : mode === 'register' ? 'Create workspace' : 'Sign in'} <span>↗</span></button>
            </form>
            <div className="switch-mode">
              {mode === 'register' ? 'Already have an account?' : 'New to ReviveAI?'}{' '}
              <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError('') }}>
                {mode === 'register' ? 'Sign in' : 'Create an account'}
              </button>
            </div>
            <div className="secure-note"><span>✳</span> Your business data stays private to your workspace.</div>
          </div>
        </section>
      </main>
    )
  }

  const workspaceName = dashboard?.workspace_name ?? session.workspaces[0]?.name ?? 'Workspace'
  const metrics: Dashboard = dashboard ?? {
    workspace_name: workspaceName,
    revenue_at_risk: 0,
    stalled_quotes: 0,
    stalled_leads: 0,
    unanswered_customers: 0,
    pending_approvals: 0,
    recovered_this_month: 0,
  }
  const firstName = session.user.name.split(' ')[0]

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#home"><span className="brand-icon">R</span> revive<span>ai</span></a>
        <div className="workspace-picker">
          <span className="workspace-avatar">{workspaceName.slice(0, 1).toUpperCase()}</span>
          <span><b>{workspaceName}</b><small>Business workspace</small></span>
          <span className="chevron">⌄</span>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <a className="side-link active" href="#overview"><span>◫</span> Overview</a>
        <a className="side-link" href="#opportunities"><span>◎</span> Opportunities <small>{metrics.stalled_quotes + metrics.stalled_leads}</small></a>
        <a className="side-link" href="#getting-started"><span>↗</span> Leads</a>
        <a className="side-link" href="#getting-started"><span>▤</span> Quotes</a>
        <a className="side-link" href="#actions"><span>✳</span> AI actions <small className="count">{metrics.pending_approvals}</small></a>
        <div className="nav-label second">MANAGE</div>
        <a className="side-link" href="#knowledge"><span>▧</span> Knowledge base</a>
        <a className="side-link" href="#settings"><span>⚙</span> Settings</a>
        <div className="sidebar-bottom">
          <div className="help-card"><span>✳</span><b>Revenue, recovered.</b><p>Your AI teammate is ready to help you follow through.</p><a href="#getting-started">See how it works ↗</a></div>
          <div className="profile">
            <div className="profile-avatar">{session.user.name.slice(0, 1).toUpperCase()}</div>
            <span><b>{session.user.name}</b><small>{session.user.email}</small></span>
            <button aria-label="Sign out" onClick={signOut}>↗</button>
          </div>
        </div>
      </aside>

      <main className="dashboard" id="overview">
        <header className="topbar">
          <div className="breadcrumb">Workspace <span>/</span> Overview</div>
          <div className="top-actions"><span className="live-dot">● &nbsp;Workspace connected</span><div className="profile-avatar small-avatar">{session.user.name.slice(0, 1).toUpperCase()}</div></div>
        </header>
        <div className="dash-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase()}</div>
              <h1>Good morning, {firstName} <span>✳</span></h1>
              <p>Here’s where your business stands today.</p>
            </div>
            <button className="outline-button" onClick={() => window.location.reload()}>↻ &nbsp; Refresh overview</button>
          </div>

          {error && <div className="error dashboard-error" role="alert">{error}</div>}
          <section className="risk-card">
            <div className="risk-main">
              <div className="eyebrow">TOTAL REVENUE AT RISK <span className="info">i</span></div>
              <div className="risk-amount">${metrics.revenue_at_risk.toLocaleString('en-US')}<span>.00</span></div>
              <div className="risk-caption"><span className="risk-spark">↗</span> {loadingDashboard ? 'Loading your workspace…' : 'Opportunities surfaced from your workspace'}</div>
            </div>
            <div className="risk-art"><div className="orb orb-a"/><div className="orb orb-b"/><div className="orb orb-c"/><div className="art-center">R<span>✳</span></div><div className="art-label">RECOVERY<br />ENGINE</div></div>
            <div className="risk-side">
              <div className="risk-side-label">OPPORTUNITIES NEEDING A LOOK</div>
              <div className="risk-stat"><span className="stat-icon orange">◷</span><span>Stalled quotes</span><b>{metrics.stalled_quotes}</b></div>
              <div className="risk-stat"><span className="stat-icon violet">↗</span><span>Stalled leads</span><b>{metrics.stalled_leads}</b></div>
              <div className="risk-stat"><span className="stat-icon teal">✉</span><span>Unanswered inquiries</span><b>{metrics.unanswered_customers}</b></div>
            </div>
          </section>

          <div className="section-line"><div><div className="eyebrow">A CLEAR PATH FORWARD</div><h2>Your recovery overview</h2></div><span className="quiet-button">Updated just now</span></div>
          <section className="summary-grid">
            <article className="summary-card"><div className="summary-top"><span>◎</span><small>IN YOUR PIPELINE</small></div><strong>{metrics.stalled_quotes + metrics.stalled_leads}</strong><p>Open opportunities</p><div className="summary-foot">Waiting for a next step <span>→</span></div></article>
            <article className="summary-card"><div className="summary-top"><span>✳</span><small>HUMAN-IN-THE-LOOP</small></div><strong>{metrics.pending_approvals}</strong><p>Actions to review</p><div className="summary-foot">You stay in control <span>→</span></div></article>
            <article className="summary-card recovered"><div className="summary-top"><span>↗</span><small>THIS MONTH</small></div><strong>${metrics.recovered_this_month.toLocaleString('en-US')}</strong><p>Revenue recovered</p><div className="summary-foot">A little follow-through goes far <span>✳</span></div></article>
          </section>

          <section className="empty-state onboarding" id="getting-started">
            <div className="empty-illustration"><div className="empty-orbit"/><span>✳</span></div>
            <div className="eyebrow">YOUR WORKSPACE IS READY</div>
            <h3>{metrics.revenue_at_risk > 0 ? 'Your recovery opportunities are here.' : 'Let’s find your first opportunity.'}</h3>
            <p>{metrics.revenue_at_risk > 0 ? 'ReviveAI has found follow-ups that may be putting revenue at risk.' : 'Your dashboard is connected. Add leads, customer conversations, and quotes to see revenue at risk here.'}</p>
            <div className="onboarding-steps">
              <div><span>01</span><b>Add leads</b><small>Keep prospect details and follow-up dates together.</small></div>
              <div><span>02</span><b>Track quotations</b><small>See which sent quotes are waiting for a reply.</small></div>
              <div><span>03</span><b>Recover revenue</b><small>Review clear next steps before any action is sent.</small></div>
            </div>
            <div className="phase-note">LEAD AND QUOTE ENTRY IS THE NEXT FEATURE PHASE</div>
          </section>

          <section className="example-opportunity" id="opportunities">
            <div className="example-label"><span>EXAMPLE</span> WHAT REVIVEAI WILL SURFACE</div>
            <div className="example-row"><div className="example-icon">◷</div><div className="example-copy"><b>Quote follow-up</b><span>Northstar Studio · Sent 8 days ago · No reply yet</span></div><strong>$4,800</strong></div>
            <div className="example-reason">Suggested next step <b>Review a personalized follow-up draft</b><span>Sample only · This is not data from your workspace</span></div>
          </section>
          <footer className="dash-footer"><span>REVIVEAI &nbsp;·&nbsp; RECOVER WHAT’S ALREADY YOURS</span><span>BUILT FOR SMALL BUSINESS, WITH CARE <i>✳</i></span></footer>
        </div>
      </main>
    </div>
  )
}
