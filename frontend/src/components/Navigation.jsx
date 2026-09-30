import React from 'react';
import { Sparkles, BarChart2, CheckSquare, HelpCircle } from 'lucide-react';

export default function Navigation({ activeTab, onTabChange, onOpenGuide }) {
  const tabs = [
    {
      id: 'studio',
      label: 'Extraction Studio',
      icon: Sparkles,
      badge: 'Live Extraction',
      description: 'Structured tasks, decisions & verbatim quotes',
      color: '#14b8a6',
    },
    {
      id: 'intelligence',
      label: 'Intelligence Hub',
      icon: BarChart2,
      badge: 'Analytics · RAG · Corpus',
      description: 'Instant NLP analytics, vector search & cross-meeting synthesis',
      color: '#0ea5e9',
    },
    {
      id: 'tasks',
      label: 'Action Items',
      icon: CheckSquare,
      badge: 'Global Checklist',
      description: 'Persistent list of tasks across all meetings',
      color: '#10b981',
    },
  ];

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '0 28px',
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      overflowX: 'auto',
      minHeight: '52px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '2px',
        maxWidth: '1500px',
        width: '100%',
        justifyContent: 'flex-start',
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
                gap: '9px',
                padding: '14px 18px',
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                fontSize: '0.875rem',
                fontWeight: isActive ? 700 : 500,
                cursor: 'pointer',
                position: 'relative',
                whiteSpace: 'nowrap',
                outline: 'none',
                transition: 'color 0.18s ease',
                fontFamily: 'inherit',
                letterSpacing: isActive ? '-0.01em' : '0',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-main)';
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {/* Icon container */}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: isActive ? `${tab.color}18` : 'transparent',
                border: isActive ? `1px solid ${tab.color}35` : '1px solid transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                flexShrink: 0,
              }}>
                <Icon size={14} color={isActive ? tab.color : 'var(--text-dim)'} />
              </div>

              <span>{tab.label}</span>

              {/* Badge */}
              <span style={{
                fontSize: '0.67rem',
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 600,
                background: isActive ? `${tab.color}18` : 'var(--bg-panel)',
                color: isActive ? tab.color : 'var(--text-dim)',
                border: `1px solid ${isActive ? tab.color + '30' : 'var(--border-subtle)'}`,
                transition: 'all 0.18s ease',
                letterSpacing: '0.01em',
              }}>
                {tab.badge}
              </span>

              {/* Active bottom indicator bar */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: isActive ? '8px' : '50%',
                right: isActive ? '8px' : '50%',
                height: '2.5px',
                background: isActive ? `linear-gradient(90deg, ${tab.color}, ${tab.color}99)` : 'transparent',
                borderRadius: '2px 2px 0 0',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              }} />
            </button>
          );
        })}

        {/* Subtle Feature Guide Button on Far Right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
          <button
            onClick={() => onOpenGuide && onOpenGuide(activeTab === 'intelligence' ? 'analytics' : activeTab)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 13px',
              borderRadius: '20px',
              border: '1px solid var(--border-medium)',
              background: 'var(--bg-input)',
              color: 'var(--text-muted)',
              fontSize: '0.76rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.color = 'var(--primary)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-medium)';
              e.currentTarget.style.color = 'var(--text-muted)';
            }}
            title="Feature Guide & Architecture Overview"
          >
            <HelpCircle size={13} color="var(--primary)" />
            <span>Guide</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
