import React from 'react';
import { Sparkles, Search, Bot, Layers, BarChart3 } from 'lucide-react';

export default function Navigation({ activeTab, onTabChange }) {
  const tabs = [
    { id: 'studio', label: 'Extraction Studio', icon: Sparkles, badge: 'Live Pipeline' },
    { id: 'rag', label: 'Hierarchical RAG', icon: Search, badge: 'Child->Parent' },
    { id: 'agent', label: 'ReAct Agent', icon: Bot, badge: 'Multi-Step' },
    { id: 'corpus', label: 'Cross-Meeting Corpus', icon: Layers, badge: 'Multi-Doc' },
    { id: 'benchmark', label: 'AMI Benchmark Hub', icon: BarChart3, badge: '0% Hallucination' },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '16px 28px 0 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(6, 9, 17, 0.4)',
      overflowX: 'auto'
    }}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              border: 'none',
              background: 'transparent',
              color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
              fontSize: '0.875rem',
              fontWeight: isActive ? 700 : 500,
              cursor: 'pointer',
              borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
              transition: 'all 0.18s ease',
              whiteSpace: 'nowrap',
              position: 'relative',
              paddingBottom: '14px'
            }}
          >
            <Icon size={16} color={isActive ? '#818cf8' : '#94a3b8'} />
            <span>{tab.label}</span>
            <span
              style={{
                fontSize: '0.675rem',
                padding: '2px 6px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: isActive ? '#a5b4fc' : 'var(--text-dim)',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent'
              }}
            >
              {tab.badge}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
