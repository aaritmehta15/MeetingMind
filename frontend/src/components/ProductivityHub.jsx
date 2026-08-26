import React, { useState, useCallback } from 'react';
import {
  CheckSquare, Square, Calendar, Grid, Clock, ChevronRight, ChevronDown,
  CheckCircle2, Circle, Trash2, AlertTriangle, TrendingUp, Sparkles,
  ArrowUp, ArrowRight, Target, Zap, User, Edit3, Check, Plus, X,
  BarChart2, Activity
} from 'lucide-react';

const PRIORITY_LABELS = {
  'urgent-important':     { label: 'Do Now',    color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.3)',  icon: '🔥' },
  'not-urgent-important': { label: 'Schedule',  color: '#14b8a6', bg: 'rgba(20,184,166,0.1)', border: 'rgba(20,184,166,0.3)', icon: '📅' },
  'urgent-not-important': { label: 'Delegate',  color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)', icon: '📤' },
  'not-urgent-not-important': { label: 'Eliminate', color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.3)', icon: '🗑️' },
};

// ── Helper: Sort action items into Eisenhower quadrants ──────────────────
function autoClassify(action) {
  const text = (action.description + ' ' + (action.deadline || '')).toLowerCase();
  const hasDeadline = !!action.deadline;
  const isUrgent = hasDeadline || /today|asap|urgent|now|immediately|by end|eod|eow|tomorrow/i.test(text);
  const isImportant = /decide|approve|sign|review|launch|deliver|client|budget|strategy|critical|finalise|finalize/i.test(text);
  if (isUrgent && isImportant) return 'urgent-important';
  if (!isUrgent && isImportant) return 'not-urgent-important';
  if (isUrgent && !isImportant) return 'urgent-not-important';
  return 'not-urgent-not-important';
}

export default function ProductivityHub({ result }) {
  const [activeView, setActiveView] = useState('checklist'); // 'checklist' | 'matrix' | 'timeline'

  // ── Enriched tasks: {id, description, owner, deadline, done, quadrant} ─
  const [tasks, setTasks] = useState(() =>
    (result?.action_items || []).map((a, i) => ({
      id: i,
      description: a.description,
      owner: a.owner || '',
      deadline: a.deadline || '',
      done: false,
      quadrant: autoClassify(a),
      editing: false,
      editText: a.description,
    }))
  );

  const [newTask, setNewTask] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const toggle = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id) => setTasks(ts => ts.filter(t => t.id !== id));
  const setQuadrant = (id, q) => setTasks(ts => ts.map(t => t.id === id ? { ...t, quadrant: q } : t));
  const startEdit = (id) => setTasks(ts => ts.map(t => t.id === id ? { ...t, editing: true } : t));
  const saveEdit = (id, text) => setTasks(ts => ts.map(t => t.id === id ? { ...t, editing: false, description: text } : t));

  const addTask = () => {
    if (!newTask.trim()) return;
    const pseudo = { description: newTask, deadline: newDeadline };
    setTasks(ts => [...ts, {
      id: Date.now(),
      description: newTask,
      owner: newOwner,
      deadline: newDeadline,
      done: false,
      quadrant: autoClassify(pseudo),
      editing: false,
      editText: newTask,
    }]);
    setNewTask(''); setNewOwner(''); setNewDeadline('');
  };

  const done  = tasks.filter(t => t.done).length;
  const total = tasks.length;
  const pct   = total === 0 ? 0 : Math.round((done / total) * 100);

  const quadrantOrder = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];

  return (
    <div className="slide-in" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

      {/* ── Header Strip with Progress ─────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>
              Action Item Progress
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: pct === 100 ? '#10b981' : '#14b8a6' }}>{pct}%</span>
              <span style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>{done} of {total} tasks completed</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div style={{ flex: 1, minWidth: '160px', maxWidth: '260px' }}>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.07)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${pct}%`,
                background: pct === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #0d9488, #14b8a6)',
                borderRadius: 'var(--radius-full)',
                transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)'
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
              <span>{tasks.filter(t => t.quadrant === 'urgent-important' && !t.done).length} critical pending</span>
              <span>{tasks.filter(t => !t.done).length} remaining</span>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div style={{ display: 'flex', background: 'rgba(0,0,0,0.35)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-subtle)', gap: '3px' }}>
            {[
              { id: 'checklist', icon: CheckSquare, label: 'Checklist' },
              { id: 'matrix',    icon: Grid,        label: 'Priority Matrix' },
              { id: 'timeline',  icon: Calendar,    label: 'Timeline' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`btn btn-xs ${activeView === id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ gap: '5px' }}
              >
                <Icon size={11} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── ADD NEW TASK ──────────────────────────────────────────────── */}
      <div className="glass-panel" style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="input-field"
            style={{ flex: '1 1 200px', padding: '8px 12px', fontSize: '0.84rem' }}
            placeholder="+ Add new action item..."
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <input
            className="input-field"
            style={{ width: '120px', padding: '8px 12px', fontSize: '0.84rem' }}
            placeholder="Owner"
            value={newOwner}
            onChange={e => setNewOwner(e.target.value)}
          />
          <input
            type="text"
            className="input-field"
            style={{ width: '120px', padding: '8px 12px', fontSize: '0.84rem' }}
            placeholder="Deadline"
            value={newDeadline}
            onChange={e => setNewDeadline(e.target.value)}
          />
          <button onClick={addTask} disabled={!newTask.trim()} className="btn btn-cta btn-sm" style={{ gap: '5px' }}>
            <Plus size={14} /> Add Task
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  VIEW 1: INTERACTIVE CHECKLIST                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeView === 'checklist' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tasks.length === 0 && (
            <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-dim)' }}>
              <CheckSquare size={32} style={{ margin: '0 auto 10px', opacity: 0.25 }} />
              <p style={{ fontSize: '0.88rem' }}>No action items yet. Run extraction above or add tasks manually.</p>
            </div>
          )}
          {tasks.map(task => {
            const q = PRIORITY_LABELS[task.quadrant];
            return (
              <div
                key={task.id}
                className="glass-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  borderLeft: `3px solid ${task.done ? 'rgba(100,116,139,0.4)' : q.color}`,
                  opacity: task.done ? 0.55 : 1,
                  transition: 'opacity 0.3s ease'
                }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggle(task.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px', flexShrink: 0, color: task.done ? '#10b981' : 'var(--text-dim)' }}
                >
                  {task.done ? <CheckCircle2 size={18} color="#10b981" /> : <Circle size={18} />}
                </button>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {task.editing ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        className="input-field"
                        style={{ fontSize: '0.88rem', padding: '4px 8px' }}
                        defaultValue={task.description}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(task.id, e.target.value)}
                        onBlur={e => saveEdit(task.id, e.target.value)}
                        autoFocus
                      />
                    </div>
                  ) : (
                    <p style={{
                      fontSize: '0.9rem',
                      fontWeight: 500,
                      color: task.done ? 'var(--text-dim)' : 'var(--text-main)',
                      textDecoration: task.done ? 'line-through' : 'none',
                      lineHeight: 1.4
                    }}>
                      {task.description}
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: '10px', marginTop: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {task.owner && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <User size={11} /> {task.owner}
                      </span>
                    )}
                    {task.deadline && (
                      <span style={{ fontSize: '0.72rem', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Clock size={11} /> {task.deadline}
                      </span>
                    )}
                    {/* Priority quadrant chip */}
                    <span style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      padding: '1px 7px',
                      borderRadius: 'var(--radius-full)',
                      background: q.bg,
                      color: q.color,
                      border: `1px solid ${q.border}`,
                      cursor: 'default'
                    }}>
                      {q.icon} {q.label}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  {/* Quick quadrant re-assign */}
                  <select
                    value={task.quadrant}
                    onChange={e => setQuadrant(task.id, e.target.value)}
                    style={{
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      fontSize: '0.68rem',
                      padding: '2px 4px',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="urgent-important">🔥 Do Now</option>
                    <option value="not-urgent-important">📅 Schedule</option>
                    <option value="urgent-not-important">📤 Delegate</option>
                    <option value="not-urgent-not-important">🗑️ Eliminate</option>
                  </select>
                  <button onClick={() => startEdit(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px 4px' }}>
                    <Edit3 size={13} />
                  </button>
                  <button onClick={() => remove(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', padding: '2px 4px' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  VIEW 2: EISENHOWER PRIORITY MATRIX (4 Quadrants)              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeView === 'matrix' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Axis Labels */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            <span>← Less Urgent</span>
            <span style={{ padding: '2px 10px', background: 'rgba(20,184,166,0.08)', borderRadius: 'var(--radius-full)', color: '#2dd4bf', fontWeight: 700 }}>
              URGENT / IMPORTANT
            </span>
            <span>More Urgent →</span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto auto',
            gap: '12px'
          }}>
            {quadrantOrder.map(qKey => {
              const q = PRIORITY_LABELS[qKey];
              const qTasks = tasks.filter(t => t.quadrant === qKey);
              return (
                <div
                  key={qKey}
                  className="glass-panel"
                  style={{ padding: '16px', borderTop: `3px solid ${q.color}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '1rem' }}>{q.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 800, color: q.color }}>{q.label}</span>
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: '0.68rem',
                      padding: '1px 7px',
                      borderRadius: 'var(--radius-full)',
                      background: q.bg,
                      color: q.color,
                      border: `1px solid ${q.border}`,
                      fontWeight: 700
                    }}>
                      {qTasks.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    {qTasks.length === 0 && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No tasks in this quadrant</p>
                    )}
                    {qTasks.map(task => (
                      <div
                        key={task.id}
                        style={{
                          background: task.done ? 'rgba(255,255,255,0.02)' : q.bg,
                          border: `1px solid ${task.done ? 'var(--border-subtle)' : q.border}`,
                          borderRadius: 'var(--radius-sm)',
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '8px',
                          opacity: task.done ? 0.5 : 1
                        }}
                      >
                        <button
                          onClick={() => toggle(task.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '1px', color: task.done ? '#10b981' : q.color }}
                        >
                          {task.done ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '0.8rem', fontWeight: 500, color: task.done ? 'var(--text-dim)' : 'var(--text-main)', lineHeight: 1.35, textDecoration: task.done ? 'line-through' : 'none' }}>
                            {task.description}
                          </p>
                          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                            {task.owner && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>👤 {task.owner}</span>}
                            {task.deadline && <span style={{ fontSize: '0.68rem', color: '#f59e0b' }}>🗓 {task.deadline}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Matrix Legend */}
          <div className="glass-panel" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: '0.73rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
              Eisenhower Matrix — How auto-classification works
            </div>
            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              <span>🔥 <strong>Do Now</strong>: Has deadline + action keywords like "approve", "deliver"</span>
              <span>📅 <strong>Schedule</strong>: Strategic importance, no urgent deadline</span>
              <span>📤 <strong>Delegate</strong>: Urgent but not your core priority</span>
              <span>🗑️ <strong>Eliminate</strong>: Low urgency + low strategic weight</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/*  VIEW 3: VISUAL DEADLINE TIMELINE                              */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeView === 'timeline' && (
        <div className="glass-panel" style={{ padding: '22px' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="#14b8a6" />
            <span>Deadline Timeline — Action Item Schedule</span>
          </div>

          {/* Tasks without deadlines first */}
          {tasks.filter(t => !t.deadline).length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>
                No Deadline Set
              </div>
              {tasks.filter(t => !t.deadline).map(task => {
                const q = PRIORITY_LABELS[task.quadrant];
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid var(--border-subtle)', opacity: task.done ? 0.5 : 1 }}>
                    <button onClick={() => toggle(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: task.done ? '#10b981' : 'var(--text-dim)' }}>
                      {task.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                    </button>
                    <p style={{ flex: 1, fontSize: '0.84rem', color: task.done ? 'var(--text-dim)' : 'var(--text-main)', textDecoration: task.done ? 'line-through' : 'none' }}>
                      {task.description}
                    </p>
                    <span style={{ fontSize: '0.68rem', padding: '1px 7px', borderRadius: 'var(--radius-full)', background: q.bg, color: q.color, border: `1px solid ${q.border}` }}>
                      {q.icon} {q.label}
                    </span>
                    {task.owner && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>👤 {task.owner}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {/* Tasks with deadlines as visual timeline */}
          {(() => {
            const withDeadline = tasks.filter(t => t.deadline);
            if (withDeadline.length === 0) {
              return (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: '24px' }}>
                  <Calendar size={32} style={{ margin: '0 auto 8px', opacity: 0.2 }} />
                  <p style={{ fontSize: '0.84rem' }}>No tasks have explicit deadlines extracted yet.</p>
                  <p style={{ fontSize: '0.74rem', marginTop: '4px', opacity: 0.7 }}>Add deadlines manually using the fields above, or run extraction on a transcript with explicit deadline mentions.</p>
                </div>
              );
            }

            return withDeadline.map((task, i) => {
              const q = PRIORITY_LABELS[task.quadrant];
              const isLast = i === withDeadline.length - 1;
              return (
                <div key={task.id} style={{ display: 'flex', gap: '14px', paddingBottom: isLast ? 0 : '14px', position: 'relative' }}>
                  {/* Timeline dot and line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: task.done ? 'rgba(16,185,129,0.15)' : q.bg,
                      border: `2px solid ${task.done ? '#10b981' : q.color}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem'
                    }}>
                      {task.done ? <Check size={14} color="#10b981" /> : q.icon}
                    </div>
                    {!isLast && <div style={{ width: '2px', flex: 1, background: 'var(--border-subtle)', marginTop: '4px' }} />}
                  </div>

                  {/* Task content */}
                  <div style={{ flex: 1, paddingTop: '2px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <p style={{
                        fontSize: '0.9rem',
                        fontWeight: 600,
                        color: task.done ? 'var(--text-dim)' : 'var(--text-main)',
                        textDecoration: task.done ? 'line-through' : 'none'
                      }}>
                        {task.description}
                      </p>
                      <div style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: q.bg,
                        color: q.color,
                        border: `1px solid ${q.border}`,
                        whiteSpace: 'nowrap'
                      }}>
                        🗓 {task.deadline}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', marginTop: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {task.owner && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>👤 {task.owner}</span>}
                      <button
                        onClick={() => toggle(task.id)}
                        className={`btn btn-xs ${task.done ? 'btn-secondary' : 'btn-emerald'}`}
                        style={{ gap: '4px', marginLeft: 'auto' }}
                      >
                        {task.done ? <><RotateCcw size={10} /> Reopen</> : <><Check size={10} /> Mark Done</>}
                      </button>
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}

// Re-import RotateCcw for timeline view
import { RotateCcw } from 'lucide-react';
