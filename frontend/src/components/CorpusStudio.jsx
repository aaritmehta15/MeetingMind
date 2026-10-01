import React, { useState } from 'react';
import {
  Layers, Database, RefreshCw, FileText, CheckCircle2, Search,
  Sparkles, BookOpen, Quote, CheckSquare, Square, Filter, Eye, X, AlertTriangle, Edit2, Trash2
} from 'lucide-react';

const SAMPLE_QUERIES = [
  'What technical architectures, infrastructure, and engineering commitments were agreed upon?',
  'What were the major security, compliance, and SLA decisions discussed across the meetings?',
  'Compare the EV battery management system architecture and its testing evaluation outcomes.',
  'Summarize all deadlines, deliverables, and owners assigned across the meetings.',
];
import { useAuth } from '../context/AuthContext';
import MarkdownAnswer from './MarkdownAnswer';

export default function CorpusStudio({ userMeetings, provider, fetchUserMeetings }) {
  const { authFetch } = useAuth();
  const fileInputRef = React.useRef(null);
  const [question, setQuestion] = useState(SAMPLE_QUERIES[0]);
  const [loading, setLoading] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [result, setResult] = useState(null);

  // Meeting Filter & Selection State
  const [selectedMeetings, setSelectedMeetings] = useState(
    () => new Set((userMeetings || []).map(m => m.id))
  );
  const [searchFilter, setSearchFilter] = useState('');
  const [previewMeeting, setPreviewMeeting] = useState(null);

  // Auto-select all meetings once loaded
  const initialLoadRef = React.useRef(false);
  React.useEffect(() => {
    if (userMeetings && userMeetings.length > 0 && !initialLoadRef.current) {
      setSelectedMeetings(new Set(userMeetings.map(m => m.id)));
      initialLoadRef.current = true;
    }
  }, [userMeetings]);

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
    setSelectedMeetings(new Set((userMeetings || []).map(m => m.id)));
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedMeetings(new Set());
  };

  // Filtered list of meetings based on search input
  const filteredMeetings = (userMeetings || []).filter(m =>
    (m.title && m.title.toLowerCase().includes(searchFilter.toLowerCase())) ||
    String(m.id).includes(searchFilter)
  );

  const handleAskCorpus = async () => {
    if (!question.trim()) return;
    if (selectedMeetings.size === 0) {
      alert('Please select at least one meeting archive to query.');
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch('/api/corpus/ask', {
        method: 'POST',
        body: JSON.stringify({
          question,
          provider,
          k: 5,
          selected_meetings: Array.from(selectedMeetings)
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const errorMsg = typeof data.detail === 'object' ? JSON.stringify(data.detail) : data.detail;
        throw new Error(errorMsg || 'Corpus query failed');
      }
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
      const res = await authFetch('/api/corpus/build', {
        method: 'POST',
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

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target.result;
      const title = file.name.replace(/\.[^/.]+$/, "");
      try {
        const res = await authFetch('/api/meetings', {
          method: 'POST',
          body: JSON.stringify({ title, transcript_text: text }),
        });
        if (res.ok) {
          await fetchUserMeetings?.();
          const json = await res.json();
          // Auto-select the newly uploaded meeting
          setSelectedMeetings(prev => new Set(prev).add(json.id));
        }
      } catch (err) {
        console.error("Failed to upload meeting", err);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const handleRename = async (id, currentTitle) => {
    const newTitle = window.prompt("Enter new title for this meeting:", currentTitle);
    if (!newTitle || newTitle === currentTitle) return;
    try {
      const res = await authFetch(`/api/meetings/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) await fetchUserMeetings?.();
      else alert("Failed to rename meeting.");
    } catch (err) {
      alert("Error renaming meeting.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this meeting?")) return;
    try {
      const res = await authFetch(`/api/meetings/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchUserMeetings?.();
        setSelectedMeetings(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    } catch (err) {
      alert("Error deleting meeting.");
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
            <span className="badge badge-primary">{selectedMeetings.size}/{(userMeetings || []).length} Meetings Active</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Select exactly which meetings to include in your cross-transcript knowledge query, then synthesize cited answers.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="file"
            accept=".txt"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary btn-sm"
            style={{ gap: '6px' }}
          >
            <span>Upload & Select Transcript</span>
          </button>

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
      </div>

      {/* ══ INTERACTIVE ARCHIVE SELECTOR SHELF ══ */}
      <div className="glass-panel" style={{ padding: '20px', marginBottom: '24px' }}>

        {/* Shelf Toolbar: Title, Filter, Select All / None */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Database size={15} color="#818cf8" />
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Indexed Corpus Archive: Select Meetings to Query ({selectedMeetings.size} of {(userMeetings || []).length} Selected)
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '10px' }}>
          {filteredMeetings.map((m) => {
            const isSelected = selectedMeetings.has(m.id);
            return (
              <div
                key={m.id}
                onClick={() => toggleMeeting(m.id)}
                style={{
                  background: isSelected ? 'var(--teal-bg)' : 'var(--bg-surface)',
                  border: `1.5px solid ${isSelected ? 'var(--border-active)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: isSelected ? '0 2px 12px rgba(20, 184, 166, 0.15)' : 'none'
                }}
                className="glass-panel-interactive"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                  {/* Custom Checkbox */}
                  <div style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '5px',
                    border: `1.5px solid ${isSelected ? 'var(--primary)' : 'var(--border-medium)'}`,
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.18s ease'
                  }}>
                    {isSelected && <CheckCircle2 size={13} color="#ffffff" />}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontSize: '0.84rem',
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }} title={m.title}>
                      {m.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                      💬 {m.turn_count} dialogue turns
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewMeeting(m); }}
                    className="btn btn-secondary btn-xs"
                    style={{ padding: '4px 6px', color: 'var(--text-muted)' }}
                    title="Preview Transcript"
                  >
                    <Eye size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRename(m.id, m.title); }}
                    className="btn btn-secondary btn-xs"
                    style={{ padding: '4px 6px', color: 'var(--text-muted)' }}
                    title="Rename Meeting"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(m.id); }}
                    className="btn btn-secondary btn-xs"
                    style={{ padding: '4px 6px', color: '#fb7185', borderColor: 'transparent' }}
                    title="Delete Meeting"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
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
              onClick={() => {
                setQuestion(sq);
              }}
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
              <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#06b6d4', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Multi-Meeting Synthesized Answer
              </span>
              <span className="badge badge-verified"><CheckCircle2 size={12} /> Source Grounding</span>
            </div>

            <MarkdownAnswer content={result.answer} />

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
              <BookOpen size={14} color="#06b6d4" />
              <span>Attributed Meeting Excerpts ({result.sources?.length || 0})</span>
            </div>

            {result.sources?.length === 0 && (
              <p style={{ fontSize: '0.84rem', color: 'var(--text-dim)' }}>No relevant excerpts found in the selected meetings.</p>
            )}

            {result.sources?.map((src, i) => {
              // Resolve human-readable meeting title
              const meetingObj = userMeetings?.find(
                m => String(m.id) === String(src.source) ||
                     String(m.id) === String(src.meeting_id) ||
                     m.title === src.source ||
                     m.title?.toLowerCase().includes(String(src.source).toLowerCase())
              );
              const displayTitle = meetingObj?.title || src.source || `Meeting #${i + 1}`;
              const scoreNum = typeof src.score === 'number' ? src.score : parseFloat(src.score) || 0;

              return (
                <div key={i} className="glass-panel" style={{
                  padding: '16px',
                  borderLeft: '3px solid #06b6d4',
                  background: 'var(--bg-surface-elevated)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}>
                  {/* Excerpt Header */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      <span style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
                        color: '#ffffff',
                        fontSize: '0.7rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          color: 'var(--text-main)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                        title={displayTitle}
                      >
                        {displayTitle}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge badge-cyan" style={{ fontSize: '0.7rem' }}>
                        Cosine: {scoreNum.toFixed(3)}
                      </span>
                      {meetingObj && (
                        <button
                          type="button"
                          onClick={() => setPreviewMeeting(meetingObj)}
                          className="btn btn-secondary btn-xs"
                          style={{ padding: '2px 7px', fontSize: '0.68rem', gap: '3px' }}
                          title="Preview full transcript"
                        >
                          <Eye size={10} /> View
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Excerpt Dialogue Text */}
                  <div style={{
                    fontSize: '0.85rem',
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--text-main)',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    lineHeight: 1.6,
                    maxHeight: '160px',
                    overflowY: 'auto',
                    whiteSpace: 'pre-wrap',
                  }}>
                    "{src.excerpt}"
                  </div>
                </div>
              );
            })}
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
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{previewMeeting.title}</h3>
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
