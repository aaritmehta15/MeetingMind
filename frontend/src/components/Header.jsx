import React from 'react';
import { Brain, ShieldCheck, Zap, Activity, LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

export default function Header({ status, provider, onProviderChange }) {
  const { logout } = useAuth();
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <header style={{
      borderBottom: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
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
      height: '60px',
      flexWrap: 'wrap'
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 12px rgba(20, 184, 166, 0.45)',
          flexShrink: 0
        }}>
          <Brain size={19} color="#ffffff" />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            fontFamily: "'Syne', sans-serif",
            fontSize: '1.15rem',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            color: 'var(--text-main)'
          }}>
            MeetingMind
          </span>
          <span style={{
            fontSize: '0.66rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--teal-bg)',
            color: 'var(--primary)',
            border: '1px solid var(--teal-border)',
            letterSpacing: '0.04em'
          }}>
            v2.0
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Citation Guard Status */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#10b981',
            background: 'var(--emerald-bg)',
            border: '1px solid var(--emerald-border)',
            padding: '4px 11px',
            borderRadius: 'var(--radius-full)',
            cursor: 'help'
          }}
          title="Verbatim Citation Guard: Validates that all extracted action items and decisions match actual transcript quotes with zero hallucinations"
        >
          <ShieldCheck size={14} />
          <span>Citation Guard Active</span>
        </div>

        {/* LLM Provider Switcher */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          padding: '3px',
          borderRadius: '10px',
          border: '1px solid var(--border-medium)',
        }}>
          <button
            onClick={() => onProviderChange('groq')}
            title="Groq (Qwen 27B) — High-speed inference"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              background: provider === 'groq' ? 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)' : 'transparent',
              color: provider === 'groq' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: provider === 'groq' ? '0 2px 8px rgba(20,184,166,0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Zap size={13} />
            <span>Groq</span>
          </button>

          <button
            onClick={() => onProviderChange('gemini')}
            title="Gemini 3.5 Flash — Advanced reasoning"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 12px',
              borderRadius: '7px',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.74rem',
              fontWeight: 600,
              fontFamily: 'inherit',
              background: provider === 'gemini' ? 'linear-gradient(135deg, #f97316 0%, #fb923c 100%)' : 'transparent',
              color: provider === 'gemini' ? '#ffffff' : 'var(--text-muted)',
              boxShadow: provider === 'gemini' ? '0 2px 8px rgba(249,115,22,0.35)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <Activity size={13} />
            <span>Gemini</span>
          </button>
        </div>

        {/* LIGHT / DARK MODE TOGGLE BUTTON */}
        <button
          onClick={toggleTheme}
          title={`Switch to ${isDark ? 'Light' : 'Dark'} Mode`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            borderRadius: '9px',
            border: '1px solid var(--border-medium)',
            background: 'var(--bg-input)',
            color: 'var(--text-main)',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            boxShadow: 'var(--shadow-sm)'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--border-active)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--border-medium)';
            e.currentTarget.style.transform = 'none';
          }}
        >
          {isDark ? (
            <>
              <Sun size={14} color="#f59e0b" />
              <span>Light Mode</span>
            </>
          ) : (
            <>
              <Moon size={14} color="#6366f1" />
              <span>Dark Mode</span>
            </>
          )}
        </button>

        {/* Logout Button */}
        <button
          onClick={logout}
          title="Sign out of MeetingMind"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            color: '#f43f5e',
            fontSize: '0.74rem',
            fontWeight: 600,
            padding: '6px 12px',
            borderRadius: '8px',
            border: '1px solid var(--rose-border)',
            background: 'var(--rose-bg)',
            cursor: 'pointer',
            transition: 'all 0.18s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.1)'; }}
          onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
        >
          <LogOut size={13} />
          <span>Sign Out</span>
        </button>
      </div>
    </header>
  );
}
