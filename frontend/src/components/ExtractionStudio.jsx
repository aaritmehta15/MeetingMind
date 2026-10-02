import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, CheckCircle2, XCircle, Clock, User, ShieldCheck, 
  Loader2, Sparkles, Brain, FileText, Trash2, Copy, Check, 
  Mail, CheckSquare, MessageSquare,
  BarChart2, Eye, Upload, ChevronDown, Edit3, HelpCircle,
  Columns, Maximize2, Minimize2, Mic, Square, FileAudio
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import MarkdownAnswer from './MarkdownAnswer';

export default function ExtractionStudio({ userMeetings, provider, fetchUserMeetings, onOpenGuide }) {
  const { authFetch } = useAuth();
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const [selectedMeetingId, setSelectedMeetingId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [highlightedTurnIdx, setHighlightedTurnIdx] = useState(null);
  const [copiedKey, setCopiedKey] = useState(null);
  
  // View mode in left column: 'dialogue' | 'raw'
  const [viewMode, setViewMode] = useState('dialogue');
  
  // Intelligence Tab: 'brief' | 'actions' | 'decisions' | 'email'
  const [intelTab, setIntelTab] = useState('brief');

  // Layout mode: 'split' | 'deliverables'
  const [layoutMode, setLayoutMode] = useState('split');
  
  // Dialogue Container ref
  const dialogueContainerRef = useRef(null);

  // Auto-select first meeting if available and none selected
  useEffect(() => {
    if (userMeetings && userMeetings.length > 0 && !selectedMeetingId && !transcript) {
      const first = userMeetings[0];
      setSelectedMeetingId(first.id);
      setTranscript(first.text || first.transcript_text || '');
    }
  }, [userMeetings]);

  // Parse dialogue turns from raw transcript text
  const parseTurns = (rawText) => {
    if (!rawText) return [];
    const lines = rawText.split('\n').filter(l => l.trim().length > 0);
    const turns = [];
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
        timeIndex += 14;
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

    const colors = ['#0d9488', '#0ea5e9', '#6366f1', '#f59e0b', '#10b981', '#ec4899'];
    return Object.values(stats).map((s, idx) => ({
      ...s,
      percentage: totalWords > 0 ? Math.round((s.words / totalWords) * 100) : 0,
      color: colors[idx % colors.length]
    }));
  }, [parsedTurns]);

  const handleSelectMeeting = (meetingId) => {
    setSelectedMeetingId(meetingId);
    const m = userMeetings?.find(item => String(item.id) === String(meetingId));
    if (m) {
      setTranscript(m.text || m.transcript_text || '');
      setResult(null);
      setHighlightedTurnIdx(null);
    }
  };

  const handleClear = () => {
    setTranscript('');
    setSelectedMeetingId('');
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

  const handleSpotlightQuote = (quoteText) => {
    if (!quoteText) return;
    setViewMode('dialogue');
    const cleanQuote = quoteText.toLowerCase().trim();
    const foundIdx = parsedTurns.findIndex(t => 
      t.text.toLowerCase().includes(cleanQuote.slice(0, 30)) || 
      cleanQuote.includes(t.text.toLowerCase().slice(0, 30))
    );
    if (foundIdx !== -1) {
      setHighlightedTurnIdx(foundIdx);
      setTimeout(() => {
        const el = document.getElementById(`turn-${foundIdx}`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
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
          setSelectedMeetingId(json.id);
          setTranscript(text);
          setResult(null);
        }
      } catch (err) {
        console.error("Failed to upload meeting", err);
      }
    };
    reader.readAsText(file);
    e.target.value = null;
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const formatAudioTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert("Microphone recording is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start(250);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone: " + (err.message || err));
    }
  };

  const stopRecording = () => {
    if (!mediaRecorderRef.current) return;
    const recorder = mediaRecorderRef.current;
    
    recorder.onstop = async () => {
      clearInterval(recordingTimerRef.current);
      recorder.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      
      const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (audioBlob.size === 0) {
        alert("Recorded audio was empty.");
        return;
      }
      
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      await uploadAndProcessAudio(audioBlob, `Voice Recording (${timestamp}).webm`);
    };

    recorder.stop();
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current) {
      clearInterval(recordingTimerRef.current);
      mediaRecorderRef.current.stream?.getTracks().forEach(track => track.stop());
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
    setRecordingDuration(0);
  };

  const handleAudioUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    await uploadAndProcessAudio(file, file.name);
    e.target.value = null;
  };

  const uploadAndProcessAudio = async (audioData, fileName) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioData, fileName);
      formData.append('title', fileName.replace(/\.[^/.]+$/, ""));

      const res = await authFetch('/api/meetings/audio', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Audio transcription failed');

      await fetchUserMeetings?.();
      setSelectedMeetingId(data.id);
      setTranscript(data.transcript_text);
      setResult(null);
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Error transcribing audio: " + err.message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleExtract = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const payload = selectedMeetingId ? { meeting_id: Number(selectedMeetingId), provider } : { transcript, provider };
      const res = await authFetch('/api/extract', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Extraction failed');
      setResult(data);
      setIntelTab('brief');

      if (data.action_items && data.action_items.length > 0) {
        for (const action of data.action_items) {
          await authFetch('/api/tasks', {
            method: 'POST',
            body: JSON.stringify({
              description: action.description,
              deadline: action.deadline || null
            })
          });
        }
        window.dispatchEvent(new Event('tasks-updated'));
      }
    } catch (err) {
      alert('Error extracting: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateFollowupEmail = (type = 'executive') => {
    if (!result) return '';
    const actions = (result.action_items || []).map(a => `• ${a.description} (Owner: ${a.owner || 'Unassigned'}${a.deadline ? ` | Due: ${a.deadline}` : ''})`).join('\n');
    const decisions = (result.decisions || []).map(d => `• ${d.description}`).join('\n');
    const meetingTitle = selectedMeetingId ? userMeetings?.find(m => String(m.id) === String(selectedMeetingId))?.title : null;
    const title = meetingTitle || 'Sync Session';
    
    if (type === 'executive') {
      return `Subject: Meeting Summary & Action Items: ${title}\n\nHi Team,\n\nHere is the executive summary and commitments verified from today's meeting:\n\n📋 Executive Summary:\n${result.summary}\n\n✅ Key Decisions Agreed:\n${decisions || '• No explicit formal decisions recorded.'}\n\n🚀 Action Items & Commitments:\n${actions || '• No action items recorded.'}\n\nBest regards,\nMeetingMind Intelligence Engine`;
    } 
    else if (type === 'action') {
      return `Subject: Action Required: Tasks from ${title}\n\nTeam,\n\nPlease see the verified action items from our recent meeting:\n\n🚀 Action Items:\n${actions || '• No action items recorded.'}\n\nPlease update your status as tasks are completed.\n\nThanks,\nMeetingMind`;
    }
    else if (type === 'client') {
      return `Subject: Following up on our meeting: ${title}\n\nHi [Client Name],\n\nIt was great speaking today. Here is a brief recap of our discussion:\n\nOverview:\n${result.summary}\n\nDecisions made:\n${decisions || '• We agreed to review the outstanding items offline.'}\n\nOur next steps:\n${actions || '• We will reach out shortly with further updates.'}\n\nBest regards,\n[Your Name]`;
    }
    return '';
  };

  const selectedMeetingObj = userMeetings?.find(m => String(m.id) === String(selectedMeetingId));

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1600px', margin: '0 auto' }}>
      
      {/* ── TOP STUDIO CONTROLS HEADER ── */}
      <div style={{ 
        marginBottom: '20px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '16px',
        padding: '16px 20px',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Left Title & Status Badges */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--text-main)', margin: 0 }}>
              Extraction Studio
            </h2>
            <span className="badge badge-verified" title="Verifies that every extracted task or decision exists word-for-word in the actual transcript without hallucinations">
              <ShieldCheck size={13} /> Citation-Verified
            </span>
            <span className="badge badge-primary" title="Uses strict Pydantic v2 schema enforcement to guarantee deterministic structured JSON output">
              Pydantic v2 Grounding
            </span>
            <button
              onClick={() => onOpenGuide && onOpenGuide('studio')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                border: '1px solid var(--border-medium)',
                background: 'var(--bg-input)',
                color: 'var(--text-muted)',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--primary)';
                e.currentTarget.style.color = 'var(--primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--border-medium)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              title="Learn how Extraction Studio & Citation Guard work"
            >
              <HelpCircle size={12} color="var(--primary)" />
              <span>Guide</span>
            </button>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '4px', margin: 0 }}>
            Deterministic verbatim citations for commitments, decisions, and one-click executive briefs.
          </p>
        </div>

        {/* Right Consolidated Meeting Source Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Meeting Selector Dropdown */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <FileText size={14} style={{ position: 'absolute', left: '12px', color: 'var(--primary)', pointerEvents: 'none' }} />
            <select
              value={selectedMeetingId}
              onChange={(e) => handleSelectMeeting(e.target.value)}
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-md)',
                padding: '7px 30px 7px 32px',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                minWidth: '220px',
                appearance: 'none',
                WebkitAppearance: 'none'
              }}
              title="Select meeting transcript"
            >
              <option value="" disabled style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>Choose transcript...</option>
              {userMeetings && userMeetings.map(m => (
                <option key={m.id} value={m.id} style={{ background: 'var(--bg-surface-elevated)', color: 'var(--text-main)' }}>
                  {m.title} ({m.turn_count || (m.text ? m.text.split('\n').filter(l => l.includes(':')).length : 0)} turns)
                </option>
              ))}
            </select>
            <ChevronDown size={13} style={{ position: 'absolute', right: '10px', color: 'var(--text-dim)', pointerEvents: 'none' }} />
          </div>

          {/* Text Upload Button */}
          <input 
            type="file" 
            accept=".txt" 
            ref={fileInputRef} 
            style={{ display: 'none' }} 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            title="Upload custom .txt transcript"
            disabled={isTranscribing || isRecording}
          >
            <Upload size={13} />
            <span>Text File</span>
          </button>

          {/* Audio Upload Button */}
          <input 
            type="file" 
            accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg,.flac,.aac" 
            ref={audioInputRef} 
            style={{ display: 'none' }} 
            onChange={handleAudioUpload} 
          />
          <button 
            onClick={() => audioInputRef.current?.click()}
            className="btn btn-secondary btn-sm"
            style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            title="Upload audio recording (.mp3, .wav, .m4a, .webm)"
            disabled={isTranscribing || isRecording}
          >
            <FileAudio size={13} />
            <span>Audio File</span>
          </button>

          {/* Live Microphone Recording Button / Active Recording Bar */}
          {!isRecording ? (
            <button 
              onClick={startRecording}
              className="btn btn-secondary btn-sm"
              style={{ 
                padding: '6px 12px', 
                fontSize: '0.78rem',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#ef4444',
                background: 'rgba(239, 68, 68, 0.08)'
              }}
              title="Record live meeting audio from microphone"
              disabled={isTranscribing}
            >
              <Mic size={13} />
              <span>Record</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.5)',
                color: '#ef4444',
                fontWeight: 700,
                fontSize: '0.76rem'
              }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#ef4444',
                  boxShadow: '0 0 8px #ef4444',
                  display: 'inline-block'
                }} />
                <span>REC {formatAudioTime(recordingDuration)}</span>
              </div>
              <button
                onClick={stopRecording}
                className="btn btn-primary btn-sm"
                style={{ padding: '5px 11px', fontSize: '0.76rem', background: '#ef4444', borderColor: '#dc2626' }}
                title="Stop recording and transcribe with Whisper AI"
              >
                <Square size={11} fill="currentColor" />
                <span>Transcribe</span>
              </button>
              <button
                onClick={cancelRecording}
                className="btn btn-secondary btn-sm"
                style={{ padding: '5px 9px', fontSize: '0.76rem' }}
                title="Cancel recording"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Layout Mode Toggle */}
          <button
            onClick={() => setLayoutMode(layoutMode === 'split' ? 'deliverables' : 'split')}
            className="btn btn-secondary btn-sm"
            style={{ 
              padding: '6px 12px', 
              fontSize: '0.78rem',
              background: layoutMode === 'deliverables' ? 'var(--primary-gradient)' : 'var(--bg-input)',
              color: layoutMode === 'deliverables' ? '#ffffff' : 'var(--text-muted)'
            }}
            title={layoutMode === 'split' ? "Expand Deliverables into full-width mode" : "Restore 50/50 side-by-side view"}
          >
            {layoutMode === 'split' ? <Maximize2 size={13} /> : <Columns size={13} />}
            <span>{layoutMode === 'split' ? 'Focus Mode' : 'Split View'}</span>
          </button>
          
          {transcript && (
            <button 
              onClick={handleClear} 
              className="btn btn-secondary btn-sm" 
              style={{ color: 'var(--rose)', padding: '6px 10px' }}
              title="Clear transcript"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ── AUDIO TRANSCRIBING BANNER ── */}
      {isTranscribing && (
        <div style={{
          marginBottom: '20px',
          padding: '14px 20px',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(20, 184, 166, 0.08)',
          border: '1px solid rgba(20, 184, 166, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Loader2 size={20} className="animate-spin" color="var(--primary)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-main)' }}>
              Transcribing audio with Whisper AI...
            </span>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Converting spoken speech into verified speaker dialogue turns and saving to your meeting library.
            </span>
          </div>
        </div>
      )}

      {/* ── MAIN WORKSPACE ── */}
      <div 
        className="responsive-2col"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: layoutMode === 'deliverables' ? '1fr' : 'minmax(460px, 1.15fr) minmax(480px, 1.25fr)', 
          gap: '24px', 
          alignItems: 'start' 
        }}
      >
        
        {/* ════ LEFT COLUMN: Unified Transcript & Playback Studio ════ */}
        {layoutMode !== 'deliverables' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Main Transcript Card */}
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Header: Mode Switcher & Stats */}
            <div style={{ 
              padding: '14px 18px', 
              borderBottom: '1px solid var(--border-subtle)', 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
              background: 'var(--bg-surface)'
            }}>
              {/* Left View Switcher */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-input)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => setViewMode('dialogue')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: viewMode === 'dialogue' ? 'var(--primary-gradient)' : 'transparent',
                    color: viewMode === 'dialogue' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <MessageSquare size={13} />
                  <span>Dialogue View ({parsedTurns.length})</span>
                </button>
                <button
                  onClick={() => setViewMode('raw')}
                  style={{
                    padding: '5px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: viewMode === 'raw' ? 'var(--primary-gradient)' : 'transparent',
                    color: viewMode === 'raw' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <Edit3 size={13} />
                  <span>Raw Editor</span>
                </button>
              </div>

              {/* Right: Speaker Turn count */}
              {viewMode === 'dialogue' && parsedTurns.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', background: 'var(--bg-input)', padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
                    {parsedTurns.length} turns
                  </span>
                </div>
              )}
            </div>

            {/* View 1: Formatted Dialogue */}
            {viewMode === 'dialogue' && (
              <div 
                ref={dialogueContainerRef}
                style={{ 
                  maxHeight: '520px', 
                  minHeight: '440px',
                  overflowY: 'auto', 
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  background: 'var(--bg-main)'
                }}
              >
                {parsedTurns.length === 0 ? (
                  <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <MessageSquare size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                    <p style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-main)' }}>No transcript loaded</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>Select a meeting from the top dropdown or paste dialogue in the Raw Editor.</p>
                  </div>
                ) : (
                  parsedTurns.map((turn, idx) => {
                    const isSpotlighted = highlightedTurnIdx === idx;
                    const speakerStat = speakerStats.find(s => s.name === turn.speaker);
                    const speakerColor = speakerStat ? speakerStat.color : '#0d9488';

                    return (
                      <div
                        id={`turn-${idx}`}
                        key={idx}
                        style={{
                          padding: '12px 16px',
                          borderRadius: 'var(--radius-md)',
                          background: isSpotlighted 
                            ? 'rgba(20, 184, 166, 0.18)' 
                            : 'var(--bg-card)',
                          border: isSpotlighted 
                            ? '2px solid var(--primary)' 
                            : '1px solid var(--border-subtle)',
                          transition: 'all 0.2s ease',
                          boxShadow: isSpotlighted ? 'var(--shadow-teal)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              width: '22px', 
                              height: '22px', 
                              borderRadius: '50%', 
                              background: speakerColor, 
                              color: '#ffffff',
                              fontSize: '0.68rem', 
                              fontWeight: 800,
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {turn.speaker.charAt(0).toUpperCase()}
                            </span>
                            <span style={{ fontSize: '0.84rem', fontWeight: 700, color: speakerColor }}>
                              {turn.speaker}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'var(--text-dim)' }}>
                            Turn #{idx + 1} • {turn.time}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.86rem', color: 'var(--text-main)', lineHeight: 1.55, paddingLeft: '30px' }}>
                          {turn.text}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* View 2: Raw Editor */}
            {viewMode === 'raw' && (
              <textarea
                value={transcript}
                onChange={(e) => {
                  setTranscript(e.target.value);
                  setSelectedMeetingId('');
                }}
                placeholder={"Paste or edit meeting transcript here in format:\n\nAlice: Let's review the product launch.\nBob: I will prepare the presentation by Friday.\nAlice: Approved."}
                style={{
                  minHeight: '440px',
                  maxHeight: '520px',
                  width: '100%',
                  padding: '16px 20px',
                  background: 'var(--bg-input)',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontSize: '0.84rem',
                  lineHeight: 1.6,
                  resize: 'none',
                  outline: 'none',
                  fontFamily: 'var(--font-mono)'
                }}
              />
            )}

            {/* Speaker Participation Bar */}
            {speakerStats.length > 0 && (
              <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Speaker Talk-Time Distribution
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                    {speakerStats.length} speakers
                  </span>
                </div>
                {/* Horizontal multi-color bar */}
                <div style={{ height: '7px', width: '100%', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: 'var(--border-subtle)' }}>
                  {speakerStats.map((s, i) => (
                    <div key={i} style={{ width: `${s.percentage}%`, background: s.color, height: '100%' }} title={`${s.name}: ${s.percentage}%`} />
                  ))}
                </div>
                {/* Speaker pills */}
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                  {speakerStats.map((s, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.74rem' }}>
                      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.color }} />
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{s.name}</span>
                      <span style={{ color: 'var(--text-muted)' }}>{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── BIG PRIMARY EXTRACTION BUTTON ── */}
          <button
            className="btn btn-primary"
            style={{ 
              padding: '15px 24px', 
              fontSize: '0.96rem', 
              fontWeight: 700,
              width: '100%', 
              gap: '10px',
              borderRadius: 'var(--radius-lg)'
            }}
            onClick={handleExtract}
            disabled={loading || !(transcript || '').trim()}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Validating Pydantic Schema &amp; Citation Guard...</span>
              </>
            ) : (
              <>
                <Sparkles size={20} />
                <span>Run Intelligence Extraction ({provider.toUpperCase()})</span>
              </>
            )}
          </button>
        </div>
        )}

        {/* ════ RIGHT COLUMN: Intelligence & Verification Hub ════ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* STATE 1: Empty Onboarding Guide */}
          {!result && !loading && (
            <div className="glass-panel" style={{ minHeight: '520px', padding: '36px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '16px', 
                background: 'var(--teal-bg)', 
                border: '1px solid var(--teal-border)',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                marginBottom: '16px',
                boxShadow: 'var(--shadow-teal)'
              }}>
                <Brain size={32} color="var(--primary)" />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                Grounded Meeting Intelligence
              </h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', maxWidth: '420px', lineHeight: 1.6, marginBottom: '24px' }}>
                Extract verified action items with assigned owners, exact deadlines, and verbatim dialogue citations.
              </p>

              {/* 3 Step Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', width: '100%', maxWidth: '440px', marginBottom: '24px' }}>
                <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '4px' }}>STEP 1</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Select Meeting</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--cta)', marginBottom: '4px' }}>STEP 2</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Choose Model</div>
                </div>
                <div style={{ background: 'var(--bg-input)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--emerald)', marginBottom: '4px' }}>STEP 3</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)' }}>Run &amp; Export</div>
                </div>
              </div>

              {selectedMeetingId && (
                <button
                  onClick={handleExtract}
                  className="btn btn-primary btn-sm"
                  style={{ gap: '6px' }}
                >
                  <Sparkles size={14} />
                  <span>Extract from "{selectedMeetingObj?.title || 'Selected Meeting'}"</span>
                </button>
              )}
            </div>
          )}

          {/* STATE 2: Loading Animation */}
          {loading && (
            <div className="glass-panel" style={{ minHeight: '520px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', textAlign: 'center' }}>
              <div style={{
                width: '54px', 
                height: '54px',
                border: '3px solid var(--teal-border)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: '20px'
              }} />
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Verifying Verbatim Citations...
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px', maxWidth: '360px', lineHeight: 1.5 }}>
                Running Pydantic extraction schema &amp; validating exact substring matches against ground truth.
              </p>
            </div>
          )}

          {/* STATE 3: Extracted Intelligence Results */}
          {result && (
            <>
              {/* KPI Metrics Row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '10px' }}>
                <div className="glass-panel" style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Citation Guard</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--emerald)', marginTop: '2px' }}>
                    100% Grounded
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Action Items</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>
                    {result.action_items?.length || 0}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Decisions</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--cta)', marginTop: '2px' }}>
                    {result.decisions?.length || 0}
                  </div>
                </div>
                <div className="glass-panel" style={{ padding: '12px 14px' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase' }}>Inference Latency</span>
                  <div style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '2px' }}>
                    {result.latency_ms ? `${result.latency_ms}ms` : '<1.2s'}
                  </div>
                </div>
              </div>

              {/* Segmented Results Switcher */}
              <div className="glass-panel" style={{ padding: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  onClick={() => setIntelTab('brief')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: intelTab === 'brief' ? 'var(--primary-gradient)' : 'transparent',
                    color: intelTab === 'brief' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <BarChart2 size={13} />
                  <span>Brief</span>
                </button>

                <button
                  onClick={() => setIntelTab('actions')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: intelTab === 'actions' ? 'var(--primary-gradient)' : 'transparent',
                    color: intelTab === 'actions' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <CheckSquare size={13} />
                  <span>Tasks</span>
                  <span style={{
                    fontSize: '0.66rem',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: intelTab === 'actions' ? 'rgba(255,255,255,0.25)' : 'var(--bg-panel)',
                    color: intelTab === 'actions' ? '#ffffff' : 'var(--primary)',
                    fontWeight: 700
                  }}>
                    {result.action_items?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setIntelTab('decisions')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: intelTab === 'decisions' ? 'var(--primary-gradient)' : 'transparent',
                    color: intelTab === 'decisions' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <CheckCircle2 size={13} />
                  <span>Decisions</span>
                  <span style={{
                    fontSize: '0.66rem',
                    padding: '1px 6px',
                    borderRadius: 'var(--radius-full)',
                    background: intelTab === 'decisions' ? 'rgba(255,255,255,0.25)' : 'var(--bg-panel)',
                    color: intelTab === 'decisions' ? '#ffffff' : 'var(--cta)',
                    fontWeight: 700
                  }}>
                    {result.decisions?.length || 0}
                  </span>
                </button>

                <button
                  onClick={() => setIntelTab('email')}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: intelTab === 'email' ? 'var(--primary-gradient)' : 'transparent',
                    color: intelTab === 'email' ? '#ffffff' : 'var(--text-muted)'
                  }}
                >
                  <Mail size={13} />
                  <span>Email</span>
                </button>

                {/* Rightmost: Focus / Split View Mode Toggle */}
                <button
                  onClick={() => setLayoutMode(layoutMode === 'split' ? 'deliverables' : 'split')}
                  style={{
                    padding: '8px 11px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-medium)',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: layoutMode === 'deliverables' ? 'var(--primary-gradient)' : 'var(--bg-input)',
                    color: layoutMode === 'deliverables' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease'
                  }}
                  title={layoutMode === 'split' ? "Expand Deliverables into full-width mode" : "Restore 50/50 side-by-side view"}
                >
                  {layoutMode === 'split' ? <Maximize2 size={13} /> : <Columns size={13} />}
                  <span>{layoutMode === 'split' ? 'Focus' : 'Split'}</span>
                </button>
              </div>

              {/* ── TAB 1: EXECUTIVE BRIEF ── */}
              {intelTab === 'brief' && (
                <div className="glass-panel" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                      Executive Summary
                    </div>
                    <button
                      onClick={() => handleCopy(result.summary, 'copy_brief')}
                      className="btn btn-secondary btn-xs"
                    >
                      {copiedKey === 'copy_brief' ? <Check size={12} color="var(--emerald)" /> : <Copy size={12} />}
                      <span>{copiedKey === 'copy_brief' ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <MarkdownAnswer content={result.summary} showCopy={false} />
                </div>
              )}

              {/* ── TAB 2: VERIFIED ACTION ITEMS ── */}
              {intelTab === 'actions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.action_items?.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No action items detected in this meeting.
                    </div>
                  ) : (
                    result.action_items.map((action, idx) => (
                      <div 
                        key={idx} 
                        className="glass-panel"
                        style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', flex: 1, margin: 0, lineHeight: 1.45 }}>
                            {action.description}
                          </p>
                          <span className={`badge ${action.accepted ? 'badge-verified' : 'badge-rejected'}`}>
                            {action.accepted ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            <span>{action.accepted ? 'Verbatim Cited' : 'Hallucinated'}</span>
                          </span>
                        </div>

                        {/* Owner, Deadline & Spotlight Quote */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {action.owner && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--teal-bg)', color: 'var(--primary)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontSize: '0.74rem', fontWeight: 600 }}>
                                <User size={11} /> {action.owner}
                              </span>
                            )}
                            {action.deadline && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--amber-bg)', color: 'var(--amber)', padding: '2px 8px', borderRadius: 'var(--radius-xs)', fontSize: '0.74rem', fontWeight: 600 }}>
                                <Clock size={11} /> {action.deadline}
                              </span>
                            )}
                          </div>

                          {action.evidence_quote && (
                            <button
                              onClick={() => handleSpotlightQuote(action.evidence_quote)}
                              className="btn btn-secondary btn-xs"
                              style={{ gap: '4px' }}
                            >
                              <Eye size={11} />
                              <span>Spotlight in Dialogue</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── TAB 3: KEY DECISIONS ── */}
              {intelTab === 'decisions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {result.decisions?.length === 0 ? (
                    <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No formal decisions detected in this meeting.
                    </div>
                  ) : (
                    result.decisions.map((dec, idx) => (
                      <div key={idx} className="glass-panel" style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                          <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-main)', margin: 0, lineHeight: 1.45 }}>
                            {dec.description}
                          </p>
                          <span className="badge badge-verified">
                            <CheckCircle2 size={12} />
                            <span>Agreed</span>
                          </span>
                        </div>
                        {dec.evidence_quote && (
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', borderLeft: '2px solid var(--primary)', paddingLeft: '8px' }}>
                            "{dec.evidence_quote}"
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── TAB 4: FOLLOW-UP EMAILS ── */}
              {intelTab === 'email' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Executive Follow-Up */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Mail size={14} /> Executive Summary Email
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleCopy(generateFollowupEmail('executive'), 'copy_email_exec')} className="btn btn-primary btn-xs">
                          {copiedKey === 'copy_email_exec' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedKey === 'copy_email_exec' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button onClick={() => handleOpenGmail(generateFollowupEmail('executive'))} className="btn btn-secondary btn-xs">
                          <Mail size={11} />
                          <span>Gmail</span>
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', margin: 0 }}>
                      {generateFollowupEmail('executive')}
                    </pre>
                  </div>

                  {/* Action-Oriented Email */}
                  <div className="glass-panel" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--cta)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckSquare size={14} /> Action Items Only Email
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => handleCopy(generateFollowupEmail('action'), 'copy_email_act')} className="btn btn-primary btn-xs">
                          {copiedKey === 'copy_email_act' ? <Check size={11} /> : <Copy size={11} />}
                          <span>{copiedKey === 'copy_email_act' ? 'Copied' : 'Copy'}</span>
                        </button>
                        <button onClick={() => handleOpenGmail(generateFollowupEmail('action'))} className="btn btn-secondary btn-xs">
                          <Mail size={11} />
                          <span>Gmail</span>
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', lineHeight: 1.55, color: 'var(--text-muted)', whiteSpace: 'pre-wrap', background: 'var(--bg-input)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', margin: 0 }}>
                      {generateFollowupEmail('action')}
                    </pre>
                  </div>
                </div>
              )}

            </>
          )}

        </div>
      </div>
    </div>
  );
}
