import React, { useState } from 'react';
import { 
  Layers, Database, RefreshCw, FileText, CheckCircle2, Search, 
  Sparkles, BookOpen, Quote, CheckSquare, Square, Filter, Eye, X, AlertTriangle 
} from 'lucide-react';

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
  
  // Meeting Filter & Selection State
  const [selectedMeetings, setSelectedMeetings] = useState(
    () => new Set(examples.map(ex => ex.id))
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [previewMeeting, setPreviewMeeting] = useState(null);

  // Toggle single meeting selection
  const toggleMeeting = (id) => {
    setSelectedMeetings(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Select all meetings
  const handleSelectAll = () => {
    setSelectedMeetings(new Set(examples.map(ex => ex.id)));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedMeetings(new Set());
  };

  // Filtered list of meetings based on search input
  const filteredExamples = examples.filter(ex => 
    ex.filename.toLowerCase().includes(searchFilter.toLowerCase()) ||
    ex.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const handleAskCorpus = async () => {
    if (!question.trim()) return;
    if (selectedMeetings.size === 0) {
      alert('Please select at least one meeting archive to query.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/corpus/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          question, 
          provider, 
          k: 5,
          selected_meetings: Array.from(selectedMeetings)
        }),
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
    <div style={{ padding: '24px 28px', maxWidth: '1550px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Cross-Meeting Knowledge Corpus</span>
            <span className="badge badge-cyan">Multi-Document RAG</span>
            <span className="badge badge-primary">{selectedMeetings.size}/{examples.length} Meetings Active</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Select exactly which meetings to include in your cross-transcript knowledge query, then synthesize cited answers.
          </p>
        </div>

        <button 
          onClick={handleRebuildCorpus} 
          disabled={indexing} 
          className="btn btn-secondary btn-sm"
          style={{ gap: '6px' }}
        >
          <RefreshCw size={13} style={indexing ? { animation: 'spin 1s linear infinite' } : {}} />
          <span>{indexing ? 'Re-indexing Archive...' : 'Re-index Meeting Files'}</span>
        </button>
      </div>

      {/* ══ INTERACTIVE ARCHIVE SELECTOR SHELF ══ */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>
        
        {/* Shelf Toolbar: Title, Filter, Select All / None */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="#818cf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Indexed Corpus Archive: Select Meetings to Query ({selectedMeetings.size} of {examples.length} Selected)
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Filter Input */}
            <div style={{ position: 'relative', width: '180px' }}>
              <Filter size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)' }} />
              <input
                type="text"
                className="input-field"
                style={{ padding: '5px 8px 5px 28px', fontSize: '0.74rem', height: '28px' }}
                placeholder="Filter meetings..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
              />
            </div>

            <button onClick={handleSelectAll} className="btn btn-secondary btn-xs" style={{ gap: '4px' }}>
              <CheckSquare size={11} /> Select All
            </button>
            <button onClick={handleDeselectAll} className="btn btn-secondary btn-xs" style={{ gap: '4px' }}>
              <Square size={11} /> Deselect All
            </button>
          </div>
        </div>

        {/* Meeting Document Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px' }}>
          {filteredExamples.map((ex) => {
            const isSelected = selectedMeetings.has(ex.id);
            return (
              <div
                key={ex.id}
                onClick={() => toggleMeeting(ex.id)}
                style={{
                  background: isSelected ? 'rgba(99, 102, 241, 0.09)' : 'rgba(255, 255, 255, 0.02)', 
                  border: `1px solid ${isSelected ? 'rgba(99, 102, 241, 0.45)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)', 
                  padding: '12px 14px',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? '0 2px 10px rgba(99, 102, 241, 0.15)' : 'none'
                }}
                className="glass-panel-interactive"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  {/* Custom Checkbox */}
                  <div style={{
                    width: '18px', 
                    height: '18px', 
                    borderRadius: '5px',
                    border: `1.5px solid ${isSelected ? '#6366f1' : 'rgba(255,255,255,0.25)'}`,
                    background: isSelected ? '#6366f1' : 'transparent',
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.18s ease'
                  }}>
                    {isSelected && <CheckCircle2 size={13} color="#ffffff" />}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div style={{ 
                      fontSize: '0.84rem', 
                      fontWeight: 700, 
                      color: isSelected ? '#ffffff' : 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {ex.filename}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      💬 {ex.turn_count} dialogue turns
                    </div>
                  </div>
                </div>

                {/* Preview transcript action */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewMeeting(ex);
                  }}
                  className="btn btn-secondary btn-xs"
                  style={{ padding: '3px 6px', color: 'var(--text-dim)' }}
                  title="Preview Transcript"
                >
                  <Eye size={12} />
                </button>
              </div>
            );
          })}
        </div>

        {selectedMeetings.size === 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontSize: '0.78rem', marginTop: '12px' }}>
            <AlertTriangle size={14} />
            <span>No meetings selected. Please check at least one meeting card above to enable corpus search.</span>
          </div>
        )}
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
              placeholder={`Ask a question across the ${selectedMeetings.size} selected meetings...`}
            />
          </div>

          <button 
            onClick={handleAskCorpus} 
            disabled={loading || !question.trim() || selectedMeetings.size === 0} 
            className="btn btn-primary" 
            style={{ minWidth: '200px' }}
          >
            {loading ? 'Synthesizing Corpus...' : <><Sparkles size={16} /> Query {selectedMeetings.size} Meetings</>}
          </button>
        </div>

        {/* Suggested Queries */}
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
              <span>🔍 Filtered Meetings: <strong>{selectedMeetings.size}</strong></span>
              <span>🤖 Provider: <strong>{result.provider?.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Cited Source Excerpts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <BookOpen size={14} color="#818cf8" />
              <span>Attributed Meeting Excerpts ({result.sources?.length || 0})</span>
            </div>

            {result.sources?.length === 0 && (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>No relevant excerpts found in the selected meetings.</p>
            )}

            {result.sources?.map((src, i) => (
              <div key={i} className="glass-panel" style={{ padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>
                    <FileText size={11} /> {src.source}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)' }}>
                    Cosine Score: <strong style={{ color: '#67e8f9' }}>{typeof src.score === 'number' ? src.score.toFixed(3) : src.score}</strong>
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

      {/* Transcript Preview Modal */}
      {previewMeeting && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(8px)',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '750px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={18} color="#818cf8" />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{previewMeeting.filename}</h3>
                <span className="badge badge-primary">{previewMeeting.turn_count} turns</span>
              </div>
              <button 
                onClick={() => setPreviewMeeting(null)}
                className="btn btn-secondary btn-xs"
              >
                <X size={14} /> Close
              </button>
            </div>
            <pre style={{
              flex: 1,
              overflowY: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.78rem',
              lineHeight: 1.6,
              background: 'rgba(0,0,0,0.4)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              color: '#e2e8f0',
              whiteSpace: 'pre-wrap'
            }}>
              {previewMeeting.text}
            </pre>
          </div>
        </div>
      )}

    </div>
  );
}
