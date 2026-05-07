import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SimpleMarkdown, ModelSelector, callAI, ModelEntry } from '../shared'

interface Msg { role: 'user' | 'assistant'; content: string; modelLabel?: string; provider?: string }

const PERSONAS = [
  { id: 'einstein', name: 'Albert Einstein', emoji: '🔬', desc: 'Theoretical physicist, relativity pioneer', prompt: 'You are Albert Einstein, the legendary theoretical physicist. You think in thought experiments and analogies. You are curious, humble, and love explaining complex ideas simply. You often use physics metaphors. Speak with warmth and intellectual playfulness.' },
  { id: 'tesla', name: 'Nikola Tesla', emoji: '⚡', desc: 'Inventor, electrical engineer, visionary', prompt: 'You are Nikola Tesla, the brilliant inventor and electrical engineer. You are passionate about science and innovation. You speak with confidence about your visions for the future. You sometimes reference your rivalry with Edison and your love for pigeons.' },
  { id: 'shakespeare', name: 'William Shakespeare', emoji: '🎭', desc: 'Playwright, poet, master of language', prompt: 'You are William Shakespeare, the greatest playwright in the English language. You speak with poetic flair, using iambic rhythms, metaphors, and occasional archaic words. You are witty and dramatic, often quoting your own works or composing new verses.' },
  { id: 'machievelli', name: 'Niccolò Machiavelli', emoji: '👑', desc: 'Political philosopher, author of The Prince', prompt: 'You are Niccolò Machiavelli, the Renaissance political philosopher. You are pragmatic, analytical, and often controversial. You discuss power, strategy, and human nature with cold clarity. You reference The Prince and your political experiences.' },
  { id: 'socrates', name: 'Socrates', emoji: '🏛️', desc: 'Athenian philosopher, father of Western philosophy', prompt: 'You are Socrates, the Athenian philosopher. You never give direct answers — instead, you ask probing questions that lead others to discover truth themselves (the Socratic method). You are humble, claiming only that you know that you know nothing.' },
  { id: 'davinci', name: 'Leonardo da Vinci', emoji: '🎨', desc: 'Renaissance polymath: artist, inventor, scientist', prompt: 'You are Leonardo da Vinci, the ultimate Renaissance polymath. You see connections between art, science, and nature. You are endlessly curious, always sketching ideas. You speak about anatomy, engineering, painting, and the beauty of the natural world with equal passion.' },
  { id: 'curie', name: 'Marie Curie', emoji: '☢️', desc: 'Pioneer in radioactivity, first woman Nobel laureate', prompt: 'You are Marie Curie, the pioneering physicist and chemist. You are dedicated, methodical, and passionate about science. You speak about the importance of rigorous research and the thrill of discovery. You occasionally reference your struggles as a woman in science.' },
  { id: 'tesla-ceo', name: 'Elon Musk (Persona)', emoji: '🚀', desc: 'Tech entrepreneur, Mars dreamer', prompt: 'You are a persona inspired by tech entrepreneurs. You think big, talk about Mars colonization, electric vehicles, and AI. You are direct, sometimes controversial, and always thinking about the future of humanity. You use engineering language and first-principles thinking.' },
  { id: 'sherlock', name: 'Sherlock Holmes', emoji: '🔍', desc: 'Consulting detective, master of deduction', prompt: 'You are Sherlock Holmes, the worlds only consulting detective. You are brilliantly observant, analytical, and sometimes condescending. You make deductions from tiny details. You speak precisely and logically. You occasionally reference Dr. Watson and your methods.' },
  { id: 'custom', name: 'Custom Persona', emoji: '✨', desc: 'Create your own persona', prompt: '' },
]

export default function PersonaAgent() {
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0])
  const [customName, setCustomName] = useState('')
  const [customPrompt, setCustomPrompt] = useState('')
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState<ModelEntry | null>(null)
  const [running, setRunning] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = useCallback(async () => {
    if (!input.trim() || running) return
    const userMsg = input.trim()
    setInput(''); setRunning(true)
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: userMsg }]
    setMsgs(newMsgs)
    abortRef.current = new AbortController()
    try {
      const systemPrompt = selectedPersona.id === 'custom'
        ? `You are ${customName}. ${customPrompt}${model?.persona ? ' You are ' + model.persona + '.' : ''}`
        : `${selectedPersona.prompt}${model?.persona ? ' You are ' + model.persona + '.' : ''} Stay in character at all times. Never break character.`
      const apiMsgs = [{ role: 'system', content: systemPrompt }, ...newMsgs.map(m => ({ role: m.role, content: m.content }))]
      const res = await callAI(apiMsgs, abortRef.current.signal, model)
      setMsgs(prev => [...prev, { role: 'assistant', content: res.content, modelLabel: res.modelLabel, provider: res.provider }])
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      if (m !== 'The user aborted a request.') setMsgs(prev => [...prev, { role: 'assistant', content: `❌ Error: ${m}` }])
    } finally { setRunning(false) }
  }, [input, running, msgs, model, selectedPersona, customName, customPrompt])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }, [send])

  const reset = useCallback(() => { setMsgs([]) }, [])

  const personaName = selectedPersona.id === 'custom' ? customName : selectedPersona.name
  const personaEmoji = selectedPersona.id === 'custom' ? '✨' : selectedPersona.emoji

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-3">
        <div>
          <label className="text-[11px] font-semibold text-gray-400 flex items-center gap-1 mb-1">🎭 Choose a Persona</label>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
            {PERSONAS.map(p => (
              <button key={p.id} onClick={() => setSelectedPersona(p)}
                className={`px-2.5 py-2 rounded-lg text-left transition-all ${selectedPersona.id === p.id ? 'bg-purple-500/20 border border-purple-500/30' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.06]'}`}
              >
                <span className="text-sm">{p.emoji}</span>
                <span className={`text-xs font-medium ml-1 ${selectedPersona.id === p.id ? 'text-purple-300' : 'text-gray-300'}`}>{p.name}</span>
                <p className="text-[9px] text-gray-500 mt-0.5">{p.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {selectedPersona.id === 'custom' && (
          <div className="space-y-2">
            <input value={customName} onChange={e => setCustomName(e.target.value)} placeholder="Persona name (e.g. Dr. Sage)" className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50" />
            <textarea value={customPrompt} onChange={e => setCustomPrompt(e.target.value)} placeholder="Describe the persona's personality, background, and speaking style..." rows={2} className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50" />
          </div>
        )}

        <ModelSelector label="🤖 AI Model" icon="🤖" selected={model} onSelect={setModel} accentColor="purple" />

        {msgs.length > 0 && (
          <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-white/10 text-gray-300 text-xs hover:bg-white/20">🔄 New Conversation</button>
        )}
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {msgs.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">{personaEmoji}</div>
            <p className="text-white font-bold">{personaName || 'Select a persona'}</p>
            <p className="text-gray-500 text-sm mt-1">Start a conversation to bring this persona to life</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`p-3 rounded-xl ${m.role === 'user' ? 'bg-blue-500/10 border-l-4 border-l-blue-400 ml-8' : 'bg-purple-500/5 border-l-4 border-l-purple-400 mr-8'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold ${m.role === 'user' ? 'text-blue-400' : 'text-purple-400'}`}>
                {m.role === 'user' ? '👤 You' : `${personaEmoji} ${personaName}`}
              </span>
              {m.modelLabel && <span className="text-[9px] text-gray-500">via {m.modelLabel}</span>}
            </div>
            {m.role === 'assistant' ? <SimpleMarkdown content={m.content} /> : <p className="text-sm text-gray-300">{m.content}</p>}
          </div>
        ))}
        {running && <div className="text-center text-gray-500 text-sm animate-pulse">{personaEmoji} {personaName} is thinking...</div>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 items-end">
        <textarea
          value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
          placeholder={`Talk to ${personaName || 'the persona'}...`}
          rows={2} className="flex-1 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
        />
        <button onClick={send} disabled={running || !input.trim()} className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 disabled:opacity-40">➤</button>
      </div>
    </div>
  )
}
