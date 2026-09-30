import React, { useState, useEffect } from 'react';
import { Search, Layers, Loader2, Target, GitMerge, Info, FileText, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const SAMPLE_QUERIES = [
  'What was decided about the roadmap and next steps?',
  'Who committed to specific deliverables or deadlines?',
  'What technical risks or blockers were discussed?',
  'What decisions were made about architecture or security?',
];

export default function RagExplorer({ userMeetings }) {
  const { authFetch } = useAuth();
  const [activeExample, setActiveExample] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [query, setQuery] = useState('What was decided about the roadmap and next steps?');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [showExplainer, setShowExplainer] = useState(false);

  // Auto-select first meeting if available and none selected
  useEffect(() => {
    if (userMeetings && userMeetings.length > 0 && !activeExample) {
      setActiveExample(userMeetings[0].id);
      setTranscript(userMeetings[0].text);
    }
  }, [userMeetings, activeExample]);

  const loadMeeting = (m) => {
    setActiveExample(m.id);
    setTranscript(m.text);
    setResults([]);
  };

  const handleSearch = async (searchQuery = query) => {
    const q = searchQuery.trim();
    if (!q || !transcript.trim()) return;
    setLoading(true);
    setResults([]);
    try {
      const payload = activeExample ? { meeting_id: activeExample, query: q, k: 3 } : { transcript, query: q, k: 3 };
      const res = await authFetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Search failed');
      setResults(data.results || []);
    } catch (err) {
      alert('Error searching: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1500px', margin: '0 auto' }}>
      {/* Header Info */}
      <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Hierarchical Parent-Child RAG Explorer</span>
            <span className="badge badge-cyan">Context Expansion</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Solves conversational ambiguity by matching high-precision <strong>Child Chunks</strong> and expanding to a <strong>5-turn Parent Context Window</strong> for the LLM.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowExplainer(!showExplainer)}
          className="btn btn-secondary btn-xs"
          style={{ fontSize: '0.74rem' }}
        >
          <HelpCircle size={13} color="var(--primary)" />
          <span>{showExplainer ? 'Hide How It Works' : 'How Does This Work?'}</span>
        </button>
      </div>

      {/* Explainer Drawer / Banner */}
      {showExplainer && (
        <div className="glass-panel fade-in-up" style={{
          padding: '18px 20px',
          marginBottom: '20px',
          borderLeft: '4px solid #06b6d4',
          background: 'var(--bg-surface-elevated)',
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-main)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} color="#06b6d4" />
            <span>Why Hierarchical RAG is Essential for Meetings</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', fontSize: '0.82rem', lineHeight: 1.6, color: 'var(--text-muted)' }}>
            <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: '#f43f5e', display: 'block', marginBottom: '4px' }}>❌ The Standard RAG Problem:</strong>
              When searching meeting transcripts, an isolated sentence like <em>"Yeah, let's ship it by Friday"</em> matches vector search well, but the LLM doesn't know <strong>who</strong> said it or <strong>what</strong> "it" refers to (the pronoun problem).
            </div>
            <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <strong style={{ color: '#10b981', display: 'block', marginBottom: '4px' }}>✅ The Hierarchical Solution:</strong>
              1. <strong>Child Chunk</strong> (1-2 sentences): Embedded for maximum search cosine precision.<br />
              2. <strong>Parent Window</strong> (5 surrounding dialogue turns): Retrieved and passed to the LLM so it sees the full speaker context, question, and agreement.
            </div>
          </div>
        </div>
      )}

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
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
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
            onClick={() => handleSearch()}
            disabled={loading || !transcript.trim() || !query.trim()}
            style={{ minWidth: '150px' }}
          >
            {loading ? <><Loader2 className="animate-spin" size={16} /> Embedding & Searching</> : <><Search size={16} /> Execute RAG</>}
          </button>
        </div>

        {/* Suggested Queries */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '6px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600 }}>Suggested:</span>
          {SAMPLE_QUERIES.map((sq, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(sq);
                handleSearch(sq);
              }}
              style={{
                fontSize: '0.72rem',
                padding: '3px 9px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-active)';
                e.currentTarget.style.color = 'var(--text-main)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {results.length === 0 && !loading && (
        <div className="glass-panel" style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', maxWidth: '420px' }}>
            <Layers size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Vector Cosine Similarity & Expansion
            </h3>
            <p style={{ fontSize: '0.82rem', lineHeight: 1.5, color: 'var(--text-muted)' }}>
              Click <strong>Execute RAG</strong> or choose a suggested query above to visualize how Child Sentence matches expand into 5-turn Parent Contexts.
            </p>
          </div>
        </div>
      )}

      {loading && (
        <div className="glass-panel animate-pulse-glow" style={{ minHeight: '340px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', color: '#67e8f9' }}>
            <Loader2 className="animate-spin" size={44} style={{ margin: '0 auto 14px' }} />
            <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>FAISS Indexing & Cosine Ranking...</p>
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--border-subtle)', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#ffffff' }}>
                    #{idx + 1}
                  </div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-main)' }}>Vector Match Rank {idx + 1}</span>
                </div>
                
                {/* Score bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    Cosine Score: <strong style={{ color: '#06b6d4' }}>{res.score.toFixed(3)}</strong>
                  </span>
                  <div style={{ width: '120px', height: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(100, Math.max(0, res.score * 100))}%`, height: '100%', background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }} />
                  </div>
                </div>
              </div>

              {/* 2-Column Parent-Child Visualizer */}
              <div 
                className="responsive-2col"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '20px' }}
              >
                
                {/* Child Chunk (Exact Search Hit) */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(6, 182, 212, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#06b6d4', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                    <Target size={14} /> Child Chunk (Embedded Sentence)
                  </div>
                  <p style={{ fontSize: '0.88rem', lineHeight: 1.6, color: 'var(--text-main)', fontStyle: 'italic' }}>
                    "{res.child_text}"
                  </p>
                  
                  <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(6,182,212,0.08)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(6,182,212,0.18)' }}>
                    <Info size={14} color="#06b6d4" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      This isolated sentence produced the high cosine match. On its own, it lacks speaker context.
                    </p>
                  </div>
                </div>

                {/* Parent Window (Dialogue Context Handed to LLM) */}
                <div style={{ background: 'var(--bg-surface)', border: '1px solid rgba(139, 92, 246, 0.3)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#8b5cf6', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '10px' }}>
                    <Layers size={14} /> Expanded Parent Window (5-Turn Context)
                  </div>
                  <div style={{ fontSize: '0.82rem', lineHeight: 1.65, color: 'var(--text-main)', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                    {res.parent_window}
                  </div>
                  
                  <div style={{ marginTop: '14px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(139,92,246,0.08)', padding: '10px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(139,92,246,0.18)' }}>
                    <GitMerge size={14} color="#8b5cf6" style={{ flexShrink: 0, marginTop: '2px' }} />
                    <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
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
