import React, { useState } from 'react';
import RagExplorer from './RagExplorer';
import MeetingAnalytics from './MeetingAnalytics';
import CorpusStudio from './CorpusStudio';
import { Search, BarChart2, Layers, Sparkles } from 'lucide-react';

export default function QueryHub({ examples, provider }) {
  const [mode, setMode] = useState('analytics'); // Default to Analytics

  const modes = [
    {
      id: 'analytics',
      label: 'Meeting Intelligence',
      shortLabel: 'Intelligence',
      icon: BarChart2,
      badge: 'Instant Analytics',
      color: '#14b8a6',
      desc: 'Sentiment · Speaker Stats · Keywords · Timeline · Citation Health — zero LLM cost'
    },
    {
      id: 'rag',
      label: 'Hierarchical RAG Explorer',
      shortLabel: 'RAG Explorer',
      icon: Search,
      badge: 'Child → Parent',
      color: '#0ea5e9',
      desc: 'Visual parent-child context expansion & vector search'
    },
    {
      id: 'corpus',
      label: 'Cross-Meeting Corpus',
      shortLabel: 'Cross-Meeting',
      icon: Layers,
      badge: 'Multi-Document',
      color: '#10b981',
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
                  background: isActive ? `linear-gradient(135deg, ${m.color}dd 0%, ${m.color}99 100%)` : 'transparent', 
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isActive ? `0 4px 18px ${m.color}44` : 'none',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Inter', sans-serif"
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
          <Sparkles size={12} color={currentModeObj.color} />
          <span>Active Engine: <strong style={{ color: '#f8fafc' }}>{currentModeObj.label}</strong> — {currentModeObj.desc}</span>
        </div>
      </div>

      {/* Render the Active Mode View */}
      <div style={{ flex: 1 }}>
        {mode === 'analytics' && <MeetingAnalytics examples={examples} provider={provider} />}
        {mode === 'rag'       && <RagExplorer examples={examples} />}
        {mode === 'corpus'    && <CorpusStudio examples={examples} provider={provider} />}
      </div>
    </div>
  );
}
