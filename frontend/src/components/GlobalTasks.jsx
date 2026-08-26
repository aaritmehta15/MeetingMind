import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Trash2, Plus, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GlobalTasks() {
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newDeadline, setNewDeadline] = useState('');

  const fetchTasks = async () => {
    try {
      const res = await authFetch('/api/tasks');
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (err) {
      console.error('Failed to fetch tasks', err);
    }
  };

  useEffect(() => {
    fetchTasks();
    const handleTaskUpdate = () => fetchTasks();
    window.addEventListener('tasks-updated', handleTaskUpdate);
    return () => window.removeEventListener('tasks-updated', handleTaskUpdate);
  }, []);

  const addTask = async () => {
    if (!newTask.trim()) return;
    try {
      const res = await authFetch('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({ description: newTask, deadline: newDeadline || null })
      });
      if (res.ok) {
        setNewTask('');
        setNewDeadline('');
        fetchTasks();
      }
    } catch (err) {
      console.error('Failed to add task', err);
    }
  };

  const toggleTask = async (task) => {
    try {
      const res = await authFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        body: JSON.stringify({ done: task.done ? 0 : 1 })
      });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error('Failed to toggle task', err);
    }
  };

  const deleteTask = async (id) => {
    try {
      const res = await authFetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTasks();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: 'calc(100vh - 150px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--text-main)', letterSpacing: '0.05em' }}>
          Global Action Items
        </h3>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          {tasks.filter(t => !t.done).length} active tasks
        </span>
      </div>
      
      {/* Add Task Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-panel)', padding: '20px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-medium)' }}>
        <input 
          className="input-field" 
          placeholder="What needs to be done? (e.g. Schedule follow-up meeting with client)" 
          value={newTask} 
          onChange={e => setNewTask(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && addTask()}
          style={{ fontSize: '1rem', padding: '12px' }}
        />
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            className="input-field" 
            placeholder="Deadline (optional, e.g. Friday 5PM)" 
            value={newDeadline} 
            onChange={e => setNewDeadline(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && addTask()}
            style={{ flex: 1, fontSize: '0.9rem' }}
          />
          <button onClick={addTask} className="btn btn-primary" style={{ padding: '0 24px' }}>
            <Plus size={18} style={{ marginRight: '6px' }} /> Add Task
          </button>
        </div>
      </div>

      {/* Task List */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {tasks.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: '1rem', marginTop: '40px' }}>
            No tasks yet. Extract a meeting or add one above!
          </div>
        )}
        {tasks.map(task => (
          <div key={task.id} style={{ 
            background: 'var(--bg-panel)', border: '1px solid var(--border-subtle)', 
            borderRadius: 'var(--radius-md)', padding: '16px',
            opacity: task.done ? 0.6 : 1, transition: 'all 0.2s ease',
            display: 'flex', gap: '14px', alignItems: 'flex-start'
          }}>
            <button onClick={() => toggleTask(task)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '2px' }}>
              {task.done ? <CheckCircle2 size={20} color="#10b981" /> : <Circle size={20} color="var(--text-dim)" />}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '1rem', color: task.done ? 'var(--text-dim)' : 'var(--text-main)', textDecoration: task.done ? 'line-through' : 'none', wordBreak: 'break-word', lineHeight: 1.5 }}>
                {task.description}
              </div>
              {task.deadline && (
                <div style={{ fontSize: '0.8rem', color: '#f59e0b', marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={12} /> {task.deadline}
                </div>
              )}
            </div>
            <button onClick={() => deleteTask(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px', color: 'var(--text-muted)' }}>
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
