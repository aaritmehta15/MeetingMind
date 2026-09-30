import React, { useState } from 'react';
import RagExplorer from './RagExplorer';
import MeetingAnalytics from './MeetingAnalytics';
import CorpusStudio from './CorpusStudio';
import AgentChat from './AgentChat';
import { Search, BarChart2, Layers, Sparkles, Brain, HelpCircle } from 'lucide-react';

export default function QueryHub({ userMeetings, fetchUserMeetings, provider, onOpenGuide }) {
  const [mode, setMode] = useState('analytics'); // Default to Analytics

  const modes = [
    {
      id: 'analytics',
      label: 'Meeting Analytics',
      subtitle: 'Instant Stats (0 API Cost)',
      shortLabel: 'Analytics',
      icon: BarChart2,
      badge: 'Local CPU',
      color: '#14b8a6',
      desc: 'Sentiment, talk-time shares, keywords & timeline computed instantly on CPU with zero API latency'
    },
    {
      id: 'agent',
      label: 'Autonomous Agent',
      subtitle: 'Chat & ReAct Assistant',
      shortLabel: 'AI Agent',
      icon: Brain,
      badge: 'Interactive AI',
      color: '#f59e0b',
      desc: 'Multi-step autonomous reasoning with 7 specialized tools, execution traces & safe arithmetic calculator'
    },
    {
      id: 'rag',
      label: 'Hierarchical RAG',
      subtitle: 'Context & Vector Search',
      shortLabel: 'RAG Explorer',
      icon: Search,
      badge: 'Evidence Inspector',
      color: '#0ea5e9',
      desc: 'Sentence-level child matches expanded into 5-turn conversational parent windows'
    },
    {
      id: 'corpus',
      label: 'Knowledge Corpus',
      subtitle: 'Search All Transcripts',
      shortLabel: 'All Meetings',
      icon: Layers,
      badge: 'Multi-Meeting',
      color: '#10b981',
      desc: 'Cross-transcript multi-document vector synthesis across all meetings in your project'
    },
  ];

  const currentModeObj = modes.find(m => m.id === mode) || modes[0];

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
          background: 'var(--bg-surface)', 
          backdropFilter: 'blur(20px)',
          borderRadius: '16px', 
          padding: '6px', 
          border: '1px solid var(--border-medium)', 
          gap: '6px',
          boxShadow: 'var(--shadow-card)',
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
                  padding: '8px 16px', 
                  borderRadius: '12px', 
                  border: '1px solid transparent', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '10px', 
                  transition: 'all 0.22s cubic-bezier(0.16, 1, 0.3, 1)', 
                  background: isActive ? `linear-gradient(135deg, ${m.color}dd 0%, ${m.color}99 100%)` : 'transparent', 
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  boxShadow: isActive ? `0 4px 18px ${m.color}44` : 'none',
                  whiteSpace: 'nowrap',
                  fontFamily: "'Inter', sans-serif"
                }}
                title={`${m.label}: ${m.desc}`}
              >
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: isActive ? 'rgba(255,255,255,0.2)' : `${m.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  <Icon size={16} color={isActive ? '#ffffff' : m.color} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: isActive ? 700 : 600, fontSize: '0.86rem', color: isActive ? '#ffffff' : 'var(--text-main)' }}>
                      {m.label}
                    </span>
                    <span style={{
                      fontSize: '0.62rem',
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      background: isActive ? 'rgba(255,255,255,0.25)' : 'var(--bg-panel)',
                      color: isActive ? '#ffffff' : 'var(--text-dim)',
                      fontWeight: 700,
                      border: `1px solid ${isActive ? 'rgba(255,255,255,0.3)' : 'var(--border-subtle)'}`
                    }}>
                      {m.badge}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.68rem',
                    color: isActive ? 'rgba(255,255,255,0.9)' : 'var(--text-dim)',
                    fontWeight: 500,
                    marginTop: '1px'
                  }}>
                    {m.subtitle}
                  </span>
                </div>
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
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          padding: '5px 14px',
          borderRadius: 'var(--radius-full)',
          flexWrap: 'wrap'
        }}>
          <Sparkles size={12} color={currentModeObj.color} />
          <span>Active Engine: <strong style={{ color: 'var(--text-main)' }}>{currentModeObj.label}</strong> — {currentModeObj.desc}</span>
          <button
            onClick={() => onOpenGuide && onOpenGuide(mode)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 9px',
              borderRadius: 'var(--radius-full)',
              border: `1px solid ${currentModeObj.color}50`,
              background: `${currentModeObj.color}14`,
              color: currentModeObj.color,
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              marginLeft: '4px'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `${currentModeObj.color}28`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = `${currentModeObj.color}14`;
            }}
            title={`View ${currentModeObj.label} guide & architecture`}
          >
            <HelpCircle size={11} color={currentModeObj.color} />
            <span>Guide</span>
          </button>
        </div>
      </div>

      {/* Render the Active Mode View */}
      <div style={{ flex: 1 }}>
        {mode === 'analytics' && <MeetingAnalytics userMeetings={userMeetings} fetchUserMeetings={fetchUserMeetings} provider={provider} />}
        {mode === 'agent'     && <AgentChat userMeetings={userMeetings} provider={provider} />}
        {mode === 'rag'       && <RagExplorer userMeetings={userMeetings} fetchUserMeetings={fetchUserMeetings} />}
        {mode === 'corpus'    && <CorpusStudio userMeetings={userMeetings} fetchUserMeetings={fetchUserMeetings} provider={provider} />}
      </div>
    </div>
  );
}
