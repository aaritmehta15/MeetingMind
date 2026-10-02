import React, { useState, useEffect } from 'react';
import {
  X, Sparkles, BarChart2, Brain, Search, Layers, CheckSquare,
  ShieldCheck, Cpu, Zap, HelpCircle, CheckCircle2, ChevronRight, ExternalLink
} from 'lucide-react';

export const GUIDE_FEATURES = {
  studio: {
    id: 'studio',
    title: 'Extraction Studio',
    subtitle: 'Structured Extraction & Citation Guard',
    icon: Sparkles,
    color: '#14b8a6',
    badge: 'Pydantic v2 + Exact Quote Verification',
    summary: 'Transforms raw, unstructured meeting transcripts into structured, verifiable deliverables with zero hallucinations.',
    sections: [
      {
        heading: 'What It Does',
        content: 'Accepts raw text transcripts, live microphone recordings, or uploaded audio files (.mp3, .wav, .m4a, .webm). Audio is transcribed via Whisper AI into speaker-labeled turns, then extracts an executive TL;DR summary, discrete action items with assigned owners and deadlines, formal decisions, and ready-to-send follow-up emails.'
      },
      {
        heading: 'Under the Hood (Technology)',
        content: 'Runs Whisper AI for speech-to-text transcription, followed by Pydantic v2 schema-enforced JSON extraction. Every action item and decision requires an evidence_quote. The Verbatim Citation Guard checks that quote against the raw transcript. If the quote is fabricated or ungrounded, it is immediately rejected with an audit report.'
      },
      {
        heading: 'When to Use',
        content: 'Immediately after any team sync, client call, or roadmap review when you need clean, verified deliverables to share with your team or export into your task board.'
      },
      {
        heading: 'Pro Tip',
        content: 'Click the "Spotlight in Dialogue" button on any action item or decision card to highlight the exact speaker turn in the transcript.'
      }
    ]
  },
  analytics: {
    id: 'analytics',
    title: 'Meeting Intelligence',
    subtitle: 'Zero-Cost Local NLP Analytics',
    icon: BarChart2,
    color: '#0ea5e9',
    badge: '100% Local CPU · Zero API Latency (<50ms)',
    summary: 'Instant statistical breakdown of speaker dynamics, emotional sentiment, timeline milestones, and top discussed topics.',
    sections: [
      {
        heading: 'What It Does',
        content: 'Provides an instant bird’s-eye analytical dashboard of meeting dynamics without spending a single API token or waiting for external LLMs.'
      },
      {
        heading: 'Under the Hood (Technology)',
        content: 'Uses rule-based VADER sentiment intensity analysis per speaker, regex-based temporal pattern matching for deadlines and dates, word tokenization for talk-time share, and Counter statistical Bigrams for top keywords.'
      },
      {
        heading: 'When to Use',
        content: 'When you need to understand meeting tone, check which participant dominated the conversation, or review upcoming dates in under 50 milliseconds.'
      },
      {
        heading: 'Pro Tip',
        content: 'Notice the Talk Share % in the speaker distribution chart to identify silent participants or uneven collaboration.'
      }
    ]
  },
  agent: {
    id: 'agent',
    title: 'Autonomous ReAct Agent',
    subtitle: 'Multi-Step Reasoning & Acting Engine',
    icon: Brain,
    color: '#f59e0b',
    badge: '7 Local Tools · Chain of Thought',
    summary: 'An autonomous agent that inspects transcripts, invokes local tools, observes findings, and synthesizes grounded answers.',
    sections: [
      {
        heading: 'What It Does',
        content: 'Answers complex or multi-part questions by formulating internal thoughts, selecting and executing appropriate tools, inspecting observations, and iterating until it has a proven final answer.'
      },
      {
        heading: 'Under the Hood (Technology)',
        content: 'Implements the ReAct (Reasoning and Acting) loop. Equipped with 7 instant tools: Hierarchical FAISS Search, VADER Sentiment Analyzer, Speaker Participation Stats, Timeline Extractor, Keyword Frequency, Safe Python AST Calculator, and Verbatim Citation Checker.'
      },
      {
        heading: 'When to Use',
        content: 'For questions involving numbers or calculations ("What percentage of budget remains?"), timeline queries, sentiment audits, or deep investigative questions.'
      },
      {
        heading: 'Pro Tip',
        content: 'Expand the "Execution Trace" accordion on the right to audit the agent’s exact thoughts and the raw data returned by each tool.'
      }
    ]
  },
  rag: {
    id: 'rag',
    title: 'Hierarchical RAG Explorer',
    subtitle: 'Parent-Child Conversational Search',
    icon: Search,
    color: '#06b6d4',
    badge: 'Dense FAISS IndexFlatIP · Cosine Similarity',
    summary: 'Demonstrates conversational retrieval by matching precise sentence-level child utterances and expanding them into 5-turn parent windows.',
    sections: [
      {
        heading: 'What It Does',
        content: 'Solves context loss in conversational transcripts. Flat document chunking fails in meetings because short phrases like "I will handle that" lack meaning without who spoke before and after.'
      },
      {
        heading: 'Under the Hood (Technology)',
        content: 'Embeds child turns via sentence-transformers/all-MiniLM-L6-v2 (384 dimensions) into a FAISS IndexFlatIP index. Once a high-cosine child match is retrieved, it automatically expands to a 5-turn parent conversational context.'
      },
      {
        heading: 'When to Use',
        content: 'When searching for specific commitments, technical discussions, or agreements within a lengthy meeting transcript.'
      },
      {
        heading: 'Pro Tip',
        content: 'Adjust the top-k slider to retrieve more or fewer surrounding context windows.'
      }
    ]
  },
  corpus: {
    id: 'corpus',
    title: 'Cross-Meeting Knowledge Corpus',
    subtitle: 'Multi-Document Historical Intelligence',
    icon: Layers,
    color: '#10b981',
    badge: 'Cross-Transcript Synthesis & Multi-Meeting RAG',
    summary: 'Answers high-level questions that span across weeks or months of different meetings, citing exact source meetings.',
    sections: [
      {
        heading: 'What It Does',
        content: 'Indexes multiple meeting transcripts into a unified knowledge repository. When asked a broad question, it retrieves relevant passages from different meetings and synthesizes a cited answer.'
      },
      {
        heading: 'Under the Hood (Technology)',
        content: 'Extracts 5-turn parent context chunks from all selected meetings and indexes them in an in-memory cached FAISS vector database. Includes source attribution tags for every cited excerpt.'
      },
      {
        heading: 'When to Use',
        content: 'When querying historical decisions, cross-team alignment, or multi-week roadmaps (e.g. "What was decided about CI/CD across all Q3 syncs?").'
      },
      {
        heading: 'Pro Tip',
        content: 'Use the meeting selection checkboxes to include or exclude specific transcripts from the knowledge query.'
      }
    ]
  },
  tasks: {
    id: 'tasks',
    title: 'Action Items (Global Checklist)',
    subtitle: 'Persistent Deliverables Management',
    icon: CheckSquare,
    color: '#8b5cf6',
    badge: 'Persistent SQLite + Real-Time Sync',
    summary: 'A centralized workspace for tracking, updating, and completing all action items across all meetings.',
    sections: [
      {
        heading: 'What It Does',
        content: 'Aggregates all action items generated by the Extraction Studio into a single personal task list with deadlines and completion checkboxes.'
      },
      {
        heading: 'Under the Hood (Technology)',
        content: 'Persisted in SQLite database models with user authentication isolation. Supports adding custom tasks, toggling completion status, and real-time completion rate tracking.'
      },
      {
        heading: 'When to Use',
        content: 'For your daily workflow, tracking commitments you made in meetings, and checking off completed deliverables.'
      },
      {
        heading: 'Pro Tip',
        content: 'Filter between "Active" and "Done" tasks to stay focused on high-priority deadlines.'
      }
    ]
  }
};

export default function FeatureGuideModal({ isOpen, onClose, initialFeature = 'studio' }) {
  const [selectedFeature, setSelectedFeature] = useState(initialFeature);

  useEffect(() => {
    if (initialFeature && GUIDE_FEATURES[initialFeature]) {
      setSelectedFeature(initialFeature);
    }
  }, [initialFeature]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const activeData = GUIDE_FEATURES[selectedFeature] || GUIDE_FEATURES.studio;
  const FeatureIcon = activeData.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(5, 10, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '880px',
          maxHeight: '90vh',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-medium)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-card), 0 20px 40px rgba(0,0,0,0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.2s ease'
        }}
      >
        {/* Modal Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
            <div style={{
              width: '30px', height: '30px', borderRadius: '8px',
              background: 'rgba(20, 184, 166, 0.12)', border: '1px solid rgba(20, 184, 166, 0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <HelpCircle size={16} color="var(--primary)" />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                MeetingMind Architecture &amp; Feature Guide
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                Learn what each feature does, how it works under the hood, and how to use it.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn btn-secondary btn-xs"
            style={{ borderRadius: '50%', width: '28px', height: '28px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Close guide (Esc)"
          >
            <X size={15} />
          </button>
        </div>

        {/* Feature Navigation Tabs */}
        <div style={{
          display: 'flex',
          gap: '6px',
          padding: '10px 20px',
          background: 'var(--bg-input)',
          borderBottom: '1px solid var(--border-subtle)',
          overflowX: 'auto',
          flexShrink: 0
        }}>
          {Object.values(GUIDE_FEATURES).map((f) => {
            const Icon = f.icon;
            const isSelected = selectedFeature === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setSelectedFeature(f.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  border: `1px solid ${isSelected ? f.color + '60' : 'transparent'}`,
                  background: isSelected ? `${f.color}15` : 'transparent',
                  color: isSelected ? f.color : 'var(--text-muted)',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit'
                }}
              >
                <Icon size={13} color={isSelected ? f.color : 'var(--text-dim)'} />
                <span>{f.title}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: '24px 28px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Feature Header Card */}
          <div style={{
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            background: `${activeData.color}0a`,
            border: `1.5px solid ${activeData.color}30`,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px'
          }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: `${activeData.color}20`, border: `1.5px solid ${activeData.color}50`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <FeatureIcon size={22} color={activeData.color} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
                  {activeData.title}
                </h4>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '12px',
                  background: `${activeData.color}18`, color: activeData.color, border: `1px solid ${activeData.color}35`
                }}>
                  {activeData.badge}
                </span>
              </div>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
                {activeData.summary}
              </p>
            </div>
          </div>

          {/* Section Breakdown Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '14px' }}>
            {activeData.sections.map((sec, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--bg-input)',
                  padding: '16px 18px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 800, color: activeData.color, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {sec.heading}
                </div>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-main)', lineHeight: 1.6, margin: 0 }}>
                  {sec.content}
                </p>
              </div>
            ))}
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '12px 24px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-surface)'
        }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Tip: Press <kbd style={{ padding: '1px 5px', background: 'var(--bg-input)', border: '1px solid var(--border-medium)', borderRadius: '4px', fontSize: '0.7rem' }}>Esc</kbd> anytime to close this guide.
          </span>
          <button
            onClick={onClose}
            className="btn btn-primary btn-sm"
            style={{ padding: '6px 16px' }}
          >
            <span>Got it</span>
          </button>
        </div>

      </div>
    </div>
  );
}
