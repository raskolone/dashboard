import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Target, Circle, CheckCircle2, PlayCircle, Plus, Edit2, Trash2, X, AlertTriangle, List, LayoutGrid, GripVertical, CheckSquare, Square, ListChecks } from 'lucide-react';
import { TaskStatus, TaskPriority, TaskCategory, Task, ChecklistItem } from '../types';
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
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newSubPriority, setNewSubPriority] = useState<TaskPriority>('medium');
  const [newSubDueDate, setNewSubDueDate] = useState('');

  const taskColors = ['#75d36e', '#3b82f6', '#c084fc', '#f43f5e', '#facc15', '#14b8a6', '#64748b'];

  const handleAddChecklistItem = () => {
    if (!newChecklistItem.trim()) return;
    setChecklist([...checklist, { 
      id: Date.now().toString(), 
      title: newChecklistItem.trim(), 
      isCompleted: false,
      priority: newSubPriority,
      dueDate: newSubDueDate || undefined
    }]);
    setNewChecklistItem('');
    setNewSubPriority('medium');
    setNewSubDueDate('');
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, isCompleted: !item.isCompleted } : item));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

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
    setDescription('');
    setChecklist([]);
    setNewChecklistItem('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setCategory(task.category);
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date);
    setDescription(task.description || '');
    setTaskColor(task.color || '#75d36e');
    setChecklist(task.checklist || []);
    setNewChecklistItem('');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title,
      description,
      category,
      priority,
      status,
      due_date: dueDate,
      color: taskColor,
      checklist
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
  type LayoutMode = 'list' | 'board';
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('board');
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setIsDragging(id);
  };

  const handleDragEnd = () => {
    setIsDragging(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId) {
      updateTask(taskId, { status: targetStatus });
    }
    setIsDragging(null);
  };

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

  const boardTasks = tasks.filter(t => {
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
      <div className="flex flex-col lg:flex-row justify-between gap-4 relative z-10">
        <div className="flex gap-4 items-center">
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
              onClick={() => setLayoutMode('list')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${layoutMode === 'list' ? 'bg-[#2D2D2D] text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
            >
              <List className="w-4 h-4 text-[#75d36e]" />
              Lista
            </button>
            <button 
              onClick={() => setLayoutMode('board')}
              className={`px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${layoutMode === 'board' ? 'bg-[#2D2D2D] text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-[#222222]'}`}
            >
              <LayoutGrid className="w-4 h-4 text-[#75d36e]" />
              Tablica (D&D)
            </button>
          </div>
        </div>

        {layoutMode === 'list' && (
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
        )}
      </div>

      {layoutMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {statuses.map(colStatus => {
            const colTasks = boardTasks.filter(t => t.status === colStatus);
            const label = colStatus === 'todo' ? 'Do zrobienia' : colStatus === 'in_progress' ? 'W toku' : 'Ukończone';
            const accentColor = colStatus === 'todo' ? 'text-blue-400' : colStatus === 'in_progress' ? 'text-orange-400' : 'text-[#75d36e]';
            
            return (
              <div 
                key={colStatus}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, colStatus)}
                className={cn(
                  "glass-card p-4 rounded-[1.5rem] flex flex-col min-h-[450px] transition-all duration-200 border border-[#222222]",
                  isDragging ? "border-dashed border-white/20 bg-white/5" : ""
                )}
              >
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-[#222222]">
                  <h3 className={cn("font-display font-semibold flex items-center gap-2 text-sm uppercase tracking-wider", accentColor)}>
                    <span className={cn("w-2 h-2 rounded-full", colStatus === 'todo' ? 'bg-blue-400' : colStatus === 'in_progress' ? 'bg-orange-400' : 'bg-[#75d36e]')} />
                    {label}
                  </h3>
                  <span className="text-xs font-mono font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-[#222222]">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-none">
                  <AnimatePresence mode="popLayout">
                    {colTasks.length === 0 ? (
                      <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-500 border border-dashed border-[#222222] rounded-xl p-4 text-center">
                        <Target className="w-6 h-6 mb-2 stroke-[1.5] opacity-20" />
                        Pusto. Przeciągnij zadanie tutaj.
                      </div>
                    ) : (
                      colTasks.map(task => (
                        <motion.div 
                          layout
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd}
                          className={cn(
                            "group p-3.5 rounded-xl bg-[#141414]/90 border border-[#222222] hover:border-[#333333] transition-all relative overflow-hidden",
                            isDragging === task.id ? "opacity-30" : "opacity-100"
                          )}
                        >
                          {task.color && (
                            <div 
                              className="absolute left-0 top-0 bottom-0 w-1" 
                              style={{ backgroundColor: task.color }}
                            />
                          )}
                          
                          <div className="flex flex-col h-full cursor-pointer" onClick={() => openEditModal(task)}>
                            <div className="flex items-start justify-between gap-2">
                              <span className={cn(
                                "text-sm font-semibold truncate block max-w-[80%]",
                                task.status === 'done' ? 'text-slate-500 line-through' : 'text-white'
                              )}>
                                {task.title}
                              </span>
                              <div className="flex shrink-0 items-center gap-1">
                                <span className="p-1 cursor-grab active:cursor-grabbing text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => {
                                  // Drag handle inside
                                  e.stopPropagation();
                                }}>
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                                <div className="hidden md:flex opacity-0 group-hover:opacity-100 items-center gap-1 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                    className="p-1 rounded text-slate-400 hover:text-[#75d36e] hover:bg-[#75d36e]/10 transition-colors"
                                    title="Szczegóły"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                                    className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title="Usuń"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                <span className="font-mono flex flex-col gap-1">
                                  <span>Do: {task.due_date}</span>
                                  {task.checklist && task.checklist.length > 0 && (
                                    <span className="flex items-center gap-1 text-[#75d36e]">
                                      <ListChecks className="w-3 h-3" />
                                      {task.checklist.filter(c => c.isCompleted).length}/{task.checklist.length}
                                    </span>
                                  )}
                                </span>
                                <span className={cn(
                                  "uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-[8px] mt-auto",
                                  task.priority === 'urgent' ? 'bg-red-950/40 text-red-400' :
                                  task.priority === 'high' ? 'bg-orange-950/40 text-orange-400' :
                                  task.priority === 'medium' ? 'bg-blue-950/40 text-blue-400' :
                                  'bg-slate-800 text-slate-300'
                                )}>
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
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
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                    key={task.id} 
                    className="flex flex-col p-4 rounded-xl bg-[#141414]/90 dark:bg-[#141414]/90 border border-[#222222] hover:border-[#333333] transition-colors group relative overflow-hidden"
                  >
                    {task.color && (
                      <div 
                        className="absolute left-0 top-0 bottom-0 w-1" 
                        style={{ backgroundColor: task.color }}
                      />
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 cursor-pointer" onClick={() => openEditModal(task)}>
                      <div className="flex items-center gap-3 w-full sm:w-auto min-w-0">
                        <div className="shrink-0 flex items-center gap-1">
                          <span className="p-1 cursor-grab active:cursor-grabbing text-slate-600 opacity-40 group-hover:opacity-100 transition-opacity" onPointerDown={(e) => {
                            e.stopPropagation();
                          }}>
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status); }} 
                            className="shrink-0 hover:scale-110 transition-transform pl-1"
                            title="Zmień status"
                          >
                            {getStatusIcon(task.status)}
                          </button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "truncate",
                            task.status === 'done' ? 'text-slate-500 line-through font-medium' : 'text-white font-medium'
                          )}>
                            {task.title}
                          </div>
                          <div className="text-xs text-slate-500 mt-0.5 font-mono flex items-center gap-3">
                            <span>Termin: {task.due_date}</span>
                            {task.checklist && task.checklist.length > 0 && (
                              <span className="flex items-center gap-1 text-[#75d36e]">
                                <ListChecks className="w-3 h-3" />
                                {task.checklist.filter(c => c.isCompleted).length}/{task.checklist.length}
                              </span>
                            )}
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
                            onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#75d36e] hover:bg-[#75d36e]/10 transition-colors"
                            title="Szczegóły"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                            title="Usuń"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Modal Add / Edit */}
      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTask ? 'Szczegóły zadania' : 'Nowe zadanie'}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="p-6 space-y-4">
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

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Opis szczegółowy (opcjonalnie)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="Dodatkowe informacje o zadaniu..."
              rows={3}
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors resize-y"
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
                onClick={(e) => {
                  try {
                    if ('showPicker' in HTMLInputElement.prototype) {
                      (e.target as HTMLInputElement).showPicker();
                    }
                  } catch (err) {}
                }}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
               style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex justify-between items-center">
              <span>Lista zadań (Checklista)</span>
              <span className="text-[10px] text-slate-500 font-normal">{checklist.filter(c => c.isCompleted).length}/{checklist.length}</span>
            </label>
            <div className="space-y-2 mb-3">
              {checklist.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    type="button"
                    onClick={() => handleToggleChecklistItem(item.id)}
                    className={cn(
                      "flex-shrink-0 text-slate-400 transition-colors",
                      item.isCompleted ? "text-[#75d36e]" : "hover:text-[#75d36e]"
                    )}
                  >
                    {item.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <span className={cn(
                      "block text-sm transition-all truncate",
                      item.isCompleted ? "text-slate-500 line-through" : "text-white"
                    )}>
                      {item.title}
                    </span>
                    {(item.dueDate || item.priority) && (
                      <div className="text-[10px] flex items-center gap-2 mt-0.5 opacity-70">
                        {item.dueDate && <span>{item.dueDate}</span>}
                        {item.priority && (
                          <span className={cn(
                            "uppercase font-bold tracking-wider",
                            item.priority === 'urgent' ? 'text-red-400' :
                            item.priority === 'high' ? 'text-orange-400' :
                            item.priority === 'medium' ? 'text-blue-400' :
                            'text-slate-400'
                          )}>{item.priority}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteChecklistItem(item.id)}
                    className="p-1.5 rounded opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={newChecklistItem}
                onChange={e => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChecklistItem();
                  }
                }}
                placeholder="Dodaj element listy..."
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#75d36e] transition-colors"
              />
              <div className="flex gap-2">
                <select 
                  value={newSubPriority} 
                  onChange={e => setNewSubPriority(e.target.value as TaskPriority)}
                  className="bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#75d36e] transition-colors capitalize flex-1"
                >
                  <option value="low">Niski</option>
                  <option value="medium">Średni</option>
                  <option value="high">Wysoki</option>
                  <option value="urgent">Pilny</option>
                </select>
                <input 
                  type="date"
                  value={newSubDueDate}
                  onChange={e => setNewSubDueDate(e.target.value)}
                  onClick={(e) => {
                    try {
                      if ('showPicker' in HTMLInputElement.prototype) {
                        (e.target as HTMLInputElement).showPicker();
                      }
                    } catch (err) {}
                  }}
                  className="bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#75d36e] transition-colors flex-1"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333333] disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 font-semibold text-sm"
                >
                  Dodaj
                </button>
              </div>
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
          </div>

          <div className="p-6 pt-4 border-t border-[#222222] bg-[#111111] sticky bottom-0 z-10 flex justify-end gap-3 mt-auto">
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

