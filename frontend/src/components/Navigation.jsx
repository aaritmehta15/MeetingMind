import React from 'react';
import { Sparkles, Bot } from 'lucide-react';

export default function Navigation({ activeTab, onTabChange }) {
  const tabs = [
    { 
      id: 'studio', 
      label: 'Extraction Studio', 
      icon: Sparkles, 
      badge: 'Live Extraction',
      description: 'Structured tasks, decisions & verbatim quotes'
    },
    { 
      id: 'intelligence', 
      label: 'Intelligence Modes', 
      icon: Bot, 
      badge: 'RAG / ReAct / Corpus',
      description: 'Interactive conversational reasoning & search'
    },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px 28px 0 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(6, 8, 15, 0.4)',
      overflowX: 'auto'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '1500px',
        width: '100%',
        justifyContent: 'flex-start'
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
                gap: '10px',
                padding: '12px 20px',
                border: 'none',
                background: 'transparent',
                color: isActive ? '#ffffff' : 'var(--text-muted)',
                fontSize: '0.92rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                borderBottom: isActive ? '2px solid #6366f1' : '2px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                whiteSpace: 'nowrap',
                position: 'relative',
                paddingBottom: '16px',
                outline: 'none'
              }}
            >
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: isActive ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}>
                <Icon size={15} color={isActive ? '#818cf8' : '#94a3b8'} />
              </div>
              
              <span>{tab.label}</span>

              <span
                style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontWeight: 600,
                  background: isActive ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: isActive ? '#a5b4fc' : 'var(--text-dim)',
                  border: isActive ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
