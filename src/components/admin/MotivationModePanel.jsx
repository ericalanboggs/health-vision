import { useState, useEffect, useCallback } from 'react'
import {
  getMotivationSettings,
  adminSetMotivationMode,
  adminUpdateMotivationSettings,
  getMotivationQueue,
  getMotivationCheckins,
  adminGenerateMotivationBatch,
  adminUpdateMotivationItem,
  adminAddMotivationItem,
  adminDeleteMotivationItem,
  adminApproveMotivationBatch,
} from '../../services/adminService'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const CADENCES = [
  { value: 'daily', label: 'Once a day' },
  { value: 'weekly_x3', label: '3x per week' },
]
const STATUS_STYLES = {
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-summit-mint text-summit-forest',
  sent: 'bg-stone-200 text-stone-600',
  skipped: 'bg-stone-100 text-stone-400 line-through',
}

/**
 * Admin composer for Motivation Mode. Toggle the flag, set the steering prompt,
 * generate a weekly batch, then review / edit / add / approve content before it sends.
 */
export default function MotivationModePanel({ userId }) {
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [queue, setQueue] = useState([])
  const [checkins, setCheckins] = useState([])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  // editable settings form
  const [prompt, setPrompt] = useState('')
  const [cadence, setCadence] = useState('daily')
  const [checkinDay, setCheckinDay] = useState(5)

  // add-content form
  const [showAdd, setShowAdd] = useState(false)
  const [addForm, setAddForm] = useState({ content_type: 'article', title: '', url: '', body: '', coach_framing: '' })

  // per-item edit state: { [id]: { coach_framing, url, title } }
  const [editing, setEditing] = useState({})

  const flash = (text, ok = true) => {
    setMsg({ text, ok })
    setTimeout(() => setMsg(null), 3500)
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [s, q, c] = await Promise.all([
      getMotivationSettings(userId),
      getMotivationQueue(userId),
      getMotivationCheckins(userId),
    ])
    if (s.success) {
      setSettings(s.data)
      setPrompt(s.data.motivation_prompt || '')
      setCadence(s.data.motivation_cadence || 'daily')
      setCheckinDay(s.data.motivation_checkin_day ?? 5)
    }
    if (q.success) setQueue(q.data)
    if (c.success) setCheckins(c.data)
    setLoading(false)
  }, [userId])

  useEffect(() => { if (userId) load() }, [userId, load])

  const toggleMode = async () => {
    setBusy(true)
    const next = !settings?.motivation_mode
    const res = await adminSetMotivationMode(userId, next)
    setBusy(false)
    if (res.success) { setSettings(s => ({ ...s, motivation_mode: next })); flash(next ? 'Motivation Mode ON' : 'Motivation Mode OFF') }
    else flash(res.error || 'Failed', false)
  }

  const saveSettings = async () => {
    setBusy(true)
    const res = await adminUpdateMotivationSettings(userId, { prompt, cadence, checkinDay: Number(checkinDay) })
    setBusy(false)
    res.success ? flash('Settings saved') : flash(res.error || 'Failed', false)
  }

  const generate = async (regenerate) => {
    if (!prompt.trim()) { flash('Add a coach steering prompt first — the AI needs it to curate.', false); return }
    setBusy(true)
    // Save current settings first so the generator reads what's in the box, not a stale value.
    flash('Saving settings…')
    const saved = await adminUpdateMotivationSettings(userId, { prompt, cadence, checkinDay: Number(checkinDay) })
    if (!saved.success) { setBusy(false); flash(saved.error || 'Failed to save settings', false); return }
    flash(regenerate ? 'Regenerating…' : 'Generating batch… (finding videos, this can take ~20s)')
    const res = await adminGenerateMotivationBatch(userId, { regenerate })
    setBusy(false)
    if (res.success) {
      const r = res.data?.results?.[0]
      flash(r?.status === 'ok' ? `Generated ${r.inserted} items (batch ${r.detail?.replace('batch ', '')})` : `Result: ${r?.detail || 'see logs'}`, r?.status === 'ok')
      load()
    } else flash(res.error || 'Failed', false)
  }

  const approveBatch = async (weekBatch) => {
    setBusy(true)
    const res = await adminApproveMotivationBatch(userId, weekBatch)
    setBusy(false)
    res.success ? (flash('Batch approved — will send on schedule'), load()) : flash(res.error || 'Failed', false)
  }

  const saveItem = async (id) => {
    const patch = editing[id]
    setBusy(true)
    const res = await adminUpdateMotivationItem(id, patch)
    setBusy(false)
    if (res.success) { setEditing(e => { const n = { ...e }; delete n[id]; return n }); flash('Item saved'); load() }
    else flash(res.error || 'Failed', false)
  }

  const deleteItem = async (id) => {
    if (!confirm('Delete this item?')) return
    setBusy(true)
    const res = await adminDeleteMotivationItem(id)
    setBusy(false)
    res.success ? (flash('Item deleted'), load()) : flash(res.error || 'Failed', false)
  }

  const addItem = async () => {
    const latestBatch = queue[0]?.week_batch || 1
    setBusy(true)
    const res = await adminAddMotivationItem(userId, { ...addForm, week_batch: latestBatch })
    setBusy(false)
    if (res.success) {
      setShowAdd(false)
      setAddForm({ content_type: 'article', title: '', url: '', body: '', coach_framing: '' })
      flash('Added (approved)')
      load()
    } else flash(res.error || 'Failed', false)
  }

  if (loading) return <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4 sm:p-6 text-stone-400">Loading Motivation Mode…</div>

  const on = !!settings?.motivation_mode
  const latestReadiness = checkins[0]?.readiness_score
  // group queue by batch (already ordered batch desc, date asc)
  const batches = queue.reduce((acc, item) => {
    (acc[item.week_batch] = acc[item.week_batch] || []).push(item)
    return acc
  }, {})
  const batchNumbers = Object.keys(batches).map(Number).sort((a, b) => b - a)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-summit-forest">Motivation Mode</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-stone-500">{on ? 'On' : 'Off'}</span>
          <button
            type="button"
            onClick={toggleMode}
            disabled={busy}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-summit-emerald' : 'bg-stone-300'}`}
            title="Toggle Motivation Mode for this user"
          >
            <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>

      {msg && (
        <div className={`mb-4 text-sm rounded-lg px-3 py-2 ${msg.ok ? 'bg-summit-mint text-summit-forest' : 'bg-red-100 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {!on && (
        <p className="text-stone-500 text-sm">
          Off. When on, this user leaves the habit-tracking track and receives a daily piece of curated
          inspiration plus a weekly readiness check-in.
        </p>
      )}

      {on && (
        <div className="space-y-6">
          {/* Readiness */}
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-stone-700">Readiness:</span>
            {latestReadiness != null ? (
              <span className="text-summit-forest font-semibold">{latestReadiness}/10</span>
            ) : (
              <span className="text-stone-400">no check-in yet</span>
            )}
            {checkins.length > 1 && (
              <span className="text-stone-400">
                (history: {checkins.slice(0, 6).map(c => c.readiness_score ?? '–').reverse().join(' → ')})
              </span>
            )}
          </div>

          {/* Steering settings */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-stone-700">Coach steering prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={4}
              placeholder="What kind of motivation does this user want? (their words are best)"
              className="w-full border border-stone-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-summit-emerald focus:outline-none"
            />
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-xs text-stone-500 mb-1">Cadence</label>
                <select value={cadence} onChange={e => setCadence(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm">
                  {CADENCES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-stone-500 mb-1">Check-in day</label>
                <select value={checkinDay} onChange={e => setCheckinDay(e.target.value)} className="border border-stone-300 rounded-lg px-3 py-2 text-sm">
                  {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <button onClick={saveSettings} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium bg-summit-forest text-white">
                  Save settings
                </button>
              </div>
            </div>
          </div>

          {/* Generate / Add */}
          <div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => generate(false)} disabled={busy || !prompt.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-summit-emerald text-white disabled:opacity-40 disabled:cursor-not-allowed">
                Generate batch
              </button>
              <button onClick={() => generate(true)} disabled={busy || !prompt.trim()} className="px-4 py-2 rounded-lg text-sm font-medium bg-stone-200 text-stone-700 disabled:opacity-40 disabled:cursor-not-allowed">
                Regenerate (replace pending)
              </button>
              <button onClick={() => setShowAdd(s => !s)} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium border border-summit-emerald text-summit-forest">
                {showAdd ? 'Cancel add' : '+ Add my own'}
              </button>
            </div>
            {!prompt.trim() && (
              <p className="text-xs text-stone-400 mt-2">Add a coach steering prompt above to enable AI generation. (You can still “Add my own” manually.)</p>
            )}
          </div>

          {/* Add form */}
          {showAdd && (
            <div className="border border-stone-200 rounded-lg p-4 space-y-2 bg-stone-50">
              <div className="flex gap-2">
                <select value={addForm.content_type} onChange={e => setAddForm(f => ({ ...f, content_type: e.target.value }))} className="border border-stone-300 rounded-lg px-2 py-1 text-sm">
                  <option value="article">Article</option>
                  <option value="video">Video</option>
                  <option value="quote">Quote</option>
                </select>
                <input value={addForm.title} onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" className="flex-1 border border-stone-300 rounded-lg px-2 py-1 text-sm" />
              </div>
              <input value={addForm.url} onChange={e => setAddForm(f => ({ ...f, url: e.target.value }))} placeholder="URL (leave blank for a quote)" className="w-full border border-stone-300 rounded-lg px-2 py-1 text-sm" />
              <textarea value={addForm.body} onChange={e => setAddForm(f => ({ ...f, body: e.target.value }))} placeholder="Body / quote text" rows={2} className="w-full border border-stone-300 rounded-lg px-2 py-1 text-sm" />
              <textarea value={addForm.coach_framing} onChange={e => setAddForm(f => ({ ...f, coach_framing: e.target.value }))} placeholder="Coach framing (the line sent with it)" rows={2} className="w-full border border-stone-300 rounded-lg px-2 py-1 text-sm" />
              <button onClick={addItem} disabled={busy} className="px-4 py-2 rounded-lg text-sm font-medium bg-summit-forest text-white">Add to queue</button>
            </div>
          )}

          {/* Batches */}
          {batchNumbers.length === 0 && <p className="text-stone-400 text-sm">No content yet. Generate a batch or add your own.</p>}
          {batchNumbers.map(bn => {
            const items = batches[bn]
            const hasPending = items.some(i => i.status === 'pending_review')
            return (
              <div key={bn} className="border-t border-stone-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-summit-forest">Week {bn}</h3>
                  {hasPending && (
                    <button onClick={() => approveBatch(bn)} disabled={busy} className="px-3 py-1 rounded-lg text-xs font-medium bg-summit-emerald text-white">
                      Approve all pending
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {items.map(item => {
                    const ed = editing[item.id]
                    return (
                      <div key={item.id} className="border border-stone-200 rounded-lg p-3 text-sm">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-summit-sage/30 text-summit-forest">{item.content_type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[item.status] || 'bg-stone-100'}`}>{item.status}</span>
                          {item.source === 'manual' && <span className="text-xs px-2 py-0.5 rounded-full bg-summit-lime/40 text-summit-forest">manual</span>}
                          {item.scheduled_date && <span className="text-xs text-stone-400 ml-auto">{item.scheduled_date}</span>}
                        </div>

                        {ed ? (
                          <div className="space-y-2">
                            <input value={ed.title ?? ''} onChange={e => setEditing(s => ({ ...s, [item.id]: { ...ed, title: e.target.value } }))} placeholder="Title" className="w-full border border-stone-300 rounded px-2 py-1" />
                            <input value={ed.url ?? ''} onChange={e => setEditing(s => ({ ...s, [item.id]: { ...ed, url: e.target.value } }))} placeholder="URL" className="w-full border border-stone-300 rounded px-2 py-1" />
                            <textarea value={ed.coach_framing ?? ''} onChange={e => setEditing(s => ({ ...s, [item.id]: { ...ed, coach_framing: e.target.value } }))} rows={2} placeholder="Coach framing" className="w-full border border-stone-300 rounded px-2 py-1" />
                            <div className="flex gap-2">
                              <button onClick={() => saveItem(item.id)} disabled={busy} className="px-3 py-1 rounded text-xs bg-summit-forest text-white">Save</button>
                              <button onClick={() => setEditing(s => { const n = { ...s }; delete n[item.id]; return n })} className="px-3 py-1 rounded text-xs bg-stone-200">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            {item.title && <div className="font-medium text-stone-800">{item.title}</div>}
                            {item.url && <a href={item.url} target="_blank" rel="noreferrer" className="text-summit-emerald break-all underline">{item.url}</a>}
                            {item.body && <div className="text-stone-600 mt-1">{item.body}</div>}
                            {item.coach_framing && <div className="text-stone-500 italic mt-1">“{item.coach_framing}”</div>}
                            <div className="flex gap-3 mt-2">
                              <button onClick={() => setEditing(s => ({ ...s, [item.id]: { title: item.title, url: item.url, coach_framing: item.coach_framing } }))} className="text-xs text-summit-forest underline">Edit</button>
                              <button onClick={() => deleteItem(item.id)} className="text-xs text-red-500 underline">Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
