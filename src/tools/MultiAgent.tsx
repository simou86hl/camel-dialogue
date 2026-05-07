import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SimpleMarkdown, ModelSelector, callAI, ModelEntry } from '../shared'

interface Agent { id: number; name: string; role: string; color: string }
interface Msg { agentId: number; agentName: string; agentRole: string; content: string; color: string; modelLabel?: string; provider?: string }

const AGENT_COLORS = ['blue', 'emerald', 'amber', 'purple', 'rose', 'cyan']
const AGENT_COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue: { bg: 'bg-blue-500/5', border: 'border-l-blue-400', text: 'text-blue-300', badge: 'bg-blue-500/20 text-blue-300' },
  emerald: { bg: 'bg-emerald-500/5', border: 'border-l-emerald-400', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  amber: { bg: 'bg-amber-500/5', border: 'border-l-amber-400', text: 'text-amber-300', badge: 'bg-amber-500/20 text-amber-300' },
  purple: { bg: 'bg-purple-500/5', border: 'border-l-purple-400', text: 'text-purple-300', badge: 'bg-purple-500/20 text-purple-300' },
  rose: { bg: 'bg-rose-500/5', border: 'border-l-rose-400', text: 'text-rose-300', badge: 'bg-rose-500/20 text-rose-300' },
  cyan: { bg: 'bg-cyan-500/5', border: 'border-l-cyan-400', text: 'text-cyan-300', badge: 'bg-cyan-500/20 text-cyan-300' },
}

const PRESETS = [
  { name: 'Software Team', task: 'Design and plan a social media app', agents: [
    { name: 'Alice', role: 'Product Manager' }, { name: 'Bob', role: 'Lead Developer' }, { name: 'Carol', role: 'UX Designer' },
  ]},
  { name: 'Research Team', task: 'Investigate the impact of AI on healthcare', agents: [
    { name: 'Dr. Kim', role: 'Research Lead' }, { name: 'Sam', role: 'Data Analyst' }, { name: 'Jo', role: 'Ethics Advisor' },
  ]},
  { name: 'Business Team', task: 'Create a go-to-market strategy for a SaaS product', agents: [
    { name: 'Morgan', role: 'CEO' }, { name: 'Riley', role: 'Marketing Head' }, { name: 'Taylor', role: 'Sales Director' }, { name: 'Jordan', role: 'CFO' },
  ]},
]

export default function MultiAgent() {
  const [task, setTask] = useState('')
  const [model, setModel] = useState<ModelEntry | null>(null)
  const [maxRounds, setMaxRounds] = useState(3)
  const [agents, setAgents] = useState<Agent[]>([
    { id: 1, name: 'Agent 1', role: 'Product Manager', color: 'blue' },
    { id: 2, name: 'Agent 2', role: 'Senior Engineer', color: 'emerald' },
    { id: 3, name: 'Agent 3', role: 'QA Engineer', color: 'amber' },
  ])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const addAgent = useCallback(() => {
    const id = agents.length + 1
    const color = AGENT_COLORS[(id - 1) % AGENT_COLORS.length]
    setAgents(prev => [...prev, { id, name: `Agent ${id}`, role: '', color }])
  }, [agents.length])

  const removeAgent = useCallback((id: number) => {
    if (agents.length <= 2) return
    setAgents(prev => prev.filter(a => a.id !== id))
  }, [agents.length])

  const updateAgent = useCallback((id: number, field: 'name' | 'role', value: string) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a))
  }, [])

  const loadPreset = useCallback((preset: typeof PRESETS[0]) => {
    setTask(preset.task)
    setAgents(preset.agents.map((a, i) => ({ id: i + 1, name: a.name, role: a.role, color: AGENT_COLORS[i % AGENT_COLORS.length] })))
  }, [])

  const runDiscussion = useCallback(async () => {
    if (!task.trim() || agents.some(a => !a.role.trim())) return
    setError(''); setMsgs([]); setRunning(true)
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    try {
      // Each agent maintains its own conversation history
      const histories: { role: string; content: string }[][] = agents.map((a, i) => [
        { role: 'system', content: `You are ${a.name}, a ${a.role}. ${model?.persona ? 'You are ' + model.persona + '.' : ''} You are part of a team discussing: ${task.trim()}. Share your perspective as a ${a.role}. Be concise (2-4 sentences per turn). Build on others' ideas. If you agree, say so briefly and add new insight. Stay in character.` }
      ])

      for (let round = 0; round < maxRounds; round++) {
        for (let i = 0; i < agents.length; i++) {
          if (signal.aborted) break

          const agent = agents[i]
          const cm = AGENT_COLOR_MAP[agent.color] || AGENT_COLOR_MAP.blue

          // Build context of what other agents said
          const recentContext = msgs.slice(-6).map(m => `${m.agentName} (${m.agentRole}): ${m.content.substring(0, 200)}`).join('\n')
          const userMsg = round === 0 && i === 0
            ? `The team needs to discuss: ${task.trim()}\n\nAs ${agent.name} (${agent.role}), share your opening thoughts and proposed approach.`
            : round === 0
            ? `The team is discussing: ${task.trim()}\n\nPrevious contributions:\n${recentContext || 'None yet'}\n\nAs ${agent.name} (${agent.role}), share your perspective.`
            : `Round ${round + 1}. Previous discussion:\n${recentContext}\n\nAs ${agent.name} (${agent.role}), continue the discussion. Add new ideas or build on previous points.`

          histories[i].push({ role: 'user', content: userMsg })
          const res = await callAI(histories[i], signal, model)
          histories[i].push({ role: 'assistant', content: res.content })

          setMsgs(prev => [...prev, {
            agentId: agent.id, agentName: agent.name, agentRole: agent.role,
            content: res.content, color: agent.color, modelLabel: res.modelLabel, provider: res.provider,
          }])
        }
        if (signal.aborted) break
      }

      // Summary
      if (!signal.aborted) {
        const summaryMsgs = [
          { role: 'system', content: 'You are a meeting facilitator. Summarize team discussions into key decisions and action items.' },
          { role: 'user', content: `Summarize this team discussion about "${task.trim()}" into:\n1. Key decisions made\n2. Action items\n3. Open questions\n\nDiscussion:\n${msgs.map(m => `${m.agentName} (${m.agentRole}): ${m.content.substring(0, 300)}`).join('\n\n')}` }
        ]
        const summaryRes = await callAI(summaryMsgs, signal, model)
        setMsgs(prev => [...prev, {
          agentId: -1, agentName: '📋 Summary', agentRole: 'Meeting Facilitator',
          content: summaryRes.content, color: 'purple', modelLabel: summaryRes.modelLabel, provider: summaryRes.provider,
        }])
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      if (m !== 'The user aborted a request.') setError(m)
    } finally { setRunning(false) }
  }, [task, model, maxRounds, agents, msgs])

  const stop = useCallback(() => { abortRef.current?.abort(); setRunning(false) }, [])
  const reset = useCallback(() => { setMsgs([]); setError('') }, [])

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">🎯 Discussion Topic</label>
          <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="What should the agents discuss?" rows={2} className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
        </div>

        {/* Agent Configuration */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] font-semibold text-gray-400">👥 Agents ({agents.length})</label>
            <button onClick={addAgent} disabled={agents.length >= 6} className="px-2 py-1 rounded-lg bg-white/10 text-gray-300 text-[10px] hover:bg-white/20 disabled:opacity-40">+ Add Agent</button>
          </div>
          <div className="space-y-1.5">
            {agents.map(a => {
              const cm = AGENT_COLOR_MAP[a.color] || AGENT_COLOR_MAP.blue
              return (
                <div key={a.id} className="flex items-center gap-2">
                  <div className={`w-2 h-8 rounded-full ${cm.bg} ${cm.border} border-l-2`} />
                  <input value={a.name} onChange={e => updateAgent(a.id, 'name', e.target.value)} placeholder="Name" className="w-24 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400/50" />
                  <input value={a.role} onChange={e => updateAgent(a.id, 'role', e.target.value)} placeholder="Role (e.g. Product Manager)" className="flex-1 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-400/50" />
                  <button onClick={() => removeAgent(a.id)} disabled={agents.length <= 2} className="text-red-400/50 hover:text-red-400 text-xs disabled:opacity-30">✕</button>
                </div>
              )
            })}
          </div>
        </div>

        <ModelSelector label="🤖 AI Model" icon="🤖" selected={model} onSelect={setModel} accentColor="amber" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-gray-400">Rounds:</label>
            <input type="number" min={1} max={10} value={maxRounds} onChange={e => setMaxRounds(Number(e.target.value))} className="w-14 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white text-sm text-center focus:outline-none" />
          </div>
          <div className="flex gap-2 ml-auto">
            {!running ? (
              <button onClick={runDiscussion} disabled={!task.trim() || agents.some(a => !a.role.trim())} className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 disabled:opacity-40">👥 Start Discussion</button>
            ) : (
              <button onClick={stop} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">⏹ Stop</button>
            )}
            {msgs.length > 0 && <button onClick={reset} className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 text-sm">🔄 Reset</button>}
          </div>
        </div>

        {!running && msgs.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p, i) => (
              <button key={i} onClick={() => loadPreset(p)} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[10px] hover:bg-white/10 hover:text-white transition-all">
                {p.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="space-y-2 max-h-[45vh] sm:max-h-[55vh] overflow-y-auto pr-1">
        {msgs.length === 0 && running && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3 animate-bounce">👥</div>
            <p className="text-gray-400 text-sm">Agents are discussing...</p>
          </div>
        )}
        {msgs.map((m, i) => {
          const cm = AGENT_COLOR_MAP[m.color] || AGENT_COLOR_MAP.blue
          return (
            <div key={i} className={`p-3 rounded-xl border-l-4 ${cm.bg} ${cm.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${cm.badge}`}>
                  {m.agentName} — {m.agentRole}
                </span>
                {m.modelLabel && <span className="text-[9px] text-gray-500">via {m.modelLabel}</span>}
              </div>
              <SimpleMarkdown content={m.content} />
            </div>
          )
        })}
        {running && <div className="text-center text-gray-500 text-sm animate-pulse">🔄 Agent is thinking...</div>}
        <div ref={endRef} />
      </div>
    </div>
  )
}
