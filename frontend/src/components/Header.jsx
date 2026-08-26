import React from 'react';
import { Brain, Cpu, Code2, ShieldCheck, Zap, Activity } from 'lucide-react';

export default function Header({ status, provider, onProviderChange }) {
  return (
    <header style={{
      borderBottom: '1px solid rgba(20, 184, 166, 0.12)',
      background: 'rgba(8, 12, 20, 0.88)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '0 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      height: '56px',
      flexWrap: 'wrap'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '9px',
          background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(20, 184, 166, 0.5)',
          flexShrink: 0
        }}>
          <Brain size={18} color="#ffffff" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.1rem',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            background: 'linear-gradient(135deg, #ffffff 20%, #94a3b8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            MeetingMind
          </span>
          <span style={{
            fontSize: '0.64rem',
            fontWeight: 700,
            padding: '2px 7px',
            borderRadius: '4px',
            background: 'rgba(20,184,166,0.15)',
            color: '#2dd4bf',
            border: '1px solid rgba(20,184,166,0.3)',
            letterSpacing: '0.05em'
          }}>
            v2.0
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Citation Guard Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.74rem',
          fontWeight: 600,
          color: '#34d399',
          background: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16,185,129,0.22)',
          padding: '4px 11px',
          borderRadius: 'var(--radius-full)'
        }}>
          <ShieldCheck size={13} />
          <span>Citation Guard Active</span>
        </div>

        {/* LLM Provider Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '3px',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
        }}>
          <button
            onClick={() => onProviderChange('groq')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 11px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.73rem',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              background: provider === 'groq' ? 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' : 'transparent',
              color: provider === 'groq' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.18s ease',
              boxShadow: provider === 'groq' ? '0 2px 8px rgba(20,184,166,0.4)' : 'none'
            }}
          >
            <Zap size={12} />
            <span>Groq</span>
          </button>

          <button
            onClick={() => onProviderChange('gemini')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 11px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.73rem',
              fontWeight: 600,
              fontFamily: "'Inter', sans-serif",
              background: provider === 'gemini' ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' : 'transparent',
              color: provider === 'gemini' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.18s ease',
              boxShadow: provider === 'gemini' ? '0 2px 8px rgba(249,115,22,0.4)' : 'none'
            }}
          >
            <Activity size={12} />
            <span>Gemini</span>
          </button>
        </div>

        {/* GitHub Link */}
        <a
          href="https://github.com/aaritmehta15/MeetingMind-"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.73rem',
            fontWeight: 600,
            padding: '5px 11px',
            borderRadius: '8px',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,0.04)',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = 'var(--border-medium)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        >
          <Code2 size={13} />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
