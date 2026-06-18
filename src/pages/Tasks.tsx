import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Target, Circle, CheckCircle2, PlayCircle, Plus, Edit2, Trash2, X, AlertTriangle } from 'lucide-react';
import { TaskStatus, TaskPriority, TaskCategory, Task } from '../types';
import { GenieModal } from '../components/GenieModal';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function Tasks() {
  const { tasks, addTask, updateTask, deleteTask } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TaskCategory>('personal');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [taskColor, setTaskColor] = useState<string>('#75d36e');

  const taskColors = ['#75d36e', '#3b82f6', '#c084fc', '#f43f5e', '#facc15', '#14b8a6', '#64748b'];

  const handleStatusChange = (id: string, current: TaskStatus) => {
    const nextMap: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo'
    };
    updateTask(id, { status: nextMap[current] });
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'todo': return <Circle className="w-5 h-5 text-slate-500" />;
      case 'in_progress': return <PlayCircle className="w-5 h-5 text-orange-400" />;
      case 'done': return <CheckCircle2 className="w-5 h-5 text-[#75d36e]" />;
    }
  };

  const openAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setCategory('personal');
    setPriority('medium');
    setStatus('todo');
    setDueDate(new Date().toISOString().split('T')[0]);
    setTaskColor('#75d36e');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setCategory(task.category);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date);
    setTaskColor(task.color || '#75d36e');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title,
      category,
      priority,
      status,
      due_date: dueDate,
      color: taskColor
    };

    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string, taskTitle: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć zadanie: "${taskTitle}"?`)) {
      deleteTask(id);
    }
  };

  const categories: TaskCategory[] = ['work', 'personal', 'learning', 'health', 'project'];
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];

  type ViewMode = 'today' | 'week' | 'all';
  type FilterStatus = 'all' | 'active' | 'done';
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');

  const todayStr = new Date().toISOString().split('T')[0];
  
  // Calculate end of week (assuming week ends in 7 days for simplicity, or we can use next 7 days)
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  const filteredTasks = tasks.filter(t => {
    // Status filter
    if (filterStatus === 'active' && t.status === 'done') return false;
    if (filterStatus === 'done' && t.status !== 'done') return false;

    // View mode filter
    if (viewMode === 'today') {
      return t.due_date === todayStr;
    } else if (viewMode === 'week') {
      return t.due_date >= todayStr && t.due_date <= nextWeekStr;
    }
    
    return true; // 'all'
  });

  const totalCount = filteredTasks.length;
  const completedCount = filteredTasks.filter(t => t.status === 'done').length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 min-h-[calc(100vh-8rem)] pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Zadania</h1>
          <p className="text-slate-400 mt-1">Zarządzaj swoimi priorytetami.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex justify-center items-center gap-2 bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] px-4 py-2 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Dodaj zadanie
        </button>
      </header>

      {/* Sleek Animated Glassmorphism Progress tracking card */}
      {totalCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 relative overflow-hidden z-10"
        >
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="text-white font-bold mb-1">Status realizacji zadań</h3>
              <p className="text-slate-400 text-xs">
                Ukończone: <span className="text-[#75d36e] font-semibold">{completedCount}</span> &bull; Oczekujące: <span className="text-blue-400 font-semibold">{pendingCount}</span>
              </p>
            </div>
            <div className="text-2xl font-display font-bold text-[#75d36e]">
              {Math.round(progressPercent)}%
            </div>
          </div>
          <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-[#75d36e] to-[#3b82f6] rounded-full shadow-[0_0_15px_rgba(117,211,110,0.5)]"
            />
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row justify-between gap-4 relative z-10">
        <div className="flex bg-[#161616] p-1 rounded-xl border border-[#262626] overflow-x-auto">
          <button 
            onClick={() => setViewMode('today')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${viewMode === 'today' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
          >
            Dzisiaj
          </button>
          <button 
            onClick={() => setViewMode('week')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${viewMode === 'week' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
          >
            Ten tydzień
          </button>
          <button 
            onClick={() => setViewMode('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${viewMode === 'all' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
          >
            Wszystkie
          </button>
        </div>

        <div className="flex bg-[#161616] p-1 rounded-xl border border-[#262626] overflow-x-auto">
           <button 
            onClick={() => setFilterStatus('active')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${filterStatus === 'active' ? 'bg-[#2a2a2a] text-[#75d36e] shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
          >
            Aktywne
          </button>
          <button 
            onClick={() => setFilterStatus('done')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${filterStatus === 'done' ? 'bg-[#2a2a2a] text-[#75d36e] shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
          >
            Ukończone
          </button>
          <button 
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors ${filterStatus === 'all' ? 'bg-[#2a2a2a] text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
          >
            Zarówno
          </button>
        </div>
      </div>

      <div className="glass-card p-6 relative z-10">
        <motion.div layout className="space-y-2">
          <AnimatePresence mode="popLayout">
            {filteredTasks.length === 0 ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-12 text-slate-500"
              >
                <Target className="w-12 h-12 mx-auto stroke-[1.5] opacity-40 mb-3" />
                <p>Brak zadań w wybranym widoku.</p>
              </motion.div>
            ) : (
              filteredTasks.map(task => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                  key={task.id} 
                  className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl bg-[#141414]/90 dark:bg-[#141414]/90 border border-[#222222] hover:border-[#333333] transition-colors group relative overflow-hidden"
                >
                  {task.color && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1" 
                      style={{ backgroundColor: task.color }}
                    />
                  )}
                  <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                    <button 
                      onClick={() => handleStatusChange(task.id, task.status)} 
                      className="shrink-0 hover:scale-110 transition-transform pl-1"
                      title="Zmień status"
                    >
                      {getStatusIcon(task.status)}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "truncate",
                        task.status === 'done' ? 'text-slate-500 line-through font-medium' : 'text-white font-medium'
                      )}>
                        {task.title}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 font-mono">
                        Termin: {task.due_date}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 ml-auto">
                    <div className="flex gap-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                        {task.category}
                      </span>
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                        task.priority === 'urgent' ? 'bg-red-950/40 text-red-400' :
                        task.priority === 'high' ? 'bg-orange-950/40 text-orange-400' :
                        task.priority === 'medium' ? 'bg-blue-950/40 text-blue-400' :
                        'bg-slate-800 text-slate-300'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(task)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#75d36e] hover:bg-[#75d36e]/10 transition-colors"
                        title="Edytuj"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(task.id, task.title)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Usuń"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Modal Add / Edit */}
      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTask ? 'Edytuj zadanie' : 'Nowe zadanie'}
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tytuł zadania</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              placeholder="np. Przygotować raport kwartalny"
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Kategoria</label>
              <select 
                value={category} 
                onChange={e => setCategory(e.target.value as TaskCategory)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors capitalize"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Priorytet</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors capitalize"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Status</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors capitalize"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Termin</label>
              <input 
                type="date" 
                value={dueDate} 
                onChange={e => setDueDate(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Kolor znacznika</label>
            <div className="flex gap-2 p-1 overflow-x-auto">
              {taskColors.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setTaskColor(color)}
                  className={`w-8 h-8 rounded-full flex-shrink-0 transition-transform ${taskColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Wybierz kolor ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#222222] flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#262626] text-slate-300 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm"
            >
              Anuluj
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm"
            >
              {editingTask ? 'Zapisz zmiany' : 'Dodaj zadanie'}
            </button>
          </div>
        </form>
      </GenieModal>
    </div>
  );
}

