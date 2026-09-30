import React, { useMemo, useState } from 'react';
import { marked } from 'marked';
import { Check, Copy, Sparkles, Smile, Frown, Meh, BarChart2, Eye, LayoutList } from 'lucide-react';

// Configure marked with soft line breaks and GitHub flavored markdown
marked.setOptions({
  breaks: true,
  gfm: true,
});

/**
 * Normalizes unformatted or run-on LLM text (especially inline bullet points
 * like ": - **Speaker**:" or ") - **Speaker**:") into well-formed Markdown.
 */
function normalizeMarkdown(text) {
  if (!text || typeof text !== 'string') return '';
  let str = text;

  // 1. Separate inline bullet dashes after colons, periods, or commas
  str = str.replace(/([:.)!?,])\s+-\s+(?=\*\*|[A-Za-z0-9])/g, '$1\n\n- ');

  // 2. Separate inline bullets after closing parentheses: ") - **" -> ")\n- **"
  str = str.replace(/(\))\s+-\s+(?=\*\*|[A-Za-z0-9])/g, '$1\n- ');

  // 3. Separate inline bullet items like "some text - **Speaker**:"
  str = str.replace(/([a-zA-Z0-9_\.]\s+)-\s+(?=\*\*[A-Z])/g, '$1\n- ');

  // 4. Separate inline numbered lists like ". 1. " or ": 1. "
  str = str.replace(/([:.)])\s+(\d+\.)\s+(?=[A-Za-z0-9*])/g, '$1\n\n$2 ');

  return str;
}

/**
 * Extract speaker sentiment stats if present in text for high-level cards
 */
function extractSpeakerStats(text) {
  if (!text) return null;

  // Look for overall compound score
  const overallMatch = text.match(/overall.*?(POSITIVE|NEGATIVE|NEUTRAL).*?compound\s*(?:score)?\s*(?:of)?\s*([+-]?\d+(?:\.\d+)?)/i);
  const overallSentiment = overallMatch ? overallMatch[1].toUpperCase() : null;
  const overallScore = overallMatch ? parseFloat(overallMatch[2]) : null;

  // Look for speaker lines: - **Name**: Tone is POSITIVE (compound = +0.963, pos=0.10, neu=0.90, neg=0.00 across 5 utterances)
  const speakerRegex = /(?:^|\n)\s*-\s*\*\*([^*]+)\*\*:\s*(?:Tone is\s*)?\*?\*?(POSITIVE|NEGATIVE|NEUTRAL)\*?\*?\s*(?:\(([^)]+)\))?/gi;
  const speakers = [];
  let match;

  while ((match = speakerRegex.exec(text)) !== null) {
    const name = match[1].trim();
    const tone = match[2].toUpperCase();
    const detailsStr = match[3] || '';

    // parse compound score
    const compMatch = detailsStr.match(/compound\s*=\s*([+-]?\d+(?:\.\d+)?)/i);
    const compound = compMatch ? parseFloat(compMatch[1]) : 0;

    // parse utterances
    const uttMatch = detailsStr.match(/(\d+)\s*utterance/i);
    const utterances = uttMatch ? parseInt(uttMatch[1], 10) : 1;

    // parse pos, neu, neg
    const posMatch = detailsStr.match(/pos\s*=\s*([0-9.]+)/i);
    const neuMatch = detailsStr.match(/neu\s*=\s*([0-9.]+)/i);
    const negMatch = detailsStr.match(/neg\s*=\s*([0-9.]+)/i);

    speakers.push({
      name,
      tone,
      compound,
      utterances,
      pos: posMatch ? parseFloat(posMatch[1]) : 0,
      neu: neuMatch ? parseFloat(neuMatch[1]) : 0,
      neg: negMatch ? parseFloat(negMatch[1]) : 0,
    });
  }

  if (speakers.length > 0) {
    return {
      overallSentiment,
      overallScore,
      speakers,
    };
  }

  return null;
}

export default function MarkdownAnswer({ content, showCopy = true, className = '' }) {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState('formatted'); // 'formatted' | 'structured'

  // Extract structured speaker data if this is a sentiment analysis report
  const sentimentStats = useMemo(() => extractSpeakerStats(content), [content]);

  // Generate cleaned & parsed HTML
  const parsedHtml = useMemo(() => {
    if (!content) return '';
    const normalized = normalizeMarkdown(content);
    let html = marked.parse(normalized);

    // Style sentiment markers
    html = html.replace(
      /<strong>POSITIVE<\/strong>/g,
      '<span class="sentiment-pill positive"><span class="sentiment-dot"></span>POSITIVE</span>'
    );
    html = html.replace(
      /<strong>NEGATIVE<\/strong>/g,
      '<span class="sentiment-pill negative"><span class="sentiment-dot"></span>NEGATIVE</span>'
    );
    html = html.replace(
      /<strong>NEUTRAL<\/strong>/g,
      '<span class="sentiment-pill neutral"><span class="sentiment-dot"></span>NEUTRAL</span>'
    );

    // Only style speaker list items as speaker cards if it actually contains sentiment tone info
    html = html.replace(
      /<li>\s*(?:<p>)?\s*<strong>([^*<]+)<\/strong>:\s*(Tone is\s*<span class="sentiment-pill.*?)(?:<\/p>)?\s*<\/li>/g,
      '<li class="speaker-sentiment-li"><div class="speaker-li-content"><strong class="speaker-name">$1</strong><div class="speaker-desc">$2</div></div></li>'
    );

    // For standard bold-label list items (like "• Meeting 2: description"), ensure natural inline flow
    html = html.replace(
      /<li>\s*(?:<p>)?\s*<strong>([^*<]+)<\/strong>:\s*(.*?)(?:<\/p>)?\s*<\/li>/g,
      '<li class="formatted-bullet-li"><strong class="bullet-label">$1:</strong> <span class="bullet-text">$2</span></li>'
    );

    return html;
  }, [content]);

  const handleCopy = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!content) {
    return <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No answer generated.</div>;
  }

  return (
    <div className={`markdown-answer-wrapper ${className}`} style={{ width: '100%' }}>
      {/* Top Action Bar if copy or multiple views available */}
      {(showCopy || sentimentStats) && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          paddingBottom: '8px',
          borderBottom: '1px solid var(--border-subtle)',
          flexWrap: 'wrap',
          gap: '8px',
        }}>
          {sentimentStats ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                display: 'inline-flex',
                background: 'var(--bg-input)',
                padding: '2px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
              }}>
                <button
                  type="button"
                  onClick={() => setViewMode('formatted')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: viewMode === 'formatted' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'formatted' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LayoutList size={12} />
                  <span>Formatted Text</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('structured')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    background: viewMode === 'structured' ? 'var(--primary)' : 'transparent',
                    color: viewMode === 'structured' ? '#ffffff' : 'var(--text-muted)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <BarChart2 size={12} />
                  <span>Speaker Breakdown ({sentimentStats.speakers.length})</span>
                </button>
              </div>

              {sentimentStats.overallSentiment && (
                <span className={`sentiment-pill ${sentimentStats.overallSentiment.toLowerCase()}`} style={{ fontSize: '0.7rem' }}>
                  <span className="sentiment-dot"></span>
                  Overall: {sentimentStats.overallSentiment} {sentimentStats.overallScore !== null && `(${sentimentStats.overallScore > 0 ? '+' : ''}${sentimentStats.overallScore})`}
                </span>
              )}
            </div>
          ) : (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>
              Synthesized Output
            </div>
          )}

          {showCopy && (
            <button
              type="button"
              onClick={handleCopy}
              className="btn btn-secondary btn-xs"
              style={{
                fontSize: '0.72rem',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                marginLeft: 'auto',
              }}
              title="Copy answer text"
            >
              {copied ? <Check size={12} color="var(--emerald)" /> : <Copy size={12} />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>
          )}
        </div>
      )}

      {/* Render View: Structured Speaker Cards */}
      {viewMode === 'structured' && sentimentStats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sentimentStats.overallSentiment && (
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}>
              <div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 700 }}>Meeting Average Sentiment</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                  <span className={`sentiment-pill ${sentimentStats.overallSentiment.toLowerCase()}`}>
                    <span className="sentiment-dot"></span>
                    {sentimentStats.overallSentiment}
                  </span>
                  {sentimentStats.overallScore !== null && (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      Score: {sentimentStats.overallScore > 0 ? '+' : ''}{sentimentStats.overallScore}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                {sentimentStats.speakers.length} participants evaluated
              </div>
            </div>
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '10px',
            marginTop: '4px',
          }}>
            {sentimentStats.speakers.map((sp, idx) => {
              const isPos = sp.tone === 'POSITIVE';
              const isNeg = sp.tone === 'NEGATIVE';
              const toneColor = isPos ? '#10b981' : isNeg ? '#f43f5e' : '#94a3b8';
              const ToneIcon = isPos ? Smile : isNeg ? Frown : Meh;

              return (
                <div
                  key={idx}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    borderLeft: `3px solid ${toneColor}`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-main)' }}>
                      {sp.name}
                    </span>
                    <span className={`sentiment-pill ${sp.tone.toLowerCase()}`}>
                      <ToneIcon size={11} />
                      {sp.tone}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                    <span>Compound Score</span>
                    <strong style={{ fontFamily: 'var(--font-mono)', color: toneColor }}>
                      {sp.compound > 0 ? '+' : ''}{sp.compound.toFixed(3)}
                    </strong>
                  </div>

                  {/* Visual Score Bar */}
                  <div style={{ width: '100%', height: '5px', background: 'var(--bg-input)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(10, ((sp.compound + 1) / 2) * 100))}%`,
                        background: toneColor,
                        borderRadius: '3px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                    <span>pos: {sp.pos.toFixed(2)}</span>
                    <span>neu: {sp.neu.toFixed(2)}</span>
                    <span>neg: {sp.neg.toFixed(2)}</span>
                    <span style={{ marginLeft: 'auto' }}>{sp.utterances} {sp.utterances === 1 ? 'utterance' : 'utterances'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Render View: Formatted Markdown */
        <div
          className="markdown-answer-body"
          dangerouslySetInnerHTML={{ __html: parsedHtml }}
        />
      )}
    </div>
  );
}
