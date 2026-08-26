import React from 'react';
import { Sparkles, Brain, Cpu, Code2, ExternalLink, ShieldCheck } from 'lucide-react';

export default function Header({ status, provider, onProviderChange }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(6, 9, 17, 0.85)',
      backdropFilter: 'blur(16px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 15px rgba(99, 102, 241, 0.5)'
        }}>
          <Brain size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              MeetingMind
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '2px 6px' }}>v2.0</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
            GenAI Intelligence & Grounded Evaluation Agent
          </p>
        </div>
      </div>

      {/* Provider Selector & Quick Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Hallucination-free guarantee badge */}
        <div className="badge badge-verified" style={{ padding: '6px 12px', fontSize: '0.78rem' }}>
          <ShieldCheck size={14} />
          <span>Citation Guard: 0% Hallucination</span>
        </div>

        {/* Provider Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            onClick={() => onProviderChange('groq')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: provider === 'groq' ? 'var(--primary-gradient)' : 'transparent',
              color: provider === 'groq' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Cpu size={13} />
            <span>Groq (Compound-Mini)</span>
          </button>

          <button
            onClick={() => onProviderChange('gemini')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              background: provider === 'gemini' ? 'var(--cyan-gradient)' : 'transparent',
              color: provider === 'gemini' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.15s ease'
            }}
          >
            <Sparkles size={13} />
            <span>Gemini (3.5-Flash)</span>
          </button>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com/aaritmehta15/MeetingMind-"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 500,
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,0.03)'
          }}
        >
          <Code2 size={15} />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
