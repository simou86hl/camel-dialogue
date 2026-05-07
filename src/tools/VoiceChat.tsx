import React, { useState, useRef, useCallback, useEffect } from 'react'
import { SimpleMarkdown, ModelSelector, callAI, ModelEntry } from '../shared'

interface Msg { role: 'user' | 'assistant'; content: string; modelLabel?: string; provider?: string }

export default function VoiceChat() {
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [running, setRunning] = useState(false)
  const [model, setModel] = useState<ModelEntry | null>(null)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const abortRef = useRef<AbortController | null>(null)
  const endRef = useRef<HTMLDivElement | null>(null)
  const recognitionRef = useRef<any>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  // Speech Synthesis
  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text.replace(/[#*`_~]/g, '').replace(/<[^>]*>/g, ''))
    utterance.rate = 1.0
    utterance.pitch = 1.0
    utterance.onstart = () => setSpeaking(true)
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => setSpeaking(false)
    window.speechSynthesis.speak(utterance)
  }, [voiceEnabled])

  // Speech Recognition
  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('Speech recognition not supported in this browser. Try Chrome.'); return }
    const recognition = new SR()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'
    recognition.onstart = () => setListening(true)
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      setInput(prev => prev + transcript)
      setListening(false)
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const send = useCallback(async () => {
    if (!input.trim() || running) return
    const userMsg = input.trim()
    setInput(''); setRunning(true)
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: userMsg }]
    setMsgs(newMsgs)
    abortRef.current = new AbortController()
    try {
      const systemMsg = { role: 'system', content: `You are a helpful voice chat assistant. Be conversational, concise, and natural. Respond as if having a spoken conversation. Keep responses brief (2-4 sentences unless more detail is needed).${model?.persona ? ' You are ' + model.persona + '.' : ''}` }
      const apiMsgs = [systemMsg, ...newMsgs.map(m => ({ role: m.role, content: m.content }))]
      const res = await callAI(apiMsgs, abortRef.current.signal, model)
      setMsgs(prev => [...prev, { role: 'assistant', content: res.content, modelLabel: res.modelLabel, provider: res.provider }])
      speak(res.content)
    } catch (e: unknown) {
      const m = e instanceof Error ? e.message : String(e)
      if (m !== 'The user aborted a request.') setMsgs(prev => [...prev, { role: 'assistant', content: `❌ Error: ${m}` }])
    } finally { setRunning(false) }
  }, [input, running, msgs, model, speak])

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }, [send])

  return (
    <div className="space-y-4">
      <div className="bg-white/[0.03] backdrop-blur-sm rounded-2xl border border-white/10 p-4 space-y-3">
        <ModelSelector label="🤖 AI Model" icon="🤖" selected={model} onSelect={setModel} accentColor="purple" />
        <div className="flex items-center gap-3">
          <button onClick={() => setVoiceEnabled(!voiceEnabled)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${voiceEnabled ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-white/10 text-gray-400'}`}>
            {voiceEnabled ? '🔊 Voice On' : '🔇 Voice Off'}
          </button>
          {speaking && <span className="text-xs text-purple-400 animate-pulse">🔊 Speaking...</span>}
        </div>
      </div>

      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {msgs.length === 0 && (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🎙️</div>
            <p className="text-gray-400 text-sm">Start a voice conversation with AI</p>
            <p className="text-gray-500 text-xs mt-1">Click the mic to speak, or type your message</p>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`p-3 rounded-xl ${m.role === 'user' ? 'bg-blue-500/10 border-l-4 border-l-blue-400 ml-8' : 'bg-purple-500/10 border-l-4 border-l-purple-400 mr-8'}`}>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-bold ${m.role === 'user' ? 'text-blue-400' : 'text-purple-400'}`}>
                {m.role === 'user' ? '👤 You' : '🤖 AI'}
              </span>
              {m.modelLabel && <span className="text-[9px] text-gray-500">via {m.modelLabel}</span>}
            </div>
            {m.role === 'assistant' ? <SimpleMarkdown content={m.content} /> : <p className="text-sm text-gray-300">{m.content}</p>}
          </div>
        ))}
        {running && <div className="text-center text-gray-500 text-sm animate-pulse">🤖 AI is thinking...</div>}
        <div ref={endRef} />
      </div>

      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <textarea
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder="Type your message or click the mic to speak..."
            rows={2} className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white text-sm resize-none placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-400/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <button
            onClick={listening ? stopListening : startListening}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${listening ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/40' : 'bg-purple-500 hover:bg-purple-600 shadow-lg shadow-purple-500/20'}`}
          >
            {listening ? '⏹' : '🎙️'}
          </button>
          <button
            onClick={send} disabled={running || !input.trim()}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/20 disabled:opacity-40"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  )
}
