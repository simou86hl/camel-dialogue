import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SimpleMarkdown, ModelSelector, callAI, ModelEntry } from '../shared'

interface Turn { speaker: 'instructor' | 'executor'; role: string; content: string; modelLabel?: string; provider?: string }

function instructorPrompt(role: string, otherRole: string, task: string, persona?: string) {
  const pfx = persona ? `You are ${persona}. ` : ''
  return `${pfx}Never forget you are a ${role} and I am a ${otherRole}. Never flip roles!\nWe share a common interest in collaborating to successfully complete a task.\n\nYou must help me to complete the task: ${task}\n\nHere are rules you MUST follow:\n1. I will give you instructions, and your task is to give me a SPECIFIC, ACTIONABLE response.\n2. Always issue ONE clear instruction at a time.\n3. When the task is COMPLETE, reply with ONLY "<TASK_DONE>" and a brief 1-line summary.\n4. Be concise. Maximum 3 sentences per turn.\n5. Never apologize. Never explain. Just instruct.`
}

function executorPrompt(role: string, otherRole: string, task: string, persona?: string) {
  const pfx = persona ? `You are ${persona}. ` : ''
  return `${pfx}Never forget you are a ${role} and I am a ${otherRole}. Never flip roles!\nYou will give me instructions to complete the task: ${task}\n\nHere are rules you MUST follow:\n1. For each instruction, perform it concretely. If you produce a deliverable, include it in full.\n2. After performing the instruction, write "Next request:" and propose what comes next.\n3. If the task is complete, write the final deliverable, then "<TASK_DONE>".\n4. Be concise. No filler. No apologies.`
}

async function runDialogue(params: {
  task: string; instructorRole: string; executorRole: string; maxTurns: number
  iModel: ModelEntry | null; eModel: ModelEntry | null
  signal?: AbortSignal; onTurn: (t: Turn) => void
}) {
  const { task, instructorRole, executorRole, maxTurns, iModel, eModel, signal, onTurn } = params
  const iMsgs: { role: string; content: string }[] = [
    { role: 'system', content: instructorPrompt(instructorRole, executorRole, task, iModel?.persona) },
    { role: 'user', content: 'Now start to give me instructions one by one. Only reply with one Instruction at a time.' },
  ]
  const eMsgs: { role: string; content: string }[] = [
    { role: 'system', content: executorPrompt(executorRole, instructorRole, task, eModel?.persona) },
  ]

  let iRes = await callAI(iMsgs, signal, iModel)
  iMsgs.push({ role: 'assistant', content: iRes.content })
  onTurn({ speaker: 'instructor', role: instructorRole, content: iRes.content, modelLabel: iRes.modelLabel, provider: iRes.provider })

  for (let i = 0; i < maxTurns && !(signal?.aborted || iRes.content.includes('<TASK_DONE>')); i++) {
    eMsgs.push({ role: 'user', content: iRes.content })
    const eRes = await callAI(eMsgs, signal, eModel)
    eMsgs.push({ role: 'assistant', content: eRes.content })
    onTurn({ speaker: 'executor', role: executorRole, content: eRes.content, modelLabel: eRes.modelLabel, provider: eRes.provider })
    if (eRes.content.includes('<TASK_DONE>')) break
    iMsgs.push({ role: 'user', content: eRes.content })
    iRes = await callAI(iMsgs, signal, iModel)
    iMsgs.push({ role: 'assistant', content: iRes.content })
    onTurn({ speaker: 'instructor', role: instructorRole, content: iRes.content, modelLabel: iRes.modelLabel, provider: iRes.provider })
  }
}

const EXAMPLES = [
  { task: 'Design a REST API for a todo application with user authentication', instructor: 'Product Manager', executor: 'Senior Backend Engineer' },
  { task: 'Create a marketing strategy for launching an AI-powered code review tool', instructor: 'Marketing Director', executor: 'Growth Hacker' },
  { task: 'Build a real-time chat application with WebSocket support', instructor: 'Tech Lead', executor: 'Full-Stack Developer' },
  { task: 'Plan the architecture for a microservices e-commerce platform', instructor: 'Solutions Architect', executor: 'DevOps Engineer' },
]

export default function CamelDialogue() {
  const [task, setTask] = useState('')
  const [iRole, setIRole] = useState('Product Manager')
  const [eRole, setERole] = useState('Senior Software Engineer')
  const [maxTurns, setMaxTurns] = useState(8)
  const [iModel, setIModel] = useState<ModelEntry | null>(null)
  const [eModel, setEModel] = useState<ModelEntry | null>(null)
  const [useDifferentModels, setUseDifferentModels] = useState(false)
  const [msgs, setMsgs] = useState<Turn[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'chat' | 'split'>('chat')
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const start = useCallback(async () => {
    if (!task.trim()) return
    setError(''); setMsgs([]); setRunning(true)
    abortRef.current = new AbortController()
    try {
      await runDialogue({
        task: task.trim(), instructorRole: iRole, executorRole: eRole, maxTurns,
        iModel, eModel: useDifferentModels ? eModel : iModel,
        signal: abortRef.current.signal,
        onTurn: (t) => setMsgs(p => [...p, t])
      })
    } catch (e: unknown) { const m = e instanceof Error ? e.message : String(e); if (m !== 'The user aborted a request.') setError(m) }
    finally { setRunning(false) }
  }, [task, iRole, eRole, maxTurns, iModel, eModel, useDifferentModels])

  const stop = useCallback(() => { abortRef.current?.abort(); setRunning(false) }, [])
  const reset = useCallback(() => { setMsgs([]); setError(''); setTask('') }, [])
  const done = msgs.some(m => m.content.includes('<TASK_DONE>'))

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">🧠 Instructor Role</label>
            <input value={iRole} onChange={e => setIRole(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-400/50" />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">⚡ Executor Role</label>
            <input value={eRole} onChange={e => setERole(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/50" />
          </div>
        </div>
        <div>
          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">✨ Mission / Task</label>
          <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="Describe the task..." rows={2} className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
        </div>
        <ModelSelector label="🤖 AI Model" icon="🤖" selected={iModel} onSelect={m => { setIModel(m); if (!useDifferentModels) setEModel(m) }} accentColor="blue" />
        <div className="flex items-center gap-2">
          <button onClick={() => setUseDifferentModels(!useDifferentModels)} className={`relative w-9 h-5 rounded-full transition-colors ${useDifferentModels ? 'bg-blue-500' : 'bg-gray-600'}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${useDifferentModels ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
          <span className="text-xs text-gray-400">Different models per agent</span>
        </div>
        {useDifferentModels && <ModelSelector label="⚡ Executor Model" icon="⚡" selected={eModel} onSelect={setEModel} accentColor="emerald" />}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-gray-400">Max Turns:</label>
            <input type="number" min={2} max={20} value={maxTurns} onChange={e => setMaxTurns(Number(e.target.value))} className="w-16 px-2 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400/50" />
          </div>
          <div className="flex gap-2 ml-auto">
            {!running ? (
              <button onClick={start} disabled={!task.trim()} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-sm font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all disabled:opacity-40">🐪 Start</button>
            ) : (
              <button onClick={stop} className="px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-all">⏹ Stop</button>
            )}
            {msgs.length > 0 && <button onClick={reset} className="px-3 py-2.5 rounded-xl bg-white/10 text-gray-300 text-sm hover:bg-white/20 transition-all">🔄</button>}
          </div>
        </div>
        {!running && msgs.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex, i) => (
              <button key={i} onClick={() => { setTask(ex.task); setIRole(ex.instructor); setERole(ex.executor) }} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-[10px] hover:bg-white/10 hover:text-white transition-all">
                {ex.instructor} → {ex.executor}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {msgs.length > 0 && (
        <div className="flex gap-1">
          <button onClick={() => setView('chat')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'chat' ? 'bg-white text-gray-900' : 'bg-white/10 text-gray-300'}`}>💬 Chat</button>
          <button onClick={() => setView('split')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${view === 'split' ? 'bg-white text-gray-900' : 'bg-white/10 text-gray-300'}`}>↔ Split</button>
        </div>
      )}

      {msgs.length > 0 && view === 'chat' && (
        <div className="space-y-2 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto pr-1">
          {msgs.map((t, i) => (
            <div key={i} className={`p-3 rounded-xl border-l-4 ${t.speaker === 'instructor' ? 'bg-blue-500/5 border-l-blue-400' : 'bg-emerald-500/5 border-l-emerald-400'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${t.speaker === 'instructor' ? 'bg-blue-500/20 text-blue-300' : 'bg-emerald-500/20 text-emerald-300'}`}>
                  {t.speaker === 'instructor' ? '🧠' : '⚡'} {t.role}
                </span>
                {t.modelLabel && <span className="text-[9px] text-gray-500">via {t.modelLabel} · {t.provider}</span>}
              </div>
              <SimpleMarkdown content={t.content.replace(/<TASK_DONE>/g, '✅ TASK DONE')} />
            </div>
          ))}
          {running && <div className="text-center text-gray-500 text-sm animate-pulse">🔄 AI is thinking...</div>}
          <div ref={endRef} />
        </div>
      )}

      {msgs.length > 0 && view === 'split' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh]">
          <div className="space-y-2 overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">🧠 Instructor ({iRole})</h3>
            {msgs.filter(m => m.speaker === 'instructor').map((t, i) => (
              <div key={i} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                <SimpleMarkdown content={t.content.replace(/<TASK_DONE>/g, '✅ TASK DONE')} />
              </div>
            ))}
          </div>
          <div className="space-y-2 overflow-y-auto pr-1">
            <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">⚡ Executor ({eRole})</h3>
            {msgs.filter(m => m.speaker === 'executor').map((t, i) => (
              <div key={i} className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <SimpleMarkdown content={t.content.replace(/<TASK_DONE>/g, '✅ TASK DONE')} />
              </div>
            ))}
          </div>
        </div>
      )}

      {done && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 text-center">
          <p className="text-amber-400 font-bold text-lg">🐪 CAMEL Dialogue Complete!</p>
          <p className="text-gray-400 text-sm mt-1">{msgs.length} turns exchanged</p>
        </div>
      )}
    </div>
  )
}
