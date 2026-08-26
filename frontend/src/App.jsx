import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import ExtractionStudio from './components/ExtractionStudio';
import RagExplorer from './components/RagExplorer';
import AgentChat from './components/AgentChat';
import CorpusStudio from './components/CorpusStudio';
import BenchmarkHub from './components/BenchmarkHub';

export default function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [provider, setProvider] = useState('groq');
  const [status, setStatus] = useState(null);
  const [examples, setExamples] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial server status and examples
    Promise.all([
      fetch('/api/status').then((r) => r.json()).catch(() => ({ default_provider: 'groq' })),
      fetch('/api/examples').then((r) => r.json()).catch(() => []),
    ])
      .then(([statusData, examplesData]) => {
        setStatus(statusData);
        setExamples(examplesData);
        if (statusData?.default_provider) {
          setProvider(statusData.default_provider);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        status={status}
        provider={provider}
        onProviderChange={setProvider}
      />

      <Navigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div className="animate-spin" style={{ width: '32px', height: '32px', border: '3px solid rgba(255,255,255,0.1)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
          </div>
        ) : (
          <>
            {activeTab === 'studio' && <ExtractionStudio examples={examples} provider={provider} />}
            {activeTab === 'rag' && <RagExplorer examples={examples} />}
            {activeTab === 'agent' && <AgentChat examples={examples} provider={provider} />}
            {activeTab === 'corpus' && <CorpusStudio examples={examples} provider={provider} />}
            {activeTab === 'benchmark' && <BenchmarkHub />}
          </>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '16px 28px',
        background: 'rgba(6, 9, 17, 0.9)',
        fontSize: '0.78rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          <span>MeetingMind Intelligence Engine</span>
          <span>•</span>
          <span>FastAPI + Vite React + FAISS CPU + Pydantic v2</span>
        </div>
        <div>Generative AI Laboratory Final Project — B.Tech (AI & Data Science)</div>
      </footer>
    </div>
  );
}
