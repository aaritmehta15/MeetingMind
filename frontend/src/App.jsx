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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header status={status} provider={provider} onProviderChange={setProvider} />
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
            <div style={{
              width: '36px', height: '36px',
              border: '3px solid rgba(255,255,255,0.08)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (
          <>
            {activeTab === 'studio'    && <ExtractionStudio examples={examples} provider={provider} />}
            {activeTab === 'rag'       && <RagExplorer examples={examples} />}
            {activeTab === 'agent'     && <AgentChat examples={examples} provider={provider} />}
            {activeTab === 'corpus'    && <CorpusStudio examples={examples} provider={provider} />}
            {activeTab === 'benchmark' && <BenchmarkHub />}
          </>
        )}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '14px 28px',
        background: 'rgba(6,9,17,0.95)',
        fontSize: '0.775rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981' }} />
          <span>MeetingMind Intelligence Engine</span>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>•</span>
          <span>FastAPI + Vite React + FAISS-CPU + Pydantic v2</span>
        </div>
        <div>Generative AI Laboratory Final Project — B.Tech (AI &amp; Data Science)</div>
      </footer>
    </div>
  );
}
