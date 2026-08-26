import React, { useState } from 'react';
import { Layers, Database, RefreshCw, FileText, CheckCircle2, Search, Sparkles, BookOpen, Quote } from 'lucide-react';

const SAMPLE_QUERIES = [
  'What decisions were made about the sales strategy across all meetings?',
  'What was decided about CI/CD and engineering roadmaps?',
  'Summarize all client follow-ups across all transcripts',
];

export default function CorpusStudio({ examples, provider }) {
  const [question, setQuestion] = useState(SAMPLE_QUERIES[0]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [result, setResult] = useState(null);

  const handleAskCorpus = async () => {
    if (!question.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/corpus/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, provider, k: 5 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Corpus query failed');
      setResult(data);
    } catch (err) {
      alert('Error querying corpus: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRebuildCorpus = async () => {
    setIndexing(true);
    try {
      const res = await fetch('/api/corpus/build', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder: 'examples' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Corpus build failed');
      alert(`✅ Corpus indexed! ${data.total_chunks} chunks from ${data.num_meetings} meetings.`);
    } catch (err) {
      alert('Error building corpus: ' + err.message);
    } finally {
      setIndexing(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1500px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Cross-Meeting Knowledge Corpus</span>
            <span className="badge badge-cyan">Multi-Document RAG</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Synthesize intelligence across your entire meeting archive with citations attributed to specific transcripts.
          </p>
        </div>

        <button 
          onClick={handleRebuildCorpus} 
          disabled={indexing} 
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <RefreshCw size={13} style={indexing ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>{indexing ? 'Indexing Multi-Doc Index...' : 'Rebuild Corpus Index'}</span>
        </button>
      </div>

      {/* Active Indexed Documents Shelf */}
      <div className="glass-panel" style={{ padding: '18px 22px', marginBottom: '22px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={13} color="#818cf8" />
          <span>Indexed Corpus Archive ({examples.length} Meetings Available)</span>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {examples.map((ex) => (
            <div key={ex.id} style={{
              background: 'rgba(255, 255, 255, 0.03)', 
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', 
              padding: '10px 14px',
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px'
            }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(99, 102, 241, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText size={14} color="#818cf8" />
              </div>
              <div>
                <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-main)' }}>{ex.filename}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{ex.turn_count} conversational turns</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Bar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '42px' }}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskCorpus()}
              placeholder="Ask a question across all indexed past meetings..."
            />
          </div>

          <button 
            onClick={handleAskCorpus} 
            disabled={loading || !question.trim()} 
            className="btn btn-primary" 
            style={{ minWidth: '170px' }}
          >
            {loading ? 'Synthesizing Corpus...' : <><Sparkles size={16} /> Query Multi-Doc RAG</>}
          </button>
        </div>

        {/* Query Suggestion Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700 }}>Try Query:</span>
          {SAMPLE_QUERIES.map((sq, idx) => (
            <button 
              key={idx} 
              onClick={() => setQuestion(sq)} 
              className="btn btn-secondary btn-xs" 
              style={{ fontSize: '0.72rem' }}
            >
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {result && (
        <div 
          className="responsive-2col"
          style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1.4fr) minmax(340px, 1fr)', gap: '24px', alignItems: 'start' }}
        >
          {/* Synthesized Answer Card */}
          <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #06b6d4' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#67e8f9', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Multi-Meeting Synthesized Answer
              </span>
              <span className="badge badge-verified"><CheckCircle2 size={12} /> Source Grounding</span>
            </div>

            <div style={{ fontSize: '0.95rem', lineHeight: 1.7, color: '#f8fafc', whiteSpace: 'pre-wrap' }}>
              {result.answer}
            </div>

            <div style={{ marginTop: '16px', fontSize: '0.74rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <span>⏱ Latency: <strong>{result.latency_ms} ms</strong></span>
              <span>📚 Sources Cited: <strong>{result.sources?.length || 0}</strong></span>
              <span>🤖 Provider: <strong>{result.provider?.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Cited Source Excerpts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} color="#818cf8" />
              <span>Attributed Meeting Excerpts ({result.sources?.length || 0})</span>
            </div>

            {result.sources?.map((src, i) => (
              <div key={i} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                    <FileText size={11} /> {src.source}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Relevance Score: <strong style={{ color: '#67e8f9' }}>{typeof src.score === 'number' ? src.score.toFixed(3) : src.score}</strong>
                  </span>
                </div>
                <div style={{
                  fontSize: '0.78rem', 
                  fontFamily: 'var(--font-mono)', 
                  color: '#cbd5e1',
                  background: 'rgba(0, 0, 0, 0.4)', 
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)', 
                  lineHeight: 1.5, 
                  maxHeight: '130px', 
                  overflowY: 'auto'
                }}>
                  "{src.excerpt}"
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
