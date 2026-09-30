import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Brain, KeyRound, User, Loader2, ArrowRight, Sparkles, ShieldCheck, Zap } from 'lucide-react';

const FEATURES = [
  { icon: Brain,       color: '#14b8a6', label: 'Citation-Verified AI',   sub: 'Pydantic v2 grounding' },
  { icon: ShieldCheck, color: '#10b981', label: 'Citation Guard™',             sub: 'Verbatim quote verification' },
  { icon: Zap,         color: '#f97316', label: 'Multi-Provider LLM',          sub: 'Groq · Gemini support' },
];

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('demo');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isLogin) { setUsername('demo'); setPassword('password'); }
    else { setUsername(''); setPassword(''); }
    setError('');
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) await login(username, password);
      else await register(username, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg-main)',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated Floating Orbs */}
      <div className="orb orb-teal animate-float" style={{ width: '400px', height: '400px', top: '-100px', left: '-120px', animationDuration: '7s' }} />
      <div className="orb orb-orange animate-float" style={{ width: '300px', height: '300px', bottom: '-80px', right: '-80px', animationDuration: '9s', animationDelay: '2s' }} />
      <div className="orb orb-sky animate-float" style={{ width: '200px', height: '200px', top: '30%', right: '10%', animationDuration: '8s', animationDelay: '1s' }} />
      <div className="orb orb-violet animate-float" style={{ width: '150px', height: '150px', bottom: '20%', left: '8%', animationDuration: '6s', animationDelay: '3s' }} />

      {/* Main card + hero side */}
      <div style={{
        display: 'flex',
        gap: '40px',
        alignItems: 'center',
        maxWidth: '900px',
        width: '100%',
        position: 'relative',
        zIndex: 1,
      }}>

        {/* Left hero panel (only shown on wider screens) */}
        <div className="fade-in-up" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '16px',
              background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(20,184,166,0.45)',
            }}>
              <Brain size={26} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-main)', lineHeight: 1 }}>
                MeetingMind
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--primary)', letterSpacing: '0.04em', marginTop: '3px' }}>
                v2.0 · Intelligence Platform
              </div>
            </div>
          </div>

          <div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, color: 'var(--text-main)', margin: 0 }}>
              Turn meetings into<br />
              <span style={{ background: 'linear-gradient(135deg, #0d9488, #14b8a6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                structured intelligence
              </span>
            </h1>
            <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginTop: '16px', lineHeight: 1.65, maxWidth: '380px' }}>
              Verifiable extraction of action items, decisions, and verbatim citations — powered by Groq & Gemini.
            </p>
          </div>

          {/* Feature pills */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="fade-in-up glass-panel"
                  style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                    animationDelay: `${120 + i * 80}ms`,
                  }}
                >
                  <div style={{ width: '34px', height: '34px', borderRadius: '9px', background: `${f.color}18`, border: `1px solid ${f.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color={f.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-main)' }}>{f.label}</div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>{f.sub}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: f.color, boxShadow: `0 0 8px ${f.color}` }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Auth Form Card */}
        <div className="glass-panel slide-in" style={{
          width: '100%',
          maxWidth: '400px',
          padding: '38px 32px',
          flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Inner decorative glow */}
          <div style={{ position: 'absolute', top: '-60px', right: '-60px', width: '180px', height: '180px', background: 'var(--primary)', filter: 'blur(90px)', opacity: 0.08, borderRadius: '50%', pointerEvents: 'none' }} />

          {/* Form Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px', position: 'relative' }}>
            <div style={{
              width: '44px', height: '44px', margin: '0 auto 14px', borderRadius: '13px',
              background: 'var(--primary-gradient)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 6px 20px rgba(20,184,166,0.4)',
            }}>
              <Sparkles size={22} color="#fff" />
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.02em', marginBottom: '6px', margin: 0 }}>
              {isLogin ? 'Welcome back' : 'Create account'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              {isLogin ? 'Sign in to your intelligence dashboard.' : 'Start your 14-day free trial.'}
            </p>
          </div>

          {/* Demo hint */}
          {isLogin && (
            <div style={{
              marginBottom: '18px', padding: '8px 12px',
              background: 'var(--teal-bg)', border: '1px solid var(--teal-border)',
              borderRadius: 'var(--radius-md)', fontSize: '0.76rem', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', gap: '7px', fontWeight: 600
            }}>
              <Sparkles size={12} />
              Demo credentials pre-filled — click Sign In to explore.
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 14px', background: 'var(--rose-bg)', border: '1px solid var(--rose-border)',
              borderRadius: 'var(--radius-md)', color: 'var(--rose)', fontSize: '0.8rem',
              marginBottom: '18px', textAlign: 'center', fontWeight: 600
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Username */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="auth-username"
                  type="text"
                  className="input-field"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  style={{ paddingLeft: '38px', height: '44px', fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} color="var(--text-dim)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                <input
                  id="auth-password"
                  type="password"
                  className="input-field"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ paddingLeft: '38px', height: '44px', fontSize: '0.9rem' }}
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              id="auth-submit"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', padding: '13px', marginTop: '6px', fontSize: '0.93rem', justifyContent: 'center' }}
              disabled={loading || !username || !password}
            >
              {loading
                ? <><Loader2 size={17} className="animate-spin" /><span>Authenticating...</span></>
                : <><span>{isLogin ? 'Sign In' : 'Create Account'}</span><ArrowRight size={16} /></>
              }
            </button>
          </form>

          {/* Toggle */}
          <div style={{ textAlign: 'center', marginTop: '22px', paddingTop: '18px', borderTop: '1px solid var(--border-subtle)' }}>
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.83rem', cursor: 'pointer', fontWeight: 600 }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
            >
              {isLogin ? "Don't have an account? Sign up →" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
