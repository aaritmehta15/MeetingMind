import React, { useState } from 'react';
import RagExplorer from './RagExplorer';
import AgentChat from './AgentChat';
import CorpusStudio from './CorpusStudio';
import { Search, Bot, Layers, Sparkles } from 'lucide-react';

export default function QueryHub({ examples, provider }) {
  const [mode, setMode] = useState('agent'); // Default to ReAct

  const modes = [
    {
      id: 'agent',
      label: 'Autonomous ReAct Agent',
      shortLabel: 'ReAct Agent',
      icon: Bot,
      badge: 'Reasoning + Tools',
      color: '#818cf8',
      desc: 'Multi-step reasoning with live tools (RAG, Web Search, Calculator)'
    },
    {
      id: 'rag',
      label: 'Hierarchical RAG Explorer',
      shortLabel: 'RAG Explorer',
      icon: Search,
      badge: 'Child → Parent',
      color: '#06b6d4',
      desc: 'Visual parent-child context expansion & vector search'
    },
    {
      id: 'corpus',
      label: 'Cross-Meeting Corpus',
      shortLabel: 'Cross-Meeting',
      icon: Layers,
      badge: 'Multi-Document',
      color: '#34d399',
      desc: 'Synthesize insights across all indexed meeting transcripts'
    },
  ];

  const currentModeObj = modes.find(m => m.id === mode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Top Segmented Switcher */}
      <div style={{ 
        padding: '24px 28px 12px', 
        maxWidth: '1500px', 
        margin: '0 auto', 
        width: '100%', 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        gap: '12px'
      }}>
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(10, 15, 28, 0.7)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '16px', 
          padding: '5px', 
          border: '1px solid var(--border-medium)', 
          gap: '4px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.04)',
          maxWidth: '100%',
          overflowX: 'auto'
        }}>
          {modes.map((m) => {
            const Icon = m.icon;
            const isActive = mode === m.id;
            return (
              <button 
                key={m.id}
                onClick={() => setMode(m.id)}
                style={{ 
                  padding: '9px 18px', 
                  borderRadius: '12px', 
                  border: '1px solid transparent', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '9px', 
                  fontWeight: isActive ? 700 : 500, 
                  fontSize: '0.85rem', 
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)', 
                  background: isActive ? 'var(--primary-gradient)' : 'transparent', 
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isActive ? '0 4px 18px rgba(99, 102, 241, 0.4)' : 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} color={isActive ? '#ffffff' : m.color} />
                <span>{m.label}</span>
                <span style={{
                  fontSize: '0.68rem',
                  padding: '2px 7px',
                  borderRadius: 'var(--radius-full)',
                  background: isActive ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)',
                  color: isActive ? '#ffffff' : 'var(--text-dim)',
                  fontWeight: 600
                }}>
                  {m.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Dynamic subtitle banner */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          background: 'rgba(255, 255, 255, 0.02)',
          border: '1px solid var(--border-subtle)',
          padding: '4px 14px',
          borderRadius: 'var(--radius-full)'
        }}>
          <Sparkles size={12} color="#818cf8" />
          <span>Active Engine: <strong style={{ color: '#f8fafc' }}>{currentModeObj.label}</strong> — {currentModeObj.desc}</span>
        </div>
      </div>

      {/* Render the Active Mode View */}
      <div style={{ flex: 1 }}>
        {mode === 'rag' && <RagExplorer examples={examples} />}
        {mode === 'agent' && <AgentChat examples={examples} provider={provider} />}
        {mode === 'corpus' && <CorpusStudio examples={examples} provider={provider} />}
      </div>
    </div>
  );
}
