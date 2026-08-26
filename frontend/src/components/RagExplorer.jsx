import React, { useState } from 'react';
import { Search, Layers, Loader2, Target, GitMerge, Info } from 'lucide-react';

export default function RagExplorer({ examples }) {
  const [activeExample, setActiveExample] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [query, setQuery] = useState('what was decided about the roadmap?');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const loadExample = (ex) => {
    setActiveExample(ex.id);
    setTranscript(ex.text);
    setResults([]);
  };

  const handleSearch = async () => {
    if (!transcript.trim() || !query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, query, k: 3 }),
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
    <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Hierarchical Parent-Child RAG</span>
          <span className="badge badge-cyan">Context Expansion</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Visualizing the difference between the high-precision embedded <strong>Child Chunk</strong> (the exact match) 
          and the expanded <strong>Parent Window</strong> (5 conversational turns sent to the LLM for context).
        </p>
      </div>

      {/* Example selector & Search Bar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)' }}>Select Transcript:</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {examples.map(ex => (
              <button
                key={ex.id}
                onClick={() => loadExample(ex)}
                className={`btn btn-sm ${activeExample === ex.id ? 'btn-primary' : 'btn-secondary'}`}
              >
                {ex.id}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '40px' }}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search transcript using semantic vector search..."
            />
          </div>
          <button 
            className="btn btn-cyan" 
            onClick={handleSearch}
            disabled={loading || !transcript.trim() || !query.trim()}
            style={{ minWidth: '140px' }}
          >
            {loading ? <><Loader2 className="animate-spin" size={16} /> Searching</> : 'RAG Search'}
          </button>
        </div>
      </div>

      {/* Results */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {results.map((res, idx) => (
          <div key={idx} className="glass-panel" style={{ padding: '24px' }}>
            
            {/* Score header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--cyan-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                  {idx + 1}
                </div>
                <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Vector Match</span>
              </div>
              
              {/* Score bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Cosine Similarity: {res.score.toFixed(3)}</span>
                <div style={{ width: '100px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, res.score * 100))}%`, height: '100%', background: 'var(--cyan-gradient)' }} />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              {/* Child Chunk */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(6, 182, 212, 0.2)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#67e8f9', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                  <Target size={14} /> Child Chunk (Embedded)
                </div>
                <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', fontStyle: 'italic' }}>"{res.child_text}"</p>
                
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(6,182,212,0.1)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <Info size={14} color="#67e8f9" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.7rem', color: '#a5f3fc', lineHeight: 1.4 }}>
                    This specific sentence is what matched the search vector. But sending just this to the LLM would lack conversational context.
                  </p>
                </div>
              </div>

              {/* Parent Window */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(139, 92, 246, 0.2)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c4b5fd', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '10px' }}>
                  <Layers size={14} /> Expanded Parent Window (5 Turns)
                </div>
                <div style={{ fontSize: '0.8rem', lineHeight: 1.6, color: '#e2e8f0', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
                  {res.parent_window}
                </div>
                
                <div style={{ marginTop: '16px', display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(139,92,246,0.1)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
                  <GitMerge size={14} color="#c4b5fd" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <p style={{ fontSize: '0.7rem', color: '#ddd6fe', lineHeight: 1.4 }}>
                    The system expands the single sentence into the surrounding 5-turn dialogue block. This is the actual text handed to the LLM agent.
                  </p>
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
