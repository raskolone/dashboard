import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Target, Circle, CheckCircle2, PlayCircle, Plus, Edit2, Trash2, X, AlertTriangle, List, LayoutGrid, GripVertical, CheckSquare, Square, ListChecks, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { TaskStatus, TaskPriority, TaskCategory, Task, ChecklistItem } from '../types';
import { GenieModal } from '../components/GenieModal';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export function Tasks() {
  const { tasks, taskLists, addTaskList, updateTaskList, deleteTaskList, addTask, updateTask, deleteTask, t, language } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeListId, setActiveListId] = useState<string>('default');

  // List management states
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [listId, setListId] = useState<string>('default');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [taskColor, setTaskColor] = useState<string>('#4ade80');
  const [description, setDescription] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [newSubPriority, setNewSubPriority] = useState<TaskPriority>('medium');
  const [newSubDueDate, setNewSubDueDate] = useState('');

  const taskColors = ['#4ade80', '#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'];

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
      case 'done': return <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />;
    }
  };

  const openAddModal = () => {
    setEditingTask(null);
    setTitle('');
    setListId(activeListId);
    setPriority('medium');
    setStatus('todo');
    setDueDate(new Date().toISOString().split('T')[0]);
    setTaskColor('#4ade80');
    setDescription('');
    setChecklist([]);
    setNewChecklistItem('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title);
    setListId(task.listId || 'default');
    setPriority(task.priority);
    setStatus(task.status);
    setDueDate(task.due_date);
    setDescription(task.description || '');
    setTaskColor(task.color || '#4ade80');
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
      listId,
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

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;
    addTaskList(newListName);
    setNewListName('');
    setIsListModalOpen(false);
  };

  const handleDelete = (id: string, taskTitle: string) => {
    const confirmMsg = language === 'pl' 
      ? `Czy na pewno chcesz usunąć zadanie: "${taskTitle}"?` 
      : `Are you sure you want to delete task: "${taskTitle}"?`;
    if (window.confirm(confirmMsg)) {
      deleteTask(id);
    }
  };

  const categories: TaskCategory[] = ['work', 'personal', 'learning', 'health', 'project'];
  const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent'];
  const statuses: TaskStatus[] = ['todo', 'in_progress', 'done'];

  type ViewMode = 'today' | 'week' | 'all';
  type FilterStatus = 'all' | 'active' | 'done';
  type LayoutMode = 'list' | 'board';
  type ListSubMode = 'vertical' | 'tiles';
  const [viewMode, setViewMode] = useState<ViewMode>('today');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('active');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('board');
  const [listSubMode, setListSubMode] = useState<ListSubMode>('tiles');
  const [expandedCompletedLists, setExpandedCompletedLists] = useState<Record<string, boolean>>({});
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const getRelativeDateLabel = (dateStr: string, lang: 'pl' | 'en') => {
    if (!dateStr) return '';
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const target = new Date(dateStr);
    target.setHours(0,0,0,0);
    
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return lang === 'pl' ? 'Dzisiaj' : 'Today';
    } else if (diffDays === 1) {
      return lang === 'pl' ? 'Jutro' : 'Tomorrow';
    } else if (diffDays === -1) {
      return lang === 'pl' ? 'Wczoraj' : 'Yesterday';
    } else if (diffDays < 0) {
      const daysAgo = Math.abs(diffDays);
      if (lang === 'pl') {
        return `${daysAgo} ${daysAgo === 1 ? 'dzień' : daysAgo < 5 ? 'dni' : 'dni'} temu`;
      } else {
        return `${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`;
      }
    } else {
      if (lang === 'pl') {
        return `za ${diffDays} dni`;
      } else {
        return `in ${diffDays} days`;
      }
    }
  };

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
  
  const nextWeekDate = new Date();
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeekStr = nextWeekDate.toISOString().split('T')[0];

  const filteredTasks = tasks.filter(tCode => {
    // List filter
    if (activeListId !== 'all' && (tCode.listId || 'default') !== activeListId) return false;

    // Status filter
    if (filterStatus === 'active' && tCode.status === 'done') return false;
    if (filterStatus === 'done' && tCode.status !== 'done') return false;

    // View mode filter
    if (viewMode === 'today') {
      return tCode.due_date === todayStr;
    } else if (viewMode === 'week') {
      return tCode.due_date >= todayStr && tCode.due_date <= nextWeekStr;
    }
    
    return true; // 'all'
  });

  const boardTasks = tasks.filter(tCode => {
    // List filter
    if (activeListId !== 'all' && (tCode.listId || 'default') !== activeListId) return false;

    if (viewMode === 'today') {
      return tCode.due_date === todayStr;
    } else if (viewMode === 'week') {
      return tCode.due_date >= todayStr && tCode.due_date <= nextWeekStr;
    }
    return true; // 'all'
  });

  const totalCount = filteredTasks.length;
  const completedCount = filteredTasks.filter(tCode => tCode.status === 'done').length;
  const pendingCount = totalCount - completedCount;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const translateCategory = (cat: TaskCategory) => {
    switch (cat) {
      case 'work': return t('tasks.categoryWork');
      case 'personal': return t('tasks.categoryPersonal');
      case 'learning': return t('tasks.categoryLearning');
      case 'health': return t('tasks.categoryHealth');
      case 'project': return t('tasks.categoryProject');
      default: return cat;
    }
  };

  const translatePriority = (pri: TaskPriority) => {
    switch (pri) {
      case 'low': return t('tasks.priorityLow');
      case 'medium': return t('tasks.priorityMedium');
      case 'high': return t('tasks.priorityHigh');
      case 'urgent': return t('tasks.priorityUrgent');
      default: return pri;
    }
  };

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 min-h-[calc(100vh-8rem)] pb-12 font-sans text-white">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">{t('sidebar.tasks')}</h1>
          <p className="text-slate-400 mt-1">
            {language === 'pl' ? 'Zarządzaj swoimi priorytetami.' : 'Manage your priorities.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsListModalOpen(true)}
            className="glass-card !rounded-2xl flex justify-center items-center gap-2 px-5 py-2.5 text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] border border-white/10 hover:border-white/20 hover:bg-white/5"
          >
            <Plus className="w-4 h-4 text-slate-400" />
            {language === 'pl' ? 'Nowa Lista' : 'New List'}
          </button>
          <button 
            onClick={openAddModal}
            className="glass-card !rounded-2xl flex justify-center items-center gap-2 px-5 py-2.5 font-bold transition-all hover:scale-[1.02] active:scale-[0.98] bg-[#4ade80]/10 text-[#4ade80] border-[#4ade80]/30 hover:border-[#4ade80]/50 hover:bg-[#4ade80]/20 hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]"
          >
            <Plus className="w-5 h-5" />
            {t('tasks.addBtn')}
          </button>
        </div>
      </header>

      {/* Task Lists Tabs */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none relative z-10">
        <button
          onClick={() => setActiveListId('all')}
          className={cn(
            "glass-card px-5 py-2.5 whitespace-nowrap font-semibold transition-all flex items-center justify-center !rounded-2xl border",
            activeListId === 'all' 
              ? "bg-white/10 text-white border-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]" 
              : "text-slate-400 border-white/5 hover:text-white hover:bg-white/5 hover:border-white/10"
          )}
        >
          {language === 'pl' ? 'Wszystkie zadania' : 'All Tasks'}
        </button>
        {taskLists.map(list => (
          <div key={list.id} className="flex group relative">
            <div
              className={cn(
                "glass-card whitespace-nowrap font-semibold transition-all flex items-center justify-center !rounded-2xl border",
                activeListId === list.id 
                  ? "bg-white/10 text-white border-white/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.05)]" 
                  : "text-slate-400 border-white/5 hover:text-white hover:bg-white/5 hover:border-white/10"
              )}
            >
              <button
                onClick={() => setActiveListId(list.id)}
                className="px-5 py-2.5 h-full w-full outline-none"
              >
                {list.name}
              </button>
              <div className="flex items-center -ml-2 overflow-hidden transition-all duration-200 w-0 group-hover:w-8 group-hover:pr-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => {
                    if(window.confirm(language === 'pl' ? `Usunąć listę "${list.name}"?` : `Delete list "${list.name}"?`)) {
                      deleteTaskList(list.id);
                      if (activeListId === list.id) setActiveListId('all');
                    }
                  }}
                  className={cn(
                    "p-1.5 rounded-lg transition-all flex items-center justify-center",
                    activeListId === list.id 
                      ? "text-red-400 hover:bg-red-500/20" 
                      : "text-slate-500 hover:text-red-400 hover:bg-red-500/20"
                  )}
                  title={language === 'pl' ? 'Usuń listę' : 'Delete List'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sleek Animated Progress tracking card */}
      {totalCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 relative overflow-hidden z-10"
        >
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="text-white font-bold mb-1">
                {language === 'pl' ? 'Status realizacji zadań' : 'Task completion details'}
              </h3>
              <p className="text-slate-400 text-xs">
                {language === 'pl' ? 'Ukończone' : 'Completed'}: <span className="text-[#4ade80] font-semibold">{completedCount}</span> &bull; {language === 'pl' ? 'Oczekujące' : 'Pending'}: <span className="text-blue-400 font-semibold">{pendingCount}</span>
              </p>
            </div>
            <div className="text-2xl font-display font-bold text-[#4ade80]">
              {Math.round(progressPercent)}%
            </div>
          </div>
          <div className="h-2.5 w-full bg-black/40 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="h-full bg-[#4ade80] rounded-full shadow-[0_0_15px_rgba(74,222,128,0.3)]"
            />
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-col lg:flex-row justify-between gap-4 relative z-10">
        <div className="flex gap-4 items-center">
          <div className="flex gap-2 overflow-x-auto">
            <button 
              onClick={() => setViewMode('today')}
              className={`glass-card !rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border ${viewMode === 'today' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
            >
              {language === 'pl' ? 'Dzisiaj' : 'Today'}
            </button>
            <button 
              onClick={() => setViewMode('week')}
              className={`glass-card !rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border ${viewMode === 'week' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
            >
              {language === 'pl' ? 'Ten tydzień' : 'This week'}
            </button>
            <button 
              onClick={() => setViewMode('all')}
              className={`glass-card !rounded-2xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-all border ${viewMode === 'all' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
            >
              {language === 'pl' ? 'Wszystkie' : 'All'}
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto">
            <button 
              onClick={() => setLayoutMode('list')}
              className={`glass-card !rounded-2xl px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${layoutMode === 'list' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
            >
              <List className="w-4 h-4 text-[#4ade80]" />
              {language === 'pl' ? 'Lista' : 'List'}
            </button>
            <button 
              onClick={() => setLayoutMode('board')}
              className={`glass-card !rounded-2xl px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${layoutMode === 'board' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
            >
              <LayoutGrid className="w-4 h-4 text-[#4ade80]" />
              {language === 'pl' ? 'Tablica (D&D)' : 'Board (D&D)'}
            </button>
          </div>
        </div>

        {layoutMode === 'list' && (
          <div className="flex flex-wrap gap-3 items-center">
            {/* List Sub Mode Toggle */}
            <div className="flex gap-2 overflow-x-auto">
              <button 
                onClick={() => setListSubMode('vertical')}
                className={`glass-card !rounded-2xl px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${listSubMode === 'vertical' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                <List className="w-4 h-4 text-[#38bdf8]" />
                {language === 'pl' ? 'Jeden pod drugim' : 'Vertical Stack'}
              </button>
              <button 
                onClick={() => setListSubMode('tiles')}
                className={`glass-card !rounded-2xl px-3 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex items-center gap-1.5 border ${listSubMode === 'tiles' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                <LayoutGrid className="w-4 h-4 text-[#c084fc]" />
                {language === 'pl' ? 'Kafelki' : 'Tiles'}
              </button>
            </div>

            {/* Status Filter */}
            <div className="flex gap-2 overflow-x-auto">
               <button 
                onClick={() => setFilterStatus('active')}
                className={`glass-card !rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all border ${filterStatus === 'active' ? 'bg-[#4ade80]/10 text-[#4ade80] shadow-[inset_0_0_15px_rgba(74,222,128,0.1)] border-[#4ade80]/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                {language === 'pl' ? 'Aktywne' : 'Active'}
              </button>
              <button 
                onClick={() => setFilterStatus('done')}
                className={`glass-card !rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all border ${filterStatus === 'done' ? 'bg-[#4ade80]/10 text-[#4ade80] shadow-[inset_0_0_15px_rgba(74,222,128,0.1)] border-[#4ade80]/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                {language === 'pl' ? 'Ukończone' : 'Completed'}
              </button>
              <button 
                onClick={() => setFilterStatus('all')}
                className={`glass-card !rounded-2xl px-3.5 py-2 text-xs sm:text-sm font-medium whitespace-nowrap transition-all border ${filterStatus === 'all' ? 'bg-white/10 text-white shadow-[inset_0_0_15px_rgba(255,255,255,0.05)] border-white/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border-white/5 hover:border-white/10'}`}
              >
                {language === 'pl' ? 'Zarówno' : 'Both'}
              </button>
            </div>
          </div>
        )}
      </div>

      {layoutMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          {statuses.map(colStatus => {
            const colTasks = boardTasks.filter(tCode => tCode.status === colStatus);
            
            let label = language === 'pl' ? 'Do zrobienia' : 'To Do';
            if (colStatus === 'in_progress') {
              label = language === 'pl' ? 'W toku' : 'In Progress';
            } else if (colStatus === 'done') {
              label = language === 'pl' ? 'Skończone' : 'Done';
            }

            const accentColor = colStatus === 'todo' ? 'text-blue-400' : colStatus === 'in_progress' ? 'text-orange-400' : 'text-[#4ade80]';
            
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
                    <span className={cn("w-2 h-2 rounded-full", colStatus === 'todo' ? 'bg-blue-400' : colStatus === 'in_progress' ? 'bg-orange-400' : 'bg-[#4ade80]')} />
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
                        {language === 'pl' ? 'Pusto. Przeciągnij zadanie tutaj.' : 'Empty. Drag a task here.'}
                      </div>
                    ) : (
                      colTasks.map(task => (
                        <motion.div 
                          layout
                          key={task.id}
                          draggable
                          onDragStart={(e: any) => handleDragStart(e, task.id)}
                          onDragEnd={handleDragEnd as any}
                          className={cn(
                            "glass-card !rounded-2xl group p-3.5 transition-all relative overflow-hidden",
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
                                  e.stopPropagation();
                                }}>
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                                <div className="hidden md:flex opacity-0 group-hover:opacity-100 items-center gap-1 transition-opacity">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                    className="p-1 rounded text-slate-400 hover:text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors"
                                    title={language === 'pl' ? 'Szczegóły' : 'Details'}
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                                    className="p-1 rounded text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                    title={language === 'pl' ? "Usuń" : "Delete"}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 flex flex-col gap-2">
                              <div className="flex items-center justify-between gap-2 text-[10px] text-slate-500">
                                <span className="font-mono flex flex-col gap-1">
                                  <span>{language === 'pl' ? 'Do:' : 'Due:'} {task.due_date}</span>
                                  {task.checklist && task.checklist.length > 0 && (
                                    <span className="flex items-center gap-1 text-[#4ade80]">
                                      <ListChecks className="w-3 h-3" />
                                      {task.checklist.filter(c => c.isCompleted).length}/{task.checklist.length}
                                    </span>
                                  )}
                                </span>
                                <span className={cn(
                                  "uppercase font-bold tracking-wider px-2 py-0.5 rounded-full text-[8px] mt-auto font-mono",
                                  task.priority === 'urgent' ? 'bg-red-950/40 text-red-400' :
                                  task.priority === 'high' ? 'bg-orange-950/40 text-orange-400' :
                                  task.priority === 'medium' ? 'bg-blue-950/40 text-blue-400' :
                                  'bg-slate-800 text-slate-300'
                                )}>
                                  {translatePriority(task.priority)}
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
        (() => {
          const getListColorPalette = (index: number) => {
            const palettes = [
              { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', hex: '#34d399' },
              { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', hex: '#60a5fa' },
              { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', hex: '#c084fc' },
              { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', hex: '#f472b6' },
              { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', hex: '#fbbf24' },
              { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', hex: '#fb923c' },
              { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', hex: '#22d3ee' },
              { text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', hex: '#f87171' },
            ];
            return palettes[index % palettes.length];
          };

          if (listSubMode === 'vertical') {
            return (
              <div className="glass-card p-6 relative z-10 animate-in fade-in duration-300">
                <motion.div layout className="space-y-8">
                  <AnimatePresence mode="popLayout">
                    {taskLists.map((list, idx) => {
                      if (activeListId !== 'all' && list.id !== activeListId) return null;
                      const listTasks = filteredTasks.filter(t => (t.listId || 'default') === list.id);
                      const palette = getListColorPalette(idx);
                      
                      return (
                        <motion.div key={list.id} layout className="space-y-3" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          <div className="flex items-center justify-between px-1">
                            <h3 className={cn("font-display font-bold text-lg flex items-center gap-2", palette.text)}>
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette.hex }} />
                              {list.name}
                              <span className="text-xs font-mono font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-[#222222]">
                                {listTasks.length}
                              </span>
                            </h3>
                          </div>
                          
                          {listTasks.length === 0 ? (
                            <div className="p-6 rounded-xl border border-dashed border-[#222222] flex flex-col items-center justify-center text-center text-slate-500">
                              <Target className="w-8 h-8 mb-2 stroke-[1.5] opacity-20" />
                              <p className="text-sm">{language === 'pl' ? 'Pusta lista. Brak zadań.' : 'Empty list. No tasks.'}</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {listTasks.map(task => (
                                <motion.div 
                                  layout
                                  draggable
                                  onDragStart={(e: any) => handleDragStart(e, task.id)}
                                  onDragEnd={handleDragEnd as any}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.15 } }}
                                  key={task.id} 
                                  className="glass-card !rounded-2xl flex flex-col p-4 transition-colors group relative overflow-hidden border border-[#222222] hover:border-white/10"
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
                                          title={language === 'pl' ? "Zmień status" : "Change status"}
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
                                          <span>{language === 'pl' ? 'Termin:' : 'Due:'} {task.due_date}</span>
                                          {task.checklist && task.checklist.length > 0 && (
                                            <span className="flex items-center gap-1 text-[#4ade80]">
                                              <ListChecks className="w-3 h-3" />
                                              {task.checklist.filter(c => c.isCompleted).length}/{task.checklist.length}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-2 sm:mt-0 ml-auto">
                                      <div className="flex gap-2 font-mono">
                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                                          task.priority === 'urgent' ? 'bg-red-950/40 text-red-400' :
                                          task.priority === 'high' ? 'bg-orange-950/40 text-orange-400' :
                                          task.priority === 'medium' ? 'bg-blue-950/40 text-blue-400' :
                                          'bg-slate-800 text-slate-300'
                                        }`}>
                                          {translatePriority(task.priority)}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#4ade80] hover:bg-[#4ade80]/10 transition-colors"
                                          title={language === 'pl' ? 'Szczegóły' : 'Details'}
                                        >
                                          <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button 
                                          onClick={(e) => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                          title={language === 'pl' ? "Usuń" : "Delete"}
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </motion.div>
              </div>
            );
          } else {
            // tiles (kafelki) sub-mode
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-start relative z-10 animate-in fade-in duration-300">
                {taskLists.map((list, idx) => {
                  if (activeListId !== 'all' && list.id !== activeListId) return null;
                  
                  const listTasks = filteredTasks.filter(t => (t.listId || 'default') === list.id);
                  const activeListTasks = listTasks.filter(t => t.status !== 'done');
                  const completedListTasks = listTasks.filter(t => t.status === 'done');
                  const palette = getListColorPalette(idx);
                  const isCompletedExpanded = expandedCompletedLists[list.id] || false;
                  
                  return (
                    <motion.div 
                      key={list.id} 
                      layout 
                      className="glass-card p-5 rounded-[1.5rem] flex flex-col border border-[#222222] hover:border-white/10 transition-all duration-300 relative overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      {/* Top Accent Strip */}
                      <div 
                        className="absolute top-0 left-0 right-0 h-1.5" 
                        style={{ backgroundColor: palette.hex }}
                      />
                      
                      {/* Title & Badge */}
                      <div className="flex items-center justify-between mb-4 mt-2">
                        <div className="flex items-center gap-2 truncate">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: palette.hex }} />
                          <h3 className={cn("font-display font-bold text-base truncate", palette.text)}>
                            {list.name}
                          </h3>
                        </div>
                        <span className="text-xs font-mono font-semibold text-slate-400 bg-white/5 px-2.5 py-0.5 rounded-lg border border-[#222222]">
                          {listTasks.length}
                        </span>
                      </div>
                      
                      {/* Dodaj zadanie inside Tile */}
                      <button
                        onClick={() => {
                          setListId(list.id);
                          setEditingTask(null);
                          setTitle('');
                          setPriority('medium');
                          setStatus('todo');
                          setDueDate(new Date().toISOString().split('T')[0]);
                          setTaskColor(palette.hex);
                          setDescription('');
                          setChecklist([]);
                          setNewChecklistItem('');
                          setIsModalOpen(true);
                        }}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 mb-4 rounded-xl border font-semibold text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
                        style={{
                          borderColor: `${palette.hex}30`,
                          color: palette.hex,
                          backgroundColor: `${palette.hex}08`
                        }}
                      >
                        <Plus className="w-4 h-4" />
                        {language === 'pl' ? 'Dodaj zadanie' : 'Add task'}
                      </button>
                      
                      {/* Active Tasks List */}
                      <div className="space-y-2.5 flex-1 max-h-[350px] overflow-y-auto pr-1 scrollbar-none mb-4">
                        <AnimatePresence mode="popLayout">
                          {activeListTasks.length === 0 ? (
                            <div className="h-20 flex flex-col items-center justify-center text-[11px] text-slate-500 border border-dashed border-[#222222] rounded-xl p-3 text-center">
                              <Target className="w-5 h-5 mb-1 stroke-[1.5] opacity-20" />
                              {language === 'pl' ? 'Brak aktywnych zadań' : 'No active tasks'}
                            </div>
                          ) : (
                            activeListTasks.map(task => (
                              <motion.div
                                layout
                                key={task.id}
                                onClick={() => openEditModal(task)}
                                className="group relative glass-card !rounded-xl p-3 cursor-pointer hover:bg-white/5 transition-all flex items-start gap-2.5 border border-[#222222]"
                              >
                                {task.color && (
                                  <div 
                                    className="absolute left-0 top-0 bottom-0 w-0.5" 
                                    style={{ backgroundColor: task.color }}
                                  />
                                )}
                                
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status); }}
                                  className="mt-0.5 text-slate-500 hover:text-[#4ade80] transition-colors shrink-0"
                                >
                                  {getStatusIcon(task.status)}
                                </button>
                                
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-white truncate">
                                    {task.title}
                                  </p>
                                  <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 items-center">
                                    <span className="text-[9px] text-slate-500 font-mono">
                                      {getRelativeDateLabel(task.due_date, language)}
                                    </span>
                                    {task.checklist && task.checklist.length > 0 && (
                                      <span className="flex items-center gap-0.5 text-[9px] text-[#4ade80]">
                                        <ListChecks className="w-2.5 h-2.5" />
                                        {task.checklist.filter(c => c.isCompleted).length}/{task.checklist.length}
                                      </span>
                                    )}
                                    <span className={cn(
                                      "text-[7px] font-bold tracking-wider uppercase font-mono px-1.5 py-0.2 rounded-full",
                                      task.priority === 'urgent' ? 'bg-red-950/40 text-red-400' :
                                      task.priority === 'high' ? 'bg-orange-950/40 text-orange-400' :
                                      task.priority === 'medium' ? 'bg-blue-950/40 text-blue-400' :
                                      'bg-slate-800 text-slate-300'
                                    )}>
                                      {translatePriority(task.priority)}
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity ml-auto">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditModal(task); }}
                                    className="p-1 rounded text-slate-400 hover:text-white"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                                    className="p-1 rounded text-slate-400 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </motion.div>
                            ))
                          )}
                        </AnimatePresence>
                      </div>
                      
                      {/* Completed Accordion inside Tile */}
                      {completedListTasks.length > 0 && (
                        <div className="border-t border-[#222222] pt-3">
                          <button
                            onClick={() => setExpandedCompletedLists(prev => ({ ...prev, [list.id]: !isCompletedExpanded }))}
                            className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors"
                          >
                            <div className="flex items-center gap-1.5 font-semibold">
                              {isCompletedExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              <span>
                                {language === 'pl' ? `Ukończone (${completedListTasks.length})` : `Completed (${completedListTasks.length})`}
                              </span>
                            </div>
                          </button>
                          
                          <AnimatePresence>
                            {isCompletedExpanded && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden mt-2 space-y-1.5 max-h-[180px] overflow-y-auto pr-1 scrollbar-none"
                              >
                                {completedListTasks.map(task => (
                                  <div
                                    key={task.id}
                                    onClick={() => openEditModal(task)}
                                    className="group relative p-2 rounded-lg cursor-pointer hover:bg-white/5 transition-all flex items-center gap-2 text-[11px] text-slate-500 border border-transparent hover:border-[#222222]"
                                  >
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStatusChange(task.id, task.status); }}
                                      className="text-[#4ade80] hover:text-slate-500 shrink-0"
                                    >
                                      {getStatusIcon(task.status)}
                                    </button>
                                    <span className="line-through truncate flex-1 font-medium text-slate-500">
                                      {task.title}
                                    </span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleDelete(task.id, task.title); }}
                                      className="opacity-0 group-hover:opacity-100 p-1 rounded text-slate-400 hover:text-red-400 ml-auto transition-opacity"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            );
          }
        })()
      )}

      {/* Modal Add / Edit */}
      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingTask ? (language === 'pl' ? 'Szczegóły zadania' : 'Task Details') : (language === 'pl' ? 'Nowe zadanie' : 'New Task')}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full text-white">
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{t('tasks.titleInput')}</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required
                placeholder={language === 'pl' ? "np. Przygotować raport kwartalny" : "e.g. Prepare quarterly report"}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors"
              />
            </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{t('tasks.descInput')}</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder={language === 'pl' ? "Dodatkowe informacje o zadaniu..." : "Additional task features or details..."}
              rows={3}
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{language === 'pl' ? 'Lista' : 'List'}</label>
              <select 
                value={listId} 
                onChange={e => setListId(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors"
              >
                {taskLists.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{t('tasks.priority')}</label>
              <select 
                value={priority} 
                onChange={e => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors capitalize"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{translatePriority(p)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{language === 'pl' ? 'Status' : 'Status'}</label>
              <select 
                value={status} 
                onChange={e => setStatus(e.target.value as TaskStatus)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors capitalize"
              >
                {statuses.map(s => {
                  let lbl = s === 'todo' ? (language === 'pl' ? 'Do zrobienia' : 'To Do') : s === 'in_progress' ? (language === 'pl' ? 'W toku' : 'In Progress') : (language === 'pl' ? 'Skończone' : 'Completed');
                  return <option key={s} value={s}>{lbl}</option>;
                })}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">{t('tasks.dueDate')}</label>
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
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex justify-between items-center">
              <span>{t('tasks.checklist')}</span>
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
                      item.isCompleted ? "text-[#4ade80]" : "hover:text-[#4ade80]"
                    )}
                  >
                    {item.isCompleted ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </button>
                  <div className="flex-1 min-w-0 text-white">
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
                          )}>{translatePriority(item.priority)}</span>
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
                placeholder={t('tasks.addChecklistItem')}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#4ade80] transition-colors"
              />
              <div className="flex gap-2">
                <select 
                  value={newSubPriority} 
                  onChange={e => setNewSubPriority(e.target.value as TaskPriority)}
                  className="bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#4ade80] transition-colors capitalize flex-1"
                >
                  <option value="low">{t('tasks.priorityLow')}</option>
                  <option value="medium">{t('tasks.priorityMedium')}</option>
                  <option value="high">{t('tasks.priorityHigh')}</option>
                  <option value="urgent">{t('tasks.priorityUrgent')}</option>
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
                  className="bg-[#161616] border border-[#262626] rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-[#4ade80] transition-colors flex-1"
                  style={{ colorScheme: 'dark' }}
                />
                <button
                  type="button"
                  onClick={handleAddChecklistItem}
                  disabled={!newChecklistItem.trim()}
                  className="px-4 py-2 bg-[#262626] hover:bg-[#333333] disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 font-semibold text-sm"
                >
                  {t('common.add')}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
              {language === 'pl' ? 'Kolor znacznika' : 'Marker Tag Color'}
            </label>
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
              {t('common.cancel')}
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm"
            >
              {editingTask ? t('common.saveChanges') : t('tasks.addBtn')}
            </button>
          </div>
        </form>
      </GenieModal>

      <GenieModal isOpen={isListModalOpen} onClose={() => setIsListModalOpen(false)} title={language === 'pl' ? 'Nowa Lista' : 'New List'}>
        <form onSubmit={handleCreateList} className="flex flex-col h-full">
          <div className="p-6 pb-4 border-b border-[#222222] bg-[#111111] sticky top-0 z-10">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-display font-bold text-white">
                {language === 'pl' ? 'Nowa Lista' : 'New List'}
              </h2>
              <button type="button" onClick={() => setIsListModalOpen(false)} className="text-slate-400 hover:text-white p-2">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="p-6 overflow-y-auto">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                {language === 'pl' ? 'Nazwa listy' : 'List Name'}
              </label>
              <input 
                type="text" 
                value={newListName} 
                onChange={e => setNewListName(e.target.value)} 
                required
                placeholder={language === 'pl' ? "np. Praca" : "e.g. Work"}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors"
                autoFocus
              />
            </div>
          </div>

          <div className="p-6 pt-4 border-t border-[#222222] bg-[#111111] sticky bottom-0 z-10 flex justify-end gap-3 mt-auto">
            <button 
              type="button"
              onClick={() => setIsListModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#262626] text-slate-300 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm"
            >
              {t('common.cancel')}
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm"
            >
              {language === 'pl' ? 'Utwórz' : 'Create'}
            </button>
          </div>
        </form>
      </GenieModal>
    </div>
  );
}
