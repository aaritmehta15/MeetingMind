import React, { useState } from 'react';
import { Brain, Send, ChevronDown, ChevronRight, Search, Zap, Quote, AlertCircle } from 'lucide-react';

const SAMPLE_QUESTIONS = [
  "What did Edd commit to do, and by when?",
  "Who owns the roadmap decision?",
  "What budget was approved in this meeting?",
  "What are the main risks discussed?",
];

export default function AgentChat({ examples, provider }) {
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);

  const loadExample = (ex) => {
    setTranscript(ex.text);
    setSelectedExample(ex.id);
    setResult(null);
  };

  const handleAsk = async () => {
    if (!transcript.trim() || !question.trim()) return;
    setLoading(true);
    setResult(null);
    setExpandedStep(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, question, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Agent failed');
      setResult(data);
    } catch (err) {
      alert('Agent error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Autonomous ReAct Agent Studio</span>
          <span className="badge badge-amber">Multi-Step Reasoning</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Watch the AI reason step-by-step — Thought → Tool Call → Observation → Grounded Answer. No black box.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(380px, 1fr) minmax(420px, 1.2fr)', gap: '24px' }}>
        {/* Left: Input */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Example presets */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px' }}>
              Load Sample Transcript
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  className={`btn btn-sm ${selectedExample === ex.id ? 'btn-cyan' : 'btn-secondary'}`}
                >
                  {ex.filename.replace('.txt', '').replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Transcript Input */}
          <div className="glass-panel" style={{ padding: '16px', flex: 1 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Meeting Transcript
            </div>
            <textarea
              className="textarea-field"
              style={{ height: '220px', width: '100%' }}
              placeholder="Paste your meeting transcript here, or load a sample above..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          {/* Question Input */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Your Question
            </div>
            <input
              type="text"
              className="input-field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="What did the team decide about...?"
            />
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => setQuestion(q)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem' }}>
                  {q}
                </button>
              ))}
            </div>
            <button
              onClick={handleAsk}
              disabled={loading || !transcript.trim() || !question.trim()}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              {loading ? (
                <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Reasoning...</>
              ) : (
                <><Send size={15} /> Ask Agent</>
              )}
            </button>
          </div>
        </div>

        {/* Right: Output */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!result && !loading && (
            <div className="glass-panel" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                <Brain size={52} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
                <p style={{ fontSize: '0.9rem' }}>Load a transcript and ask a question.</p>
                <p style={{ fontSize: '0.78rem', marginTop: '6px', opacity: 0.6 }}>The agent will reason step-by-step using its tools.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-panel animate-pulse-glow" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
              <div style={{ textAlign: 'center', color: '#a5b4fc' }}>
                <Zap size={48} style={{ margin: '0 auto 16px', animation: 'pulse-glow 1.2s infinite' }} />
                <p style={{ fontWeight: 600 }}>Agent is reasoning...</p>
                <p style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-dim)' }}>Thought → Tool → Observation → Answer</p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Final Answer */}
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid #6366f1' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={13} /> Final Grounded Answer
                </div>
                <p style={{ fontSize: '0.975rem', lineHeight: 1.7, color: '#f1f5f9' }}>{result.answer}</p>
                <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '14px' }}>
                  <span>⏱ {result.latency_ms} ms</span>
                  <span>🔁 {result.steps?.length || 0} reasoning step(s)</span>
                  <span>🤖 {provider.toUpperCase()}</span>
                </div>
              </div>

              {/* ReAct Reasoning Steps */}
              <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '14px' }}>
                  ReAct Reasoning Chain ({result.steps?.length || 0} steps)
                </div>

                {result.steps?.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No intermediate steps — answer was direct.</p>
                )}

                {result.steps?.map((step, idx) => (
                  <div key={idx} style={{ marginBottom: '10px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    {/* Step Header */}
                    <button
                      onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer',
                        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-main)',
                        fontFamily: 'var(--font-sans)', textAlign: 'left'
                      }}
                    >
                      {expandedStep === idx ? <ChevronDown size={14} color="#818cf8" /> : <ChevronRight size={14} color="#818cf8" />}
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Step {idx + 1}</span>
                      {step.tool_name && (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>
                          <Search size={10} /> {step.tool_name}
                        </span>
                      )}
                      {!step.tool_name && (
                        <span className="badge badge-verified" style={{ fontSize: '0.7rem', marginLeft: '4px' }}>
                          Final Reasoning
                        </span>
                      )}
                    </button>

                    {/* Step Details */}
                    {expandedStep === idx && (
                      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)' }}>
                        {step.thought && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '4px' }}>💭 Thought</div>
                            <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>{step.thought}</p>
                          </div>
                        )}
                        {step.tool_name && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', marginBottom: '4px' }}>🔧 Tool Call: {step.tool_name}</div>
                            <pre style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', overflowX: 'auto' }}>
                              {JSON.stringify(step.tool_args, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.tool_result && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>👁 Observation</div>
                            <p style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '8px', borderRadius: '6px', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' }}>
                              {typeof step.tool_result === 'string' ? step.tool_result : JSON.stringify(step.tool_result, null, 2)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
