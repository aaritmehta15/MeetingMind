import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, KeyRound, User, Loader2, ArrowRight } from 'lucide-react';

export default function AuthScreen() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Pre-fill demo credentials for convenience
  React.useEffect(() => {
    if (isLogin) {
      setUsername('demo');
      setPassword('password');
    }
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
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
      padding: '20px'
    }}>
      <div className="glass-panel slide-in" style={{ 
        width: '100%', 
        maxWidth: '420px', 
        padding: '40px 32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Decorative background glow */}
        <div style={{
          position: 'absolute', top: '-50px', left: '-50px', width: '150px', height: '150px',
          background: 'var(--primary-color)', filter: 'blur(80px)', opacity: 0.15, borderRadius: '50%'
        }} />

        <div style={{ textAlign: 'center', marginBottom: '32px', position: 'relative' }}>
          <div style={{ 
            width: '48px', height: '48px', margin: '0 auto 16px', borderRadius: '14px',
            background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)'
          }}>
            <Sparkles size={24} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.02em', marginBottom: '8px' }}>
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Sign in to access your Meeting Intelligence Dashboard.
          </p>
        </div>

        {error && (
          <div style={{ 
            padding: '12px 16px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)', color: '#fb7185', fontSize: '0.8rem', marginBottom: '20px',
            textAlign: 'center'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Username
            </label>
            <div style={{ position: 'relative' }}>
              <User size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="text"
                className="textarea-field"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                style={{ width: '100%', height: '44px', paddingLeft: '40px', fontSize: '0.9rem' }}
                required
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '6px' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
              <input
                type="password"
                className="textarea-field"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: '100%', height: '44px', paddingLeft: '40px', fontSize: '0.9rem' }}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', padding: '12px', marginTop: '8px', fontSize: '0.95rem', justifyContent: 'center' }}
            disabled={loading || !username || !password}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Sign In' : 'Create Account')}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600 }}
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}
