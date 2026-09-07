import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Archive, 
  CheckCircle2, 
  RotateCcw, 
  Trash2, 
  Search, 
  Filter, 
  Calendar, 
  Tag, 
  CheckSquare, 
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { Task, TaskPriority } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function TasksArchiveView({ onSwitchToPlanner }: { onSwitchToPlanner?: () => void }) {
  const { tasks, updateTask, deleteTask, taskLists, language } = useAppStore();
  const isPl = language === 'pl';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListFilter, setSelectedListFilter] = useState<string>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'priority'>('newest');

  // Filter only completed tasks
  const completedTasks = useMemo(() => {
    return tasks.filter(t => t.status === 'done');
  }, [tasks]);

  // Apply search, list, priority, and sorting
  const filteredTasks = useMemo(() => {
    let list = [...completedTasks];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) || 
        (t.description && t.description.toLowerCase().includes(q))
      );
    }

    if (selectedListFilter !== 'all') {
      list = list.filter(t => t.listId === selectedListFilter);
    }

    if (selectedPriorityFilter !== 'all') {
      list = list.filter(t => t.priority === selectedPriorityFilter);
    }

    list.sort((a, b) => {
      if (sortBy === 'priority') {
        const pOrder: Record<TaskPriority, number> = { urgent: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      const timeA = new Date(a.updatedAt || a.createdAt || a.due_date || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || b.due_date || 0).getTime();
      return sortBy === 'newest' ? timeB - timeA : timeA - timeB;
    });

    return list;
  }, [completedTasks, searchQuery, selectedListFilter, selectedPriorityFilter, sortBy]);

  // Group by time completed
  const groupedTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTime = today.getTime();
    const sevenDaysAgo = todayTime - 7 * 86400000;
    const thirtyDaysAgo = todayTime - 30 * 86400000;

    const groups: {
      today: Task[];
      thisWeek: Task[];
      thisMonth: Task[];
      older: Task[];
    } = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      older: []
    };

    filteredTasks.forEach(task => {
      const dateVal = task.updatedAt || task.due_date;
      if (!dateVal) {
        groups.older.push(task);
        return;
      }
      const tTime = new Date(dateVal).getTime();
      if (tTime >= todayTime) {
        groups.today.push(task);
      } else if (tTime >= sevenDaysAgo) {
        groups.thisWeek.push(task);
      } else if (tTime >= thirtyDaysAgo) {
        groups.thisMonth.push(task);
      } else {
        groups.older.push(task);
      }
    });

    return groups;
  }, [filteredTasks]);

  // Actions
  const handleRestore = async (task: Task) => {
    await updateTask(task.id, {
      status: 'todo',
      updatedAt: new Date().toISOString()
    });
  };

  const handleDeletePermanent = async (task: Task) => {
    const confirmMsg = isPl
      ? `Czy na pewno chcesz bezpowrotnie usunąć zadanie "${task.title}"?`
      : `Are you sure you want to permanently delete task "${task.title}"?`;
    if (window.confirm(confirmMsg)) {
      await deleteTask(task.id);
    }
  };

  const handleClearAllArchive = async () => {
    if (completedTasks.length === 0) return;
    const confirmMsg = isPl
      ? `Czy na pewno chcesz bezpowrotnie wyczyścić CAŁE archiwum (${completedTasks.length} zadań)? TEJ OPERACJI NIE MOŻNA COFNĄĆ.`
      : `Are you sure you want to permanently delete ALL ${completedTasks.length} completed tasks in archive?`;
    if (window.confirm(confirmMsg)) {
      for (const t of completedTasks) {
        await deleteTask(t.id);
      }
    }
  };

  const getListName = (listId?: string) => {
    if (!listId) return isPl ? 'Pula ogólna' : 'General pool';
    const found = taskLists.find(l => l.id === listId);
    return found ? found.name : isPl ? 'Pula ogólna' : 'General pool';
  };

  const getPriorityLabel = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent': return { label: isPl ? 'Pilny' : 'Urgent', color: 'bg-red-500/20 text-red-300 border-red-500/30' };
      case 'high': return { label: isPl ? 'Wysoki' : 'High', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'medium': return { label: isPl ? 'Średni' : 'Medium', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' };
      default: return { label: isPl ? 'Niski' : 'Low', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Summary */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-white/10 bg-[#161619]/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-inner">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold text-white tracking-tight">
                {isPl ? 'Archiwum wykonanych zadań' : 'Completed Tasks Archive'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                {completedTasks.length} {isPl ? 'ukończonych' : 'done'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {isPl 
                ? 'Przeglądaj historię, filtruj według list lub przywracaj zadania z powrotem do aktywnego planera jednym kliknięciem.'
                : 'Browse completed history, filter by lists, or restore tasks back to your planner with one click.'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          {onSwitchToPlanner && (
            <button
              type="button"
              onClick={onSwitchToPlanner}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold transition-all cursor-pointer"
            >
              {isPl ? 'Wróć do Planera' : 'Back to Planner'}
            </button>
          )}

          {completedTasks.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllArchive}
              className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title={isPl ? 'Usuń wszystkie zadania z archiwum' : 'Delete all completed tasks'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isPl ? 'Wyczyść archiwum' : 'Clear archive'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#161619]/90 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isPl ? 'Szukaj w archiwum po tytule, opisie...' : 'Search completed tasks...'}
            className="w-full pl-9 pr-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80]"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* List filter */}
          <select
            value={selectedListFilter}
            onChange={(e) => setSelectedListFilter(e.target.value)}
            aria-label={isPl ? 'Filtruj według listy' : 'Filter by list'}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4ade80] cursor-pointer"
          >
            <option value="all">{isPl ? 'Wszystkie listy' : 'All lists'}</option>
            {taskLists.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Priority filter */}
          <select
            value={selectedPriorityFilter}
            onChange={(e) => setSelectedPriorityFilter(e.target.value)}
            aria-label={isPl ? 'Filtruj według priorytetu' : 'Filter by priority'}
            className="px-3 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-[#4ade80] cursor-pointer"
          >
            <option value="all">{isPl ? 'Wszystkie priorytety' : 'All priorities'}</option>
            <option value="urgent">{isPl ? 'Pilny' : 'Urgent'}</option>
            <option value="high">{isPl ? 'Wysoki' : 'High'}</option>
            <option value="medium">{isPl ? 'Średni' : 'Medium'}</option>
            <option value="low">{isPl ? 'Niski' : 'Low'}</option>
          </select>

          {/* Sort order */}
          <button
            type="button"
            onClick={() => setSortBy(prev => prev === 'newest' ? 'oldest' : prev === 'oldest' ? 'priority' : 'newest')}
            className="px-3 py-2 bg-black/40 border border-white/10 hover:border-white/20 rounded-xl text-xs text-slate-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
            title={isPl ? 'Zmień sortowanie' : 'Change sort order'}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#4ade80]" />
            <span>
              {sortBy === 'newest' 
                ? (isPl ? 'Najnowsze' : 'Newest') 
                : sortBy === 'oldest' 
                  ? (isPl ? 'Najstarsze' : 'Oldest') 
                  : (isPl ? 'Priorytet' : 'Priority')}
            </span>
          </button>
        </div>
      </div>

      {/* Task Groups */}
      {completedTasks.length === 0 ? (
        <div className="glass-card p-12 rounded-2xl border border-white/10 bg-[#161619]/60 text-center flex flex-col items-center justify-center gap-3">
          <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-slate-500">
            <Archive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-white">
            {isPl ? 'Archiwum jest puste' : 'Archive is empty'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md">
            {isPl 
              ? 'Nie masz jeszcze żadnych wykonanych zadań. Gdy ukończysz zadanie w planerze lub na tablicy, trafi ono tutaj do bezpiecznego archiwum.'
              : 'You have no completed tasks yet. When you complete a task in planner or board, it will be saved here.'}
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-card p-10 rounded-2xl border border-white/10 bg-[#161619]/60 text-center flex flex-col items-center justify-center gap-2">
          <AlertCircle className="w-8 h-8 text-amber-400" />
          <h3 className="text-sm font-bold text-white">
            {isPl ? 'Brak zadań spełniających kryteria' : 'No matching tasks'}
          </h3>
          <p className="text-xs text-slate-400">
            {isPl ? 'Spróbuj zmienić zapytanie lub wyczyścić filtry wyszukiwania.' : 'Try changing search query or filters.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedListFilter('all');
              setSelectedPriorityFilter('all');
            }}
            className="mt-2 px-3 py-1.5 rounded-lg bg-white/10 text-xs text-white hover:bg-white/20 transition-all cursor-pointer"
          >
            {isPl ? 'Resetuj filtry' : 'Reset filters'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {renderSection(isPl ? 'Dzisiaj' : 'Today', groupedTasks.today)}
          {renderSection(isPl ? 'W tym tygodniu' : 'This week', groupedTasks.thisWeek)}
          {renderSection(isPl ? 'W tym miesiącu' : 'This month', groupedTasks.thisMonth)}
          {renderSection(isPl ? 'Wcześniejsze' : 'Older', groupedTasks.older)}
        </div>
      )}
    </div>
  );

  function renderSection(title: string, sectionTasks: Task[]) {
    if (sectionTasks.length === 0) return null;

    return (
      <div key={title} className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span>{title}</span>
            <span className="px-2 py-0.5 rounded-md bg-white/5 text-slate-300 font-mono text-[11px]">
              {sectionTasks.length}
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sectionTasks.map(task => {
            const priorityInfo = getPriorityLabel(task.priority);
            const listName = getListName(task.listId);
            const checklistCount = task.checklist?.length || 0;
            const checklistCompleted = task.checklist?.filter(c => c.isCompleted).length || 0;

            return (
              <div
                key={task.id}
                className="group p-4 rounded-2xl bg-[#1b1b20] border border-white/10 hover:border-emerald-500/40 transition-all shadow-sm flex flex-col justify-between gap-3"
              >
                {/* Upper section */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => handleRestore(task)}
                      className="mt-0.5 w-5 h-5 rounded-md bg-emerald-500/20 border border-emerald-500 text-emerald-400 flex items-center justify-center shrink-0 cursor-pointer hover:bg-emerald-500/30 transition-all"
                      title={isPl ? 'Kliknij, aby przywrócić do todo' : 'Click to restore to todo'}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-semibold text-slate-300 line-through truncate group-hover:text-white transition-colors">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Priority Pill */}
                  <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0", priorityInfo.color)}>
                    {priorityInfo.label}
                  </span>
                </div>

                {/* Bottom details & Actions */}
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px] text-slate-400">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* List tag */}
                    <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-medium">
                      {listName}
                    </span>

                    {/* Due date if existed */}
                    {task.due_date && (
                      <span className="flex items-center gap-1 font-mono text-slate-400">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{task.due_date}</span>
                        {task.due_time && <span>@{task.due_time}</span>}
                      </span>
                    )}

                    {/* Checklist info */}
                    {checklistCount > 0 && (
                      <span className="flex items-center gap-1 text-slate-400 font-mono">
                        <CheckSquare className="w-3 h-3 text-emerald-400" />
                        <span>{checklistCompleted}/{checklistCount}</span>
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRestore(task)}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer"
                      title={isPl ? 'Przywróć do aktywnych zadań' : 'Restore to active tasks'}
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>{isPl ? 'Przywróć' : 'Restore'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeletePermanent(task)}
                      className="p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                      title={isPl ? 'Usuń trwale' : 'Delete permanently'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}
