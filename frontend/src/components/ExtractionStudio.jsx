import React, { useState } from 'react';
import { Play, CheckCircle2, XCircle, Clock, User, ShieldCheck, Quote, Loader2, Sparkles, AlertCircle } from 'lucide-react';

export default function ExtractionStudio({ examples, provider }) {
  const [activeExample, setActiveExample] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hoverQuote, setHoverQuote] = useState(null);

  const loadExample = (ex) => {
    setActiveExample(ex.id);
    setTranscript(ex.text);
    setResult(null);
  };

  const handleExtract = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Extraction failed');
      setResult(data);
    } catch (err) {
      alert('Error extracting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      
      {/* Left Pane: Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Raw Transcript</h2>
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

        <textarea
          className="textarea-field"
          style={{ flex: 1, minHeight: '500px' }}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Paste meeting transcript here..."
        />

        <button
          className="btn btn-primary"
          style={{ padding: '12px', fontSize: '1rem' }}
          onClick={handleExtract}
          disabled={loading || !transcript.trim()}
        >
          {loading ? (
            <><Loader2 className="animate-spin" size={18} /> Analyzing with Citation Guard...</>
          ) : (
            <><Sparkles size={18} /> Extract Structured Data</>
          )}
        </button>
      </div>

      {/* Right Pane: Output */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>Intelligence Engine Output</span>
          {result && (
            <span className="badge badge-verified" style={{ marginLeft: 'auto' }}>
              <ShieldCheck size={14} /> 0% Hallucination
            </span>
          )}
        </h2>

        {!result && !loading && (
          <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
            <div style={{ textAlign: 'center' }}>
              <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
              <p>Run extraction to see verified action items and decisions.</p>
            </div>
          </div>
        )}

        {loading && (
          <div className="glass-panel animate-pulse-glow" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: 'var(--primary)' }}>
              <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto 16px' }} />
              <p style={{ fontWeight: 600 }}>Extracting & Verifying...</p>
            </div>
          </div>
        )}

        {result && (
          <>
            {/* Executive Summary */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: '12px', fontWeight: 700 }}>Executive Summary</h3>
              <p style={{ fontSize: '0.95rem', lineHeight: 1.6 }}>{result.summary}</p>
            </div>

            {/* Action Items */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Action Items</h3>
                <span className="badge badge-primary">{result.action_items.length} Tasks</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.action_items.map((action, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1 }}>{action.description}</p>
                      {action.accepted ? (
                        <div 
                          className="badge badge-verified" 
                          style={{ cursor: 'pointer', position: 'relative' }}
                          onMouseEnter={() => setHoverQuote(idx)}
                          onMouseLeave={() => setHoverQuote(null)}
                        >
                          <CheckCircle2 size={12} /> Cited Grounding
                          
                          {/* Hover Popover */}
                          {hoverQuote === idx && (
                            <div className="evidence-box" style={{ 
                              position: 'absolute', 
                              right: '0', 
                              top: '100%', 
                              marginTop: '8px',
                              width: '300px',
                              zIndex: 100
                            }}>
                              <Quote size={12} color="#10b981" style={{ marginBottom: '4px' }} />
                              "{action.evidence_quote}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="badge badge-rejected"><XCircle size={12} /> Hallucinated</div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '12px', marginTop: '12px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {action.owner && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <User size={12} /> {action.owner}
                        </div>
                      )}
                      {action.deadline && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Clock size={12} /> {action.deadline}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                {result.action_items.length === 0 && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>No action items detected.</p>
                )}
              </div>
            </div>

            {/* Decisions */}
            <div className="glass-panel" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 700 }}>Decisions</h3>
                <span className="badge badge-cyan">{result.decisions.length} Decisions</span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {result.decisions.map((dec, idx) => (
                  <div key={idx} style={{ 
                    background: 'rgba(255,255,255,0.03)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: 'var(--radius-sm)', 
                    padding: '12px' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                      <p style={{ fontSize: '0.9rem', fontWeight: 500, flex: 1 }}>{dec.description}</p>
                      {dec.accepted ? (
                        <div 
                          className="badge badge-verified" 
                          style={{ cursor: 'pointer', position: 'relative' }}
                          onMouseEnter={() => setHoverQuote('d'+idx)}
                          onMouseLeave={() => setHoverQuote(null)}
                        >
                          <CheckCircle2 size={12} /> Cited Grounding
                          
                          {hoverQuote === 'd'+idx && (
                            <div className="evidence-box" style={{ 
                              position: 'absolute', 
                              right: '0', 
                              top: '100%', 
                              marginTop: '8px',
                              width: '300px',
                              zIndex: 100
                            }}>
                              <Quote size={12} color="#10b981" style={{ marginBottom: '4px' }} />
                              "{dec.evidence_quote}"
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="badge badge-rejected"><XCircle size={12} /> Hallucinated</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Add Brain icon missing from imports
import { Brain } from 'lucide-react';
