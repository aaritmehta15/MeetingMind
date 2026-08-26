import React, { useState } from 'react';
import { Send, Bot, User, Wrench, ChevronDown, ChevronRight, Zap, Loader2, BrainCircuit } from 'lucide-react';

export default function AgentChat({ examples, provider }) {
  const [activeExample, setActiveExample] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState('What did Edd commit to do, and by when?');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedSteps, setExpandedSteps] = useState(true);

  const loadExample = (ex) => {
    setActiveExample(ex.id);
    setTranscript(ex.text);
    setResult(null);
  };

  const handleAsk = async () => {
    if (!transcript.trim() || !question.trim()) return;
    setLoading(true);
    setResult(null);
    setExpandedSteps(true);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, question, provider }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ask failed');
      setResult(data);
    } catch (err) {
      alert('Error asking agent: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>ReAct Reasoning Agent</span>
          <span className="badge badge-primary">Autonomous Thought Loop</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          A multi-step agent that reasons about the question, selects the appropriate tools (`rag_search` or `get_extraction`), 
          observes the results, and formulates a grounded answer.
        </p>
      </div>

      {/* Transcript Selector */}
      <div className="glass-panel" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dim)' }}>Transcript Context:</span>
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

      {/* Chat Area */}
      <div className="glass-panel" style={{ minHeight: '400px', display: 'flex', flexDirection: 'column' }}>
        
        {/* Messages */}
        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* User Question */}
          {result && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <User size={16} />
              </div>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px 16px', borderRadius: '0 var(--radius-md) var(--radius-md) var(--radius-md)', fontSize: '0.95rem' }}>
                {question}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <BrainCircuit size={16} color="white" className="animate-pulse-glow" />
              </div>
              <div style={{ padding: '6px 0', color: 'var(--primary)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Loader2 size={14} className="animate-spin" /> Agent is reasoning and exploring tools...
              </div>
            </div>
          )}

          {/* Agent Response */}
          {result && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 10px rgba(99,102,241,0.5)' }}>
                <Bot size={16} color="white" />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Reasoning Accordion */}
                <div style={{ border: '1px solid rgba(99,102,241,0.3)', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
                  <button 
                    onClick={() => setExpandedSteps(!expandedSteps)}
                    style={{ 
                      width: '100%', 
                      padding: '10px 16px', 
                      background: 'rgba(99,102,241,0.1)', 
                      border: 'none', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      color: '#a5b4fc',
                      fontSize: '0.8rem',
                      fontWeight: 600
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Zap size={14} /> Agent Reasoning Trace ({result.steps.length} steps)
                    </div>
                    {expandedSteps ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  
                  {expandedSteps && (
                    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {result.steps.map((step, idx) => (
                        <div key={idx} style={{ paddingLeft: '16px', borderLeft: '2px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ fontSize: '0.8rem', color: '#e2e8f0' }}>
                            <strong style={{ color: '#c4b5fd' }}>Thought:</strong> {step.thought}
                          </div>
                          
                          {step.tool_name && (
                            <div style={{ background: 'rgba(15,23,42,0.6)', borderRadius: 'var(--radius-sm)', padding: '10px', border: '1px solid var(--border-subtle)' }}>
                              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#67e8f9', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                                <Wrench size={12} /> Executing Tool: {step.tool_name}
                              </div>
                              {step.tool_args && (
                                <pre style={{ margin: 0, fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                                  {JSON.stringify(step.tool_args, null, 2)}
                                </pre>
                              )}
                              
                              <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#10b981', fontWeight: 600, marginBottom: '4px' }}>Observation:</div>
                              <div style={{ fontSize: '0.7rem', color: '#cbd5e1', fontFamily: 'var(--font-mono)', maxHeight: '100px', overflowY: 'auto' }}>
                                {step.tool_result.substring(0, 300)}{step.tool_result.length > 300 ? '...' : ''}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Final Answer */}
                <div style={{ fontSize: '0.95rem', lineHeight: 1.6, color: 'white', whiteSpace: 'pre-wrap' }}>
                  {result.answer}
                </div>
                
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', alignSelf: 'flex-end' }}>
                  Agent Pipeline Latency: {result.latency_ms} ms
                </div>
              </div>
            </div>
          )}

          {!result && !loading && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-dim)' }}>
              <p>Select a transcript and ask a question to see the agent think.</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '16px 24px', background: 'rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <input
              type="text"
              className="input-field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask the agent a complex multi-step question..."
              disabled={!transcript}
            />
            <button 
              className="btn btn-primary" 
              onClick={handleAsk}
              disabled={loading || !transcript.trim() || !question.trim()}
              style={{ padding: '0 20px' }}
            >
              <Send size={16} /> Ask
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
