import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Navigation from './components/Navigation';
import ExtractionStudio from './components/ExtractionStudio';
import QueryHub from './components/QueryHub';
import AuthScreen from './components/AuthScreen';
import GlobalTasks from './components/GlobalTasks';
import FeatureGuideModal from './components/FeatureGuideModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function AppContent() {
  const { isAuthenticated, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('studio');
  const [provider, setProvider] = useState('gemini');
  const [status, setStatus] = useState(null);
  const [userMeetings, setUserMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideFeature, setGuideFeature] = useState('studio');

  const handleOpenGuide = (feat = 'studio') => {
    setGuideFeature(feat);
    setGuideOpen(true);
  };

  const fetchUserMeetings = async () => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch('/api/meetings');
      if (res.ok) {
        setUserMeetings(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserMeetings();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetch('/api/status')
      .then((r) => r.json())
      .then((statusData) => {
        setStatus(statusData);
        if (statusData?.default_provider) setProvider(statusData.default_provider);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
      {/* SaaS Navigation Header */}
      <Header status={status} provider={provider} onProviderChange={setProvider} />
      
      {/* Main Navigation Tabs */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} onOpenGuide={handleOpenGuide} />

      {/* Main Workspace Area */}
      <main style={{ flex: 1, overflowY: 'auto', paddingBottom: '40px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '480px', gap: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '32px' }}>
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
              <span className="soundwave-bar" />
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Connecting to MeetingMind Engine...
            </span>
          </div>
        ) : (
          <div key={activeTab} className="fade-in-up" style={{ animationDuration: '0.3s' }}>
            {activeTab === 'studio'       && <ExtractionStudio userMeetings={userMeetings} fetchUserMeetings={fetchUserMeetings} provider={provider} onOpenGuide={handleOpenGuide} />}
            {activeTab === 'intelligence' && <QueryHub userMeetings={userMeetings} fetchUserMeetings={fetchUserMeetings} provider={provider} onOpenGuide={handleOpenGuide} />}
            {activeTab === 'tasks'        && <GlobalTasks onOpenGuide={handleOpenGuide} />}
          </div>
        )}
      </main>

      {/* Feature Guide Modal */}
      <FeatureGuideModal
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        initialFeature={guideFeature}
      />

      {/* Modern Compact Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        padding: '12px 28px',
        background: 'var(--bg-surface)',
        backdropFilter: 'blur(12px)',
        fontSize: '0.76rem',
        color: 'var(--text-dim)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 6px #10b981', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-main)', fontWeight: 700 }}>MeetingMind Engine Active</span>
          <span style={{ color: 'var(--border-medium)' }}>•</span>
          <span>FastAPI · Vite React · SQLite · FAISS-CPU</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem' }}>Generative AI Meeting Intelligence & Verification</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '5px', background: 'var(--teal-bg)', color: 'var(--primary)', border: '1px solid var(--teal-border)', borderRadius: 'var(--radius-full)', padding: '3px 10px', fontWeight: 700, fontSize: '0.7rem' }}>
            v2.0
          </span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
