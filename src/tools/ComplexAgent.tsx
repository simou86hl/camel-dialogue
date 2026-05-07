import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SimpleMarkdown, ModelSelector, callAI, ModelEntry } from '../shared'

interface Step { id: number; type: 'think' | 'plan' | 'act' | 'observe' | 'reflect'; content: string; modelLabel?: string; provider?: string }

const COMPLEXITY_PRESETS = [
  { label: 'Quick Analysis', depth: 2, desc: 'Fast analysis with minimal steps' },
  { label: 'Standard', depth: 4, desc: 'Balanced depth and speed' },
  { label: 'Deep Research', depth: 6, desc: 'Thorough multi-step reasoning' },
]

export default function ComplexAgent() {
  const [task, setTask] = useState('')
  const [model, setModel] = useState<ModelEntry | null>(null)
  const [depth, setDepth] = useState(4)
  const [steps, setSteps] = useState<Step[]>([])
  const [running, setRunning] = useState(false)
  const [error, setError] = useState('')
  const [currentPhase, setCurrentPhase] = useState<string>('')
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [steps])

  const runAgent = useCallback(async () => {
    if (!task.trim()) return
    setError(''); setSteps([]); setRunning(true)
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal
    const persona = model?.persona ? `You are ${model.persona}. ` : ''

    try {
      // Phase 1: THINK — Understand the problem
      setCurrentPhase('🧠 Thinking...')
      const thinkMsgs = [
        { role: 'system', content: `${persona}You are an advanced AI agent using the ReAct (Reason+Act) pattern. Analyze problems step by step.` },
        { role: 'user', content: `Analyze this task deeply:\n\n${task.trim()}\n\nBreak down:\n1. What is the core problem?\n2. What are the key challenges?\n3. What information is needed?\n4. What approach would work best?\n\nThink step by step.` }
      ]
      const thinkRes = await callAI(thinkMsgs, signal, model)
      setSteps(prev => [...prev, { id: 1, type: 'think', content: thinkRes.content, modelLabel: thinkRes.modelLabel, provider: thinkRes.provider }])

      if (signal.aborted) return

      // Phase 2: PLAN — Create execution plan
      setCurrentPhase('📋 Planning...')
      const planMsgs = [
        { role: 'system', content: `${persona}You are a strategic planning AI. Create detailed, actionable plans.` },
        { role: 'user', content: `Based on this analysis:\n${thinkRes.content}\n\nCreate a detailed step-by-step plan to accomplish: ${task.trim()}\n\nFor each step, specify:\n- What to do\n- Expected output\n- Dependencies\n\nBe specific and actionable.` }
      ]
      const planRes = await callAI(planMsgs, signal, model)
      setSteps(prev => [...prev, { id: 2, type: 'plan', content: planRes.content, modelLabel: planRes.modelLabel, provider: planRes.provider }])

      if (signal.aborted) return

      // Phase 3-6: ACT → OBSERVE → REFLECT (repeat for depth)
      let accumulatedKnowledge = `Analysis:\n${thinkRes.content}\n\nPlan:\n${planRes.content}\n\n`

      for (let i = 0; i < Math.min(depth, 6); i++) {
        if (signal.aborted) break

        // ACT — Execute next step
        setCurrentPhase(`⚡ Acting (Step ${i + 1})...`)
        const actMsgs = [
          { role: 'system', content: `${persona}You are an execution AI. Produce concrete, detailed results for each step.` },
          { role: 'user', content: `Task: ${task.trim()}\n\nCurrent progress:\n${accumulatedKnowledge}\n\nExecute step ${i + 1} of the plan. Produce a detailed, concrete result. Include specific details, examples, or code if relevant.` }
        ]
        const actRes = await callAI(actMsgs, signal, model)
        setSteps(prev => [...prev, { id: 3 + i * 3, type: 'act', content: actRes.content, modelLabel: actRes.modelLabel, provider: actRes.provider }])
        accumulatedKnowledge += `Step ${i + 1} Result:\n${actRes.content}\n\n`

        if (signal.aborted) break

        // OBSERVE — Analyze the result
        setCurrentPhase(`👁️ Observing (Step ${i + 1})...`)
        const obsMsgs = [
          { role: 'system', content: 'You are an analytical observer. Evaluate results objectively and identify gaps or issues.' },
          { role: 'user', content: `Task: ${task.trim()}\n\nStep ${i + 1} result:\n${actRes.content}\n\nObserve and evaluate:\n1. Is this result correct and complete?\n2. What gaps or issues remain?\n3. What should the next step focus on?\n4. Are we closer to the goal?` }
        ]
        const obsRes = await callAI(obsMsgs, signal, model)
        setSteps(prev => [...prev, { id: 4 + i * 3, type: 'observe', content: obsRes.content, modelLabel: obsRes.modelLabel, provider: obsRes.provider }])

        if (signal.aborted) break

        // REFLECT — Should we continue?
        setCurrentPhase(`🪞 Reflecting (Step ${i + 1})...`)
        const refMsgs = [
          { role: 'system', content: 'You are a reflective AI. Decide if the task is complete or needs more work.' },
          { role: 'user', content: `Task: ${task.trim()}\n\nProgress so far:\n${accumulatedKnowledge}\n\nObservation:\n${obsRes.content}\n\nIs the task complete? If yes, respond with "TASK_COMPLETE:" followed by the final summary. If not, explain what still needs to be done.` }
        ]
        const refRes = await callAI(refMsgs, signal, model)
        setSteps(prev => [...prev, { id: 5 + i * 3, type: 'reflect', content: refRes.content, modelLabel: refRes.modelLabel, provider: refRes.provider }])

        if (refRes.content.includes('TASK_COMPLETE:')) break
        accumulatedKnowledge += `Observation:\n${obsRes.content}\nReflection:\n${refRes.content}\n\n`
      }

      // Final Summary
      if (!signal.aborted) {
        setCurrentPhase('📝 Generating summary...')
        const sumMsgs = [
          { role: 'system', content: 'You are a synthesis AI. Combine all work into a clear, actionable final deliverable.' },
          { role: 'user', content: `Original task: ${task.trim()}\n\nAll work done:\n${accumulatedKnowledge}\n\nProvide a comprehensive final deliverable that:\n1. Summarizes the key findings\n2. Lists the main results\n3. Provides actionable next steps\n4. Notes any limitations or caveats` }
        ]
        const sumRes = await callAI(sumMsgs, signal, model)
        setSteps(prev => [...prev, { id: 999, type: 'reflect', content: `## 📋 Final Deliverable\n\n${sumRes.content}`, modelLabel: sumRes.modelLabel, provider: sumRes.provider }])
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      if (m !== 'The user aborted a request.') setError(m)
    } finally { setRunning(false); setCurrentPhase('') }
  }, [task, model, depth])

  const stop = useCallback(() => { abortRef.current?.abort(); setRunning(false); setCurrentPhase('') }, [])
  const reset = useCallback(() => { setSteps([]); setError(''); setTask('') }, [])

  const stepIcon = (type: Step['type']) => {
    switch (type) {
      case 'think': return '🧠'
      case 'plan': return '📋'
      case 'act': return '⚡'
      case 'observe': return '👁️'
      case 'reflect': return '🪞'
    }
  }

  const stepColor = (type: Step['type']) => {
    switch (type) {
      case 'think': return { bg: 'bg-indigo-500/5', border: 'border-l-indigo-400', text: 'text-indigo-300' }
      case 'plan': return { bg: 'bg-blue-500/5', border: 'border-l-blue-400', text: 'text-blue-300' }
      case 'act': return { bg: 'bg-emerald-500/5', border: 'border-l-emerald-400', text: 'text-emerald-300' }
      case 'observe': return { bg: 'bg-amber-500/5', border: 'border-l-amber-400', text: 'text-amber-300' }
      case 'reflect': return { bg: 'bg-purple-500/5', border: 'border-l-purple-400', text: 'text-purple-300' }
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">🎯 Complex Task</label>
          <textarea value={task} onChange={e => setTask(e.target.value)} placeholder="Describe a complex task requiring multi-step reasoning..." rows={3} className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400/50" />
        </div>

        <ModelSelector label="🤖 AI Model" icon="🤖" selected={model} onSelect={setModel} accentColor="purple" />

        <div>
          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">🔧 Depth</label>
          <div className="flex gap-1.5">
            {COMPLEXITY_PRESETS.map((p, i) => (
              <button key={i} onClick={() => setDepth(p.depth)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${depth === p.depth ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10'}`}
              >
                {p.label}
                <span className="text-[9px] text-gray-500 ml-1">({p.depth}x)</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          {!running ? (
            <button onClick={runAgent} disabled={!task.trim()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-500 text-white text-sm font-bold shadow-lg shadow-purple-500/20 disabled:opacity-40">🧠 Run Complex Agent</button>
          ) : (
            <button onClick={stop} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">⏹ Stop</button>
          )}
          {steps.length > 0 && <button onClick={reset} className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 text-sm">🔄 Reset</button>}
        </div>
      </div>

      {currentPhase && <div className="px-1 text-sm text-indigo-400 animate-pulse">{currentPhase}</div>}
      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {steps.length === 0 && !running && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🧠</div>
            <p className="text-gray-400 text-sm">Complex Agent uses Think → Plan → Act → Observe → Reflect</p>
            <p className="text-gray-500 text-xs mt-1">Multi-step reasoning for complex tasks</p>
          </div>
        )}

        {/* Timeline */}
        {steps.map((s, i) => {
          const c = stepColor(s.type)
          return (
            <div key={s.id} className={`p-3 rounded-xl border-l-4 ${c.bg} ${c.border}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold ${c.text}`}>
                  {stepIcon(s.type)} {s.type.toUpperCase()}
                </span>
                {s.modelLabel && <span className="text-[9px] text-gray-500">via {s.modelLabel}</span>}
              </div>
              <SimpleMarkdown content={s.content} />
            </div>
          )
        })}
        {running && <div className="text-center text-gray-500 text-sm animate-pulse">🔄 Agent is reasoning...</div>}
        <div ref={endRef} />
      </div>
    </div>
  )
}
