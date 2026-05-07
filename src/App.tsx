import React, { useState, useEffect } from 'react'
import CamelDialogue from './tools/CamelDialogue'
import VoiceChat from './tools/VoiceChat'
import BabyAGI from './tools/BabyAGI'
import MultiAgent from './tools/MultiAgent'
import PersonaAgent from './tools/PersonaAgent'
import ComplexAgent from './tools/ComplexAgent'

type ToolId = 'camel' | 'voice' | 'babyagi' | 'multi' | 'persona' | 'complex'

const TOOLS: { id: ToolId; name: string; shortName: string; emoji: string; desc: string; gradient: string }[] = [
  { id: 'camel', name: 'CAMEL Dialogue', shortName: 'CAMEL', emoji: '🐪', desc: 'Two AI agents collaborate', gradient: 'from-amber-400 to-orange-500' },
  { id: 'voice', name: 'Voice Chat', shortName: 'Voice', emoji: '🎙️', desc: 'Chat with AI using voice', gradient: 'from-purple-400 to-pink-500' },
  { id: 'babyagi', name: 'BabyAGI', shortName: 'BabyAGI', emoji: '🤖', desc: 'Autonomous task execution', gradient: 'from-rose-400 to-pink-500' },
  { id: 'multi', name: 'Multi-Agent', shortName: 'Multi', emoji: '👥', desc: 'Team of AI agents discuss', gradient: 'from-amber-400 to-orange-500' },
  { id: 'persona', name: 'Persona Agent', shortName: 'Persona', emoji: '🎭', desc: 'Chat with famous personas', gradient: 'from-purple-400 to-pink-500' },
  { id: 'complex', name: 'Complex Agent', shortName: 'Complex', emoji: '🧠', desc: 'Think-Plan-Act-Observe', gradient: 'from-indigo-400 to-purple-500' },
]

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('camel')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const selectTool = (id: ToolId) => {
    setActiveTool(id)
    setSidebarOpen(false) // Close drawer on mobile after selection
  }

  const renderTool = () => {
    switch (activeTool) {
      case 'camel': return <CamelDialogue />
      case 'voice': return <VoiceChat />
      case 'babyagi': return <BabyAGI />
      case 'multi': return <MultiAgent />
      case 'persona': return <PersonaAgent />
      case 'complex': return <ComplexAgent />
    }
  }

  const currentTool = TOOLS.find(t => t.id === activeTool)!

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col md:flex-row">
      {/* ═══ DESKTOP SIDEBAR (hidden on mobile) ═══ */}
      {!isMobile && (
        <div className={`${sidebarOpen ? 'w-56' : 'w-14'} transition-all duration-300 bg-slate-900/80 border-r border-white/5 flex flex-col flex-shrink-0`}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-white/5 transition-colors flex items-center gap-2">
            <span className="text-lg">🤖</span>
            {sidebarOpen && <span className="text-sm font-bold text-white">AI Studio</span>}
          </button>
          <nav className="flex-1 py-2 space-y-0.5">
            {TOOLS.map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id)}
                className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-all ${activeTool === tool.id ? 'bg-white/8 border-r-2 border-white/30' : 'hover:bg-white/5'}`}
              >
                <span className="text-base flex-shrink-0">{tool.emoji}</span>
                {sidebarOpen && (
                  <div className="text-left min-w-0">
                    <p className={`text-xs font-semibold truncate ${activeTool === tool.id ? 'text-white' : 'text-gray-400'}`}>{tool.name}</p>
                    <p className="text-[9px] text-gray-500 truncate">{tool.desc}</p>
                  </div>
                )}
              </button>
            ))}
          </nav>
          {sidebarOpen && (
            <div className="p-3 border-t border-white/5">
              <p className="text-[9px] text-gray-600 text-center">Free AI Tools • No API Key Needed</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ MOBILE DRAWER (overlay) ═══ */}
      {isMobile && sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 z-50 flex flex-col shadow-2xl">
            <div className="p-4 flex items-center justify-between border-b border-white/10">
              <span className="text-sm font-bold text-white">🤖 AI Studio</span>
              <button onClick={() => setSidebarOpen(false)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <nav className="flex-1 py-2 space-y-0.5">
              {TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => selectTool(tool.id)}
                  className={`w-full px-4 py-3 flex items-center gap-3 transition-all ${activeTool === tool.id ? 'bg-white/10 border-l-4 border-white/40' : 'hover:bg-white/5'}`}
                >
                  <span className="text-lg">{tool.emoji}</span>
                  <div className="text-left">
                    <p className={`text-sm font-medium ${activeTool === tool.id ? 'text-white' : 'text-gray-300'}`}>{tool.name}</p>
                    <p className="text-[10px] text-gray-500">{tool.desc}</p>
                  </div>
                </button>
              ))}
            </nav>
          </div>
        </>
      )}

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="mx-auto w-full max-w-5xl px-3 sm:px-4 py-4 sm:py-6 space-y-4 flex-1">
          {/* Header */}
          <div className="flex items-center gap-3">
            {isMobile && (
              <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
                ☰
              </button>
            )}
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${currentTool.gradient} flex items-center justify-center text-white text-lg sm:text-xl shadow-lg flex-shrink-0`}>
              {currentTool.emoji}
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-white truncate">{currentTool.name}</h1>
              <p className="text-[10px] sm:text-xs text-gray-400 truncate">{currentTool.desc}</p>
            </div>
          </div>

          {/* Tool Content */}
          {renderTool()}
        </div>

        {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
        {isMobile && (
          <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-lg border-t border-white/10 px-1 pb-[env(safe-area-inset-bottom)] z-30">
            <div className="flex justify-around">
              {TOOLS.map(tool => (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`flex flex-col items-center justify-center py-2 px-1 min-w-0 flex-1 transition-colors ${activeTool === tool.id ? 'text-white' : 'text-gray-500'}`}
                >
                  <span className={`text-lg ${activeTool === tool.id ? 'scale-110' : ''} transition-transform`}>{tool.emoji}</span>
                  <span className={`text-[9px] mt-0.5 font-medium ${activeTool === tool.id ? 'text-white' : 'text-gray-500'}`}>{tool.shortName}</span>
                  {activeTool === tool.id && <div className="w-1 h-1 rounded-full bg-white mt-0.5" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
