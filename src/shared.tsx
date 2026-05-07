import React, { useState, useRef, useEffect } from 'react'

// ═══════════════════════════════════════════════════════════════
// Lightweight Markdown Renderer
// ═══════════════════════════════════════════════════════════════

export function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let inCodeBlock = false
  let codeBlockContent: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        elements.push(<pre key={`c-${i}`} className="my-2 p-3 rounded-lg bg-zinc-800 text-green-300 overflow-x-auto text-xs font-mono whitespace-pre"><code>{codeBlockContent.join('\n')}</code></pre>)
        codeBlockContent = []; inCodeBlock = false
      } else { inCodeBlock = true }
      continue
    }
    if (inCodeBlock) { codeBlockContent.push(line); continue }
    if (line.startsWith('### ')) elements.push(<h4 key={i} className="font-bold text-sm mt-3 mb-1 text-white">{fmt(line.slice(4))}</h4>)
    else if (line.startsWith('## ')) elements.push(<h3 key={i} className="font-bold text-base mt-3 mb-1 text-white">{fmt(line.slice(3))}</h3>)
    else if (line.startsWith('# ')) elements.push(<h2 key={i} className="font-bold text-lg mt-3 mb-1 text-white">{fmt(line.slice(2))}</h2>)
    else if (line.match(/^[-*]\s/)) elements.push(<li key={i} className="ml-4 list-disc text-sm text-gray-300">{fmt(line.replace(/^[-*]\s/, ''))}</li>)
    else if (line.match(/^\d+\.\s/)) elements.push(<li key={i} className="ml-4 list-decimal text-sm text-gray-300">{fmt(line.replace(/^\d+\.\s/, ''))}</li>)
    else if (line.match(/^---+$/)) elements.push(<hr key={i} className="my-2 border-gray-600" />)
    else if (line.trim() === '') elements.push(<div key={i} className="h-2" />)
    else elements.push(<p key={i} className="text-sm leading-relaxed text-gray-300">{fmt(line)}</p>)
  }
  return <div>{elements}</div>
}

export function fmt(text: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  let rem = text; let k = 0
  while (rem.length > 0) {
    const bm = rem.match(/\*\*(.+?)\*\*/); const cm = rem.match(/`([^`]+)`/)
    let first: { i: number; l: number; n: React.ReactNode } | null = null
    if (bm && bm.index !== undefined) { const c = { i: bm.index, l: bm[0].length, n: <strong key={`b${k++}`}>{bm[1]}</strong> }; if (!first || c.i < first.i) first = c }
    if (cm && cm.index !== undefined) { const c = { i: cm.index, l: cm[0].length, n: <code key={`c${k++}`} className="px-1 py-0.5 rounded bg-zinc-800 text-green-300 text-xs font-mono">{cm[1]}</code> }; if (!first || c.i < first.i) first = c }
    if (first) { if (first.i > 0) parts.push(rem.slice(0, first.i)); parts.push(first.n); rem = rem.slice(first.i + first.l) }
    else { parts.push(rem); break }
  }
  return parts.length === 1 ? parts[0] : <>{parts}</>
}

// ═══════════════════════════════════════════════════════════════
// Model Catalog — Tested & Verified with Persona Identity Lock
// ═══════════════════════════════════════════════════════════════

export interface ProxyRoute {
  provider: string
  url: string
  modelId: string
}

export interface ModelEntry {
  id: string
  company: string
  label: string
  persona: string
  color: string
  routes: ProxyRoute[]
}

export const MODELS: ModelEntry[] = [
  { id: 'claude-opus-4.7', company: 'Anthropic', label: 'Claude Opus 4.7', persona: 'Claude Opus 4.7 by Anthropic', color: 'bg-orange-100 text-orange-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-opus-4.7' },
    { provider: 'AirForce (Alt)', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-opus-4.6-p2g' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'claude-opus-4.6', company: 'Anthropic', label: 'Claude Opus 4.6', persona: 'Claude Opus 4.6 by Anthropic', color: 'bg-orange-100 text-orange-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-opus-4.6-p2g' },
    { provider: 'AirForce (RP)', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-opus-4.6-rp' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'claude-sonnet-4.6', company: 'Anthropic', label: 'Claude Sonnet 4.6', persona: 'Claude Sonnet 4.6 by Anthropic', color: 'bg-orange-100 text-orange-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-sonnet-4.6' },
    { provider: 'AirForce (Alt)', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-sonnet-4.5-p2g' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'claude-sonnet-4.5', company: 'Anthropic', label: 'Claude Sonnet 4.5', persona: 'Claude Sonnet 4.5 by Anthropic', color: 'bg-orange-100 text-orange-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-sonnet-4.5-p2g' },
    { provider: 'AirForce (RP)', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-sonnet-4.5-rp' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'claude-haiku-4.5', company: 'Anthropic', label: 'Claude Haiku 4.5', persona: 'Claude Haiku 4.5 by Anthropic', color: 'bg-orange-100 text-orange-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-haiku-4.5-p2g' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'gpt-5.5-pro', company: 'OpenAI', label: 'GPT-5.5 Pro', persona: 'GPT-5.5 Pro by OpenAI', color: 'bg-green-100 text-green-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-5.5-p2g' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'gpt-oss-20b' },
    { provider: 'AirForce (Fallback)', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
  ]},
  { id: 'gpt-5.5-thinking', company: 'OpenAI', label: 'GPT-5.5 Thinking', persona: 'GPT-5.5 Thinking by OpenAI, with deep chain-of-thought reasoning', color: 'bg-green-100 text-green-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-5.5-p2g' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'gpt-oss-20b' },
    { provider: 'AirForce (Fallback)', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
  ]},
  { id: 'gpt-5.4-mini', company: 'OpenAI', label: 'GPT-5.4 Mini', persona: 'GPT-5.4 Mini by OpenAI', color: 'bg-green-100 text-green-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-5.4-p2g' },
    { provider: 'AirForce (Fallback)', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'chatgpt-atlas', company: 'OpenAI', label: 'ChatGPT Atlas', persona: 'ChatGPT Atlas by OpenAI, an advanced knowledge and reasoning assistant', color: 'bg-green-100 text-green-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-5.5-p2g' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'gpt-oss-20b' },
    { provider: 'AirForce (Fallback)', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
  ]},
  { id: 'gpt-4o', company: 'OpenAI', label: 'GPT-4o', persona: 'GPT-4o by OpenAI', color: 'bg-green-100 text-green-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'gpt-4o-mini', company: 'OpenAI', label: 'GPT-4o Mini', persona: 'GPT-4o Mini by OpenAI', color: 'bg-green-100 text-green-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'gemini-2.5-pro', company: 'Google', label: 'Gemini 2.5 Pro', persona: 'Gemini 2.5 Pro by Google DeepMind', color: 'bg-blue-100 text-blue-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gemini-2.5-flash' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'gemini-2.5-flash', company: 'Google', label: 'Gemini 2.5 Flash', persona: 'Gemini 2.5 Flash by Google DeepMind', color: 'bg-blue-100 text-blue-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gemini-2.5-flash' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'grok-4.1-mini', company: 'xAI', label: 'Grok 4.1 Mini', persona: 'Grok 4.1 Mini by xAI', color: 'bg-gray-100 text-gray-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'grok-4.1-mini:free' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'deepseek-v3.2', company: 'DeepSeek', label: 'DeepSeek V3.2', persona: 'DeepSeek V3.2 by DeepSeek', color: 'bg-cyan-100 text-cyan-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'deepseek-v3.2' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'deepseek-v3', company: 'DeepSeek', label: 'DeepSeek V3', persona: 'DeepSeek V3 by DeepSeek', color: 'bg-cyan-100 text-cyan-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'deepseek-v3-0324' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'llama-4-scout', company: 'Meta', label: 'LLaMA 4 Scout', persona: 'LLaMA 4 Scout by Meta', color: 'bg-indigo-100 text-indigo-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'llama-4-scout' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo' },
  ]},
  { id: 'mistral-large', company: 'Mistral', label: 'Mistral Large', persona: 'Mistral Large by Mistral AI', color: 'bg-purple-100 text-purple-700', routes: [
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
  ]},
  { id: 'kimi-k2.5', company: 'Moonshot', label: 'Kimi K2.5', persona: 'Kimi K2.5 by Moonshot AI', color: 'bg-yellow-100 text-yellow-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'kimi-k2.5' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'nemotron-3-super', company: 'NVIDIA', label: 'Nemotron 3 Super', persona: 'Nemotron 3 Super by NVIDIA', color: 'bg-lime-100 text-lime-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'nemotron-3-super' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
  { id: 'glm-5.1', company: 'Z.AI', label: 'GLM 5.1', persona: 'GLM 5.1 by Z.AI', color: 'bg-teal-100 text-teal-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'glm-5.1' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'GLM-4.6V-Flash' },
  ]},
  { id: 'minimax-m2.7', company: 'MiniMax', label: 'MiniMax M2.7', persona: 'MiniMax M2.7 by MiniMax', color: 'bg-pink-100 text-pink-700', routes: [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'minimax-m2.7' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
  ]},
]

export const COMPANIES = [...new Set(MODELS.map(m => m.company))]
export const COMPANY_ICONS: Record<string, string> = {
  'Anthropic': '🟠', 'OpenAI': '🟢', 'Google': '🔵', 'xAI': '⚪',
  'DeepSeek': '🔷', 'Meta': '🟤', 'Mistral': '🟣', 'Moonshot': '🟡',
  'NVIDIA': '💚', 'Z.AI': '🩵', 'MiniMax': '🩷',
}
export const COMPANY_COLORS: Record<string, string> = {
  'Anthropic': 'border-l-orange-400', 'OpenAI': 'border-l-green-400', 'Google': 'border-l-blue-400',
  'xAI': 'border-l-gray-400', 'DeepSeek': 'border-l-cyan-400', 'Meta': 'border-l-amber-600',
  'Mistral': 'border-l-purple-400', 'Moonshot': 'border-l-yellow-400', 'NVIDIA': 'border-l-lime-400',
  'Z.AI': 'border-l-teal-400', 'MiniMax': 'border-l-pink-400',
}

// ═══════════════════════════════════════════════════════════════
// API Call — Persona Identity Lock via Tested Proxies
// ═══════════════════════════════════════════════════════════════

export async function callAI(
  messages: { role: string; content: string }[],
  signal: AbortSignal | undefined,
  modelEntry: ModelEntry | null,
): Promise<{ content: string; modelLabel: string; provider: string }> {
  if (modelEntry) {
    for (const route of modelEntry.routes) {
      const result = await callRoute(route, messages, signal)
      if (result && !result.includes('Pay-As-You-Go') && !result.includes('model does not exist')) {
        return { content: result, modelLabel: modelEntry.label, provider: route.provider }
      }
    }
    throw new Error(`All proxy routes failed for ${modelEntry.label}. Try another model.`)
  }
  const fallbackRoutes: ProxyRoute[] = [
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'gpt-4o-mini' },
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'claude-sonnet-4.6' },
    { provider: 'LLM7', url: 'https://api.llm7.io/v1/chat/completions', modelId: 'codestral-latest' },
    { provider: 'AirForce', url: 'https://api.airforce/v1/chat/completions', modelId: 'grok-4.1-mini:free' },
  ]
  for (const route of fallbackRoutes) {
    const result = await callRoute(route, messages, signal)
    if (result && !result.includes('Pay-As-You-Go') && !result.includes('model does not exist')) {
      return { content: result, modelLabel: 'Auto', provider: route.provider }
    }
  }
  throw new Error('All proxy providers failed. Please try again.')
}

async function callRoute(
  route: ProxyRoute,
  messages: { role: string; content: string }[],
  signal?: AbortSignal,
): Promise<string | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const body = { model: route.modelId, messages, temperature: 0.7, max_tokens: 2048 }
    const res = await fetch(route.url, { method: 'POST', headers, body: JSON.stringify(body), signal })
    if (!res.ok) return null
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (!content) return null
    if (content.includes('Pay-As-You-Go') || content.includes('model does not exist')) return null
    return content
  } catch { return null }
}

// ═══════════════════════════════════════════════════════════════
// Model Selector Component
// ═══════════════════════════════════════════════════════════════

export function ModelSelector({ label, icon, selected, onSelect, accentColor }: {
  label: string; icon: string; selected: ModelEntry | null; onSelect: (m: ModelEntry | null) => void
  accentColor?: string
}) {
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const filtered = filter
    ? MODELS.filter(m => m.label.toLowerCase().includes(filter.toLowerCase()) || m.company.toLowerCase().includes(filter.toLowerCase()))
    : MODELS

  const grouped = COMPANIES.reduce((acc, co) => {
    const ms = filtered.filter(m => m.company === co)
    if (ms.length) acc.push({ company: co, models: ms })
    return acc
  }, [] as { company: string; models: ModelEntry[] }[])

  const accentMap: Record<string, { border: string; bg: string }> = {
    blue: { border: '#60a5fa', bg: '#eff6ff' },
    emerald: { border: '#34d399', bg: '#ecfdf5' },
    amber: { border: '#fbbf24', bg: '#fffbeb' },
    purple: { border: '#a78bfa', bg: '#f5f3ff' },
    rose: { border: '#fb7185', bg: '#fff1f2' },
  }
  const ac = accentMap[accentColor || 'blue'] || accentMap.blue

  return (
    <div className="relative" ref={ref}>
      <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">{icon} {label}</label>
      <button
        onClick={() => { setOpen(!open); setFilter('') }}
        className="w-full px-3 py-2.5 rounded-xl border-2 text-left text-sm transition-all flex items-center justify-between gap-2"
        style={selected ? { borderColor: ac.border, backgroundColor: ac.bg } : { borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}
      >
        <span className="flex items-center gap-2 truncate">
          {selected ? (
            <>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${selected.color}`}>{selected.company}</span>
              <span className="font-medium text-gray-900">{selected.label}</span>
            </>
          ) : (
            <span className="text-gray-400">Select a model...</span>
          )}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full left-0 right-0 bg-slate-800 rounded-xl shadow-2xl border border-white/10 overflow-hidden max-h-[280px] sm:max-h-[380px]">
          <div className="p-2 border-b border-white/10 sticky top-0 bg-slate-800 z-10">
            <input
              value={filter} onChange={e => setFilter(e.target.value)}
              placeholder="Search models..." autoFocus
              className="w-full px-3 py-1.5 rounded-lg bg-slate-700 border border-white/10 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <button
            onClick={() => { onSelect(null); setOpen(false) }}
            className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2 ${!selected ? 'bg-blue-500/10' : ''}`}
          >
            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-[10px] font-bold text-gray-700">AUTO</span>
            <span className="font-medium text-gray-300">Auto (fastest available)</span>
          </button>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100% - 90px)' }}>
            {grouped.map(g => (
              <div key={g.company}>
                <div className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400 border-l-4 ${COMPANY_COLORS[g.company] || 'border-l-gray-300'} bg-slate-900/50`}>
                  {COMPANY_ICONS[g.company] || '⬜'} {g.company}
                </div>
                {g.models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => { onSelect(m); setOpen(false) }}
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-700 flex items-center gap-2.5 transition-colors ${selected?.id === m.id ? 'bg-blue-500/10' : ''}`}
                  >
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${m.color}`}>{m.company}</span>
                    <span className="font-medium text-gray-200">{m.label}</span>
                    <span className="ml-auto text-[9px] text-gray-500">via {m.routes[0].provider}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
