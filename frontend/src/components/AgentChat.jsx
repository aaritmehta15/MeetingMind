import React, { useState } from 'react';
import { Brain, Send, ChevronDown, ChevronRight, Search, Zap, Globe, Calculator, FileText, List, Sparkles, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

const ALL_TOOLS = [
  {
    id: 'rag_search',
    name: 'RAG Search',
    icon: Search,
    color: '#818cf8',
    description: 'Semantically searches the transcript for relevant dialogue passages.',
    badge: 'Vector Index',
    badgeClass: 'badge-primary',
  },
  {
    id: 'get_extraction',
    name: 'Structured Extraction',
    icon: FileText,
    color: '#06b6d4',
    description: 'Runs schema pipeline to retrieve verified tasks and decisions.',
    badge: 'Pipeline',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'get_summary',
    name: 'Meeting Summary',
    icon: List,
    color: '#a5b4fc',
    description: 'Generates an executive 2–3 sentence meeting overview.',
    badge: 'Overview',
    badgeClass: 'badge-primary',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    color: '#fbbf24',
    description: 'Safely evaluates arithmetic expressions (budgets, timelines, totals).',
    badge: 'Pure Python',
    badgeClass: 'badge-amber',
  },
  {
    id: 'web_search',
    name: 'Web Search',
    icon: Globe,
    color: '#34d399',
    description: 'Live DuckDuckGo search for external entities, clients, or companies.',
    badge: 'Live Web',
    badgeClass: 'badge-verified',
  },
];

const SAMPLE_QUESTIONS = [
  "What did Edd commit to do, and by when?",
  "Who owns the roadmap decision?",
  "If the Q3 budget is $50,000 and we spent $12,500, calculate remaining %.",
  "Who is Heinz as a company? Search the web.",
];

export default function AgentChat({ examples, provider }) {
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedStep, setExpandedStep] = useState(null);
  const [selectedExample, setSelectedExample] = useState(null);
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
      alert('Please enable at least one tool before launching the agent.');
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
      // Auto-expand all steps by default or first step
      if (data.steps && data.steps.length > 0) {
        setExpandedStep(0);
      }
    } catch (err) {
      alert('Agent error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1550px', margin: '0 auto' }}>
      
      {/* Workspace Header */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Autonomous ReAct Agent Workbench</span>
            <span className="badge badge-amber">Thought → Action → Observation</span>
            <span className="badge badge-primary">{enabledTools.size}/{ALL_TOOLS.length} Active Tools</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Transparent multi-step reasoning loop. Configure active tools on the left and inspect real-time tool execution.
          </p>
        </div>

        {/* Status indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }} />
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>ReAct Loop Ready ({provider.toUpperCase()})</span>
        </div>
      </div>

      {/* 3-Column Responsive Grid */}
      <div 
        className="responsive-3col"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '270px minmax(360px, 1fr) minmax(420px, 1.2fr)', 
          gap: '20px', 
          alignItems: 'start' 
        }}
      >

        {/* ══ COLUMN 1: Tool Selector & Configuration ══ */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🔧 Agent Toolbox
            </span>
            <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700 }}>
              {enabledTools.size} Enabled
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {ALL_TOOLS.map((tool) => {
              const Icon = tool.icon;
              const isEnabled = enabledTools.has(tool.id);
              return (
                <button
                  key={tool.id}
                  onClick={() => toggleTool(tool.id)}
                  style={{
                    background: isEnabled
                      ? `rgba(99, 102, 241, 0.08)`
                      : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isEnabled ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '11px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    width: '100%',
                    boxShadow: isEnabled ? '0 2px 10px rgba(0,0,0,0.2)' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} color={isEnabled ? tool.color : 'var(--text-dim)'} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isEnabled ? 'var(--text-main)' : 'var(--text-dim)' }}>
                        {tool.name}
                      </span>
                    </div>

                    {/* Smooth Toggle Switch */}
                    <div style={{
                      width: '30px', 
                      height: '16px',
                      background: isEnabled ? '#6366f1' : 'rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      position: 'relative',
                      flexShrink: 0,
                      transition: 'background 0.2s ease',
                    }}>
                      <div style={{
                        position: 'absolute',
                        width: '10px', 
                        height: '10px',
                        borderRadius: '50%',
                        background: 'white',
                        top: '3px',
                        left: isEnabled ? '16px' : '3px',
                        transition: 'left 0.2s ease',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                      }} />
                    </div>
                  </div>

                  <p style={{ fontSize: '0.72rem', color: isEnabled ? 'var(--text-muted)' : 'var(--text-dim)', lineHeight: 1.35 }}>
                    {tool.description}
                  </p>
                  
                  <div style={{ marginTop: '6px' }}>
                    <span className={`badge ${tool.badgeClass}`} style={{ fontSize: '0.64rem', padding: '1px 6px', opacity: isEnabled ? 1 : 0.4 }}>
                      {tool.badge}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setEnabledTools(new Set(ALL_TOOLS.map(t => t.id)))}
              className="btn btn-secondary btn-xs"
              style={{ flex: 1 }}
            >
              All Tools On
            </button>
            <button
              onClick={() => setEnabledTools(new Set(['rag_search']))}
              className="btn btn-secondary btn-xs"
              style={{ flex: 1 }}
            >
              RAG Only
            </button>
          </div>
        </div>

        {/* ══ COLUMN 2: Input & Context ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Transcript Selector */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Load Meeting Transcript
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  className={`btn btn-xs ${selectedExample === ex.id ? 'btn-cyan' : 'btn-secondary'}`}
                >
                  <FileText size={11} />
                  <span>{ex.filename.replace('.txt', '').replace(/-/g, ' ')}</span>
                </button>
              ))}
            </div>

            <textarea
              className="textarea-field"
              style={{ height: '180px', width: '100%' }}
              placeholder="Paste meeting transcript here or choose a preset above..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          {/* Question / Prompt Input */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Your Question for the ReAct Agent
            </div>

            <input
              type="text"
              className="input-field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask anything about the meeting..."
            />

            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {SAMPLE_QUESTIONS.map((q, i) => (
                <button 
                  key={i} 
                  onClick={() => setQuestion(q)} 
                  className="btn btn-secondary btn-xs" 
                  style={{ fontSize: '0.7rem', textAlign: 'left' }}
                >
                  {q}
                </button>
              ))}
            </div>

            <button
              onClick={handleAsk}
              disabled={loading || !transcript.trim() || !question.trim() || enabledTools.size === 0}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '14px', padding: '12px' }}
            >
              {loading ? (
                <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Reasoning with {enabledTools.size} active tools...</>
              ) : (
                <><Send size={15} /> Execute ReAct Loop ({enabledTools.size} tools)</>
              )}
            </button>

            {enabledTools.size === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fb7185', fontSize: '0.75rem', marginTop: '8px', justifyContent: 'center' }}>
                <AlertTriangle size={13} />
                <span>Enable at least one tool in the left panel to execute.</span>
              </div>
            )}
          </div>
        </div>

        {/* ══ COLUMN 3: Real-Time Execution Trace & Answer ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {!result && !loading && (
            <div className="glass-panel" style={{ minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', maxWidth: '340px' }}>
                <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  Awaiting Agent Execution
                </h3>
                <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                  Configure your question and active tools, then click <strong>Execute ReAct Loop</strong> to watch live step-by-step reasoning.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-panel animate-pulse-glow" style={{ minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: '#a5b4fc' }}>
                <Zap size={44} style={{ margin: '0 auto 14px', animation: 'pulse-glow 1.5s infinite' }} />
                <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>Agent is Reasoning...</p>
                <p style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                  Iterating through Thought → Tool Action → Observation
                </p>
                <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  {[...enabledTools].map(tid => {
                    const tool = ALL_TOOLS.find(t => t.id === tid);
                    return tool ? <span key={tid} className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{tool.name}</span> : null;
                  })}
                </div>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Final Answer Card */}
              <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #6366f1', background: 'rgba(15, 23, 42, 0.85)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Brain size={14} /> Grounded Final Answer
                </div>
                <p style={{ fontSize: '0.95rem', lineHeight: 1.65, color: '#f8fafc' }}>
                  {result.answer}
                </p>
                <div style={{ marginTop: '14px', fontSize: '0.72rem', color: 'var(--text-dim)', display: 'flex', gap: '12px', flexWrap: 'wrap', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span>⏱ Latency: <strong>{result.latency_ms} ms</strong></span>
                  <span>🔁 Steps: <strong>{result.steps?.length || 0}</strong></span>
                  <span>🔧 Active Tools: <strong>{enabledTools.size}</strong></span>
                  <span>🤖 Engine: <strong>{provider.toUpperCase()}</strong></span>
                </div>
              </div>

              {/* Step-by-Step Reasoning Chain */}
              <div className="glass-panel" style={{ padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                    ReAct Execution Trace ({result.steps?.length || 0} Steps)
                  </span>
                  <span className="badge badge-verified"><CheckCircle2 size={11} /> Grounded</span>
                </div>

                {result.steps?.length === 0 && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Direct answer without intermediate tool calls.</p>
                )}

                {result.steps?.map((step, idx) => (
                  <div key={idx} style={{ marginBottom: '10px', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                      style={{
                        width: '100%', background: 'rgba(255,255,255,0.03)', border: 'none', cursor: 'pointer',
                        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px',
                        color: 'var(--text-main)', fontFamily: 'var(--font-sans)', textAlign: 'left',
                      }}
                    >
                      {expandedStep === idx ? <ChevronDown size={14} color="#818cf8" /> : <ChevronRight size={14} color="#818cf8" />}
                      <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Step {idx + 1}</span>
                      {step.tool_name ? (
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
                          🔧 Tool: {step.tool_name}
                        </span>
                      ) : (
                        <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
                          🎯 Final Reasoning
                        </span>
                      )}
                    </button>

                    {expandedStep === idx && (
                      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border-subtle)' }}>
                        {step.thought && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '3px' }}>
                              💭 Internal Thought
                            </div>
                            <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>{step.thought}</p>
                          </div>
                        )}
                        {step.tool_name && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: '3px' }}>
                              🔧 Tool Invocation: {step.tool_name}
                            </div>
                            <pre style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', overflowX: 'auto' }}>
                              {JSON.stringify(step.tool_args, null, 2)}
                            </pre>
                          </div>
                        )}
                        {step.tool_result && (
                          <div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '3px' }}>
                              👁 Tool Observation
                            </div>
                            <p style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#cbd5e1', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', lineHeight: 1.5, maxHeight: '140px', overflowY: 'auto' }}>
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
