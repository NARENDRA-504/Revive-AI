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
  revenue_at_risk_by_currency: Record<string, number>
  stalled_quotes: number
  stalled_leads: number
  unanswered_customers: number
  pending_approvals: number
  recovered_this_month: number
}
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'QUOTED' | 'NEGOTIATING' | 'WON' | 'LOST' | 'INACTIVE'
type QuoteStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'NEGOTIATING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
type Lead = { id: string; name: string; company: string | null; email: string | null; phone: string | null; source: string | null; status: LeadStatus; estimated_value: number; next_followup_at: string | null; last_contacted_at: string | null; notes: string | null; created_at: string; updated_at: string }
type Quote = { id: string; lead_id: string | null; quote_number: string; amount: number; currency: string; status: QuoteStatus; sent_at: string | null; expires_at: string | null; accepted_at: string | null; rejected_at: string | null; created_at: string; updated_at: string }
type Opportunity = { id: string; source_type: 'lead' | 'quote'; source_id: string; title: string; customer: string; amount: number; currency: string; days_waiting: number; priority: 'HIGH' | 'MEDIUM' | 'LOW'; reason: string; recommended_action: string }
const leadStatuses: LeadStatus[] = ['NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'NEGOTIATING', 'WON', 'LOST', 'INACTIVE']
const quoteStatuses: QuoteStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED']

const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [dashboard, setDashboard] = useState<Dashboard | null>(null)
  const [mode, setMode] = useState<'login' | 'register'>('register')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [activePage, setActivePage] = useState<'overview' | 'leads' | 'quotes' | 'opportunities'>('overview')
  const [leads, setLeads] = useState<Lead[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [saving, setSaving] = useState(false)
  const [editingLead, setEditingLead] = useState<Lead | null>(null)
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

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
  }, [session, refreshKey])

  useEffect(() => {
    const workspace = session?.workspaces[0]
    if (!session || !workspace) return
    const headers = { Authorization: `Bearer ${session.access_token}`, 'X-Workspace-ID': workspace.id }
    const controller = new AbortController()
    Promise.all([
      fetch(`${API}/api/v1/leads`, { headers, signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error('Could not load leads.'); return r.json() as Promise<Lead[]> }),
      fetch(`${API}/api/v1/quotes`, { headers, signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error('Could not load quotes.'); return r.json() as Promise<Quote[]> }),
      fetch(`${API}/api/v1/opportunities`, { headers, signal: controller.signal }).then(async (r) => { if (!r.ok) throw new Error('Could not load opportunities.'); return r.json() as Promise<Opportunity[]> }),
    ]).then(([leadRows, quoteRows, opportunityRows]) => { setLeads(leadRows); setQuotes(quoteRows); setOpportunities(opportunityRows) })
      .catch((cause: unknown) => { if (cause instanceof DOMException && cause.name === 'AbortError') return; setError(cause instanceof Error ? cause.message : 'Could not load workspace data.') })
    return () => controller.abort()
  }, [session, refreshKey])

  async function saveRecord(event: FormEvent<HTMLFormElement>, kind: 'leads' | 'quotes') {
    event.preventDefault()
    if (!session) return
    setSaving(true)
    setError('')
    const formNode = event.currentTarget
    const form = new FormData(formNode)
    const value = (key: string) => String(form.get(key) ?? '')
    const payload = kind === 'leads' ? {
      name: value('name'), company: value('company') || null, email: value('email') || null,
      phone: value('phone') || null, source: value('source') || null, status: value('status'),
      estimated_value: Number(value('estimated_value') || 0), next_followup_at: value('next_followup_at') ? new Date(value('next_followup_at')).toISOString() : null,
      notes: value('notes') || null,
    } : {
      lead_id: value('lead_id') || null, quote_number: value('quote_number'), amount: Number(value('amount')),
      currency: value('currency').toUpperCase(), status: value('status'),
      sent_at: value('sent_at') ? new Date(value('sent_at')).toISOString() : null,
      expires_at: value('expires_at') ? new Date(value('expires_at')).toISOString() : null,
    }
    try {
      const editingId = kind === 'leads' ? editingLead?.id : editingQuote?.id
      const response = await fetch(`${API}/api/v1/${kind}${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, 'X-Workspace-ID': session.workspaces[0].id },
        body: JSON.stringify(payload),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.detail ?? `Could not save ${kind.slice(0, -1)}.`)
      if (kind === 'leads') {
        setLeads((old) => editingId ? old.map((item) => item.id === editingId ? body as Lead : item) : [body as Lead, ...old])
        setEditingLead(null)
      } else {
        setQuotes((old) => editingId ? old.map((item) => item.id === editingId ? body as Quote : item) : [body as Quote, ...old])
        setEditingQuote(null)
      }
      setRefreshKey((current) => current + 1)
      formNode.reset()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save this record.') }
    finally { setSaving(false) }
  }

  async function removeRecord(kind: 'leads' | 'quotes', id: string) {
    if (!session) return
    const response = await fetch(`${API}/api/v1/${kind}/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${session.access_token}`, 'X-Workspace-ID': session.workspaces[0].id } })
    if (!response.ok) { setError(`Could not delete this ${kind === 'leads' ? 'lead' : 'quote'}.`); return }
    if (kind === 'leads') setLeads((old) => old.filter((lead) => lead.id !== id))
    else setQuotes((old) => old.filter((quote) => quote.id !== id))
    setRefreshKey((current) => current + 1)
  }

  async function updateLeadStatus(lead: Lead, status: LeadStatus) {
    if (!session) return
    const response = await fetch(`${API}/api/v1/leads/${lead.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, 'X-Workspace-ID': session.workspaces[0].id }, body: JSON.stringify({ ...lead, status }) })
    if (!response.ok) { setError('Could not update lead status.'); return }
    const updated = await response.json() as Lead
    setLeads((old) => old.map((item) => item.id === lead.id ? updated : item))
    setRefreshKey((current) => current + 1)
  }

  async function updateQuoteStatus(quote: Quote, status: QuoteStatus) {
    if (!session) return
    const response = await fetch(`${API}/api/v1/quotes/${quote.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}`, 'X-Workspace-ID': session.workspaces[0].id }, body: JSON.stringify({ ...quote, status }) })
    if (!response.ok) { setError('Could not update quote status.'); return }
    const updated = await response.json() as Quote
    setQuotes((old) => old.map((item) => item.id === quote.id ? updated : item))
    setRefreshKey((current) => current + 1)
  }

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
    revenue_at_risk_by_currency: {},
    stalled_quotes: 0,
    stalled_leads: 0,
    unanswered_customers: 0,
    pending_approvals: 0,
    recovered_this_month: 0,
  }
  const firstName = session.user.name.split(' ')[0]
  const riskTotals = Object.entries(metrics.revenue_at_risk_by_currency ?? {}).filter(([, amount]) => amount > 0)

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
        <button className={`side-link ${activePage === 'overview' ? 'active' : ''}`} onClick={() => setActivePage('overview')}><span>◫</span> Overview</button>
        <button className={`side-link ${activePage === 'leads' ? 'active' : ''}`} onClick={() => setActivePage('leads')}><span>↗</span> Leads <small>{leads.length}</small></button>
        <button className={`side-link ${activePage === 'quotes' ? 'active' : ''}`} onClick={() => setActivePage('quotes')}><span>▤</span> Quotes <small>{quotes.length}</small></button>
        <button className={`side-link ${activePage === 'opportunities' ? 'active' : ''}`} onClick={() => setActivePage('opportunities')}><span>◎</span> Opportunities <small>{opportunities.length}</small></button>
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
          <div className="breadcrumb">Workspace <span>/</span> {activePage[0].toUpperCase() + activePage.slice(1)}</div>
          <div className="top-actions"><span className="live-dot">● &nbsp;Workspace connected</span><div className="profile-avatar small-avatar">{session.user.name.slice(0, 1).toUpperCase()}</div></div>
        </header>
        <div className="dash-content">
          <div className="welcome-row">
            <div>
              <div className="eyebrow">{new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: '2-digit', year: 'numeric' }).format(new Date()).toUpperCase()}</div>
              <h1>{activePage === 'overview' ? <>Good morning, {firstName} <span>✳</span></> : activePage === 'leads' ? 'Leads' : activePage === 'quotes' ? 'Quotes' : 'Opportunities'}</h1>
              <p>{activePage === 'overview' ? 'Here’s where your business stands today.' : activePage === 'leads' ? 'Keep prospects, follow-ups, and potential value in one place.' : activePage === 'quotes' ? 'Track sent quotations and see which customers need a follow-up.' : 'A clear, rules-based view of follow-ups waiting for attention.'}</p>
            </div>
            <button className="outline-button" onClick={() => setRefreshKey((current) => current + 1)}>↻ &nbsp; Refresh overview</button>
          </div>

          {error && <div className="error dashboard-error" role="alert">{error}</div>}
          {activePage === 'overview' && <section className="risk-card">
            <div className="risk-main">
              <div className="eyebrow">TOTAL REVENUE AT RISK <span className="info">i</span></div>
              <div className="risk-amount">{riskTotals.length ? riskTotals.map(([currency, amount]) => <span className="risk-amount-item" key={currency}>{new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)}</span>) : <span className="risk-amount-item">$0</span>}</div>
              <div className="risk-caption"><span className="risk-spark">↗</span> {loadingDashboard ? 'Loading your workspace…' : 'Opportunities surfaced from your workspace'}</div>
            </div>
            <div className="risk-art"><div className="orb orb-a"/><div className="orb orb-b"/><div className="orb orb-c"/><div className="art-center">R<span>✳</span></div><div className="art-label">RECOVERY<br />ENGINE</div></div>
            <div className="risk-side">
              <div className="risk-side-label">OPPORTUNITIES NEEDING A LOOK</div>
              <div className="risk-stat"><span className="stat-icon orange">◷</span><span>Stalled quotes</span><b>{metrics.stalled_quotes}</b></div>
              <div className="risk-stat"><span className="stat-icon violet">↗</span><span>Stalled leads</span><b>{metrics.stalled_leads}</b></div>
              <div className="risk-stat"><span className="stat-icon teal">✉</span><span>Unanswered inquiries</span><b>{metrics.unanswered_customers}</b></div>
            </div>
          </section>}

          {activePage === 'overview' ? <>
          <div className="section-line"><div><div className="eyebrow">A CLEAR PATH FORWARD</div><h2>Your recovery overview</h2></div><span className="quiet-button">{leads.length} leads · {quotes.length} quotes</span></div>
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
            <div className="phase-note">ADD YOUR BUSINESS RECORDS FROM LEADS OR QUOTES IN THE SIDEBAR</div>
          </section>

          <section className="example-opportunity" id="opportunities">
            <div className="example-label"><span>EXAMPLE</span> WHAT REVIVEAI WILL SURFACE</div>
            <div className="example-row"><div className="example-icon">◷</div><div className="example-copy"><b>Quote follow-up</b><span>Northstar Studio · Sent 8 days ago · No reply yet</span></div><strong>$4,800</strong></div>
            <div className="example-reason">Suggested next step <b>Review a personalized follow-up draft</b><span>Sample only · This is not data from your workspace</span></div>
          </section>
          </> : activePage === 'leads' ? <section className="data-page">
            <form key={editingLead?.id ?? 'new-lead'} className="record-form" onSubmit={(event) => saveRecord(event, 'leads')}>
              <div className="eyebrow">YOUR PIPELINE</div><h2>{editingLead ? `Edit ${editingLead.name}` : 'New lead'}</h2>
              <div className="form-grid"><label>Name *<input name="name" required maxLength={160} placeholder="Maya Chen" defaultValue={editingLead?.name ?? ''} /></label><label>Company<input name="company" maxLength={160} placeholder="Company name" defaultValue={editingLead?.company ?? ''} /></label><label>Email<input name="email" type="email" placeholder="maya@company.com" defaultValue={editingLead?.email ?? ''} /></label><label>Phone<input name="phone" maxLength={40} placeholder="Phone number" defaultValue={editingLead?.phone ?? ''} /></label><label>Source<input name="source" maxLength={80} placeholder="Referral, website…" defaultValue={editingLead?.source ?? ''} /></label><label>Estimated value (USD)<input name="estimated_value" type="number" min="0" step="0.01" defaultValue={editingLead?.estimated_value ?? 0} /></label><label>Status<select name="status" defaultValue={editingLead?.status ?? 'NEW'}>{leadStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Next follow-up<input name="next_followup_at" type="datetime-local" defaultValue={editingLead?.next_followup_at?.slice(0, 16) ?? ''} /></label></div>
              <label>Notes<textarea name="notes" maxLength={4000} rows={3} placeholder="Context and next steps" defaultValue={editingLead?.notes ?? ''} /></label><div className="form-actions"><button className="primary" disabled={saving}>{saving ? 'Saving…' : editingLead ? 'Save changes' : 'Add lead'} <span>↗</span></button>{editingLead && <button type="button" className="cancel-edit" onClick={() => setEditingLead(null)}>Cancel</button>}</div>
            </form>
            <div className="section-line"><div><div className="eyebrow">YOUR PIPELINE</div><h2>{leads.length} {leads.length === 1 ? 'lead' : 'leads'}</h2></div></div>
            {leads.length === 0 ? <div className="list-empty">No leads yet. Add your first lead above to start building your pipeline.</div> : <div className="record-list">{leads.map((lead) => <article className="record-row" key={lead.id}><div className="record-avatar">{lead.name.slice(0, 1).toUpperCase()}</div><div className="record-primary"><b>{lead.name}</b><span>{[lead.company, lead.email].filter(Boolean).join(' · ') || 'No company or email added'}</span></div><strong>${Number(lead.estimated_value).toLocaleString('en-US')}</strong><select aria-label={`Status for ${lead.name}`} value={lead.status} onChange={(event) => updateLeadStatus(lead, event.target.value as LeadStatus)}>{leadStatuses.map((status) => <option key={status}>{status}</option>)}</select><button className="edit-record" onClick={() => { setEditingLead(lead); document.querySelector('.data-page')?.scrollIntoView({ behavior: 'smooth' }) }}>Edit</button><button className="delete-record" onClick={() => removeRecord('leads', lead.id)}>Delete</button></article>)}</div>}
          </section> : activePage === 'quotes' ? <section className="data-page">
            <form key={editingQuote?.id ?? 'new-quote'} className="record-form" onSubmit={(event) => saveRecord(event, 'quotes')}>
              <div className="eyebrow">TRACK A CUSTOMER QUOTATION</div><h2>{editingQuote ? `Edit ${editingQuote.quote_number}` : 'New quote'}</h2>
              <div className="form-grid"><label>Quote number *<input name="quote_number" required maxLength={64} placeholder="Q-2026-001" defaultValue={editingQuote?.quote_number ?? ''} /></label><label>Amount *<input name="amount" type="number" min="0" step="0.01" required placeholder="4800" defaultValue={editingQuote?.amount ?? ''} /></label><label>Currency<select name="currency" defaultValue={editingQuote?.currency ?? 'USD'}>{['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD'].map((currency) => <option key={currency}>{currency}</option>)}</select></label><label>Linked lead<select name="lead_id" defaultValue={editingQuote?.lead_id ?? ''}><option value="">No linked lead</option>{leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name}{lead.company ? ` · ${lead.company}` : ''}</option>)}</select></label><label>Status<select name="status" defaultValue={editingQuote?.status ?? 'DRAFT'}>{quoteStatuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Sent at<input name="sent_at" type="datetime-local" defaultValue={editingQuote?.sent_at?.slice(0, 16) ?? ''} /></label><label>Expires at<input name="expires_at" type="datetime-local" defaultValue={editingQuote?.expires_at?.slice(0, 16) ?? ''} /></label></div>
              <div className="form-actions"><button className="primary" disabled={saving}>{saving ? 'Saving…' : editingQuote ? 'Save changes' : 'Add quote'} <span>↗</span></button>{editingQuote && <button type="button" className="cancel-edit" onClick={() => setEditingQuote(null)}>Cancel</button>}</div>
            </form>
            <div className="section-line"><div><div className="eyebrow">QUOTATION TRACKER</div><h2>{quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}</h2></div></div>
            {quotes.length === 0 ? <div className="list-empty">No quotes yet. Add a quote above to track its status and follow-up.</div> : <div className="record-list">{quotes.map((quote) => { const lead = leads.find((item) => item.id === quote.lead_id); return <article className="record-row" key={quote.id}><div className="quote-icon">▤</div><div className="record-primary"><b>{quote.quote_number}</b><span>{lead?.name ?? 'No linked lead'} · {quote.currency}</span></div><strong>{quote.currency} {Number(quote.amount).toLocaleString('en-US')}</strong><select aria-label={`Status for quote ${quote.quote_number}`} value={quote.status} onChange={(event) => updateQuoteStatus(quote, event.target.value as QuoteStatus)}>{quoteStatuses.map((status) => <option key={status}>{status}</option>)}</select><button className="edit-record" onClick={() => { setEditingQuote(quote); document.querySelector('.data-page')?.scrollIntoView({ behavior: 'smooth' }) }}>Edit</button><button className="delete-record" onClick={() => removeRecord('quotes', quote.id)}>Delete</button></article>})}</div>}
          </section> : <section className="opportunity-page">
            <div className="opportunity-intro"><div><div className="eyebrow">DETERMINISTIC DETECTION · 7+ DAYS WAITING</div><h2>{opportunities.length ? `${opportunities.length} follow-up${opportunities.length === 1 ? '' : 's'} to review` : 'Nothing is waiting too long'}</h2><p>ReviveAI checks lead and quote status plus the last recorded follow-up date. These are rule-based signals from your workspace data.</p></div><span className="rules-badge">RULES-BASED</span></div>
            {opportunities.length === 0 ? <div className="list-empty">No stalled leads or quotes found. Add records and follow-up dates to keep your pipeline current.</div> : <div className="opportunity-list">{opportunities.map((item) => <article className="opportunity-card" key={item.id}><div className={`priority-mark ${item.priority.toLowerCase()}`}>{item.priority}</div><div className="opportunity-details"><div className="opportunity-heading"><h3>{item.title}</h3><span>{item.days_waiting} days waiting</span></div><div className="opportunity-customer">{item.customer} · {item.source_type === 'quote' ? 'Quotation' : 'Lead'}</div><p>{item.reason}</p><div className="opportunity-next"><span>Suggested next step</span><b>{item.recommended_action}</b></div></div><strong className="opportunity-amount">{item.currency} {Number(item.amount).toLocaleString('en-US')}</strong></article>)}</div>}
            <div className="opportunity-disclaimer">Suggestions only. ReviveAI does not send messages or take actions automatically.</div>
          </section>}
          <footer className="dash-footer"><span>REVIVEAI &nbsp;·&nbsp; RECOVER WHAT’S ALREADY YOURS</span><span>BUILT FOR SMALL BUSINESS, WITH CARE <i>✳</i></span></footer>
        </div>
      </main>
    </div>
  )
}

