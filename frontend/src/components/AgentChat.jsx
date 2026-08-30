import React, { useState } from 'react';
import { 
  Brain, Send, ChevronDown, ChevronRight, Search, Zap, Globe, Calculator, 
  FileText, List, Sparkles, CheckCircle2, 
  Terminal, Activity, Play,
  Smile, Users, Calendar, Hash, ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ALL_TOOLS = [
  {
    id: 'rag_search',
    name: 'RAG Search',
    icon: Search,
    color: '#14b8a6',
    description: 'Semantically searches the transcript for relevant dialogue passages.',
    badge: 'Vector Index',
    badgeClass: 'badge-primary',
  },
  {
    id: 'get_extraction',
    name: 'Structured Extraction',
    icon: FileText,
    color: '#0ea5e9',
    description: 'Runs schema pipeline to retrieve verified tasks and decisions.',
    badge: 'Pipeline',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'get_summary',
    name: 'Meeting Summary',
    icon: List,
    color: '#38bdf8',
    description: 'Generates an executive 2–3 sentence meeting overview.',
    badge: 'Overview',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'calculator',
    name: 'Calculator',
    icon: Calculator,
    color: '#f59e0b',
    description: 'Safely evaluates arithmetic expressions (budgets, timelines, totals).',
    badge: 'Pure Python',
    badgeClass: 'badge-amber',
  },
  {
    id: 'web_search',
    name: 'Web Search',
    icon: Globe,
    color: '#10b981',
    description: 'Live DuckDuckGo search for external entities, clients, or companies.',
    badge: 'Live Web',
    badgeClass: 'badge-verified',
  },
  {
    id: 'sentiment_analyzer',
    name: 'Sentiment Analyzer',
    icon: Smile,
    color: '#ec4899',
    description: 'VADER NLP emotional tone analysis per-speaker + overall meeting mood.',
    badge: 'Local NLP',
    badgeClass: 'badge-orange',
  },
  {
    id: 'speaker_stats',
    name: 'Speaker Participation',
    icon: Users,
    color: '#8b5cf6',
    description: 'Calculates talk-time share %, turn counts, questions asked, and dominance.',
    badge: 'Analytics',
    badgeClass: 'badge-primary',
  },
  {
    id: 'timeline_extractor',
    name: 'Timeline & Deadlines',
    icon: Calendar,
    color: '#f97316',
    description: 'Regex pattern engine extracting all dates, deadlines, and time references.',
    badge: 'Pattern Engine',
    badgeClass: 'badge-orange',
  },
  {
    id: 'keyword_frequency',
    name: 'Keyword Frequency',
    icon: Hash,
    color: '#06b6d4',
    description: 'Statistical TF keyword ranking and top recurring 2-word phrase counter.',
    badge: 'Stat NLP',
    badgeClass: 'badge-cyan',
  },
  {
    id: 'citation_checker',
    name: 'Citation Guard',
    icon: ShieldCheck,
    color: '#10b981',
    description: 'Verbatim substring and sliding window overlap hallucination validator.',
    badge: 'Zero-Hallucination',
    badgeClass: 'badge-verified',
  },
];

const SAMPLE_QUESTIONS = [
  "Analyze the sentiment and emotional tone of each speaker in this meeting.",
  "Show me speaker participation stats: who spoke the most and who asked the most questions?",
  "Extract all deadlines and create a chronological timeline for this meeting.",
  "What were the top recurring keywords and phrases discussed?",
  "Verify if the claim 'Edd agreed to finish the budget by Friday' is grounded in the transcript.",
  "What did Edd commit to do, and by when?",
  "If the Q3 budget is $50,000 and we spent $12,500, calculate remaining %.",
  "Who is Heinz as a company? Search the web.",
];

export default function AgentChat({ userMeetings, examples, provider }) {
  const { authFetch } = useAuth();
  const meetingList = userMeetings || examples || [];
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedStep, setExpandedStep] = useState(0);
  const [selectedExample, setSelectedExample] = useState(null);
  const [viewMode, setViewMode] = useState('trace'); // 'trace' | 'flow' | 'playground'
  
  // Playground state for testing individual tools
  const [testTool, setTestTool] = useState('calculator');
  const [testInput, setTestInput] = useState('50000 * 0.15 + 1200');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const [enabledTools, setEnabledTools] = useState(
    () => new Set(ALL_TOOLS.map((t) => t.id))
  );

  const toggleTool = (toolId) => {
    setEnabledTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  };

  const loadExample = (ex) => {
    setTranscript(ex.text || ex.transcript_text || '');
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
    try {
      const res = await authFetch('/api/ask', {
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
      if (data.steps && data.steps.length > 0) setExpandedStep(0);
    } catch (err) {
      alert('Agent error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run a standalone tool test in the Playground
  const handleTestTool = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const activeTranscript = transcript || (meetingList && meetingList[0]?.text) || 'Speaker: Sample meeting text.';
      const res = await authFetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: activeTranscript,
          question: `Use the ${testTool} tool to: ${testInput}`,
          provider,
          enabled_tools: [testTool],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Tool test failed');
      setTestResult(data.answer || JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult('Error testing tool: ' + err.message);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1550px', margin: '0 auto' }}>
      
      {/* Workspace Header */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Autonomous ReAct Agent Studio</span>
            <span className="badge badge-amber">Thought → Action → Observation</span>
            <span className="badge badge-primary">{enabledTools.size}/{ALL_TOOLS.length} Active Tools</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Inspect multi-step autonomous tool dispatching, live visual execution graph, and grounded answers.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.4)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', gap: '4px' }}>
          <button
            onClick={() => setViewMode('trace')}
            className={`btn btn-xs ${viewMode === 'trace' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Terminal size={12} /> Execution Trace
          </button>
          <button
            onClick={() => setViewMode('flow')}
            className={`btn btn-xs ${viewMode === 'flow' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Activity size={12} /> Visual Flow Graph
          </button>
          <button
            onClick={() => setViewMode('playground')}
            className={`btn btn-xs ${viewMode === 'playground' ? 'btn-primary' : 'btn-secondary'}`}
          >
            <Zap size={12} /> Tool Playground
          </button>
        </div>
      </div>

      {/* 3-Column Responsive Grid */}
      <div 
        className="responsive-3col"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: '270px minmax(360px, 1fr) minmax(440px, 1.25fr)', 
          gap: '20px', 
          alignItems: 'start' 
        }}
      >

        {/* ══ COLUMN 1: Tool Drawer ══ */}
        <div className="glass-panel" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              🔧 Active Toolset
            </span>
            <span style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700 }}>
              {enabledTools.size} Active
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
                    background: isEnabled ? `rgba(99, 102, 241, 0.08)` : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isEnabled ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '11px 12px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.18s ease',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Icon size={14} color={isEnabled ? tool.color : 'var(--text-dim)'} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isEnabled ? 'var(--text-main)' : 'var(--text-dim)' }}>
                        {tool.name}
                      </span>
                    </div>

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

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={() => setEnabledTools(new Set(ALL_TOOLS.map(t => t.id)))}
              className="btn btn-secondary btn-xs"
              style={{ flex: 1 }}
            >
              Enable All
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

        {/* ══ COLUMN 2: Prompt & Transcript ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Load Context Transcript
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {meetingList.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  className={`btn btn-xs ${selectedExample === ex.id ? 'btn-cyan' : 'btn-secondary'}`}
                >
                  <FileText size={11} />
                  <span>{ex.title || (ex.filename ? ex.filename.replace('.txt', '').replace(/-/g, ' ') : `Meeting ${ex.id}`)}</span>
                </button>
              ))}
            </div>

            <textarea
              className="textarea-field"
              style={{ height: '180px', width: '100%' }}
              placeholder="Paste meeting transcript or choose a preset above..."
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />
          </div>

          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Question / Prompt for Agent
            </div>

            <input
              type="text"
              className="input-field"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
              placeholder="Ask anything about the meeting..."
            />

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
                <><span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} /> Executing ReAct Loop ({enabledTools.size} Tools)...</>
              ) : (
                <><Send size={15} /> Execute ReAct Agent ({enabledTools.size} active)</>
              )}
            </button>
          </div>
        </div>

        {/* ══ COLUMN 3: Execution View (Trace / Flow Graph / Playground) ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* VIEW 1: EXECUTION TRACE */}
          {viewMode === 'trace' && (
            <>
              {!result && !loading && (
                <div className="glass-panel" style={{ minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '30px' }}>
                  <div style={{ textAlign: 'center', color: 'var(--text-dim)', maxWidth: '340px' }}>
                    <Brain size={48} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                      ReAct Agent Idle
                    </h3>
                    <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                      Click <strong>Execute ReAct Agent</strong> to watch step-by-step reasoning in real-time.
                    </p>
                  </div>
                </div>
              )}

              {loading && (
                <div className="glass-panel animate-pulse-glow" style={{ minHeight: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center', color: '#a5b4fc' }}>
                    <Zap size={44} style={{ margin: '0 auto 14px', animation: 'pulse-glow 1.5s infinite' }} />
                    <p style={{ fontWeight: 700, fontSize: '1.05rem', color: '#ffffff' }}>Executing ReAct Reasoning Loop</p>
                    <p style={{ fontSize: '0.78rem', marginTop: '6px', color: 'var(--text-muted)' }}>
                      Evaluating Thoughts → Calling Tools → Observing Outcomes
                    </p>
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
                    </div>
                  </div>

                  {/* Step Trace Accordion */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-main)' }}>
                        ReAct Steps ({result.steps?.length || 0})
                      </span>
                      <span className="badge badge-verified"><CheckCircle2 size={11} /> Grounded</span>
                    </div>

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
                              🎯 Final Step
                            </span>
                          )}
                        </button>

                        {expandedStep === idx && (
                          <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid var(--border-subtle)' }}>
                            {step.thought && (
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fbbf24', textTransform: 'uppercase', marginBottom: '3px' }}>
                                  💭 Thought
                                </div>
                                <p style={{ fontSize: '0.82rem', color: '#e2e8f0', lineHeight: 1.5 }}>{step.thought}</p>
                              </div>
                            )}
                            {step.tool_name && (
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#818cf8', textTransform: 'uppercase', marginBottom: '3px' }}>
                                  🔧 Tool Call: {step.tool_name}
                                </div>
                                <pre style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#94a3b8', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', overflowX: 'auto' }}>
                                  {JSON.stringify(step.tool_args, null, 2)}
                                </pre>
                              </div>
                            )}
                            {step.tool_result && (
                              <div>
                                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', marginBottom: '3px' }}>
                                  👁 Observation
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
            </>
          )}

          {/* VIEW 2: VISUAL FLOW GRAPH */}
          {viewMode === 'flow' && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} /> ReAct Autonomous Decision Graph
              </div>

              {/* Visual Node Diagram */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
                
                {/* Node 1: User Prompt */}
                <div style={{ background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px 18px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#a5b4fc', fontWeight: 700 }}>1. USER PROMPT / INQUIRY</div>
                  <div style={{ fontSize: '0.84rem', fontWeight: 600, marginTop: '2px' }}>"{question || 'Ask question...'}"</div>
                </div>

                <div style={{ width: '2px', height: '16px', background: '#6366f1' }} />

                {/* Node 2: ReAct Planner */}
                <div style={{ background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px 18px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 700 }}>2. REACT REASONING &amp; ROUTING</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>Determines if tool calls are needed or direct answer is available</div>
                </div>

                <div style={{ width: '2px', height: '16px', background: '#f59e0b' }} />

                {/* Node 3: Dispatched Tools */}
                <div style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px 18px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#67e8f9', fontWeight: 700 }}>3. TOOL EXECUTION ENGINE</div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '6px', flexWrap: 'wrap' }}>
                    {[...enabledTools].map(tid => {
                      const t = ALL_TOOLS.find(x => x.id === tid);
                      return <span key={tid} className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>{t?.name}</span>;
                    })}
                  </div>
                </div>

                <div style={{ width: '2px', height: '16px', background: '#06b6d4' }} />

                {/* Node 4: Grounded Synthesis */}
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: 'var(--radius-md)', padding: '12px 18px', width: '100%', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>4. CITATION-VERIFIED FINAL ANSWER</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>0% Hallucination enforcement &amp; latency tracking</div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW 3: TOOL PLAYGROUND */}
          {viewMode === 'playground' && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} /> Standalone Tool Sandbox
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Test individual tools directly to see raw responses without executing the entire multi-step agent.
              </p>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setTestTool('sentiment_analyzer'); setTestInput('Analyze sentiment of all speakers'); }}
                  className={`btn btn-xs ${testTool === 'sentiment_analyzer' ? 'btn-cta' : 'btn-secondary'}`}
                >
                  <Smile size={12} /> Sentiment (VADER)
                </button>
                <button
                  onClick={() => { setTestTool('speaker_stats'); setTestInput('Compute speaker participation breakdown'); }}
                  className={`btn btn-xs ${testTool === 'speaker_stats' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Users size={12} /> Speaker Stats
                </button>
                <button
                  onClick={() => { setTestTool('timeline_extractor'); setTestInput('Extract all deadlines and time mentions'); }}
                  className={`btn btn-xs ${testTool === 'timeline_extractor' ? 'btn-cyan' : 'btn-secondary'}`}
                >
                  <Calendar size={12} /> Timeline
                </button>
                <button
                  onClick={() => { setTestTool('keyword_frequency'); setTestInput('Compute top 10 keywords'); }}
                  className={`btn btn-xs ${testTool === 'keyword_frequency' ? 'btn-primary' : 'btn-secondary'}`}
                >
                  <Hash size={12} /> Keywords
                </button>
                <button
                  onClick={() => { setTestTool('citation_checker'); setTestInput('Edd will finish the roadmap'); }}
                  className={`btn btn-xs ${testTool === 'citation_checker' ? 'btn-emerald' : 'btn-secondary'}`}
                >
                  <ShieldCheck size={12} /> Citation Guard
                </button>
                <button
                  onClick={() => { setTestTool('calculator'); setTestInput('50000 * 0.15 + 1200'); }}
                  className={`btn btn-xs ${testTool === 'calculator' ? 'btn-amber' : 'btn-secondary'}`}
                >
                  <Calculator size={12} /> Calculator
                </button>
                <button
                  onClick={() => { setTestTool('web_search'); setTestInput('Dunder Mifflin Scranton'); }}
                  className={`btn btn-xs ${testTool === 'web_search' ? 'btn-emerald' : 'btn-secondary'}`}
                >
                  <Globe size={12} /> DuckDuckGo Web
                </button>
              </div>

              <div>
                <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontWeight: 700 }}>Test Parameter / Query:</span>
                <input
                  type="text"
                  className="input-field"
                  style={{ marginTop: '4px' }}
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                />
              </div>

              <button
                onClick={handleTestTool}
                disabled={testLoading || !testInput.trim()}
                className="btn btn-primary btn-sm"
              >
                {testLoading ? 'Executing Tool...' : <><Play size={12} /> Run Tool Standalone</>}
              </button>

              {testResult && (
                <div style={{ background: 'rgba(0,0,0,0.4)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, marginBottom: '4px' }}>Tool Response:</div>
                  <pre style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>
                    {testResult}
                  </pre>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
