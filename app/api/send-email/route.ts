import { NextResponse } from 'next/server'
import { Resend } from 'resend'

interface UpdateItem {
  category: 'critical' | 'deprecation' | 'feature' | 'news'
  title: string
  summary: string
  date?: string
  deadline?: string
  source?: string
  url?: string
}

const CATEGORY_META = {
  critical:    { label: 'Critical / Action Needed', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', icon: '⚠' },
  deprecation: { label: 'Upcoming Deprecations',   color: '#d97706', bg: '#fffbeb', border: '#fde68a', icon: '↓' },
  feature:     { label: 'New Features',            color: '#059669', bg: '#f0fdf4', border: '#a7f3d0', icon: '+' },
  news:        { label: 'Latest News',             color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe', icon: 'ℹ' },
}

function esc(t: string | undefined): string {
  if (!t) return ''
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

function generateEmailHtml(items: UpdateItem[], selectedMonth: string): string {
  const grouped = {
    critical:    items.filter(i => i.category === 'critical'),
    deprecation: items.filter(i => i.category === 'deprecation'),
    feature:     items.filter(i => i.category === 'feature'),
    news:        items.filter(i => i.category === 'news'),
  }

  const sectionsHtml = (['critical','deprecation','feature','news'] as const).map(cat => {
    const catItems = grouped[cat]
    if (!catItems.length) return ''
    const meta = CATEGORY_META[cat]
    const itemsHtml = catItems.map(item => `
      <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:16px 18px;margin-bottom:10px;border-left:3px solid ${meta.color};">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:6px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#0f172a;line-height:1.4;">${esc(item.title)}</p>
          ${item.deadline ? `<span style="flex-shrink:0;font-size:11px;font-weight:600;color:#92400e;background:#fef3c7;border:1px solid #fde68a;padding:2px 8px;border-radius:20px;white-space:nowrap;">${esc(item.deadline)}</span>` : ''}
        </div>
        <p style="margin:0 0 8px;font-size:13px;color:#475569;line-height:1.6;">${esc(item.summary)}</p>
        <div style="display:flex;align-items:center;gap:12px;">
          ${item.date ? `<span style="font-size:11px;color:#94a3b8;">${esc(item.date)}</span>` : ''}
          ${item.source && item.url ? `<a href="${esc(item.url)}" style="font-size:11px;color:#2563eb;text-decoration:none;" target="_blank">${esc(item.source)} ↗</a>` : item.source ? `<span style="font-size:11px;color:#94a3b8;">${esc(item.source)}</span>` : ''}
        </div>
      </div>`).join('')

    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid #f1f5f9;">
          <span style="width:22px;height:22px;background:${meta.bg};border:1px solid ${meta.border};border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:bold;color:${meta.color};">${meta.icon}</span>
          <h2 style="margin:0;font-size:13px;font-weight:700;color:${meta.color};text-transform:uppercase;letter-spacing:.05em;">${meta.label}</h2>
          <span style="font-size:11px;color:#94a3b8;">(${catItems.length})</span>
        </div>
        ${itemsHtml}
      </div>`
  }).join('')

  const summaryBadges = (['critical','deprecation','feature','news'] as const)
    .filter(c => grouped[c].length > 0)
    .map(c => {
      const m = CATEGORY_META[c]
      return `<span style="font-size:12px;background:${m.bg};color:${m.color};border:1px solid ${m.border};padding:4px 12px;border-radius:20px;font-weight:600;">${grouped[c].length} ${m.label}</span>`
    }).join('')

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">
  <div style="background:#0f172a;border-radius:14px;padding:24px 28px;margin-bottom:20px;">
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#f8fafc;letter-spacing:-.02em;">Azure &amp; M365 Intelligence</h1>
    <p style="margin:0 0 12px;font-size:13px;color:#64748b;">Updates for <strong style="color:#94a3b8;">${esc(selectedMonth)}</strong></p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <span style="font-size:11px;font-weight:600;background:rgba(59,130,246,.15);color:#93c5fd;border:1px solid rgba(59,130,246,.25);padding:3px 10px;border-radius:20px;">Azure</span>
      <span style="font-size:11px;font-weight:600;background:rgba(16,185,129,.15);color:#6ee7b7;border:1px solid rgba(16,185,129,.25);padding:3px 10px;border-radius:20px;">Microsoft 365</span>
    </div>
  </div>
  <div style="display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap;">${summaryBadges}</div>
  ${sectionsHtml}
  <div style="border-top:1px solid #e2e8f0;padding-top:16px;margin-top:8px;text-align:center;">
    <p style="margin:0 0 5px;font-size:12px;color:#334155;">Created by <strong style="color:#0f172a;">Deep Darshan Singrodia</strong></p>
    <p style="margin:0;font-size:11px;color:#94a3b8;">Azure &amp; M365 Intelligence &bull; Data from Microsoft RSS Feeds</p>
  </div>
</div>
</body></html>`
}

export async function POST(req: Request) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 })

  let body: { items: UpdateItem[]; to: string; selectedMonth?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const { items, to, selectedMonth = '' } = body
  if (!to?.includes('@')) return NextResponse.json({ error: 'Invalid recipient email' }, { status: 400 })
  if (!items?.length) return NextResponse.json({ error: 'No items to send' }, { status: 400 })

  const resend = new Resend(resendKey)

  try {
    const result = await resend.emails.send({
      from: 'Azure M365 Intel <onboarding@resend.dev>',
      to: [to],
      subject: `Azure & M365 Digest — ${selectedMonth} (${items.length} updates)`,
      html: generateEmailHtml(items, selectedMonth),
    })
    if (result.error) return NextResponse.json({ error: result.error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to send' }, { status: 500 })
  }
}
