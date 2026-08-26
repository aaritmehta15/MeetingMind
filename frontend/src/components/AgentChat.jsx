import React, { useState } from 'react';
import { Brain, Send, ChevronDown, ChevronRight, Search, Zap, Globe, Calculator, FileText, List } from 'lucide-react';

// Tool metadata for the UI selector panel
const ALL_TOOLS = [
  {
    id: 'rag_search',
    name: 'RAG Search',
    icon: Search,
    color: '#818cf8',
    description: 'Semantically searches the transcript for relevant passages. Core tool — always recommended.',
    badge: 'Core',
    badgeClass: 'badge-primary',
  },
  {
    id: 'get_extraction',
    name: 'Structured Extraction',
    icon: FileText,
    color: '#06b6d4',
    description: 'Runs the full extraction pipeline to retrieve action items, decisions, and owners.',
    badge: 'LLM Call',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'get_summary',
    name: 'Meeting Summary',
    icon: List,
    color: '#a5b4fc',
    description: 'Returns a 2–3 sentence TL;DR of the entire meeting.',
    badge: 'LLM Call',
    badgeClass: 'badge-primary',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    color: '#fbbf24',
    description: 'Safely evaluates arithmetic — budgets, percentages, totals. Pure Python, free.',
    badge: 'Free · No API',
    badgeClass: 'badge-amber',
  },
  {
    id: 'web_search',
    name: 'Web Search',
    icon: Globe,
    color: '#34d399',
    description: 'Live DuckDuckGo search for real-world context about companies, people, or events.',
    badge: 'Free · Live Web',
    badgeClass: 'badge-verified',
  },
];

const SAMPLE_QUESTIONS = [
  "What did Edd commit to do, and by when?",
  "Who owns the roadmap decision?",
  "What budget was approved? Calculate 15% of it.",
  "Who is Heinz as a company? Search the web.",
];

export default function AgentChat({ examples, provider }) {
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
  // All tools enabled by default
  const [enabledTools, setEnabledTools] = useState(
    () => new Set(ALL_TOOLS.map((t) => t.id))
  );

  const toggleTool = (toolId) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) {
        next.delete(toolId);
      } else {
        next.add(toolId);
      }
      return next;
    });
  };

  const loadExample = (ex) => {
    setTranscript(ex.text);
    setSelectedExample(ex.id);
    setResult(null);
  };

  const handleAsk = async () => {
    if (!transcript.trim() || !question.trim()) return;
    if (enabledTools.size === 0) {
      alert('Please enable at least one tool before running the agent.');
      return;
    }
    setLoading(true);
    setResult(null);
    setExpandedStep(null);
    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript,
          question,
          provider,
          enabled_tools: [...enabledTools],
        }),
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
    <div style={{ padding: '24px 28px', maxWidth: '1500px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span>Autonomous ReAct Agent Studio</span>
          <span className="badge badge-amber">Multi-Step Reasoning</span>
          <span className="badge badge-primary">{enabledTools.size}/{ALL_TOOLS.length} Tools Active</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Watch the AI reason step-by-step — Thought → Tool Call → Observation → Grounded Answer. Toggle tools below.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr minmax(380px, 1.1fr)', gap: '20px', alignItems: 'start' }}>

        {/* ══ LEFT SIDEBAR: Tool Selector ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '2px', padding: '0 4px' }}>
            🔧 Active Toolbox
          </div>

          {ALL_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isEnabled = enabledTools.has(tool.id);
            return (
              <button
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                style={{
                  background: isEnabled
                    ? `rgba(${tool.id === 'calculator' ? '245,158,11' : tool.id === 'web_search' ? '16,185,129' : '99,102,241'}, 0.10)`
                    : 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isEnabled ? (tool.id === 'calculator' ? 'rgba(245,158,11,0.35)' : tool.id === 'web_search' ? 'rgba(16,185,129,0.35)' : 'rgba(99,102,241,0.35)') : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '11px 13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.18s ease',
                  width: '100%',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '5px' }}>
                  {/* Toggle pill */}
                  <div style={{
                    width: '32px', height: '18px',
                    background: isEnabled ? (tool.id === 'calculator' ? '#f59e0b' : tool.id === 'web_search' ? '#10b981' : '#6366f1') : 'rgba(255,255,255,0.12)',
                    borderRadius: '9px',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background 0.2s ease',
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '12px', height: '12px',
                      borderRadius: '50%',
                      background: 'white',
                      top: '3px',
                      left: isEnabled ? '17px' : '3px',
                      transition: 'left 0.2s ease',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    }} />
                  </div>
                  <Icon size={14} color={isEnabled ? tool.color : 'var(--text-dim)'} />
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isEnabled ? 'var(--text-main)' : 'var(--text-dim)' }}>
                    {tool.name}
                  </span>
                </div>
                <p style={{ fontSize: '0.72rem', color: isEnabled ? 'var(--text-muted)' : 'var(--text-dim)', lineHeight: 1.4, paddingLeft: '1px' }}>
                  {tool.description}
                </p>
                <div style={{ marginTop: '6px' }}>
                  <span className={`badge ${tool.badgeClass}`} style={{ fontSize: '0.65rem', opacity: isEnabled ? 1 : 0.4 }}>
                    {tool.badge}
                  </span>
                </div>
              </button>
            );
          })}

          {/* Enable / Disable All */}
          <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
            <button
              onClick={() => setEnabledTools(new Set(ALL_TOOLS.map(t => t.id)))}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, fontSize: '0.72rem' }}
            >
              All On
            </button>
            <button
              onClick={() => setEnabledTools(new Set())}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, fontSize: '0.72rem' }}
            >
              All Off
            </button>
          </div>
        </div>

        {/* ══ MIDDLE: Input Panel ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Example presets */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Load Sample Transcript
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  className={`btn btn-sm ${selectedExample === ex.id ? 'btn-cyan' : 'btn-secondary'}`}
                  style={{ fontSize: '0.75rem' }}
                >
                  {ex.filename.replace('.txt', '').replace(/-/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Transcript */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Meeting Transcript
            </div>
            <textarea
              className="textarea-field"
              style={{ height: '200px', width: '100%' }}
              placeholder="Paste a meeting transcript, or load a sample above..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          {/* Question */}
          <div className="glass-panel" style={{ padding: '14px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '9px' }}>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => setQuestion(q)} className="btn btn-secondary btn-sm" style={{ fontSize: '0.68rem' }}>
                  {q}
                </button>
              ))}
            </div>

            <button
              onClick={handleAsk}
              disabled={loading || !transcript.trim() || !question.trim() || enabledTools.size === 0}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '12px' }}
            >
              {loading ? (
                <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Reasoning with {enabledTools.size} tools...</>
              ) : (
                <><Send size={15} /> Ask Agent ({enabledTools.size} tools active)</>
              )}
            </button>
            {enabledTools.size === 0 && (
              <p style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '6px', textAlign: 'center' }}>
                ⚠️ Enable at least one tool to run the agent.
              </p>
            )}
          </div>
        </div>

        {/* ══ RIGHT: Output ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!result && !loading && (
            <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '420px' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)' }}>
                <Brain size={52} style={{ margin: '0 auto 16px', opacity: 0.15 }} />
                <p style={{ fontSize: '0.9rem' }}>Load a transcript and ask a question.</p>
                <p style={{ fontSize: '0.75rem', marginTop: '6px', opacity: 0.6 }}>Agent will use the tools you've enabled on the left.</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-panel animate-pulse-glow" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '420px' }}>
              <div style={{ textAlign: 'center', color: '#a5b4fc' }}>
                <Zap size={48} style={{ margin: '0 auto 16px' }} />
                <p style={{ fontWeight: 600 }}>Agent is reasoning...</p>
                <p style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-dim)' }}>Thought → Tool → Observation → Answer</p>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {[...enabledTools].map(tid => {
                    const tool = ALL_TOOLS.find(t => t.id === tid);
                    return tool ? <span key={tid} className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{tool.name}</span> : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Final Answer */}
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '3px solid #6366f1' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={13} /> Final Grounded Answer
                </div>
                <p style={{ fontSize: '0.975rem', lineHeight: 1.7, color: '#f1f5f9' }}>{result.answer}</p>
                <div style={{ marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                  <span>⏱ {result.latency_ms} ms</span>
                  <span>🔁 {result.steps?.length || 0} step(s)</span>
                  <span>🔧 {enabledTools.size} tools active</span>
                  <span>🤖 {provider.toUpperCase()}</span>
                </div>
              </div>

              {/* ReAct Reasoning Chain */}
              <div className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '12px' }}>
                  ReAct Reasoning Chain ({result.steps?.length || 0} steps)
                </div>

                {result.steps?.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No intermediate steps — answer was direct.</p>
                )}

                {result.steps?.map((step, idx) => (
                  <div key={idx} style={{ marginBottom: '8px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer',
                        padding: '9px 13px', display: 'flex', alignItems: 'center', gap: '9px',
                        color: 'var(--text-main)', fontFamily: 'var(--font-sans)', textAlign: 'left',
                      }}
                    >
                      {expandedStep === idx ? <ChevronDown size={13} color="#818cf8" /> : <ChevronRight size={13} color="#818cf8" />}
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Step {idx + 1}</span>
                      {step.tool_name && (
                        <span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>
                          🔧 {step.tool_name}
                        </span>
                      )}
                      {!step.tool_name && (
                        <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}>✓ Final Reasoning</span>
                      )}
                    </button>

                    {expandedStep === idx && (
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.2)' }}>
                        {step.thought && (
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '4px' }}>💭 Thought</div>
                            <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>{step.thought}</p>
                          </div>
                        )}
                        {step.tool_name && (
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#818cf8', textTransform: 'uppercase', marginBottom: '4px' }}>🔧 Tool: {step.tool_name}</div>
                            <pre style={{ fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', background: 'rgba(0,0,0,0.3)', padding: '7px', borderRadius: '6px', overflowX: 'auto' }}>
                              {JSON.stringify(step.tool_args, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.tool_result && (
                          <div>
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#34d399', textTransform: 'uppercase', marginBottom: '4px' }}>👁 Observation</div>
                            <p style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1', background: 'rgba(0,0,0,0.3)', padding: '7px', borderRadius: '6px', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto' }}>
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
