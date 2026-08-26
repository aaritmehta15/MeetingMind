import React, { useState } from 'react';
import {
  BarChart2, Users, Smile, Calendar, Hash, ShieldCheck,
  Loader2, Sparkles, AlertTriangle, ChevronRight, TrendingUp,
  Clock, MessageSquare, Zap, FileText
} from 'lucide-react';

const TONE_COLORS = {
  Positive: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', bar: '#10b981' },
  Neutral:  { color: '#94a3b8', bg: 'rgba(148,163,184,0.08)', border: 'rgba(148,163,184,0.2)', bar: '#94a3b8' },
  Negative: { color: '#f43f5e', bg: 'rgba(244,63,94,0.12)',  border: 'rgba(244,63,94,0.3)',  bar: '#f43f5e' },
};

const SPEAKER_PALETTE = [
  '#14b8a6', '#f97316', '#8b5cf6', '#0ea5e9',
  '#ec4899', '#10b981', '#f59e0b', '#06b6d4',
];

function StatCard({ icon: Icon, label, value, sub, color = '#14b8a6' }) {
  return (
    <div className="glass-panel" style={{ padding: '16px 18px', display: 'flex', gap: '14px', alignItems: 'center' }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
        background: `${color}18`, border: `1px solid ${color}38`,
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, color, badge }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginBottom: '14px' }}>
      <div style={{
        width: '30px', height: '30px', borderRadius: '8px',
        background: `${color}18`, border: `1px solid ${color}35`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
        <Icon size={15} color={color} />
      </div>
      <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#f1f5f9' }}>{title}</span>
      {badge && (
        <span style={{
          fontSize: '0.65rem', padding: '2px 8px', borderRadius: 'var(--radius-full)',
          background: `${color}15`, color: color, border: `1px solid ${color}30`,
          fontWeight: 700, letterSpacing: '0.03em'
        }}>{badge}</span>
      )}
    </div>
  );
}

export default function MeetingAnalytics({ examples }) {
  const [transcript, setTranscript] = useState('');
  const [selectedExample, setSelectedExample] = useState(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const loadExample = (ex) => {
    setTranscript(ex.text);
    setSelectedExample(ex.id);
    setData(null);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) return;
    setLoading(true);
    setData(null);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || 'Analysis failed');
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const maxKw = data?.keywords?.[0]?.count || 1;

  return (
    <div style={{ padding: '24px 28px', maxWidth: '1550px', margin: '0 auto' }}>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            Meeting Intelligence Dashboard
            <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>5 Analysis Engines</span>
            <span className="badge badge-verified" style={{ fontSize: '0.7rem' }}>Zero LLM Cost</span>
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem' }}>
            Sentiment • Speaker Stats • Keywords • Timeline • Citation Health — all computed locally in &lt; 500ms.
          </p>
        </div>
        <div style={{
          fontSize: '0.72rem', color: '#f59e0b', padding: '6px 12px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)',
          borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', gap: '6px', maxWidth: '320px'
        }}>
          <AlertTriangle size={12} />
          <span>Sentiment scores are approximate tone indicators (VADER). Not suitable for HR or performance evaluation.</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '20px', alignItems: 'start' }}>

        {/* ── LEFT PANEL: Input ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* Example presets */}
          {examples && examples.length > 0 && (
            <div className="glass-panel" style={{ padding: '16px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Sample Transcripts
              </div>
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => loadExample(ex)}
                  style={{
                    width: '100%', textAlign: 'left', padding: '9px 12px', marginBottom: '5px',
                    background: selectedExample === ex.id ? 'rgba(20,184,166,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${selectedExample === ex.id ? 'rgba(20,184,166,0.4)' : 'var(--border-subtle)'}`,
                    borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', gap: '8px',
                    transition: 'all 0.18s ease'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: selectedExample === ex.id ? '#2dd4bf' : '#f1f5f9' }}>
                      {ex.id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{ex.turn_count} turns</div>
                  </div>
                  <ChevronRight size={13} color={selectedExample === ex.id ? '#14b8a6' : '#64748b'} />
                </button>
              ))}
            </div>
          )}

          {/* Transcript textarea */}
          <div className="glass-panel" style={{ padding: '16px' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>
              Or Paste Transcript
            </div>
            <textarea
              className="textarea-field"
              value={transcript}
              onChange={e => { setTranscript(e.target.value); setSelectedExample(null); }}
              placeholder={"Speaker A: Hello everyone...\nSpeaker B: Let's start with the budget.\n..."}
              style={{ height: '160px', width: '100%' }}
            />
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '6px' }}>
              Format: Speaker Name: dialogue text (one turn per line)
            </div>
          </div>

          {/* Run button */}
          <button
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '0.95rem', gap: '10px' }}
            onClick={handleAnalyze}
            disabled={loading || !transcript.trim()}
          >
            {loading
              ? <><Loader2 className="animate-spin" size={18} /> Analysing...</>
              : <><Sparkles size={18} /> Run Full Intelligence Analysis</>
            }
          </button>

          {data && (
            <div className="glass-panel" style={{ padding: '14px 16px', borderLeft: '3px solid #14b8a6' }}>
              <div style={{ fontSize: '0.72rem', color: '#2dd4bf', fontWeight: 700, marginBottom: '4px' }}>Completed in {data.latency_ms}ms</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                5 engines processed {data.stats.total_words} words · {data.stats.total_turns} turns · {data.stats.num_speakers} speakers
              </div>
            </div>
          )}

          {error && (
            <div className="glass-panel" style={{ padding: '14px 16px', borderLeft: '3px solid #f43f5e' }}>
              <div style={{ fontSize: '0.8rem', color: '#fb7185' }}>Error: {error}</div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Results ─────────────────────────────────────── */}
        <div>
          {!data && !loading && (
            <div className="glass-panel" style={{ minHeight: '580px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', maxWidth: '360px' }}>
                <BarChart2 size={48} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '8px' }}>
                  Awaiting Analysis
                </h3>
                <p style={{ fontSize: '0.83rem', lineHeight: 1.6 }}>
                  Select a sample transcript or paste your own, then click <strong>Run Full Intelligence Analysis</strong> to see the instant dashboard.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '16px' }}>
                  {['VADER Sentiment', 'Speaker Stats', 'TF Keywords', 'Timeline', 'Citation Score'].map(l => (
                    <span key={l} style={{ fontSize: '0.68rem', padding: '3px 9px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>{l}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {loading && (
            <div className="glass-panel animate-pulse-glow" style={{ minHeight: '580px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <Loader2 className="animate-spin" size={42} color="#14b8a6" />
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: '1.1rem' }}>Running 5 Analysis Engines</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                  VADER NLP → Speaker Stats → TF Keywords → Timeline → Citation Guard
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['#14b8a6','#f97316','#8b5cf6','#0ea5e9','#10b981'].map((c, i) => (
                  <div key={i} className="soundwave-bar" style={{ background: c }} />
                ))}
              </div>
            </div>
          )}

          {data && (
            <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* ── Stat Overview Row ─────────────────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <StatCard icon={Users}      label="Participants"  value={data.stats.num_speakers}   color="#14b8a6" />
                <StatCard icon={MessageSquare} label="Total Turns"  value={data.stats.total_turns}   color="#f97316" />
                <StatCard icon={Calendar}   label="Time Refs"    value={data.stats.timeline_count} color="#8b5cf6" />
                <StatCard icon={ShieldCheck} label="Citation Health" value={`${data.citation_health}%`}
                  color={data.citation_health > 80 ? '#10b981' : data.citation_health > 50 ? '#f59e0b' : '#f43f5e'}
                  sub="Well-structured transcript" />
              </div>

              {/* ── Row 1: Speaker Stats + Sentiment ─────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Speaker Talk-Time */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <SectionHeader icon={Users} title="Speaker Participation" color="#14b8a6" badge="Talk-Time %" />
                  {data.speakers.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No parseable speaker turns found.</p>
                  )}
                  {data.speakers.map((s, i) => (
                    <div key={s.speaker} style={{ marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: SPEAKER_PALETTE[i % SPEAKER_PALETTE.length], flexShrink: 0 }} />
                          <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f1f5f9' }}>{s.speaker}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                          <span>{s.share_pct}%</span>
                          <span>{s.words}w</span>
                          <span>{s.questions}?</span>
                        </div>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          width: `${s.share_pct}%`,
                          background: SPEAKER_PALETTE[i % SPEAKER_PALETTE.length],
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)'
                        }} />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Sentiment */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <SectionHeader icon={Smile} title="Tone & Sentiment" color="#ec4899" badge="VADER NLP" />

                  {/* Meeting-level badge */}
                  {data.overall_sentiment && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: '7px',
                      padding: '6px 12px', borderRadius: 'var(--radius-md)', marginBottom: '14px',
                      background: TONE_COLORS[data.overall_sentiment.tone]?.bg || 'rgba(255,255,255,0.05)',
                      border: `1px solid ${TONE_COLORS[data.overall_sentiment.tone]?.border || 'var(--border-subtle)'}`,
                    }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)' }}>Overall Meeting:</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: TONE_COLORS[data.overall_sentiment.tone]?.color || '#f1f5f9' }}>
                        {data.overall_sentiment.tone}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>({data.overall_sentiment.compound > 0 ? '+' : ''}{data.overall_sentiment.compound})</span>
                    </div>
                  )}

                  {data.sentiment.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Install vaderSentiment for per-speaker analysis.</p>
                  )}

                  {data.sentiment.map((s) => {
                    const tc = TONE_COLORS[s.tone] || TONE_COLORS.Neutral;
                    const pct = Math.round(((s.compound + 1) / 2) * 100); // map -1..+1 to 0..100
                    return (
                      <div key={s.speaker} style={{ marginBottom: '11px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.83rem', fontWeight: 600, color: '#f1f5f9' }}>{s.speaker}</span>
                          <span style={{
                            fontSize: '0.68rem', padding: '1px 8px', borderRadius: 'var(--radius-full)',
                            fontWeight: 700, background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`
                          }}>{s.tone} ({s.compound > 0 ? '+' : ''}{s.compound})</span>
                        </div>
                        <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
                          <div style={{
                            position: 'absolute', left: '50%', top: 0, height: '100%',
                            width: `${Math.abs(s.compound) * 50}%`,
                            background: tc.bar,
                            transform: s.compound >= 0 ? 'translateX(0%)' : 'translateX(-100%)',
                            borderRadius: 'var(--radius-full)',
                            transition: 'width 0.6s cubic-bezier(0.16,1,0.3,1)'
                          }} />
                          <div style={{ position: 'absolute', left: '50%', top: 0, width: '1px', height: '100%', background: 'rgba(255,255,255,0.2)' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                          <span>Negative</span><span>Neutral</span><span>Positive</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Row 2: Keywords + Timeline ───────────────────────── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

                {/* Keywords */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <SectionHeader icon={Hash} title="Top Keywords" color="#0ea5e9" badge="TF Frequency" />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {data.keywords.slice(0, 12).map((kw, i) => {
                      const pct = Math.round((kw.count / maxKw) * 100);
                      const colors = ['#14b8a6','#f97316','#8b5cf6','#0ea5e9','#ec4899','#10b981'];
                      const c = colors[i % colors.length];
                      return (
                        <div key={kw.word} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', minWidth: '90px' }}>{kw.word}</span>
                          <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 'var(--radius-full)', transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', minWidth: '28px', textAlign: 'right' }}>{kw.count}×</span>
                        </div>
                      );
                    })}
                  </div>
                  {data.bigrams.length > 0 && (
                    <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
                      <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px' }}>Top 2-Word Phrases</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {data.bigrams.map((b) => (
                          <span key={b.phrase} style={{
                            fontSize: '0.72rem', padding: '2px 9px', borderRadius: 'var(--radius-full)',
                            background: 'rgba(14,165,233,0.1)', color: '#38bdf8',
                            border: '1px solid rgba(14,165,233,0.25)', fontWeight: 600
                          }}>
                            "{b.phrase}" ×{b.count}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                  <SectionHeader icon={Calendar} title="Extracted Timeline" color="#8b5cf6" badge="Regex Engine" />
                  {data.timeline.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-dim)' }}>
                      <Calendar size={28} style={{ margin: '0 auto 8px', opacity: 0.2 }} />
                      <p style={{ fontSize: '0.8rem' }}>No explicit date or deadline mentions detected.</p>
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '280px', overflowY: 'auto' }}>
                    {data.timeline.map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: '26px', height: '26px', borderRadius: '50%',
                            background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.62rem', fontWeight: 700, color: '#a78bfa'
                          }}>{i + 1}</div>
                          {i < data.timeline.length - 1 && (
                            <div style={{ width: '1px', flex: 1, background: 'var(--border-subtle)', marginTop: '4px', minHeight: '14px' }} />
                          )}
                        </div>
                        <div style={{ paddingTop: '3px', paddingBottom: i < data.timeline.length - 1 ? '8px' : 0 }}>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#a78bfa', marginBottom: '3px' }}>
                            "{t.mention}"
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                            ...{t.context}...
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Citation Health Banner ─────────────────────────── */}
              <div className="glass-panel" style={{
                padding: '16px 22px',
                borderLeft: `4px solid ${data.citation_health > 80 ? '#10b981' : data.citation_health > 50 ? '#f59e0b' : '#f43f5e'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <ShieldCheck size={18} color={data.citation_health > 80 ? '#10b981' : data.citation_health > 50 ? '#f59e0b' : '#f43f5e'} />
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#f1f5f9' }}>
                        Transcript Structural Health: {data.citation_health}%
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {data.citation_health > 80
                          ? 'Excellent — transcript is well-formatted and highly parseable for extraction.'
                          : data.citation_health > 50
                          ? 'Moderate — some lines are missing speaker attribution, which may reduce extraction accuracy.'
                          : 'Low — many lines lack "Speaker: text" format. Extraction quality may be impacted.'}
                      </div>
                    </div>
                  </div>
                  <div style={{ fontSize: '2.2rem', fontWeight: 900, color: data.citation_health > 80 ? '#10b981' : data.citation_health > 50 ? '#f59e0b' : '#f43f5e' }}>
                    {data.citation_health > 80 ? 'A+' : data.citation_health > 60 ? 'B' : 'C'}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
