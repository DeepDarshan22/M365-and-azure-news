'use client'

import { useState, useEffect } from 'react'

type Category = 'critical' | 'deprecation' | 'feature' | 'news'
type Filter = 'all' | Category

interface UpdateItem {
  category: Category
  title: string
  summary: string
  date?: string
  deadline?: string
  source?: string
  url?: string
}

const CATEGORY_META: Record<Category, { label: string; icon: string; badge: string; hover: string }> = {
  critical:    { label: 'Critical / action needed', icon: '!', badge: 'bg-red-500/15 text-red-400 border border-red-500/25',     hover: 'hover:border-red-500/20' },
  deprecation: { label: 'Upcoming deprecations',   icon: '↓', badge: 'bg-amber-500/15 text-amber-400 border border-amber-500/25', hover: 'hover:border-amber-500/20' },
  feature:     { label: 'New features',            icon: '+', badge: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25', hover: 'hover:border-emerald-500/20' },
  news:        { label: 'Latest news',             icon: 'i', badge: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',    hover: 'hover:border-blue-500/20' },
}

function generateMonthOptions() {
  const now = new Date()
  return Array.from({ length: 18 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    return {
      value: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      month: String(d.getMonth() + 1),
      year: String(d.getFullYear()),
    }
  })
}

function ItemCard({ item }: { item: UpdateItem }) {
  const meta = CATEGORY_META[item.category]
  return (
    <div className={`bg-[#131b27] border border-white/[0.06] ${meta.hover} rounded-xl p-4 transition-colors duration-150`}>
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${meta.badge}`}>
          {meta.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <p className="text-sm font-medium text-[#e2e8f0] leading-snug">{item.title}</p>
            {item.deadline && (
              <span className="flex-shrink-0 text-[10px] font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                {item.deadline}
              </span>
            )}
          </div>
          <p className="text-xs text-[#64748b] leading-relaxed mb-2">{item.summary}</p>
          <div className="flex items-center gap-3 flex-wrap">
            {item.date && <span className="text-[11px] text-[#334155]">{item.date}</span>}
            {item.source && item.url
              ? <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-[11px] text-[#3b82f6] hover:text-blue-300 transition-colors">{item.source} ↗</a>
              : item.source ? <span className="text-[11px] text-[#334155]">{item.source}</span> : null
            }
          </div>
        </div>
      </div>
    </div>
  )
}

function Skeleton() {
  return <div className="h-24 bg-[#131b27] border border-white/[0.04] rounded-xl animate-pulse" />
}

export default function Dashboard() {
  const [items, setItems] = useState<UpdateItem[]>([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState<Filter>('all')
  const [error, setError] = useState('')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedLabel, setSelectedLabel] = useState('')

  // Email state
  const [emailTo, setEmailTo] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailMsg, setEmailMsg] = useState('')

  const monthOptions = generateMonthOptions()

  useEffect(() => {
    if (!selectedMonth) return
    const opt = monthOptions.find(o => o.value === selectedMonth)
    if (!opt) return
    fetchUpdates(opt.month, opt.year, opt.label)
  }, [selectedMonth])

  async function fetchUpdates(month: string, year: string, label: string) {
    setLoading(true)
    setError('')
    setItems([])
    setFilter('all')
    setSelectedLabel(label)
    try {
      const res = await fetch('/api/fetch-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month, year }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to fetch')
      setItems(data.items || [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function sendDigest() {
    if (!emailTo || !emailTo.includes('@')) { setEmailMsg('Enter a valid email address'); return }
    if (!items.length) { setEmailMsg('No updates to send'); return }
    setEmailSending(true)
    setEmailMsg('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, to: emailTo, selectedMonth: selectedLabel }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Failed to send')
      setEmailMsg('✓ Digest sent!')
    } catch (e: unknown) {
      setEmailMsg(e instanceof Error ? e.message : 'Send failed')
    } finally {
      setEmailSending(false)
    }
  }

  const counts: Record<Category, number> = {
    critical:    items.filter(i => i.category === 'critical').length,
    deprecation: items.filter(i => i.category === 'deprecation').length,
    feature:     items.filter(i => i.category === 'feature').length,
    news:        items.filter(i => i.category === 'news').length,
  }

  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)
  const grouped = (Object.keys(CATEGORY_META) as Category[]).reduce(
    (acc, cat) => ({ ...acc, [cat]: filtered.filter(i => i.category === cat) }),
    {} as Record<Category, UpdateItem[]>
  )

  const hasItems = items.length > 0

  return (
    <main className="min-h-screen bg-[#0c1017] font-sans flex flex-col">

      {/* Nav */}
      <nav className="border-b border-white/[0.07] px-5 py-3.5 sticky top-0 bg-[#0c1017]/95 backdrop-blur-sm z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-semibold text-[#f1f5f9] tracking-tight">Azure &amp; M365 intelligence</h1>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-blue-500/10 text-blue-400 rounded-full border border-blue-500/20 hidden sm:inline">Azure</span>
            <span className="px-2 py-0.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 hidden sm:inline">M365</span>
          </div>
          {/* Month selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-[#475569] whitespace-nowrap">Select month:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="bg-[#1a2235] border border-white/10 text-[#e2e8f0] text-sm rounded-lg px-3 py-1.5 outline-none focus:border-blue-500/40 transition-colors cursor-pointer"
            >
              <option value="" disabled>— pick a month —</option>
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto w-full px-5 py-6 flex-1">

        {/* Error */}
        {error && (
          <div className="mb-5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        {/* Empty state — no month selected */}
        {!selectedMonth && !loading && (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-white/[0.06] rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-[#131b27] border border-white/[0.08] flex items-center justify-center mb-4">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
            </div>
            <p className="text-[#475569] text-sm font-medium mb-1">Select a month to load updates</p>
            <p className="text-[#334155] text-xs">Choose any month from the dropdown above</p>
          </div>
        )}

        {/* Stats */}
        {(hasItems || loading) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {(Object.keys(CATEGORY_META) as Category[]).map(cat => (
              <button
                key={cat}
                onClick={() => setFilter(filter === cat ? 'all' : cat)}
                className={`border rounded-xl p-4 text-center transition-all cursor-pointer ${
                  filter === cat ? 'bg-[#1a2235] border-white/15' : 'border-white/[0.06] bg-[#131b27] hover:border-white/10'
                }`}
              >
                <div className={`text-2xl font-semibold ${
                  cat === 'critical' ? 'text-red-400' : cat === 'deprecation' ? 'text-amber-400' : cat === 'feature' ? 'text-emerald-400' : 'text-blue-400'
                }`}>
                  {loading ? '–' : counts[cat]}
                </div>
                <div className="text-[11px] text-[#475569] mt-1">{CATEGORY_META[cat].label}</div>
              </button>
            ))}
          </div>
        )}

        {/* Filters */}
        {(hasItems || loading) && (
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {([
              { id: 'all', label: 'All updates' },
              { id: 'critical', label: '! Critical' },
              { id: 'deprecation', label: '↓ Deprecations' },
              { id: 'feature', label: '+ Features' },
              { id: 'news', label: 'i News' },
            ] as { id: Filter; label: string }[]).map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filter === f.id
                    ? 'bg-[#1a2235] border-white/[0.15] text-[#e2e8f0]'
                    : 'border-white/[0.05] text-[#475569] hover:text-[#94a3b8] hover:border-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
            {selectedLabel && !loading && (
              <span className="text-xs text-[#334155] py-1.5 ml-1">
                {items.length} update{items.length !== 1 ? 's' : ''} for {selectedLabel}
              </span>
            )}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} />)}
          </div>
        )}

        {/* No results for selected month */}
        {!loading && selectedMonth && items.length === 0 && !error && (
          <div className="text-center py-16 border border-dashed border-white/[0.06] rounded-xl">
            <p className="text-[#475569] text-sm font-medium mb-1">No updates found for {selectedLabel}</p>
            <p className="text-[#334155] text-xs">Try selecting a different month</p>
          </div>
        )}

        {/* Feed */}
        {!loading && hasItems && (
          filter === 'all' ? (
            <div className="space-y-6">
              {(Object.keys(CATEGORY_META) as Category[]).map(cat => {
                const catItems = grouped[cat]
                if (!catItems.length) return null
                return (
                  <section key={cat}>
                    <h2 className="text-[11px] font-medium text-[#334155] uppercase tracking-widest mb-3">{CATEGORY_META[cat].label}</h2>
                    <div className="space-y-2">{catItems.map((item, i) => <ItemCard key={i} item={item} />)}</div>
                  </section>
                )
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.length === 0
                ? <div className="text-center py-12 border border-dashed border-white/[0.06] rounded-xl"><p className="text-[#334155] text-sm">No items in this category</p></div>
                : filtered.map((item, i) => <ItemCard key={i} item={item} />)
              }
            </div>
          )
        )}

        {/* Email digest section */}
        {hasItems && !loading && (
          <div className="mt-8 bg-[#131b27] border border-white/[0.07] rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-1">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <p className="text-sm font-medium text-[#94a3b8]">Email this digest</p>
            </div>
            <p className="text-xs text-[#334155] mb-4">Send the {selectedLabel} digest ({items.length} updates) to any email address.</p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="email"
                placeholder="recipient@example.com"
                value={emailTo}
                onChange={e => { setEmailTo(e.target.value); setEmailMsg('') }}
                onKeyDown={e => e.key === 'Enter' && sendDigest()}
                className="bg-[#0c1017] border border-white/10 focus:border-blue-500/40 text-[#e2e8f0] placeholder:text-[#1e293b] text-sm rounded-xl px-4 py-2 outline-none transition-colors w-72"
              />
              <button
                onClick={sendDigest}
                disabled={emailSending}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2 rounded-xl transition-colors font-medium flex items-center gap-2"
              >
                {emailSending
                  ? <><span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"/>Sending…</>
                  : 'Send digest'
                }
              </button>
              {emailMsg && (
                <span className={`text-xs font-medium ${emailMsg.startsWith('✓') ? 'text-emerald-400' : 'text-red-400'}`}>
                  {emailMsg}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] px-5 py-4 mt-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
              <span className="text-[9px] font-bold text-white">DD</span>
            </div>
            <p className="text-[11px] text-[#64748b]">
              Created by <span className="text-[#94a3b8] font-semibold">Deep Darshan Singrodia</span>
            </p>
          </div>
          <p className="text-[10px] text-[#334155]">Powered by Microsoft RSS Feeds · Resend · Next.js</p>
        </div>
      </footer>
    </main>
  )
}
