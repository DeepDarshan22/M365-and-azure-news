import { NextResponse } from 'next/server'
import { XMLParser } from 'fast-xml-parser'

export const maxDuration = 30

type Category = 'critical' | 'deprecation' | 'feature' | 'news'

interface FeedItem {
  category: Category
  title: string
  summary: string
  date: string
  deadline: string | null
  source: string
  url: string | null
  _pubDate?: string
}

const RSS_FEEDS = [
  { url: 'https://azure.microsoft.com/en-us/updates/feed/', source: 'Azure Updates' },
  { url: 'https://azure.microsoft.com/en-us/blog/feed/', source: 'Azure Blog' },
  { url: 'https://www.microsoft.com/en-us/microsoft-365/blog/feed/', source: 'Microsoft 365 Blog' },
  { url: 'https://msrc.microsoft.com/blog/feed', source: 'Microsoft Security' },
]

function extractStr(val: unknown): string {
  if (!val) return ''
  if (typeof val === 'string') return val.trim()
  if (typeof val === 'object' && val !== null) {
    const obj = val as Record<string, unknown>
    if ('__cdata' in obj) return String(obj.__cdata).trim()
    if ('#text' in obj) return String(obj['#text']).trim()
  }
  return String(val).trim()
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function categorize(title: string, desc: string): Category {
  const text = `${title} ${desc}`.toLowerCase()
  if (/deprecat|retir|end.of.life|\beol\b|end.of.support|sunset|discontinu|will.be.removed|shutting.down|no.longer.support/.test(text)) return 'deprecation'
  if (/\bsecurity\b|vulnerab|\bcve-|\bpatch\b|critical|action.required|action.needed|breaking.change|\btls\b|\bssl\b|must.upgrade|mandatory|urgent|compliance.required|update.required|service.disruption/.test(text)) return 'critical'
  if (/generally.available|public.preview|\bga\b|new.feature|announc|introduc|now.available|\bpreview\b|launched|releasing|rolling.out|new.capability/.test(text)) return 'feature'
  return 'news'
}

function matchesMonth(pubDate: string, year: number, month: number): boolean {
  if (!pubDate) return false
  try {
    const d = new Date(pubDate)
    if (isNaN(d.getTime())) return false
    return d.getFullYear() === year && d.getMonth() + 1 === month
  } catch { return false }
}

function formatDate(pubDate: string): string {
  try {
    return new Date(pubDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return pubDate }
}

async function fetchFeed(feedUrl: string, source: string): Promise<FeedItem[]> {
  try {
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AzureM365Intel/1.0)' },
      next: { revalidate: 0 },
    })
    if (!res.ok) return []
    const xml = await res.text()
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_', cdataPropName: '__cdata', textNodeName: '#text' })
    const parsed = parser.parse(xml)
    const channel = parsed?.rss?.channel || parsed?.feed
    if (!channel) return []
    const rawItems = channel.item || channel.entry || []
    const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : []

    return items.map((item: Record<string, unknown>) => {
      const title = extractStr(item.title)
      const description = stripHtml(extractStr(item.description || item.summary || item.content || ''))
      const pubDate = extractStr(item.pubDate || item.updated || item.published || '')
      const link = extractStr(item.link || item.id || '')
      const summary = description.length > 300 ? description.slice(0, 300) + '…' : description || title
      return { category: categorize(title, description), title, summary, date: formatDate(pubDate), deadline: null, source, url: link || null, _pubDate: pubDate }
    })
  } catch { return [] }
}

export async function POST(req: Request) {
  let body: { month?: string; year?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Invalid request body' }, { status: 400 }) }

  const year = parseInt(body.year || '')
  const month = parseInt(body.month || '')
  if (!year || !month || month < 1 || month > 12) return NextResponse.json({ error: 'Valid month and year required' }, { status: 400 })

  try {
    const results = await Promise.allSettled(RSS_FEEDS.map(f => fetchFeed(f.url, f.source)))
    const allItems: FeedItem[] = results.flatMap(r => r.status === 'fulfilled' ? r.value : [])
    const filtered = allItems
      .filter(item => matchesMonth(item._pubDate || '', year, month))
      .map(({ _pubDate: _, ...rest }) => rest)
    const deduped = filtered.filter((item, idx, arr) => arr.findIndex(o => o.title === item.title) === idx)
    const order: Record<Category, number> = { critical: 0, deprecation: 1, feature: 2, news: 3 }
    const sorted = deduped.sort((a, b) => order[a.category] - order[b.category])
    return NextResponse.json({ items: sorted })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed to fetch feeds' }, { status: 500 })
  }
}
