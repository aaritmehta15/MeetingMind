# MeetingMind Frontend 🖥️ — Modern Intelligence Workspace

[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646cff.svg)](https://vitejs.dev/)
[![Lucide Icons](https://img.shields.io/badge/Icons-Lucide-f43f5e.svg)](https://lucide.dev/)
[![CSS Tokens](https://img.shields.io/badge/Styling-Vanilla_CSS_Tokens-14b8a6.svg)](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

The frontend for **MeetingMind** is a high-performance, single-page application (SPA) engineered with **React 19** and **Vite**. Built with custom vanilla CSS tokens and glassmorphism styling, it provides an interactive command center for meeting transcription, intelligence extraction, citation audits, hierarchical vector retrieval, and autonomous multi-tool agent interaction.

---

## 🎨 Design Philosophy & UX Architecture

1. **Curated Glassmorphism Aesthetics**:
   - Modern semi-transparent glass panels (`backdrop-filter: blur(16px)`).
   - High-contrast typography with Inter and JetBrains Mono monospace code styling.
   - Dual theme system (Dark/Light mode) persisted in `localStorage`.
2. **Deterministic Trust & Transparency**:
   - Visual badges denote **Citation-Verified** items (`ShieldCheck`) vs ungrounded claims.
   - Direct quote spotlighting (`Spotlight in Dialogue`) scrolls and highlights exact transcript turns.
   - Live step-by-step reasoning visibility in the autonomous ReAct agent chat.
3. **Low-Latency & Zero-Bloat**:
   - Zero heavyweight UI component libraries (no bulky Tailwind or Bootstrap overhead).
   - Clean CSS variables (`--bg-surface`, `--primary`, `--border-subtle`) for instant re-theming.

---

## 🏗️ Workspace Modules & Components

The application is structured into modular, focused components under `src/components/`:

```
frontend/src/
├── App.jsx                     # Root workspace layout, active tabs & top-level routing
├── main.jsx                    # Application entrypoint & DOM mounting
├── index.css                   # Global design tokens, animations & glassmorphism utilities
├── context/
│   ├── AuthContext.jsx         # JWT session management, login/register & authFetch wrapper
│   └── ThemeContext.jsx        # Dark/Light theme state & attribute toggling
└── components/
    ├── Header.jsx              # System status, provider selector (Groq/Gemini), theme toggle
    ├── Navigation.jsx          # Tab navigation (Studio, Intelligence Hub, Global Tasks)
    ├── ExtractionStudio.jsx    # Unified transcript viewer, audio recorder & deliverable generator
    ├── QueryHub.jsx            # Tabbed switchboard for deep analytical tools
    ├── MeetingAnalytics.jsx    # VADER sentiment, talk-time share, keyword & timeline cards
    ├── AgentChat.jsx           # Autonomous ReAct agent interface with tool trace drawer
    ├── RagExplorer.jsx         # Single-meeting Hierarchical RAG vector search & parent expansion
    ├── CorpusStudio.jsx        # Multi-meeting global knowledge corpus search & Q&A
    ├── GlobalTasks.jsx         # Cross-meeting task manager with Google Calendar export
    ├── FeatureGuideModal.jsx   # Interactive modal explaining system architecture & algorithms
    └── MarkdownAnswer.jsx      # Markdown renderer for structured AI deliverables
```

---

## 🎙️ Speech & Audio Recording Pipeline

The `ExtractionStudio` component features a complete browser-native audio ingestion workflow:

1. **Live Microphone Recording (`navigator.mediaDevices.getUserMedia`)**:
   - Stream audio via browser `MediaRecorder` API with 250ms chunk buffering.
   - Visual live recording timer with animated pulsing indicator (`REC 00:15`).
   - One-click **"Transcribe"** sends binary blob to `/api/meetings/audio`.
2. **Audio File Upload**:
   - Dedicated file selector supporting `.mp3`, `.wav`, `.m4a`, `.webm`, `.ogg`, `.flac`, `.aac`.
3. **Real-time Status Feedback**:
   - Animated soundwave progress bar during Whisper speech-to-text processing.
   - Automatic refresh of user meetings library and immediate selection of transcribed transcript.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18.x or higher
- npm 9.x or higher

### Development Server
```bash
# Install dependencies
npm install

# Run Vite dev server with Hot Module Replacement (HMR)
npm run dev
```
The application will be accessible at **`http://localhost:5173/`**.

### Production Build
```bash
# Compile and optimize production bundle
npm run build

# Preview the production build locally
npm run preview
```

---

## 🔒 Security & Client-Side Architecture

- **Automatic Authorization**: `authFetch` automatically attaches the active Bearer JWT token to all requests while seamlessly supporting `multipart/form-data` uploads.
- **Session Resilience**: Automatically detects `401 Unauthorized` responses and cleanly routes to the login screen without state desynchronization.
- **Zero Hallucination UI Guard**: Extraction cards visually distinguish verified claims from rejected ungrounded assertions.
