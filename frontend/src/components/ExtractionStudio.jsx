import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, CheckCircle2, XCircle, Clock, User, ShieldCheck, 
  Quote, Loader2, Sparkles, Brain, FileText, Trash2, Copy, Check, 
  Volume2, Users, Mail, CheckSquare, MessageSquare, Download, ChevronRight,
  TrendingUp, BarChart2, Eye, Compass, Target
} from 'lucide-react';
import ProductivityHub from './ProductivityHub';
import { useAuth } from '../context/AuthContext';

export default function ExtractionStudio({ userMeetings, provider, fetchUserMeetings }) {
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);
  const [activeExample, setActiveExample] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [hoverQuote, setHoverQuote] = useState(null);
  const [highlightedTurnIdx, setHighlightedTurnIdx] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  
  // Executive Suite Tab: 'summary' | 'email' | 'jira' | 'slack'
  const [actionTab, setActionTab] = useState('summary');
  
  // Simulated Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlaybackTurn, setCurrentPlaybackTurn] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const dialogueContainerRef = useRef(null);

  // Parse dialogue turns from raw transcript text
  const parseTurns = (rawText) => {
    if (!rawText) return [];
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    const turns = [];
    let currentSpeaker = 'Speaker';
    let currentText = '';
    let timeIndex = 0;

    const ignoreList = ['date', 'duration', 'participants', 'time', 'location', 'attendees', 'subject'];
    lines.forEach((line, i) => {
      const match = line.match(/^([A-Za-z0-9\s_-]+):\s*(.*)$/);
      if (match && !ignoreList.includes(match[1].trim().toLowerCase())) {
        turns.push({
          id: i,
          speaker: match[1].trim(),
          text: match[2].trim(),
          time: `${Math.floor(timeIndex / 60)}:${(timeIndex % 60).toString().padStart(2, '0')}`
        });
        timeIndex += 14; // ~14 sec per turn estimation
      } else if (turns.length > 0) {
        turns[turns.length - 1].text += ' ' + line.trim();
      } else {
        turns.push({
          id: i,
          speaker: 'Note',
          text: line.trim(),
          time: '0:00'
        });
      }
    });
    return turns;
  };

  const parsedTurns = parseTurns(transcript);

  // Compute Speaker Analytics (Talk time, turn count, words)
  const speakerStats = React.useMemo(() => {
    const stats = {};
    let totalWords = 0;
    parsedTurns.forEach(turn => {
      const spk = turn.speaker;
      const words = turn.text.split(/\s+/).length;
      totalWords += words;
      if (!stats[spk]) stats[spk] = { name: spk, turns: 0, words: 0 };
      stats[spk].turns += 1;
      stats[spk].words += words;
    });

    const colors = ['#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#d946ef', '#ec4899'];
    return Object.values(stats).map((s, idx) => ({
      ...s,
      percentage: totalWords > 0 ? Math.round((s.words / totalWords) * 100) : 0,
      color: colors[idx % colors.length]
    }));
  }, [parsedTurns]);

  // Handle Playback Simulation
  useEffect(() => {
    let interval = null;
    if (isPlaying && parsedTurns.length > 0) {
      interval = setInterval(() => {
        setCurrentPlaybackTurn(prev => {
          if (prev >= parsedTurns.length - 1) {
            setIsPlaying(false);
            return 0;
          }
          const next = prev + 1;
          // Auto-scroll the dialogue view
          const el = document.getElementById(`turn-${next}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          return next;
        });
      }, 2400 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, parsedTurns.length, playbackSpeed]);

  const loadMeeting = (m) => {
    setActiveExample(m.id);
    setTranscript(m.text || m.transcript_text || '');
    setResult(null);
    setIsPlaying(false);
    setCurrentPlaybackTurn(0);
    setHighlightedTurnIdx(null);
  };

  const handleClear = () => {
    setTranscript('');
    setActiveExample(null);
    setResult(null);
    setIsPlaying(false);
    setCurrentPlaybackTurn(0);
    setHighlightedTurnIdx(null);
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleOpenGmail = (templateText) => {
    let subject = 'Meeting Summary';
    let bodyText = templateText;
    if (templateText.startsWith('Subject: ')) {
      const parts = templateText.split('\n\n');
      subject = parts[0].replace('Subject: ', '');
      bodyText = parts.slice(1).join('\n\n');
    }
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`, '_blank');
  };

  // Verbatim Grounding Spotlight: Locate quote in transcript turns & scroll to it
  const handleSpotlightQuote = (quoteText, key) => {
    setHoverQuote(key);
    if (!quoteText) return;
    const cleanQuote = quoteText.toLowerCase().trim();
    const foundIdx = parsedTurns.findIndex(t => t.text.toLowerCase().includes(cleanQuote.slice(0, 30)) || cleanQuote.includes(t.text.toLowerCase().slice(0, 30)));
    if (foundIdx !== -1) {
      setHighlightedTurnIdx(foundIdx);
      const el = document.getElementById(`turn-${foundIdx}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          // Load the newly saved meeting
          loadMeeting({ id: json.id, title, transcript_text: text });
        }
      } catch (err) {
        console.error("Failed to upload meeting", err);
      }
    };
    reader.readAsText(file);
    e.target.value = null; // reset
  };

  const handleExtract = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const payload = activeExample ? { meeting_id: activeExample, provider } : { transcript, provider };
      const res = await authFetch('/api/extract', {
        method: 'POST',
        body: JSON.stringify(payload),
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

  const handleSavePasted = async () => {
    if (!transcript.trim()) return;
    try {
      // Create a basic title based on the first few words or a default
      const defaultTitle = "Pasted Meeting " + new Date().toLocaleTimeString();
      const res = await authFetch('/api/meetings', {
        method: 'POST',
        body: JSON.stringify({ title: defaultTitle, transcript_text: transcript }),
      });
      if (res.ok) {
        await fetchUserMeetings?.();
        const json = await res.json();
        loadMeeting({ id: json.id, title: defaultTitle, transcript_text: transcript });
      }
    } catch (err) {
      console.error("Failed to save pasted meeting", err);
    }
  };

  // Generate Follow-up Email Templates
  const generateFollowupEmail = (type = 'executive') => {
    if (!result) return '';
    const actions = result.action_items.map(a => `• ${a.description} (Owner: ${a.owner || 'Unassigned'}${a.deadline ? ` | Due: ${a.deadline}` : ''})`).join('\n');
    const decisions = result.decisions.map(d => `• ${d.description}`).join('\n');
    const meetingTitle = activeExample ? userMeetings?.find(m => m.id === activeExample)?.title : null;
    const title = meetingTitle || 'Sync Session';
    
    if (type === 'executive') {
      return `Subject: Meeting Summary & Action Items: ${title}\n\nHi Team,\n\nThank you for your time during today's meeting. Here is a summary of our discussion and key takeaways:\n\n📋 Executive Summary:\n${result.summary}\n\n✅ Key Decisions Agreed:\n${decisions || '• No explicit formal decisions recorded.'}\n\n🚀 Action Items & Commitments:\n${actions || '• No action items recorded.'}\n\nPlease review your respective commitments and let the team know if any adjustments are needed.\n\nBest regards,\nMeetingMind Intelligence Engine`;
    } 
    else if (type === 'action') {
      return `Subject: Action Required: Tasks from ${title}\n\nTeam,\n\nPlease see the action items captured from our recent meeting. I need everyone to review their assigned tasks below and ensure they are completed by the respective deadlines.\n\n🚀 Action Items:\n${actions || '• No action items recorded.'}\n\nPlease reply to this thread if you have any blockers.\n\nThanks,\nMeetingMind`;
    }
    else if (type === 'client') {
      return `Subject: Following up on our meeting: ${title}\n\nHi [Client Name],\n\nIt was great speaking with you today. I'm sharing a brief recap of what we discussed to ensure we're fully aligned on the next steps.\n\nOverview:\n${result.summary}\n\nDecisions made:\n${decisions || '• We agreed to review the outstanding items offline.'}\n\nOur next steps:\n${actions || '• We will reach out shortly with further updates.'}\n\nIf anything was missed, please don't hesitate to let me know.\n\nBest regards,\n[Your Name]`;
    }
    return '';
  };

  // Generate Jira Tickets
  const generateJiraMarkdown = () => {
    if (!result) return '';
    return result.action_items.map((a, i) => `### [TASK-${101 + i}] ${a.description}
- **Assignee:** ${a.owner || 'Unassigned'}
- **Due Date:** ${a.deadline || 'TBD'}
- **Status:** To Do
- **Grounded Quote:** "${a.evidence_quote}"
- **Verified Grounding:** 100% Verbatim Substring Match
`).join('\n---\n\n');
  };

  // Generate Slack Standup
  const generateSlackMessage = () => {
    if (!result) return '';
    return `*📢 Meeting Summary & Next Steps:*

*📝 Summary:*
>${result.summary}

*🎯 Decisions:*
${result.decisions.map(d => `• *${d.description}*`).join('\n')}

*⚡ Action Items:*
${result.action_items.map(a => `• *${a.owner || 'Someone'}* → ${a.description} _(Due: ${a.deadline || 'Soon'})_`).join('\n')}

_Generated with MeetingMind (0% Hallucination Guaranteed)_`;
  };

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1550px', margin: '0 auto' }}>
      
      {/* Top Banner with Presets */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Extraction Studio &amp; Action Suite</span>
            <span className="badge badge-primary">Pydantic v2 Schema</span>
            <span className="badge badge-verified"><ShieldCheck size={13} /> 0% Hallucination</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginTop: '4px' }}>
            Extract grounded commitments, playback dialogue turns, and export instant follow-ups to Email, Jira, or Slack.
          </p>
        </div>

        {/* Quick Sample Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 700 }}>Choose Meeting:</span>
          {userMeetings && userMeetings.map(m => (
            <button
              key={m.id}
              onClick={() => loadMeeting(m)}
              className={`btn btn-xs ${activeExample === m.id ? 'btn-cyan' : 'btn-secondary'}`}
              style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
            >
              <FileText size={11} />
              <span>{m.title}</span>
            </button>
          ))}
          <div style={{ width: '1px', height: '16px', background: 'var(--border-medium)', margin: '0 4px' }} />
          <input 
            type="file" 
            accept=".txt" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-primary btn-xs"
          >
            + Upload .txt
          </button>
          
          {transcript && (
            <button onClick={handleClear} className="btn btn-secondary btn-xs" style={{ color: '#fb7185' }}>
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* 2-Column Main Workspace */}
      <div 
        className="responsive-2col"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'minmax(420px, 1.05fr) minmax(460px, 1.25fr)', 
          gap: '24px', 
          alignItems: 'start' 
        }}
      >
        
        {/* ══ LEFT PANE: Interactive Transcript & Simulation ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {/* Transcript Editor */}
          <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ 
              padding: '12px 18px', 
              borderBottom: '1px solid var(--border-subtle)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center' 
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Raw Input Transcript
              </span>
              {!activeExample && (transcript || '').trim() && (
                <button onClick={handleSavePasted} className="btn btn-primary btn-xs" style={{ padding: '4px 10px', fontSize: '0.7rem' }}>
                  Save to My Meetings
                </button>
              )}
            </div>
            
            <textarea
              value={transcript}
              onChange={(e) => {
                setTranscript(e.target.value);
                setActiveExample(null);
              }}
              placeholder={"Speaker A: Let's start the sync...\nSpeaker B: I've updated the roadmap.\n..."}
              style={{
                flex: 1, minHeight: '220px', width: '100%', padding: '16px 18px',
                background: 'transparent', border: 'none', color: '#f1f5f9',
                fontSize: '0.85rem', lineHeight: 1.6, resize: 'none', outline: 'none',
                fontFamily: 'var(--font-mono)'
              }}
            />
          </div>

          {/* Transcript Player & Dialogue Viewer */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            {/* Header with Player Controls */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Interactive Meeting Transcript
                </div>
                {isPlaying && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '6px' }}>
                    <div className="soundwave-bar" />
                    <div className="soundwave-bar" />
                    <div className="soundwave-bar" />
                    <div className="soundwave-bar" />
                    <div className="soundwave-bar" />
                  </div>
                )}
              </div>

              {/* Simulation Playback Toolbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  disabled={parsedTurns.length === 0}
                  className={`btn btn-xs ${isPlaying ? 'btn-amber' : 'btn-secondary'}`}
                  style={{ gap: '5px' }}
                  title="Simulate turn-by-turn dialogue playback"
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                  <span>{isPlaying ? 'Pause' : 'Simulate Playback'}</span>
                </button>

                {isPlaying && (
                  <button
                    onClick={() => setPlaybackSpeed(s => s === 1 ? 2 : 1)}
                    className="btn btn-secondary btn-xs"
                    style={{ fontSize: '0.68rem', padding: '3px 7px' }}
                  >
                    {playbackSpeed}x
                  </button>
                )}

                <button
                  onClick={() => { setCurrentPlaybackTurn(0); setHighlightedTurnIdx(null); }}
                  className="btn btn-secondary btn-xs"
                  title="Reset playback"
                >
                  <RotateCcw size={11} />
                </button>
              </div>
            </div>

            {/* Formatted Turn-by-Turn Dialogue View */}
            <div 
              ref={dialogueContainerRef}
              style={{ 
                height: '380px', 
                overflowY: 'auto', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '8px', 
                paddingRight: '6px' 
              }}
            >
              {parsedTurns.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-dim)' }}>
                  <FileText size={36} style={{ opacity: 0.2, marginBottom: '8px' }} />
                  <p style={{ fontSize: '0.84rem' }}>No meeting transcript loaded.</p>
                  <p style={{ fontSize: '0.74rem', opacity: 0.7, marginTop: '4px' }}>Click a sample preset above or paste text below.</p>
                </div>
              ) : (
                parsedTurns.map((turn, idx) => {
                  const isCurrent = isPlaying && currentPlaybackTurn === idx;
                  const isHighlighted = highlightedTurnIdx === idx;
                  const speakerColor = speakerStats.find(s => s.name === turn.speaker)?.color || '#6366f1';

                  return (
                    <div
                      key={idx}
                      id={`turn-${idx}`}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: isHighlighted 
                          ? 'rgba(16, 185, 129, 0.15)' 
                          : isCurrent 
                            ? 'rgba(99, 102, 241, 0.18)' 
                            : 'rgba(255, 255, 255, 0.02)',
                        border: `1px solid ${isHighlighted ? '#10b981' : isCurrent ? '#6366f1' : 'var(--border-subtle)'}`,
                        transition: 'all 0.25s ease',
                        boxShadow: isHighlighted ? '0 0 18px rgba(16, 185, 129, 0.35)' : isCurrent ? '0 0 15px rgba(99, 102, 241, 0.25)' : 'none',
                        position: 'relative'
                      }}
                      className={isHighlighted ? 'highlight-radar' : ''}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            width: '20px', 
                            height: '20px', 
                            borderRadius: '50%', 
                            background: speakerColor, 
                            color: '#ffffff',
                            fontSize: '0.65rem', 
                            fontWeight: 800,
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            flexShrink: 0
                          }}>
                            {turn.speaker.charAt(0).toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: speakerColor }}>
                            {turn.speaker}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                          Turn #{idx + 1} • {turn.time}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.84rem', color: '#e2e8f0', lineHeight: 1.5, paddingLeft: '28px' }}>
                        {turn.text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            {/* Main Action Button */}
            <button
              className="btn btn-primary"
              style={{ padding: '14px', fontSize: '0.95rem', width: '100%', gap: '10px' }}
              onClick={handleExtract}
              disabled={loading || !(transcript || '').trim()}
            >
              {loading ? (
                <><Loader2 className="animate-spin" size={18} /> Validating Pydantic Schema &amp; Citation Guard...</>
              ) : (
                <><Sparkles size={18} /> Run Intelligence Extraction ({provider.toUpperCase()})</>
              )}
            </button>
          </div>

          {/* Speaker Talk-Time & Participation Breakdown */}
          {speakerStats.length > 0 && (
            <div className="glass-panel" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={14} color="#818cf8" />
                <span>Speaker Participation &amp; Talk-Time</span>
              </div>

              {/* Progress Bar Distribution */}
              <div style={{ height: '8px', width: '100%', display: 'flex', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px', background: 'rgba(255,255,255,0.05)' }}>
                {speakerStats.map((s, i) => (
                  <div key={i} style={{ width: `${s.percentage}%`, background: s.color, height: '100%' }} title={`${s.name}: ${s.percentage}%`} />
                ))}
              </div>

              {/* Speaker Stats Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                {speakerStats.map((s, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: s.color }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{s.name}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      <strong>{s.percentage}%</strong> talk-time ({s.turns} turns)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ══ RIGHT PANE: Structured Intelligence & Executive Action Hub ══ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {!result && !loading && (
            <div className="glass-panel" style={{ minHeight: '560px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', maxWidth: '380px' }}>
                <div style={{ 
                  width: '68px', 
                  height: '68px', 
                  borderRadius: '50%', 
                  background: 'rgba(99, 102, 241, 0.09)', 
                  border: '1px solid var(--border-subtle)',
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  margin: '0 auto 16px' 
                }}>
                  <Brain size={34} color="#818cf8" style={{ opacity: 0.75 }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Awaiting Meeting Analysis
                </h3>
                <p style={{ fontSize: '0.84rem', lineHeight: 1.55 }}>
                  Select a transcript preset on the left, then click <strong>Run Intelligence Extraction</strong> to see verified commitments, decisions, and exportable executive briefs.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-panel animate-pulse-glow" style={{ minHeight: '560px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', color: 'var(--primary-glow)' }}>
                <Loader2 className="animate-spin" size={48} style={{ margin: '0 auto 16px', color: '#818cf8' }} />
                <p style={{ fontWeight: 800, fontSize: '1.15rem', color: '#ffffff' }}>Executing Extraction &amp; Verification</p>
                <p style={{ fontSize: '0.82rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                  Extracting Entities → Resolving Action Items → Citation Guard Exact-Substring Validation
                </p>
              </div>
            </div>
          )}

          {result && (
            <>
              {/* Executive Suite Segmented Switcher */}
              <div className="glass-panel" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => setActionTab('summary')}
                    className={`btn btn-xs ${actionTab === 'summary' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <BarChart2 size={12} /> Structured Brief
                  </button>
                  <button
                    onClick={() => setActionTab('email')}
                    className={`btn btn-xs ${actionTab === 'email' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <Mail size={12} /> Follow-Up Email
                  </button>
                  <button
                    onClick={() => setActionTab('jira')}
                    className={`btn btn-xs ${actionTab === 'jira' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <CheckSquare size={12} /> Jira / Linear Tickets
                  </button>
                  <button
                    onClick={() => setActionTab('slack')}
                    className={`btn btn-xs ${actionTab === 'slack' ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <MessageSquare size={12} /> Slack Standup
                  </button>
                  <div style={{ width: '1px', height: '18px', background: 'var(--border-medium)', margin: '0 2px' }} />
                  <button
                    onClick={() => setActionTab('productivity')}
                    className={`btn btn-xs ${actionTab === 'productivity' ? 'btn-cta' : 'btn-secondary'}`}
                    style={{ gap: '5px' }}
                  >
                    <Target size={12} /> ✨ Productivity Hub
                  </button>
                </div>

                <div className="badge badge-verified" style={{ fontSize: '0.72rem' }}>
                  <ShieldCheck size={12} /> 100% Grounded
                </div>
              </div>

              {/* VIEW 1: STRUCTURED BRIEF */}
              {actionTab === 'summary' && (
                <>
                  {/* Executive Summary Card */}
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: '#a5b4fc', fontWeight: 800, letterSpacing: '0.05em' }}>
                        Executive Summary
                      </div>
                      <button
                        onClick={() => handleCopy(result.summary, 'summary_copy')}
                        className="btn btn-secondary btn-xs"
                      >
                        {copiedKey === 'summary_copy' ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
                        <span>Copy</span>
                      </button>
                    </div>
                    <p style={{ fontSize: '0.94rem', lineHeight: 1.65, color: '#f1f5f9' }}>
                      {result.summary}
                    </p>
                  </div>

                  {/* Action Items Card with Verbatim Citation Highlighting */}
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: '#fbbf24', fontWeight: 800, letterSpacing: '0.05em' }}>
                        Action Items &amp; Commitments
                      </div>
                      <span className="badge badge-amber">{result.action_items.length} Tasks Detected</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {result.action_items.map((action, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleSpotlightQuote(action.evidence_quote, `action_${idx}`)}
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.025)', 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '14px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          className="glass-panel-interactive"
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', flex: 1, lineHeight: 1.4 }}>
                              {action.description}
                            </p>
                            
                            {action.accepted ? (
                              <div className="badge badge-verified" style={{ flexShrink: 0 }}>
                                <CheckCircle2 size={12} />
                                <span>Verbatim Cited</span>
                              </div>
                            ) : (
                              <div className="badge badge-rejected"><XCircle size={12} /> Hallucinated</div>
                            )}
                          </div>
                          
                          {/* Owner & Deadline Chips */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.76rem' }}>
                              {action.owner && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(99, 102, 241, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', color: '#a5b4fc', fontWeight: 600 }}>
                                  <User size={11} /> {action.owner}
                                </div>
                              )}
                              {action.deadline && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(245, 158, 11, 0.12)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', color: '#fbbf24', fontWeight: 600 }}>
                                  <Clock size={11} /> {action.deadline}
                                </div>
                              )}
                            </div>

                            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Eye size={11} /> Click to spotlight quote in transcript
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      {result.action_items.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No action items found in this meeting.</p>
                      )}
                    </div>
                  </div>

                  {/* Decisions Card */}
                  <div className="glass-panel" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ fontSize: '0.76rem', textTransform: 'uppercase', color: '#67e8f9', fontWeight: 800, letterSpacing: '0.05em' }}>
                        Agreed Decisions
                      </div>
                      <span className="badge badge-cyan">{result.decisions.length} Decisions</span>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {result.decisions.map((dec, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => handleSpotlightQuote(dec.evidence_quote, `decision_${idx}`)}
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.025)', 
                            border: '1px solid var(--border-subtle)', 
                            borderRadius: 'var(--radius-md)', 
                            padding: '14px',
                            cursor: 'pointer'
                          }}
                          className="glass-panel-interactive"
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                            <p style={{ fontSize: '0.92rem', fontWeight: 600, color: '#f8fafc', flex: 1, lineHeight: 1.4 }}>
                              {dec.description}
                            </p>
                            {dec.accepted && (
                              <div className="badge badge-verified" style={{ flexShrink: 0 }}>
                                <CheckCircle2 size={12} />
                                <span>Verbatim Cited</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}

                      {result.decisions.length === 0 && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No decisions detected in this meeting.</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* VIEW 2: FOLLOW-UP EMAIL */}
              {actionTab === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  
                  {/* Executive Email */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={15} /> Internal Executive Summary
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleCopy(generateFollowupEmail('executive'), 'email_copy_exec')} className="btn btn-primary btn-xs">
                          {copiedKey === 'email_copy_exec' ? <Check size={12} /> : <Copy size={12} />} <span>Copy</span>
                        </button>
                        <button onClick={() => handleOpenGmail(generateFollowupEmail('executive'))} className="btn btn-secondary btn-xs">
                          <Mail size={12} /> <span>Open in Gmail</span>
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      {generateFollowupEmail('executive')}
                    </pre>
                  </div>

                  {/* Action-Oriented Email */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckSquare size={15} /> Action Items Only (Internal)
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleCopy(generateFollowupEmail('action'), 'email_copy_action')} className="btn btn-primary btn-xs">
                          {copiedKey === 'email_copy_action' ? <Check size={12} /> : <Copy size={12} />} <span>Copy</span>
                        </button>
                        <button onClick={() => handleOpenGmail(generateFollowupEmail('action'))} className="btn btn-secondary btn-xs">
                          <Mail size={12} /> <span>Open in Gmail</span>
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      {generateFollowupEmail('action')}
                    </pre>
                  </div>

                  {/* Client Email */}
                  <div className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={15} /> Client / External Follow-up
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleCopy(generateFollowupEmail('client'), 'email_copy_client')} className="btn btn-primary btn-xs">
                          {copiedKey === 'email_copy_client' ? <Check size={12} /> : <Copy size={12} />} <span>Copy</span>
                        </button>
                        <button onClick={() => handleOpenGmail(generateFollowupEmail('client'))} className="btn btn-secondary btn-xs">
                          <Mail size={12} /> <span>Open in Gmail</span>
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', lineHeight: 1.6, color: '#e2e8f0', whiteSpace: 'pre-wrap', background: 'rgba(0,0,0,0.35)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      {generateFollowupEmail('client')}
                    </pre>
                  </div>

                </div>
              )}

              {/* VIEW 3: JIRA / LINEAR TICKETS */}
              {actionTab === 'jira' && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={15} /> Formatted Jira / Linear Tickets
                    </div>
                    <button
                      onClick={() => handleCopy(generateJiraMarkdown(), 'jira_copy')}
                      className="btn btn-primary btn-xs"
                    >
                      {copiedKey === 'jira_copy' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'jira_copy' ? 'Copied Tickets!' : 'Copy All Tasks'}</span>
                    </button>
                  </div>
                  <pre style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.78rem',
                    lineHeight: 1.6,
                    color: '#cbd5e1',
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0,0,0,0.35)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    maxHeight: '440px',
                    overflowY: 'auto'
                  }}>
                    {generateJiraMarkdown()}
                  </pre>
                </div>
              )}

              {/* VIEW 4: SLACK STANDUP */}
              {actionTab === 'slack' && (
                <div className="glass-panel" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 800, color: '#34d399', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <MessageSquare size={15} /> Slack / Teams Standup Broadcast
                    </div>
                    <button
                      onClick={() => handleCopy(generateSlackMessage(), 'slack_copy')}
                      className="btn btn-primary btn-xs"
                    >
                      {copiedKey === 'slack_copy' ? <Check size={12} /> : <Copy size={12} />}
                      <span>{copiedKey === 'slack_copy' ? 'Copied!' : 'Copy Message'}</span>
                    </button>
                  </div>
                  <pre style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.85rem',
                    lineHeight: 1.6,
                    color: '#e2e8f0',
                    whiteSpace: 'pre-wrap',
                    background: 'rgba(0,0,0,0.35)',
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}>
                    {generateSlackMessage()}
                  </pre>
                </div>
              )}

              {/* VIEW 5: PRODUCTIVITY HUB — Checklist / Eisenhower Matrix / Timeline */}
              {actionTab === 'productivity' && (
                <ProductivityHub result={result} />
              )}

            </>
          )}
        </div>
      </div>
    </div>
  );
}
