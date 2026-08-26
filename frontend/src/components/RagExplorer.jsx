import React, { useState } from 'react';
import { Search, Layers, Loader2, Target, GitMerge, Info, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RagExplorer({ userMeetings }) {
  const { authFetch } = useAuth();
  const [activeExample, setActiveExample] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [query, setQuery] = useState('what was decided about the roadmap?');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const loadMeeting = (m) => {
    setActiveExample(m.id);
    setTranscript(m.text);
    setResults([]);
    setQuery('');
  };

  const handleSearch = async () => {
    if (!query.trim() || !transcript.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const payload = activeExample ? { meeting_id: activeExample, query, k: 3 } : { transcript, query, k: 3 };
      const res = await authFetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Search failed');
      setResults(data.results);
    } catch (err) {
      alert('Error searching: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1500px', margin: '0 auto' }}>
      {/* Header Info */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Hierarchical Parent-Child RAG Explorer</span>
          <span className="badge badge-cyan">Context Expansion</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
          Solves dialogue ambiguity by searching high-precision <strong>Child Chunks</strong> and expanding to a <strong>5-turn Parent Context Window</strong> for the LLM.
        </p>
      </div>

      {/* Control / Search Panel */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        {/* Sample presets */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
            Choose Transcript to Index:
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {userMeetings && userMeetings.map(m => (
              <button
                key={m.id}
                onClick={() => loadMeeting(m)}
                className={`btn btn-xs ${activeExample === m.id ? 'btn-cyan' : 'btn-secondary'}`}
              >
                <FileText size={11} />
                <span>{m.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search input bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '42px' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search meeting dialogue using vector cosine similarity..."
            />
          </div>
          <button 
            className="btn btn-cyan" 
            onClick={handleSearch}
            disabled={loading || !transcript.trim() || !query.trim()}
            style={{ minWidth: '150px' }}
          >
            {loading ? <><Loader2 className="animate-spin" size={16} /> Embedding & Searching</> : <><Search size={16} /> Execute RAG</>}
          </button>
        </div>
      </div>

      {/* Results View */}
      {results.length === 0 && !loading && (
        <div className="glass-panel" style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', maxWidth: '380px' }}>
            <Layers size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              No Vector Queries Executed
            </h3>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.5 }}>
              Select a sample transcript above and run a vector search to visualize the parent-child chunk mapping.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-panel animate-pulse-glow" style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#67e8f9' }}>
            <Loader2 className="animate-spin" size={44} style={{ margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>FAISS Indexing & Cosine Ranking...</p>
            <p style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-muted)' }}>
              Calculating sentence embeddings & expanding 5-turn parent windows
            </p>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {results.map((res, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '22px' }}>
              
              {/* Score header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--cyan-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#ffffff' }}>
                    #{idx + 1}
                  </div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700 }}>Vector Match Rank {idx + 1}</span>
                </div>
                
                {/* Score bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Cosine Score: <strong style={{ color: '#67e8f9' }}>{res.score.toFixed(3)}</strong>
                  </span>
                  <div style={{ width: '120px', height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, res.score * 100))}%`, height: '100%', background: 'var(--cyan-gradient)' }} />
                  </div>
                </div>
              </div>

              {/* 2-Column Parent-Child Visualizer */}
              <div 
                className="responsive-2col"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}
              >
                
                {/* Child Chunk (Exact Search Hit) */}
                <div style={{ background: 'rgba(6, 182, 212, 0.04)', border: '1px solid rgba(6, 182, 212, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#67e8f9', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                    <Target size={14} /> Child Chunk (Embedded Sentence)
                  </div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: '#f1f5f9', fontStyle: 'italic' }}>
                    "{res.child_text}"
                  </p>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(6,182,212,0.08)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <Info size={14} color="#67e8f9" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.74rem', color: '#a5f3fc', lineHeight: 1.45 }}>
                      This isolated sentence produced the high cosine match. On its own, it lacks speaker context.
                    </p>
                  </div>
                </div>

                {/* Parent Window (Dialogue Context Handed to LLM) */}
                <div style={{ background: 'rgba(139, 92, 246, 0.04)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                    <Layers size={14} /> Expanded Parent Window (5-Turn Context)
                  </div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.65, color: '#e2e8f0', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    {res.parent_window}
                  </div>
                  
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(139,92,246,0.08)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    <GitMerge size={14} color="#c4b5fd" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.74rem', color: '#ddd6fe', lineHeight: 1.45 }}>
                      Hierarchical RAG automatically expanded surrounding turns so the LLM knows who said it and why.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
