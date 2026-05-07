import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SimpleMarkdown, ModelSelector, callAI, ModelEntry } from '../shared'

interface TaskItem { id: number; text: string; status: 'pending' | 'running' | 'done'; result?: string }
interface LogEntry { step: number; type: 'plan' | 'execute' | 'evaluate'; content: string; modelLabel?: string; provider?: string }

export default function BabyAGI() {
  const [objective, setObjective] = useState('')
  const [model, setModel] = useState<ModelEntry | null>(null)
  const [maxIterations, setMaxIterations] = useState(5)
  const [running, setRunning] = useState(false)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [error, setError] = useState('')
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const [currentStep, setCurrentStep] = useState<'idle' | 'planning' | 'executing' | 'evaluating'>('idle')

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [logs])

  const runBabyAGI = useCallback(async () => {
    if (!objective.trim()) return
    setError(''); setTasks([]); setLogs([]); setRunning(true)
    abortRef.current = new AbortController()
    const signal = abortRef.current.signal

    try {
      // Step 1: Create initial task list
      setCurrentStep('planning')
      const planMsgs = [
        { role: 'system', content: `You are a task planning AI. ${model?.persona ? 'You are ' + model.persona + '.' : ''} Break down objectives into specific, actionable tasks. Return ONLY a numbered list of tasks, one per line. No explanations.` },
        { role: 'user', content: `Break down this objective into 3-5 specific tasks:\n\n${objective.trim()}` }
      ]
      const planRes = await callAI(planMsgs, signal, model)
      const taskLines = planRes.content.split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim())
      if (taskLines.length === 0) {
        // Fallback: try splitting by newlines
        const fallback = planRes.content.split('\n').filter(l => l.trim().length > 5 && !l.startsWith('#')).map(l => l.replace(/^[-*]\s*/, '').trim())
        if (fallback.length === 0) throw new Error('Could not parse task list from AI response')
        fallback.forEach((t, i) => {
          setTasks(prev => [...prev, { id: i, text: t, status: 'pending' }])
        })
        setLogs(prev => [...prev, { step: 0, type: 'plan', content: planRes.content, modelLabel: planRes.modelLabel, provider: planRes.provider }])
      } else {
        taskLines.forEach((t, i) => {
          setTasks(prev => [...prev, { id: i, text: t, status: 'pending' }])
        })
        setLogs(prev => [...prev, { step: 0, type: 'plan', content: planRes.content, modelLabel: planRes.modelLabel, provider: planRes.provider }])
      }

      // Wait a tick for state to settle
      await new Promise(r => setTimeout(r, 100))

      // Get current tasks from the ref
      let currentTasks: TaskItem[] = []
      setTasks(prev => { currentTasks = prev; return prev })

      // Step 2: Execute tasks one by one
      for (let iteration = 0; iteration < maxIterations; iteration++) {
        if (signal.aborted) break

        // Find next pending task
        const pendingIdx = currentTasks.findIndex(t => t.status === 'pending')
        if (pendingIdx === -1) break

        const currentTask = currentTasks[pendingIdx]
        setCurrentStep('executing')
        setTasks(prev => prev.map((t, i) => i === pendingIdx ? { ...t, status: 'running' } : t))

        const execMsgs = [
          { role: 'system', content: `You are a task execution AI. ${model?.persona ? 'You are ' + model.persona + '.' : ''} Execute tasks thoroughly and provide concrete results. Be specific and actionable.` },
          { role: 'user', content: `Objective: ${objective.trim()}\n\nCurrent task to execute: ${currentTask.text}\n\nPrevious completed tasks:\n${currentTasks.filter(t => t.status === 'done').map((t, i) => `${i + 1}. ${t.text}: ${t.result || 'Done'}`).join('\n')}\n\nExecute this task now. Provide a detailed result.` }
        ]
        const execRes = await callAI(execMsgs, signal, model)
        setTasks(prev => { currentTasks = prev.map((t, i) => i === pendingIdx ? { ...t, status: 'done', result: execRes.content } : t); return currentTasks })
        setLogs(prev => [...prev, { step: iteration + 1, type: 'execute', content: `**Task: ${currentTask.text}**\n\n${execRes.content}`, modelLabel: execRes.modelLabel, provider: execRes.provider }])

        // Step 3: Evaluate if new tasks are needed
        setCurrentStep('evaluating')
        const evalMsgs = [
          { role: 'system', content: `You are a task evaluation AI. Based on the objective and completed work, determine if new tasks are needed. If the objective is FULLY achieved, respond with "OBJECTIVE_COMPLETE". Otherwise, list ONLY new tasks that are still needed, one per line with numbers.` },
          { role: 'user', content: `Objective: ${objective.trim()}\n\nCompleted tasks:\n${currentTasks.filter(t => t.status === 'done').map((t, i) => `${i + 1}. ${t.text}`).join('\n')}\n\nAre there additional tasks needed to fully achieve the objective? If yes, list them. If the objective is fully achieved, say "OBJECTIVE_COMPLETE".` }
        ]
        const evalRes = await callAI(evalMsgs, signal, model)

        if (evalRes.content.includes('OBJECTIVE_COMPLETE')) {
          setLogs(prev => [...prev, { step: iteration + 1, type: 'evaluate', content: '✅ Objective achieved! All tasks completed.', modelLabel: evalRes.modelLabel, provider: evalRes.provider }])
          break
        } else {
          const newTaskLines = evalRes.content.split('\n').filter(l => l.trim().match(/^\d+\./)).map(l => l.replace(/^\d+\.\s*/, '').trim())
          if (newTaskLines.length > 0) {
            const newTasks = newTaskLines.map((text, i) => ({ id: currentTasks.length + i, text, status: 'pending' as const }))
            setTasks(prev => { currentTasks = [...prev, ...newTasks]; return currentTasks })
            setLogs(prev => [...prev, { step: iteration + 1, type: 'evaluate', content: `Added ${newTaskLines.length} new task(s):\n${newTaskLines.map((t, i) => `${i + 1}. ${t}`).join('\n')}`, modelLabel: evalRes.modelLabel, provider: evalRes.provider }])
          }
          await new Promise(r => setTimeout(r, 100))
        }
      }
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      if (m !== 'The user aborted a request.') setError(m)
    } finally { setRunning(false); setCurrentStep('idle') }
  }, [objective, model, maxIterations])

  const stop = useCallback(() => { abortRef.current?.abort(); setRunning(false); setCurrentStep('idle') }, [])
  const reset = useCallback(() => { setTasks([]); setLogs([]); setError(''); setObjective('') }, [])

  const doneCount = tasks.filter(t => t.status === 'done').length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (doneCount / totalCount) * 100 : 0

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">🎯 Objective</label>
          <textarea value={objective} onChange={e => setObjective(e.target.value)} placeholder="What do you want the AI agent to achieve?" rows={2} className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-rose-400/50" />
        </div>
        <ModelSelector label="🤖 AI Model" icon="🤖" selected={model} onSelect={setModel} accentColor="rose" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-[11px] font-semibold text-gray-400">Max Iterations:</label>
            <input type="number" min={2} max={15} value={maxIterations} onChange={e => setMaxIterations(Number(e.target.value))} className="w-16 px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-white text-sm text-center focus:outline-none" />
          </div>
          <div className="flex gap-2 ml-auto">
            {!running ? (
              <button onClick={runBabyAGI} disabled={!objective.trim()} className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-400 to-pink-500 text-white text-sm font-bold shadow-lg shadow-pink-500/20 disabled:opacity-40">🤖 Run BabyAGI</button>
            ) : (
              <button onClick={stop} className="px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600">⏹ Stop</button>
            )}
            {tasks.length > 0 && <button onClick={reset} className="px-3 py-2 rounded-xl bg-white/10 text-gray-300 text-sm">🔄 Reset</button>}
          </div>
        </div>
      </div>

      {currentStep !== 'idle' && (
        <div className="flex items-center gap-3 px-1">
          <span className="text-xs text-gray-400">Status:</span>
          {currentStep === 'planning' && <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium animate-pulse">📋 Planning tasks...</span>}
          {currentStep === 'executing' && <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-medium animate-pulse">⚡ Executing task...</span>}
          {currentStep === 'evaluating' && <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-xs font-medium animate-pulse">🔍 Evaluating progress...</span>}
        </div>
      )}

      {error && <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {/* Task Board */}
      {tasks.length > 0 && (
        <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">📋 Task Board</h3>
            <span className="text-xs text-gray-400">{doneCount}/{totalCount} done</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-1.5 mb-3">
            <div className="bg-gradient-to-r from-rose-400 to-pink-500 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="space-y-1.5 max-h-36 sm:max-h-48 overflow-y-auto">
            {tasks.map(t => (
              <div key={t.id} className={`flex items-start gap-2 p-2 rounded-lg ${t.status === 'done' ? 'bg-emerald-500/5' : t.status === 'running' ? 'bg-amber-500/10' : 'bg-white/[0.02]'}`}>
                <span className="text-sm mt-0.5">{t.status === 'done' ? '✅' : t.status === 'running' ? '⏳' : '⬜'}</span>
                <span className={`text-sm ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-300'}`}>{t.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Execution Log */}
      {logs.length > 0 && (
        <div className="space-y-2 max-h-[35vh] sm:max-h-[40vh] overflow-y-auto pr-1">
          {logs.map((log, i) => (
            <div key={i} className={`p-3 rounded-xl border-l-4 ${log.type === 'plan' ? 'bg-blue-500/5 border-l-blue-400' : log.type === 'execute' ? 'bg-emerald-500/5 border-l-emerald-400' : 'bg-amber-500/5 border-l-amber-400'}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold ${log.type === 'plan' ? 'text-blue-400' : log.type === 'execute' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {log.type === 'plan' ? '📋 Plan' : log.type === 'execute' ? '⚡ Execute' : '🔍 Evaluate'} — Step {log.step}
                </span>
                {log.modelLabel && <span className="text-[9px] text-gray-500">via {log.modelLabel}</span>}
              </div>
              <SimpleMarkdown content={log.content} />
            </div>
          ))}
          <div ref={endRef} />
        </div>
      )}

      {tasks.length > 0 && doneCount === totalCount && currentStep === 'idle' && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-rose-500/10 to-pink-500/10 border border-rose-500/30 text-center">
          <p className="text-rose-400 font-bold text-lg">🤖 BabyAGI Complete!</p>
          <p className="text-gray-400 text-sm mt-1">{totalCount} tasks executed</p>
        </div>
      )}
    </div>
  )
}
