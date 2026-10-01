import React, { useState, useEffect } from 'react';
import {
  Brain, Send, ChevronDown, ChevronRight, Search, Zap, Calculator,
  FileText, CheckCircle2, Terminal, Copy, Check, AlertCircle,
  Smile, Users, Calendar, Hash, ShieldCheck, ArrowRight, Loader2, Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MarkdownAnswer from './MarkdownAnswer';

const ALL_TOOLS = [
  { id: 'rag_search',         name: 'RAG Search',      icon: Search,      color: '#14b8a6', badge: 'Vector',  desc: 'Hierarchical 5-turn conversational context search' },
  { id: 'sentiment_analyzer', name: 'Sentiment',       icon: Smile,       color: '#ec4899', badge: 'VADER',   desc: 'Speaker emotional tone and meeting mood' },
  { id: 'speaker_stats',      name: 'Speaker Stats',   icon: Users,       color: '#8b5cf6', badge: 'NLP',     desc: 'Talk-time distribution, turn count, questions' },
  { id: 'timeline_extractor', name: 'Timeline',        icon: Calendar,    color: '#f97316', badge: 'Regex',   desc: 'Explicit dates, deadlines, and time anchors' },
  { id: 'keyword_frequency',  name: 'Keywords',        icon: Hash,        color: '#06b6d4', badge: 'TF',      desc: 'Top recurring terms and bigrams' },
  { id: 'calculator',         name: 'Calculator',      icon: Calculator,  color: '#f59e0b', badge: 'Safe AST',desc: 'Arithmetic for budgets and metrics' },
  { id: 'citation_checker',   name: 'Citation Guard',  icon: ShieldCheck, color: '#10b981', badge: 'Grounded',desc: 'Verbatim transcript quote verification' },
];

const SAMPLE_QUESTIONS = [
  'Analyze the sentiment and emotional tone of each speaker in this meeting.',
  'Show me speaker participation stats: who spoke the most and who asked the most questions?',
  'Extract all deadlines and create a chronological timeline for this meeting.',
  'What were the top recurring keywords and phrases discussed?',
  "Verify if the claim 'Edd agreed to finish the budget by Friday' is grounded in the transcript.",
  'What did Edd commit to do, and by when?',
  'If the Q3 budget is $50,000 and we spent $12,500, calculate remaining %.',
];

function getToolColor(toolName) {
  if (!toolName) return '#14b8a6';
  const t = ALL_TOOLS.find(x => x.id === toolName || x.name.toLowerCase() === toolName.toLowerCase());
  return t ? t.color : '#14b8a6';
}

function getToolIcon(toolName) {
  if (!toolName) return Brain;
  const t = ALL_TOOLS.find(x => x.id === toolName || x.name.toLowerCase() === toolName.toLowerCase());
  return t ? t.icon : Brain;
}

export default function AgentChat({ userMeetings, examples, provider }) {
  const { authFetch } = useAuth();
  const meetingList = userMeetings || examples || [];
  const [transcript, setTranscript] = useState('');
  const [question, setQuestion] = useState(SAMPLE_QUESTIONS[0]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [expandedStep, setExpandedStep] = useState(0);
  const [selectedExample, setSelectedExample] = useState(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);
  const [error, setError] = useState(null);

  const [enabledTools, setEnabledTools] = useState(
    () => new Set(ALL_TOOLS.map(t => t.id))
  );

  // Auto-load first meeting transcript if empty
  useEffect(() => {
    if (meetingList.length > 0 && !transcript) {
      const first = meetingList[0];
      setTranscript(first.text || first.transcript_text || '');
      setSelectedExample(first.id);
    }
  }, [meetingList]);

  const toggleTool = (toolId) => {
    setEnabledTools(prev => {
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
    setError(null);
  };

  const handleAsk = async () => {
    const cleanT = transcript.trim();
    const cleanQ = question.trim();
    if (!cleanT) {
      setError('Please load or paste a meeting transcript first.');
      return;
    }
    if (!cleanQ) {
      setError('Please enter a question or instruction for the agent.');
      return;
    }
    if (enabledTools.size === 0) {
      setError('Please enable at least one tool.');
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await authFetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: cleanT,
          question: cleanQ,
          provider,
          enabled_tools: [...enabledTools],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Agent execution failed');
      setResult(data);
      if (data.steps?.length > 0) setExpandedStep(0);
    } catch (err) {
      setError(err.message || 'Agent reasoning encountered an unexpected error.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyAnswer = () => {
    if (!result?.answer) return;
    navigator.clipboard.writeText(result.answer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  const transcriptWords = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;
  const transcriptLines = transcript.trim() ? transcript.trim().split('\n').filter(l => l.trim()).length : 0;

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1600px', margin: '0 auto' }}>

      {/* ── HEADER ── */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <div style={{
              width: '34px', height: '34px', borderRadius: '10px',
              background: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Brain size={19} color="var(--primary)" />
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
              Autonomous ReAct Agent
            </h2>
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>
              Thought → Action → Observe Loop
            </span>
            <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>
              {enabledTools.size}/{ALL_TOOLS.length} Instant Tools
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: 0 }}>
            Autonomous multi-step reasoning powered by local CPU NLP, FAISS hierarchical search, and safe AST math.
          </p>
        </div>

        {/* Active Engine Badge */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px', borderRadius: '20px',
          background: 'var(--bg-input)', border: '1px solid var(--border-medium)',
          fontSize: '0.78rem', color: 'var(--text-muted)'
        }}>
          <Zap size={14} color="#f59e0b" />
          <span>Engine: <strong style={{ color: 'var(--text-main)' }}>{provider.toUpperCase()}</strong> + 7 Local Analyzers</span>
        </div>
      </div>

      {/* ── 2-COLUMN BALANCED WORKSPACE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(420px, 1fr) minmax(460px, 1.25fr)', gap: '22px', alignItems: 'start' }}>

        {/* ════ LEFT COLUMN: INPUT WORKSPACE ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Transcript Box */}
          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={15} color="var(--primary)" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Meeting Transcript
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                {transcriptLines} turns · {transcriptWords} words
              </div>
            </div>

            {/* Meeting Presets */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
              {meetingList.map(ex => {
                const isSelected = selectedExample === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => loadExample(ex)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      padding: '5px 12px', borderRadius: '6px',
                      border: `1px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      background: isSelected ? 'var(--teal-bg)' : 'var(--bg-input)',
                      color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                      cursor: 'pointer', fontSize: '0.75rem', fontWeight: isSelected ? 700 : 500,
                      transition: 'all 0.15s ease', fontFamily: 'inherit'
                    }}
                  >
                    <span>{ex.title || `Meeting ${ex.id}`}</span>
                  </button>
                );
              })}
            </div>

            <textarea
              className="textarea-field"
              rows={8}
              style={{ width: '100%', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', lineHeight: 1.55 }}
              placeholder="Paste meeting transcript with speaker dialogue turns (e.g. Alice: ... Bob: ...)..."
              value={transcript}
              onChange={e => setTranscript(e.target.value)}
            />
          </div>

          {/* Question / Prompt Box */}
          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <Brain size={15} color="var(--cta)" />
              <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                2. Question / Instruction
              </span>
            </div>

            <textarea
              className="input-field"
              rows={3}
              style={{ width: '100%', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '12px' }}
              value={question}
              onChange={e => setQuestion(e.target.value)}
              placeholder="Ask anything about speakers, sentiment, timeline, numbers, or specific dialogue quotes..."
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAsk();
                }
              }}
            />

            {/* Suggested Question Chips */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '8px', textTransform: 'uppercase' }}>
                Suggested Prompts:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SAMPLE_QUESTIONS.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => setQuestion(q)}
                    style={{
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '5px 10px',
                      fontSize: '0.74rem',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* Armed Tools Toolbar */}
            <div style={{ marginBottom: '18px', padding: '12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Armed Toolset ({enabledTools.size} Active)
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setEnabledTools(new Set(ALL_TOOLS.map(t => t.id)))} style={{ fontSize: '0.68rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Enable All</button>
                  <span style={{ color: 'var(--border-medium)' }}>·</span>
                  <button onClick={() => setEnabledTools(new Set(['rag_search']))} style={{ fontSize: '0.68rem', color: 'var(--text-dim)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>RAG Only</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {ALL_TOOLS.map(t => {
                  const Icon = t.icon;
                  const isActive = enabledTools.has(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => toggleTool(t.id)}
                      title={t.desc}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '5px',
                        padding: '4px 10px', borderRadius: '16px',
                        border: `1px solid ${isActive ? t.color : 'var(--border-subtle)'}`,
                        background: isActive ? `${t.color}15` : 'transparent',
                        color: isActive ? t.color : 'var(--text-dim)',
                        fontSize: '0.72rem', fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={12} />
                      <span>{t.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleAsk}
              disabled={loading || !transcript.trim() || !question.trim()}
              className="btn btn-primary"
              style={{
                width: '100%', padding: '14px', fontSize: '0.96rem',
                fontWeight: 700, gap: '10px', borderRadius: 'var(--radius-md)'
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  <span>Executing ReAct Reasoning Loop...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>Execute Agent ({provider.toUpperCase()})</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* ════ RIGHT COLUMN: LIVE INTELLIGENCE & EXECUTION TRACE ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Error State */}
          {error && !loading && (
            <div className="glass-panel" style={{
              minHeight: '400px', padding: '36px 28px', display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', textAlign: 'center',
              border: '1px solid rgba(239, 68, 68, 0.35)', background: 'rgba(239, 68, 68, 0.04)'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '16px',
                background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
              }}>
                <AlertCircle size={28} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Agent Execution Notice
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '460px', lineHeight: 1.6, marginBottom: '20px' }}>
                {error.includes('11001') || error.toLowerCase().includes('getaddrinfo') || error.toLowerCase().includes('network')
                  ? "Network connection issue: The AI provider server could not be reached (DNS resolution failed). Your internet connection may have briefly dropped or reconnected. Please verify your connection and click Retry below."
                  : error}
              </p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  onClick={handleAsk}
                  className="btn btn-primary"
                  style={{ padding: '8px 18px', fontSize: '0.82rem', gap: '6px' }}
                >
                  <Sparkles size={14} />
                  <span>Retry Reasoning Loop</span>
                </button>
                <button
                  onClick={() => setError(null)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 14px', fontSize: '0.82rem' }}
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Idle State */}
          {!loading && !result && !error && (
            <div className="glass-panel" style={{ minHeight: '560px', padding: '40px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{
                width: '60px', height: '60px', borderRadius: '16px',
                background: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px'
              }}>
                <Brain size={30} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                ReAct Autonomous Reasoner Ready
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '440px', lineHeight: 1.6, marginBottom: '24px' }}>
                Ask a question to see the agent decompose your request, dispatch local NLP tools, inspect evidence, and synthesize a grounded final answer.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', width: '100%', maxWidth: '420px', textAlign: 'left' }}>
                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--primary)', marginBottom: '4px' }}>⚡ ZERO API LATENCY TOOLS</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>VADER Sentiment, Regex Timelines, Speaker Stats, AST Math</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--cta)', marginBottom: '4px' }}>🛡️ GROUNDED RETRIEVAL</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>FAISS hierarchical child turns expanded to 5-turn parent windows</div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="glass-panel" style={{ minHeight: '560px', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
              <div style={{
                width: '54px', height: '54px',
                border: '3px solid var(--teal-border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '20px'
              }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
                Executing ReAct Loop
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', maxWidth: '360px', lineHeight: 1.5 }}>
                Thought → Tool Dispatch → Observation → Synthesis
              </p>
            </div>
          )}

          {/* Completed Execution State */}
          {result && !loading && (
            <>
              {/* Grounded Final Answer Card */}
              <div className="glass-panel" style={{ padding: '22px 24px', border: '1.5px solid rgba(20, 184, 166, 0.4)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: 'var(--teal-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <CheckCircle2 size={15} color="var(--primary)" />
                    </div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Synthesized Grounded Answer
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="badge badge-verified" style={{ fontSize: '0.68rem' }}>
                      {result.steps?.length || 0} Steps · {result.latency_ms}ms
                    </span>
                    <button
                      onClick={handleCopyAnswer}
                      className="btn btn-secondary btn-xs"
                      style={{ gap: '4px' }}
                    >
                      {copiedAnswer ? <Check size={12} color="#10b981" /> : <Copy size={12} />}
                      <span>{copiedAnswer ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '0.9rem', lineHeight: 1.65, color: 'var(--text-main)' }}>
                  <MarkdownAnswer content={result.answer} />
                </div>
              </div>

              {/* Step-by-Step Execution Trace */}
              <div className="glass-panel" style={{ padding: '20px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Terminal size={15} color="var(--text-muted)" />
                    <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-main)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Execution Trace ({result.steps?.length || 0} steps)
                    </span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    Chain of Thought Audit
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.steps?.map((step, idx) => {
                    const isExpanded = expandedStep === idx;
                    const ToolIcon = getToolIcon(step.tool_name);
                    const toolCol = getToolColor(step.tool_name);

                    return (
                      <div
                        key={idx}
                        style={{
                          background: 'var(--bg-input)',
                          borderRadius: 'var(--radius-md)',
                          border: `1px solid ${isExpanded ? 'var(--border-medium)' : 'var(--border-subtle)'}`,
                          overflow: 'hidden',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {/* Step Header */}
                        <div
                          onClick={() => setExpandedStep(isExpanded ? null : idx)}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            userSelect: 'none'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 800,
                              background: 'var(--bg-card)', padding: '2px 6px',
                              borderRadius: '4px', color: 'var(--text-dim)'
                            }}>
                              #{idx + 1}
                            </span>

                            {step.tool_name ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <ToolIcon size={13} color={toolCol} />
                                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: toolCol }}>
                                  {step.tool_name}
                                </span>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)' }}>
                                Final Synthesis
                              </span>
                            )}

                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '320px' }}>
                              — {step.thought || 'Reasoning...'}
                            </span>
                          </div>

                          {isExpanded ? <ChevronDown size={14} color="var(--text-dim)" /> : <ChevronRight size={14} color="var(--text-dim)" />}
                        </div>

                        {/* Step Details Body */}
                        {isExpanded && (
                          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {/* Thought */}
                            {step.thought && (
                              <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', marginBottom: '4px' }}>
                                  Thought:
                                </div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                  "{step.thought}"
                                </div>
                              </div>
                            )}

                            {/* Tool Args */}
                            {step.tool_args && Object.keys(step.tool_args).length > 0 && (
                              <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '4px' }}>
                                  Tool Input:
                                </div>
                                <pre style={{ margin: 0, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'pre-wrap' }}>
                                  {JSON.stringify(step.tool_args, null, 2)}
                                </pre>
                              </div>
                            )}

                            {/* Observation / Result */}
                            {step.tool_result && (
                              <div>
                                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#10b981', textTransform: 'uppercase', marginBottom: '4px' }}>
                                  Observation:
                                </div>
                                <pre style={{ margin: 0, padding: '8px 10px', background: 'var(--bg-input)', borderRadius: '4px', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', whiteSpace: 'pre-wrap', maxHeight: '200px', overflowY: 'auto' }}>
                                  {step.tool_result}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
}
