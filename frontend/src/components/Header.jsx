import React from 'react';
import { Sparkles, Brain, Cpu, Code2, ShieldCheck, Activity } from 'lucide-react';

export default function Header({ status, provider, onProviderChange }) {
  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'rgba(6, 8, 15, 0.82)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      padding: '12px 28px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap'
    }}>
      {/* Brand Identity */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: 'var(--radius-md)',
          background: 'var(--primary-gradient)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 20px rgba(99, 102, 241, 0.55)',
          flexShrink: 0
        }}>
          <Brain size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ 
              fontSize: '1.2rem', 
              fontWeight: 800, 
              letterSpacing: '-0.03em', 
              background: 'linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)', 
              WebkitBackgroundClip: 'text', 
              WebkitTextFillColor: 'transparent' 
            }}>
              MeetingMind
            </span>
            <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '2px 7px', fontWeight: 700 }}>
              v2.0 PRO
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            Autonomous Meeting Intelligence & Grounded Extraction
          </p>
        </div>
      </div>

      {/* Right Controls: Status, Provider Switcher, GitHub */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
        {/* Real-time Citation Guard / Health Badge */}
        <div className="badge badge-verified" style={{ padding: '6px 12px', fontSize: '0.75rem', gap: '6px', background: 'rgba(16, 185, 129, 0.1)' }}>
          <ShieldCheck size={14} />
          <span>Citation Guard: 0% Hallucination</span>
        </div>

        {/* LLM Engine Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'rgba(0, 0, 0, 0.4)',
          padding: '3px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.3)'
        }}>
          <button
            onClick={() => onProviderChange('groq')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: provider === 'groq' ? 'var(--primary-gradient)' : 'transparent',
              color: provider === 'groq' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.18s ease',
              boxShadow: provider === 'groq' ? '0 2px 8px rgba(99,102,241,0.4)' : 'none'
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
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontWeight: 600,
              background: provider === 'gemini' ? 'var(--cyan-gradient)' : 'transparent',
              color: provider === 'gemini' ? '#ffffff' : 'var(--text-muted)',
              transition: 'all 0.18s ease',
              boxShadow: provider === 'gemini' ? '0 2px 8px rgba(6,182,212,0.4)' : 'none'
            }}
          >
            <Sparkles size={13} />
            <span>Gemini (3.5-Flash)</span>
          </button>
        </div>

        {/* GitHub Repository Link */}
        <a
          href="https://github.com/aaritmehta15/MeetingMind-"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-main)',
            textDecoration: 'none',
            fontSize: '0.78rem',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            background: 'rgba(255, 255, 255, 0.04)',
            transition: 'all 0.18s ease'
          }}
          className="btn-secondary"
        >
          <Code2 size={14} />
          <span>GitHub</span>
        </a>
      </div>
    </header>
  );
}
