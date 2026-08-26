import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import ExtractionStudio from './components/ExtractionStudio';
import QueryHub from './components/QueryHub';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [provider, setProvider] = useState('gemini');
  const [status, setStatus] = useState(null);
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/status').then((r) => r.json()).catch(() => ({ default_provider: 'groq' })),
      fetch('/api/examples').then((r) => r.json()).catch(() => []),
    ]).then(([statusData, examplesData]) => {
      setStatus(statusData);
      setExamples(examplesData);
      if (statusData?.default_provider) setProvider(statusData.default_provider);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* SaaS Navigation Header */}
      <Header status={status} provider={provider} onProviderChange={setProvider} />
      
      {/* 2-Tab Main Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Workspace Area */}
      <main style={{ flex: 1, paddingBottom: '50px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '480px', gap: '16px' }}>
            <div style={{
              width: '42px', 
              height: '42px',
              border: '3px solid rgba(99, 102, 241, 0.15)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
            <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Connecting to MeetingMind Engine...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'studio'       && <ExtractionStudio examples={examples} provider={provider} />}
            {activeTab === 'intelligence' && <QueryHub examples={examples} provider={provider} />}
          </>
        )}
      </main>

      {/* Modern Compact Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        background: 'rgba(6, 8, 15, 0.95)',
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>MeetingMind Engine Active</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
          <span>FastAPI + Vite React + FAISS-CPU + Pydantic v2 + ReAct Agent</span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          Generative AI Laboratory — B.Tech (AI &amp; Data Science)
        </div>
      </footer>
    </div>
  );
}
