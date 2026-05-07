import React, { useState } from 'react'
import CamelDialogue from './tools/CamelDialogue'
import VoiceChat from './tools/VoiceChat'
import BabyAGI from './tools/BabyAGI'
import MultiAgent from './tools/MultiAgent'
import PersonaAgent from './tools/PersonaAgent'
import ComplexAgent from './tools/ComplexAgent'

type ToolId = 'camel' | 'voice' | 'babyagi' | 'multi' | 'persona' | 'complex'

const TOOLS: { id: ToolId; name: string; emoji: string; desc: string; gradient: string }[] = [
  { id: 'camel', name: 'CAMEL Dialogue', emoji: '🐪', desc: 'Two AI agents collaborate', gradient: 'from-amber-400 to-orange-500' },
  { id: 'voice', name: 'Voice Chat', emoji: '🎙️', desc: 'Chat with AI using voice', gradient: 'from-purple-400 to-pink-500' },
  { id: 'babyagi', name: 'BabyAGI', emoji: '🤖', desc: 'Autonomous task execution', gradient: 'from-rose-400 to-pink-500' },
  { id: 'multi', name: 'Multi-Agent', emoji: '👥', desc: 'Team of AI agents discuss', gradient: 'from-amber-400 to-orange-500' },
  { id: 'persona', name: 'Persona Agent', emoji: '🎭', desc: 'Chat with famous personas', gradient: 'from-purple-400 to-pink-500' },
  { id: 'complex', name: 'Complex Agent', emoji: '🧠', desc: 'Think-Plan-Act-Observe', gradient: 'from-indigo-400 to-purple-500' },
]

export default function App() {
  const [activeTool, setActiveTool] = useState<ToolId>('camel')
  const [sidebarOpen, setSidebarOpen] = useState(true)

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-56' : 'w-14'} transition-all duration-300 bg-slate-900/80 border-r border-white/5 flex flex-col`}>
        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-3 hover:bg-white/5 transition-colors flex items-center gap-2">
          <span className="text-lg">🤖</span>
          {sidebarOpen && <span className="text-sm font-bold text-white">AI Studio</span>}
        </button>

        {/* Nav Items */}
        <nav className="flex-1 py-2 space-y-0.5">
          {TOOLS.map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`w-full px-3 py-2.5 flex items-center gap-2.5 transition-all ${activeTool === tool.id ? `bg-gradient-to-r ${tool.gradient} bg-opacity-10 border-r-2 border-white/30` : 'hover:bg-white/5'}`}
              style={activeTool === tool.id ? { background: `linear-gradient(to right, rgba(255,255,255,0.08), transparent)` } : {}}
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

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${currentTool.gradient} flex items-center justify-center text-white text-xl shadow-lg`}>
              {currentTool.emoji}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{currentTool.name}</h1>
              <p className="text-xs text-gray-400">{currentTool.desc}</p>
            </div>
          </div>

          {/* Tool Content */}
          {renderTool()}
        </div>
      </div>
    </div>
  )
}
