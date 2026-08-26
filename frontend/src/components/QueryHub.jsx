import React, { useState } from 'react';
import RagExplorer from './RagExplorer';
import AgentChat from './AgentChat';
import CorpusStudio from './CorpusStudio';
import { Search, Bot, Layers } from 'lucide-react';

export default function QueryHub({ examples, provider }) {
  const [mode, setMode] = useState('agent'); // Default to the ReAct agent

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Segmented Control / Sub-Navigation */}
      <div style={{ padding: '20px 28px 0', maxWidth: '1500px', margin: '0 auto', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <div style={{ 
          display: 'inline-flex', 
          background: 'rgba(0,0,0,0.4)', 
          borderRadius: '12px', 
          padding: '6px', 
          border: '1px solid var(--border-subtle)', 
          gap: '6px',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
        }}>
          <button 
            onClick={() => setMode('rag')}
            style={{ 
              padding: '8px 18px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              transition: 'all 0.2s', 
              background: mode === 'rag' ? '#6366f1' : 'transparent', 
              color: mode === 'rag' ? '#fff' : 'var(--text-muted)',
              boxShadow: mode === 'rag' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
            }}
          >
            <Search size={16} /> Basic RAG Explorer
          </button>
          
          <button 
            onClick={() => setMode('agent')}
            style={{ 
              padding: '8px 18px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              transition: 'all 0.2s', 
              background: mode === 'agent' ? '#6366f1' : 'transparent', 
              color: mode === 'agent' ? '#fff' : 'var(--text-muted)',
              boxShadow: mode === 'agent' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
            }}
          >
            <Bot size={16} /> ReAct Agent Studio
          </button>
          
          <button 
            onClick={() => setMode('corpus')}
            style={{ 
              padding: '8px 18px', 
              borderRadius: '8px', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontWeight: 600, 
              fontSize: '0.85rem', 
              transition: 'all 0.2s', 
              background: mode === 'corpus' ? '#6366f1' : 'transparent', 
              color: mode === 'corpus' ? '#fff' : 'var(--text-muted)',
              boxShadow: mode === 'corpus' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
            }}
          >
            <Layers size={16} /> Cross-Meeting Search
          </button>
        </div>
      </div>

      {/* Render the selected component */}
      <div style={{ flex: 1 }}>
        {mode === 'rag' && <RagExplorer examples={examples} />}
        {mode === 'agent' && <AgentChat examples={examples} provider={provider} />}
        {mode === 'corpus' && <CorpusStudio examples={examples} provider={provider} />}
      </div>
    </div>
  );
}
