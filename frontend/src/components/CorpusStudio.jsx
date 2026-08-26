import React, { useState } from 'react';
import { Layers, Database, RefreshCw, FileText, CheckCircle2 } from 'lucide-react';

const SAMPLE_QUERIES = [
  'what decisions were made about the sales strategy across all meetings?',
  'what was decided about CI/CD and engineering roadmaps?',
  'summarize all client follow-ups across all transcripts',
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
    <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Cross-Meeting Knowledge Corpus</span>
            <span className="badge badge-cyan">Multi-Document RAG</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            Synthesize answers from your entire meeting library with source-attributed excerpts.
          </p>
        </div>
        <button onClick={handleRebuildCorpus} disabled={indexing} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} style={indexing ? { animation: 'spin 1s linear infinite' } : {}} />
          {indexing ? 'Indexing...' : 'Re-index Meeting Files'}
        </button>
      </div>

      {/* Indexed Meetings */}
      <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={13} /> Active Corpus Documents ({examples.length} meetings)
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {examples.map((ex) => (
            <div key={ex.id} style={{
              background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}>
              <FileText size={14} color="#818cf8" />
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600 }}>{ex.filename}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{ex.turn_count} turns</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Query Bar */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
          <input
            type="text"
            className="input-field"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAskCorpus()}
            placeholder="Ask a question across all indexed past meetings..."
          />
          <button onClick={handleAskCorpus} disabled={loading || !question.trim()} className="btn btn-primary" style={{ minWidth: '160px' }}>
            {loading ? 'Synthesizing...' : 'Query Corpus'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>Try:</span>
          {SAMPLE_QUERIES.map((sq, idx) => (
            <button key={idx} onClick={() => setQuestion(sq)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
              {sq}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(400px, 1.4fr) minmax(320px, 1fr)', gap: '24px' }}>
          {/* Synthesized Answer */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Synthesized Answer
              </span>
              <span className="badge badge-verified"><CheckCircle2 size={12} /> Cited Grounding</span>
            </div>
            <div style={{ fontSize: '0.925rem', lineHeight: 1.7, color: '#f1f5f9', whiteSpace: 'pre-wrap' }}>
              {result.answer}
            </div>
            <div style={{ marginTop: '14px', fontSize: '0.725rem', color: 'var(--text-dim)', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              Latency: {result.latency_ms} ms · Provider: {result.provider?.toUpperCase()}
            </div>
          </div>

          {/* Source Excerpts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
              Source Excerpts ({result.sources?.length || 0})
            </div>
            {result.sources?.map((src, i) => (
              <div key={i} className="glass-panel" style={{ padding: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                    <FileText size={11} /> {src.source}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Score: <strong style={{ color: '#67e8f9' }}>{src.score}</strong>
                  </span>
                </div>
                <div style={{
                  fontSize: '0.775rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1',
                  background: 'rgba(0,0,0,0.3)', padding: '8px 10px',
                  borderRadius: 'var(--radius-sm)', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto'
                }}>
                  {src.excerpt}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
