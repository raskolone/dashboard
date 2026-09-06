import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Table, 
  CalendarDays, 
  LayoutGrid, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Plus, 
  Flame, 
  Trophy, 
  Check, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  X, 
  Edit3, 
  SlidersHorizontal, 
  Sparkles, 
  Database, 
  CheckCircle2, 
  ListChecks, 
  TrendingUp, 
  Calendar as CalendarIcon, 
  Hash, 
  Tag, 
  RotateCcw,
  CheckSquare,
  Square,
  Trash2,
  Archive,
  Copy
} from 'lucide-react';
import { format, subDays, addDays, isSameDay, isToday, isYesterday, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { calculateHabitStats, getLocalDateStr } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { Habit } from '../types';
import { ContextMenu, ContextMenuItem } from './ContextMenu';

export function HabitsDatabaseView() {
  const { habits, addHabit, updateHabit, toggleHabit, updateHabitProgress, skipHabit, deleteHabit, language } = useAppStore();

  // Notion Database Views
  const [viewMode, setViewMode] = useState<'matrix' | 'days_log' | 'gallery'>('matrix');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived' | 'overdue' | 'daily' | 'weekly'>('active');
  const [sortBy, setSortBy] = useState<'order' | 'name' | 'streak' | 'rate' | 'completed'>('order');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Date Range window for the Matrix table (offset in days from today)
  const [rangeLength, setRangeLength] = useState<7 | 14 | 21 | 30>(14);
  const [dayOffset, setDayOffset] = useState<number>(0); // 0 = ending today, >0 = shifted into the past

  // Inline new habit creation in table
  const [isInlineAdding, setIsInlineAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('✨');
  const [newHabitColor, setNewHabitColor] = useState('#a855f7');
  const [newHabitTarget, setNewHabitTarget] = useState(1);
  const [newHabitUnit, setNewHabitUnit] = useState('');

  // Notion page detail drawer
  const [selectedHabitForDetail, setSelectedHabitForDetail] = useState<Habit | null>(null);

  // Counter popover state for multi-target habits
  const [activeCounterPopover, setActiveCounterPopover] = useState<{ habitId: string; date: string } | null>(null);

  // Generate date columns for Matrix view
  const dateColumns = useMemo(() => {
    const list: string[] = [];
    const baseDate = subDays(new Date(), dayOffset);
    for (let i = rangeLength - 1; i >= 0; i--) {
      list.push(getLocalDateStr(subDays(baseDate, i)));
    }
    return list;
  }, [rangeLength, dayOffset]);

  const todayStr = getLocalDateStr(new Date());
  const yesterdayStr = getLocalDateStr(subDays(new Date(), 1));

  // Filtered and Sorted Habits
  const processedHabits = useMemo(() => {
    let list = [...habits];

    // Status filter
    if (statusFilter === 'active') {
      list = list.filter(h => h.status !== 'archived');
    } else if (statusFilter === 'archived') {
      list = list.filter(h => h.status === 'archived');
    } else if (statusFilter === 'daily') {
      list = list.filter(h => h.status !== 'archived' && (h.frequency || 'daily') === 'daily');
    } else if (statusFilter === 'weekly') {
      list = list.filter(h => h.status !== 'archived' && h.frequency === 'weekly');
    } else if (statusFilter === 'overdue') {
      // Habit has missed days in the visible date range (past dates not completed)
      list = list.filter(h => {
        if (h.status === 'archived') return false;
        return dateColumns.some(d => d <= todayStr && !h.completedDates.includes(d) && !h.skippedDates?.includes(d));
      });
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(h => 
        h.name.toLowerCase().includes(q) || 
        h.unit?.toLowerCase().includes(q) || 
        h.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortBy === 'streak') {
        const streakA = calculateHabitStats(a.completedDates).currentStreak;
        const streakB = calculateHabitStats(b.completedDates).currentStreak;
        cmp = streakA - streakB;
      } else if (sortBy === 'rate') {
        const rateA = calculateHabitStats(a.completedDates).completionRate30Days || 0;
        const rateB = calculateHabitStats(b.completedDates).completionRate30Days || 0;
        cmp = rateA - rateB;
      } else if (sortBy === 'completed') {
        cmp = a.completedDates.length - b.completedDates.length;
      } else {
        cmp = (a.order || 0) - (b.order || 0);
      }
      return sortDirection === 'desc' ? -cmp : cmp;
    });

    return list;
  }, [habits, statusFilter, searchQuery, sortBy, sortDirection, dateColumns, todayStr]);

  // Overdue count in visible window
  const overdueStats = useMemo(() => {
    let overdueCount = 0;
    const overdueHabitIds = new Set<string>();
    const activeHabits = habits.filter(h => h.status !== 'archived');

    // Only count days in past (up to yesterday)
    dateColumns.forEach(dateStr => {
      if (dateStr < todayStr) {
        activeHabits.forEach(h => {
          if (!h.completedDates.includes(dateStr) && !h.skippedDates?.includes(dateStr)) {
            overdueCount++;
            overdueHabitIds.add(h.id);
          }
        });
      }
    });

    return {
      totalOverdueCells: overdueCount,
      habitsWithOverdueCount: overdueHabitIds.size
    };
  }, [habits, dateColumns, todayStr]);

  // Handle Quick Add Inline Habit
  const handleCreateInlineHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    addHabit({
      name: newHabitName.trim(),
      icon: newHabitIcon || '✨',
      color: newHabitColor,
      frequency: 'daily',
      target_count: newHabitTarget > 0 ? newHabitTarget : 1,
      unit: newHabitUnit.trim() || undefined,
      tags: ['notion-db']
    });

    setNewHabitName('');
    setIsInlineAdding(false);
  };

  // Quick action: Complete all habits for today
  const handleCompleteAllToday = () => {
    const activeList = habits.filter(h => h.status !== 'archived');
    activeList.forEach(h => {
      if (!h.completedDates.includes(todayStr)) {
        toggleHabit(h.id, todayStr);
      }
    });
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  // Quick action: Catch up overdue habits for yesterday
  const handleCatchUpYesterday = () => {
    const activeList = habits.filter(h => h.status !== 'archived');
    let markedCount = 0;
    activeList.forEach(h => {
      if (!h.completedDates.includes(yesterdayStr) && !h.skippedDates?.includes(yesterdayStr)) {
        toggleHabit(h.id, yesterdayStr);
        markedCount++;
      }
    });
    if (markedCount > 0) {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  };

  // Custom Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
    title?: string;
  } | null>(null);

  const handleDuplicateHabit = (habit: Habit) => {
    addHabit({
      name: `${habit.name} (${language === 'pl' ? 'kopia' : 'copy'})`,
      icon: habit.icon,
      color: habit.color,
      target_count: habit.target_count,
      unit: habit.unit,
      frequency: habit.frequency,
      tags: habit.tags || ['notion-db']
    });
  };

  const handleMarkVisibleOverdue = (habit: Habit) => {
    const overdueDates = dateColumns.filter(d => {
      return d <= todayStr && !habit.completedDates.includes(d) && !habit.skippedDates?.includes(d);
    });
    if (overdueDates.length === 0) return;
    const newCompleted = Array.from(new Set([...habit.completedDates, ...overdueDates]));
    updateHabit(habit.id, { completedDates: newCompleted });
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
  };

  const handleClearVisibleCompletions = (habit: Habit) => {
    const visibleSet = new Set(dateColumns);
    const filtered = habit.completedDates.filter(d => !visibleSet.has(d));
    updateHabit(habit.id, { completedDates: filtered });
  };

  const handleHabitRowContextMenu = (e: React.MouseEvent, habit: Habit) => {
    e.preventDefault();
    e.stopPropagation();

    const isPl = language === 'pl';
    const isCompletedToday = habit.completedDates.includes(todayStr);
    const isCompletedYesterday = habit.completedDates.includes(yesterdayStr);
    const overdueDates = dateColumns.filter(d => {
      return d <= todayStr && !habit.completedDates.includes(d) && !habit.skippedDates?.includes(d);
    });

    const items: ContextMenuItem[] = [
      {
        id: 'h-header',
        header: `${habit.icon} ${habit.name}`
      },
      {
        id: 'toggle-today',
        label: isCompletedToday 
          ? (isPl ? 'Cofnij wykonanie z dzisiaj' : 'Undo today\'s completion')
          : (isPl ? 'Oznacz jako wykonane dzisiaj' : 'Mark done for today'),
        icon: CheckCircle2,
        onClick: () => toggleHabit(habit.id, todayStr)
      },
      {
        id: 'toggle-yesterday',
        label: isCompletedYesterday
          ? (isPl ? 'Cofnij wykonanie z wczoraj' : 'Undo yesterday\'s completion')
          : (isPl ? 'Oznacz jako wykonane wczoraj' : 'Mark done for yesterday'),
        icon: Clock,
        onClick: () => toggleHabit(habit.id, yesterdayStr)
      },
      ...(overdueDates.length > 0 ? [
        {
          id: 'mark-all-overdue',
          label: isPl 
            ? `Zalicz zaległe dni w widoku (${overdueDates.length})` 
            : `Catch up overdue in view (${overdueDates.length})`,
          icon: CheckSquare,
          onClick: () => handleMarkVisibleOverdue(habit)
        }
      ] : []),
      { id: 'div-h-1', divider: true },
      {
        id: 'open-drawer',
        label: isPl ? 'Otwórz kartę nawyku i statystyki' : 'Open details & statistics',
        icon: Eye,
        onClick: () => setSelectedHabitForDetail(habit)
      },
      {
        id: 'frequency',
        label: isPl ? 'Częstotliwość nawyku' : 'Frequency',
        icon: RotateCcw,
        submenu: [
          {
            id: 'freq-daily',
            label: isPl ? 'Codziennie' : 'Daily',
            checked: (habit.frequency || 'daily') === 'daily',
            onClick: () => updateHabit(habit.id, { frequency: 'daily' })
          },
          {
            id: 'freq-weekly',
            label: isPl ? 'Tygodniowo' : 'Weekly',
            checked: habit.frequency === 'weekly',
            onClick: () => updateHabit(habit.id, { frequency: 'weekly' })
          }
        ]
      },
      {
        id: 'archive-toggle',
        label: habit.status === 'archived' 
          ? (isPl ? 'Przywróć z archiwum' : 'Restore from archive')
          : (isPl ? 'Archiwizuj nawyk' : 'Archive habit'),
        icon: Archive,
        onClick: () => updateHabit(habit.id, { status: habit.status === 'archived' ? 'active' : 'archived' })
      },
      {
        id: 'duplicate',
        label: isPl ? 'Duplikuj nawyk' : 'Duplicate habit',
        icon: Copy,
        onClick: () => handleDuplicateHabit(habit)
      },
      {
        id: 'clear-visible',
        label: isPl ? 'Wyczyść historię w tym oknie' : 'Clear history in view',
        icon: RotateCcw,
        onClick: () => handleClearVisibleCompletions(habit)
      },
      { id: 'div-h-2', divider: true },
      {
        id: 'delete-habit',
        label: isPl ? 'Usuń nawyk' : 'Delete habit',
        icon: Trash2,
        danger: true,
        onClick: () => deleteHabit(habit.id)
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      title: isPl ? 'Menu nawyku' : 'Habit Menu'
    });
  };

  const handleCellContextMenu = (e: React.MouseEvent, habit: Habit, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const isPl = language === 'pl';
    const isCompleted = habit.completedDates.includes(dateStr);
    const isSkipped = habit.skippedDates?.includes(dateStr);

    const items: ContextMenuItem[] = [
      {
        id: 'c-header',
        header: `${habit.name} • ${dateStr}`
      },
      {
        id: 'cell-toggle',
        label: isCompleted 
          ? (isPl ? 'Oznacz jako niewykonane' : 'Mark incomplete') 
          : (isPl ? 'Oznacz jako wykonane' : 'Mark completed'),
        icon: CheckCircle2,
        onClick: () => toggleHabit(habit.id, dateStr)
      },
      {
        id: 'cell-skip',
        label: isSkipped 
          ? (isPl ? 'Cofnij pominięcie' : 'Unskip day') 
          : (isPl ? 'Pomiń ten dzień (zamroź streak)' : 'Skip day (freeze streak)'),
        icon: AlertCircle,
        onClick: () => skipHabit(habit.id, dateStr)
      },
      ...(habit.target_count > 1 ? [
        {
          id: 'cell-target',
          label: isPl ? `Ustaw pełny cel (${habit.target_count} ${habit.unit || ''})` : `Set full target (${habit.target_count} ${habit.unit || ''})`,
          icon: Sparkles,
          onClick: () => updateHabitProgress(habit.id, dateStr, habit.target_count, true)
        },
        {
          id: 'cell-zero',
          label: isPl ? 'Wyzeruj postęp' : 'Reset progress',
          icon: RotateCcw,
          onClick: () => updateHabitProgress(habit.id, dateStr, 0, false)
        }
      ] : []),
      { id: 'div-c-1', divider: true },
      {
        id: 'cell-details',
        label: isPl ? 'Otwórz statystyki nawyku' : 'Open habit statistics',
        icon: Eye,
        onClick: () => setSelectedHabitForDetail(habit)
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      title: isPl ? 'Dzień w bazie nawyków' : 'Habit Day'
    });
  };

  const handleTableContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isPl = language === 'pl';
    const items: ContextMenuItem[] = [
      {
        id: 't-header',
        header: isPl ? 'Baza nawyków (Notion DB)' : 'Habit Database'
      },
      {
        id: 'add-habit-inline',
        label: isPl ? 'Dodaj nowy nawyk' : 'Add new habit',
        icon: Plus,
        onClick: () => setIsInlineAdding(true)
      },
      {
        id: 'complete-all-today',
        label: isPl ? 'Zalicz wszystkie na dzisiaj' : 'Complete all for today',
        icon: CheckCircle2,
        onClick: handleCompleteAllToday
      },
      {
        id: 'catchup-yesterday',
        label: isPl ? 'Uzupełnij zaległe z wczoraj' : 'Catch up yesterday',
        icon: Clock,
        onClick: handleCatchUpYesterday
      },
      { id: 'div-t-1', divider: true },
      {
        id: 'window-range',
        label: isPl ? 'Zakres dni w tabeli' : 'Table day range',
        icon: CalendarDays,
        submenu: [
          { id: 'r-7', label: isPl ? '7 dni' : '7 days', checked: rangeLength === 7, onClick: () => setRangeLength(7) },
          { id: 'r-14', label: isPl ? '14 dni' : '14 days', checked: rangeLength === 14, onClick: () => setRangeLength(14) },
          { id: 'r-21', label: isPl ? '21 dni' : '21 days', checked: rangeLength === 21, onClick: () => setRangeLength(21) },
          { id: 'r-30', label: isPl ? '30 dni' : '30 days', checked: rangeLength === 30, onClick: () => setRangeLength(30) }
        ]
      },
      {
        id: 'view-mode-sub',
        label: isPl ? 'Zmień widok bazy' : 'Switch database view',
        icon: Table,
        submenu: [
          { id: 'v-mat', label: isPl ? 'Macierz historii (Tabela)' : 'History Matrix (Table)', checked: viewMode === 'matrix', onClick: () => setViewMode('matrix') },
          { id: 'v-day', label: isPl ? 'Dziennik dni (Log)' : 'Daily Log', checked: viewMode === 'days_log', onClick: () => setViewMode('days_log') },
          { id: 'v-gal', label: isPl ? 'Galeria kart (Karty)' : 'Cards Gallery', checked: viewMode === 'gallery', onClick: () => setViewMode('gallery') }
        ]
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      title: isPl ? 'Opcje bazy' : 'Database Options'
    });
  };

  const handleDayRowContextMenu = (e: React.MouseEvent, dateStr: string) => {
    e.preventDefault();
    e.stopPropagation();

    const isPl = language === 'pl';
    const activeList = processedHabits.filter(h => h.status !== 'archived');

    const items: ContextMenuItem[] = [
      {
        id: 'day-header',
        header: `${isPl ? 'Dzień' : 'Day'}: ${dateStr}`
      },
      {
        id: 'day-complete-all',
        label: isPl ? 'Zalicz wszystkie nawyki tego dnia' : 'Complete all habits for this day',
        icon: CheckCircle2,
        onClick: () => {
          activeList.forEach(h => {
            if (!h.completedDates.includes(dateStr)) {
              toggleHabit(h.id, dateStr);
            }
          });
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
        }
      },
      {
        id: 'day-clear-all',
        label: isPl ? 'Wyczyść wszystkie nawyki tego dnia' : 'Clear all habits for this day',
        icon: RotateCcw,
        onClick: () => {
          activeList.forEach(h => {
            if (h.completedDates.includes(dateStr)) {
              toggleHabit(h.id, dateStr);
            }
          });
        }
      },
      { id: 'div-d-1', divider: true },
      {
        id: 'day-add-habit',
        label: isPl ? 'Dodaj nowy nawyk' : 'Add new habit',
        icon: Plus,
        onClick: () => setIsInlineAdding(true)
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      title: isPl ? 'Zarządzanie dniem' : 'Day Management'
    });
  };

  // Cell click handler
  const handleCellClick = (habit: Habit, dateStr: string) => {
    const isCompleted = habit.completedDates.includes(dateStr);
    
    if (habit.target_count === 1) {
      toggleHabit(habit.id, dateStr);
    } else {
      // If multi-target: If completed, uncomplete it. If not completed, complete it to max, or open counter.
      if (isCompleted) {
        toggleHabit(habit.id, dateStr);
      } else {
        const currentProg = habit.progress?.[dateStr] || 0;
        const nextProg = currentProg + 1;
        updateHabitProgress(habit.id, dateStr, nextProg, nextProg >= habit.target_count);
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 py-3 text-slate-100 font-sans">
      
      {/* Notion Database Header Card */}
      <div className="glass-card rounded-[24px] p-4 sm:p-6 mb-6 border border-white/10 bg-[#121215]/80 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-2xl p-2 rounded-xl bg-white/5 border border-white/10 shadow-inner">📑</span>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                  {language === 'pl' ? 'Baza danych nawyków' : 'Habits Database'}
                </h1>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-medium border border-purple-500/30">
                  Notion Style
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white/5 text-slate-400 font-mono">
                  {processedHabits.length} {language === 'pl' ? 'pozycji' : 'items'}
                </span>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              {language === 'pl' 
                ? 'Przeglądaj pełną historię w elastycznej siatce, zaznaczaj zaległe dni jednym kliknięciem i analizuj serie bez ograniczeń.'
                : 'Browse complete habit history in a flexible grid, check off overdue days in one click, and track progress effortlessly.'}
            </p>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {overdueStats.totalOverdueCells > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                <span>
                  {language === 'pl' 
                    ? `${overdueStats.totalOverdueCells} zaległych dni` 
                    : `${overdueStats.totalOverdueCells} overdue days`}
                </span>
                <button
                  onClick={handleCatchUpYesterday}
                  className="ml-1 underline hover:text-white cursor-pointer transition-colors"
                  title={language === 'pl' ? 'Zaznacz zaległe nawyki z wczoraj' : 'Complete yesterday overdue habits'}
                >
                  {language === 'pl' ? 'Uzupełnij wczoraj' : 'Fill yesterday'}
                </button>
              </div>
            )}

            <button
              onClick={handleCompleteAllToday}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
              {language === 'pl' ? 'Zaznacz wszystko na dziś' : 'Mark all today'}
            </button>
          </div>
        </div>

        {/* Notion View Tabs */}
        <div className="flex items-center gap-1 mt-6 pt-4 border-t border-white/10 overflow-x-auto pb-1">
          <button
            onClick={() => setViewMode('matrix')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'matrix' 
                ? 'bg-white/15 text-white shadow-sm border border-white/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Table className="w-3.5 h-3.5 text-purple-400" />
            <span>{language === 'pl' ? 'Tabela nawyków' : 'Habits Table'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300">
              {rangeLength}D
            </span>
          </button>

          <button
            onClick={() => setViewMode('days_log')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'days_log' 
                ? 'bg-white/15 text-white shadow-sm border border-white/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
            <span>{language === 'pl' ? 'Dziennik dat' : 'Days Log'}</span>
          </button>

          <button
            onClick={() => setViewMode('gallery')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
              viewMode === 'gallery' 
                ? 'bg-white/15 text-white shadow-sm border border-white/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5 text-emerald-400" />
            <span>{language === 'pl' ? 'Karty i statystyki' : 'Gallery & Stats'}</span>
          </button>

          <div className="ml-auto pl-2 flex items-center gap-1.5">
            <button
              onClick={() => setIsInlineAdding(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'pl' ? 'Nowy' : 'New'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Notion Database Toolbar (Search, Filter, Sort, Range Selector) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4 bg-white/5 rounded-2xl p-2.5 sm:p-3 border border-white/10">
        
        {/* Left: Search & Status Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search */}
          <div className="relative min-w-[180px] sm:min-w-[220px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'pl' ? 'Szukaj nawyku...' : 'Search habits...'}
              className="w-full pl-8 pr-7 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'active', label: language === 'pl' ? 'Aktywne' : 'Active' },
              { id: 'overdue', label: language === 'pl' ? 'Z zaległościami' : 'Has Overdue' },
              { id: 'daily', label: language === 'pl' ? 'Codzienne' : 'Daily' },
              { id: 'all', label: language === 'pl' ? 'Wszystkie' : 'All' },
              { id: 'archived', label: language === 'pl' ? 'Archiwum' : 'Archived' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Sort & Range Controls */}
        <div className="flex items-center gap-2 justify-between lg:justify-end flex-wrap">
          {/* Sort selector */}
          <div className="flex items-center gap-1 text-xs text-slate-400 bg-black/30 border border-white/10 rounded-xl px-2 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="order" className="bg-[#1c1c1e]">{language === 'pl' ? 'Kolejność' : 'Manual Order'}</option>
              <option value="name" className="bg-[#1c1c1e]">{language === 'pl' ? 'Nazwa A-Z' : 'Name A-Z'}</option>
              <option value="streak" className="bg-[#1c1c1e]">{language === 'pl' ? 'Seria (Streak)' : 'Streak'}</option>
              <option value="rate" className="bg-[#1c1c1e]">{language === 'pl' ? 'Wskaźnik (30D)' : 'Rate (30D)'}</option>
              <option value="completed" className="bg-[#1c1c1e]">{language === 'pl' ? 'Liczba ukończeń' : 'Total completed'}</option>
            </select>
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="p-0.5 hover:text-white text-slate-400 cursor-pointer"
              title={language === 'pl' ? 'Zmień kierunek sortowania' : 'Toggle sort direction'}
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Matrix Window controls (only in matrix mode) */}
          {viewMode === 'matrix' && (
            <div className="flex items-center gap-1 bg-black/30 border border-white/10 rounded-xl p-0.5 text-xs">
              {/* Range length selector */}
              {[7, 14, 21, 30].map(len => (
                <button
                  key={len}
                  onClick={() => setRangeLength(len as any)}
                  className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-colors cursor-pointer ${
                    rangeLength === len 
                      ? 'bg-white/20 text-white font-bold' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {len}D
                </button>
              ))}

              <div className="w-[1px] h-3 bg-white/10 mx-1" />

              {/* Offset pager */}
              <button
                onClick={() => setDayOffset(prev => prev + 7)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer"
                title={language === 'pl' ? 'Wcześniej o 7 dni' : 'Earlier 7 days'}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {dayOffset !== 0 && (
                <button
                  onClick={() => setDayOffset(0)}
                  className="px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded font-medium hover:bg-purple-500/30 cursor-pointer"
                >
                  {language === 'pl' ? 'Dziś' : 'Today'}
                </button>
              )}

              <button
                onClick={() => setDayOffset(prev => Math.max(0, prev - 7))}
                disabled={dayOffset === 0}
                className={`p-1 rounded cursor-pointer ${
                  dayOffset === 0 
                    ? 'text-slate-600 cursor-not-allowed' 
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
                title={language === 'pl' ? 'Później o 7 dni' : 'Later 7 days'}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* VIEW 1: MATRIX TABLE (Habits x Dates) */}
      {viewMode === 'matrix' && (
        <div className="glass-card rounded-[20px] border border-white/10 bg-[#121215]/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse text-xs">
              
              {/* Header Row */}
              <thead onContextMenu={handleTableContextMenu}>
                <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 font-medium">
                  {/* Sticky left columns */}
                  <th className="sticky left-0 z-20 bg-[#141418] px-4 py-3 min-w-[200px] sm:min-w-[240px] border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Hash className="w-3.5 h-3.5 text-slate-400" />
                      <span>{language === 'pl' ? 'Nawyk' : 'Habit'}</span>
                    </div>
                  </th>

                  <th className="px-3 py-3 min-w-[70px] text-center border-r border-white/5">
                    <div className="flex items-center justify-center gap-1" title={language === 'pl' ? 'Aktualna seria' : 'Current streak'}>
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      <span>{language === 'pl' ? 'Seria' : 'Streak'}</span>
                    </div>
                  </th>

                  <th className="px-3 py-3 min-w-[85px] text-center border-r border-white/5">
                    <div className="flex items-center justify-center gap-1" title={language === 'pl' ? 'Wskaźnik ukończenia 30 dni' : '30-day completion rate'}>
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      <span>{language === 'pl' ? 'Postęp' : 'Rate'}</span>
                    </div>
                  </th>

                  {/* Date Columns */}
                  {dateColumns.map(dateStr => {
                    const isCurrentDay = dateStr === todayStr;
                    const isYesterdayDate = dateStr === yesterdayStr;
                    const dateObj = parseISO(dateStr);
                    const dayOfWeek = format(dateObj, 'eeeee', { locale: language === 'pl' ? pl : undefined }).toUpperCase();
                    const dayNum = format(dateObj, 'd');
                    const monthName = format(dateObj, 'MMM', { locale: language === 'pl' ? pl : undefined });

                    return (
                      <th 
                        key={dateStr}
                        className={`px-2 py-2 text-center min-w-[44px] max-w-[50px] border-r border-white/5 transition-colors ${
                          isCurrentDay 
                            ? 'bg-purple-900/30 font-bold text-purple-200' 
                            : isYesterdayDate 
                              ? 'bg-white/[0.02] text-slate-300' 
                              : 'text-slate-400'
                        }`}
                        title={format(dateObj, 'EEEE, d MMMM yyyy', { locale: language === 'pl' ? pl : undefined })}
                      >
                        <div className="flex flex-col items-center">
                          <span className={`text-[9px] uppercase tracking-wider ${isCurrentDay ? 'text-purple-300 font-bold' : 'text-slate-500'}`}>
                            {dayOfWeek}
                          </span>
                          <span className={`text-xs mt-0.5 ${isCurrentDay ? 'px-1.5 py-0.5 rounded-full bg-purple-500 text-white font-bold' : 'text-slate-200'}`}>
                            {dayNum}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Body Rows */}
              <tbody className="divide-y divide-white/5">
                {processedHabits.map((habit, habitIdx) => {
                  const stats = calculateHabitStats(habit.completedDates);
                  const isArchived = habit.status === 'archived';

                  return (
                    <tr 
                      key={habit.id}
                      onContextMenu={(e) => handleHabitRowContextMenu(e, habit)}
                      className={`hover:bg-white/[0.04] transition-colors group ${
                        isArchived ? 'opacity-60 bg-white/[0.01]' : ''
                      }`}
                    >
                      {/* Habit Name Column (Sticky) */}
                      <td className="sticky left-0 z-10 bg-[#141418] group-hover:bg-[#181820] transition-colors px-4 py-2.5 border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center justify-between gap-2">
                          <div 
                            className="flex items-center gap-2.5 cursor-pointer min-w-0 flex-1"
                            onClick={() => setSelectedHabitForDetail(habit)}
                            title={language === 'pl' ? 'Kliknij, aby otworzyć szczegóły i statystyki' : 'Click to view details and statistics'}
                          >
                            <span 
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0 shadow-inner"
                              style={{ backgroundColor: `${habit.color}25` }}
                            >
                              {habit.icon}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-100 truncate block text-xs group-hover:text-purple-300 transition-colors">
                                {habit.name}
                              </span>
                              <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                <span>
                                  {habit.target_count > 1 ? `${habit.target_count} ${habit.unit || ''}` : (language === 'pl' ? '1x dziennie' : '1x daily')}
                                </span>
                                {habit.frequency === 'weekly' && (
                                  <span className="text-blue-400 font-medium">{language === 'pl' ? 'Tyg.' : 'Wk.'}</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Quick open button */}
                          <button
                            onClick={() => setSelectedHabitForDetail(habit)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 transition-all shrink-0 cursor-pointer"
                            title={language === 'pl' ? 'Otwórz stronę nawyku' : 'Open habit page'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>

                      {/* Streak Column */}
                      <td className="px-3 py-2.5 text-center border-r border-white/5">
                        <div className="flex items-center justify-center gap-1 font-mono font-bold">
                          <span className={stats.currentStreak > 0 ? 'text-orange-400' : 'text-slate-600'}>
                            {stats.currentStreak}
                          </span>
                          {stats.currentStreak > 0 && (
                            <span className="text-[10px] text-slate-500 font-normal">
                              /{stats.longestStreak}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Progress / Rate Column */}
                      <td className="px-3 py-2.5 border-r border-white/5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-mono font-semibold text-slate-300">
                            {stats.completionRate30Days}%
                          </span>
                          <div className="w-12 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500"
                              style={{ 
                                width: `${stats.completionRate30Days}%`,
                                backgroundColor: habit.color 
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Checkbox Columns for each Date */}
                      {dateColumns.map(dateStr => {
                        const isCurrentDay = dateStr === todayStr;
                        const isPast = dateStr < todayStr;
                        const isCompleted = habit.completedDates.includes(dateStr);
                        const isSkipped = habit.skippedDates?.includes(dateStr);
                        const currentProgress = isCompleted ? habit.target_count : (habit.progress?.[dateStr] || 0);
                        const isOverdue = isPast && !isCompleted && !isSkipped;

                        return (
                          <td 
                            key={dateStr}
                            onContextMenu={(e) => handleCellContextMenu(e, habit, dateStr)}
                            className={`p-1 text-center border-r border-white/5 transition-colors ${
                              isCurrentDay ? 'bg-purple-950/15' : ''
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {habit.target_count === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => handleCellClick(habit, dateStr)}
                                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer relative group/cell ${
                                    isCompleted 
                                      ? 'shadow-sm hover:scale-105' 
                                      : isOverdue 
                                        ? 'border border-dashed border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10' 
                                        : isSkipped 
                                          ? 'border border-white/10 bg-white/5' 
                                          : 'border border-white/10 hover:border-white/30 hover:bg-white/5'
                                  }`}
                                  style={{
                                    backgroundColor: isCompleted ? `${habit.color}35` : undefined,
                                    borderColor: isCompleted ? habit.color : undefined
                                  }}
                                  title={`${habit.name} - ${dateStr}${isOverdue ? ` (${language === 'pl' ? 'Zaległy nawyk! Kliknij by zaliczyć' : 'Overdue! Click to complete'})` : ''}`}
                                >
                                  {isCompleted ? (
                                    <Check className="w-4 h-4 drop-shadow" style={{ color: habit.color }} />
                                  ) : isOverdue ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover/cell:scale-150 transition-transform" />
                                  ) : isSkipped ? (
                                    <span className="text-[10px] text-slate-500">-</span>
                                  ) : (
                                    <span className="opacity-0 group-hover/cell:opacity-100 text-slate-400 text-xs">
                                      +
                                    </span>
                                  )}
                                </button>
                              ) : (
                                // Multi-target counter cell
                                <button
                                  type="button"
                                  onClick={() => handleCellClick(habit, dateStr)}
                                  className={`min-w-[28px] h-7 px-1.5 rounded-lg flex items-center justify-center gap-0.5 text-[11px] font-mono font-bold transition-all cursor-pointer ${
                                    isCompleted 
                                      ? 'shadow-sm hover:scale-105' 
                                      : isOverdue 
                                        ? 'border border-dashed border-amber-500/40 hover:border-amber-400 hover:bg-amber-500/10' 
                                        : currentProgress > 0 
                                          ? 'border border-purple-500/50 bg-purple-500/20' 
                                          : 'border border-white/10 hover:border-white/30 hover:bg-white/5'
                                  }`}
                                  style={{
                                    backgroundColor: isCompleted ? `${habit.color}35` : undefined,
                                    borderColor: isCompleted ? habit.color : undefined,
                                    color: isCompleted ? habit.color : undefined
                                  }}
                                  title={`${habit.name} (${currentProgress}/${habit.target_count}) - ${dateStr}`}
                                >
                                  {isCompleted ? (
                                    <Check className="w-3.5 h-3.5 drop-shadow" />
                                  ) : currentProgress > 0 ? (
                                    <span className="text-purple-300">{currentProgress}</span>
                                  ) : isOverdue ? (
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  ) : (
                                    <span className="opacity-0 group-hover:opacity-100 text-slate-400 text-xs">+</span>
                                  )}
                                </button>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Empty State */}
                {processedHabits.length === 0 && (
                  <tr>
                    <td colSpan={dateColumns.length + 3} className="py-12 text-center text-slate-500">
                      <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                      <p className="text-sm font-medium">
                        {language === 'pl' ? 'Brak nawyków pasujących do filtrów.' : 'No habits match the filters.'}
                      </p>
                      <button
                        onClick={() => { setSearchQuery(''); setStatusFilter('all'); }}
                        className="mt-2 text-xs text-purple-400 hover:underline cursor-pointer"
                      >
                        {language === 'pl' ? 'Wyczyść filtry' : 'Reset filters'}
                      </button>
                    </td>
                  </tr>
                )}

                {/* Notion Inline "+ Nowy" Row */}
                {isInlineAdding ? (
                  <tr className="bg-white/[0.04] border-t border-purple-500/30">
                    <td colSpan={dateColumns.length + 3} className="p-3">
                      <form onSubmit={handleCreateInlineHabit} className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newHabitIcon}
                            onChange={(e) => setNewHabitIcon(e.target.value)}
                            className="w-8 h-8 text-center text-lg bg-black/50 border border-white/10 rounded-lg focus:outline-none"
                            maxLength={2}
                          />
                          <input
                            type="text"
                            value={newHabitName}
                            onChange={(e) => setNewHabitName(e.target.value)}
                            placeholder={language === 'pl' ? 'Nazwa nowego nawyku...' : 'New habit name...'}
                            autoFocus
                            className="px-3 py-1.5 bg-black/50 border border-white/15 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500 w-48 sm:w-64 font-semibold"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ec4899'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setNewHabitColor(c)}
                              className={`w-4 h-4 rounded-full border ${newHabitColor === c ? 'border-white scale-110' : 'border-transparent'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400">{language === 'pl' ? 'Cel:' : 'Target:'}</span>
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={newHabitTarget}
                            onChange={(e) => setNewHabitTarget(Number(e.target.value))}
                            className="w-12 px-1.5 py-1 bg-black/50 border border-white/10 rounded text-center text-xs text-white"
                          />
                          <input
                            type="text"
                            value={newHabitUnit}
                            onChange={(e) => setNewHabitUnit(e.target.value)}
                            placeholder={language === 'pl' ? 'jednostka (np. szklanki)' : 'unit (e.g. glasses)'}
                            className="px-2 py-1 bg-black/50 border border-white/10 rounded text-xs text-white w-28 placeholder:text-slate-600"
                          />
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                          <button
                            type="submit"
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold shadow transition-colors cursor-pointer"
                          >
                            {language === 'pl' ? 'Dodaj nawyk' : 'Add habit'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsInlineAdding(false)}
                            className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/10 cursor-pointer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </form>
                    </td>
                  </tr>
                ) : (
                  <tr className="hover:bg-white/[0.02] transition-colors">
                    <td 
                      colSpan={dateColumns.length + 3} 
                      className="px-4 py-2 cursor-pointer text-slate-400 hover:text-purple-300 font-medium text-xs transition-colors"
                      onClick={() => setIsInlineAdding(true)}
                    >
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5" />
                        <span>{language === 'pl' ? '+ Nowy nawyk w tabeli' : '+ New habit in database'}</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Notion Calculation Footer Row ("Calculate") */}
              <tfoot>
                <tr className="border-t-2 border-white/15 bg-black/40 text-slate-400 font-mono text-[10px]">
                  {/* Summary for Name Column */}
                  <td className="sticky left-0 z-20 bg-[#121216] px-4 py-2.5 border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center justify-between text-slate-300 font-sans font-semibold">
                      <span>{language === 'pl' ? 'Oblicz / Podsumowanie' : 'Calculate'}</span>
                      <span className="text-purple-400 font-mono font-bold text-xs">{processedHabits.length}</span>
                    </div>
                  </td>

                  {/* Avg Streak */}
                  <td className="px-2 py-2.5 text-center border-r border-white/5">
                    {(() => {
                      if (processedHabits.length === 0) return '-';
                      const sum = processedHabits.reduce((acc, h) => acc + calculateHabitStats(h.completedDates).currentStreak, 0);
                      return `${Math.round(sum / processedHabits.length)}d`;
                    })()}
                  </td>

                  {/* Avg Rate */}
                  <td className="px-2 py-2.5 text-center border-r border-white/5">
                    {(() => {
                      if (processedHabits.length === 0) return '-';
                      const sum = processedHabits.reduce((acc, h) => acc + (calculateHabitStats(h.completedDates).completionRate30Days || 0), 0);
                      return `${Math.round(sum / processedHabits.length)}%`;
                    })()}
                  </td>

                  {/* Totals for each Date column */}
                  {dateColumns.map(dateStr => {
                    const completedForDate = processedHabits.filter(h => h.completedDates.includes(dateStr)).length;
                    const totalActive = processedHabits.filter(h => h.status !== 'archived').length;
                    const pct = totalActive > 0 ? Math.round((completedForDate / totalActive) * 100) : 0;
                    const isCurrentDay = dateStr === todayStr;

                    return (
                      <td 
                        key={dateStr}
                        className={`p-1.5 text-center border-r border-white/5 ${isCurrentDay ? 'bg-purple-950/20 font-bold text-purple-300' : ''}`}
                      >
                        <div className="flex flex-col items-center leading-tight">
                          <span className="text-[10px] text-slate-200">{completedForDate}</span>
                          <span className="text-[8px] text-slate-500">{pct}%</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: DAYS LOG (Rows = Days, Columns = Habits) */}
      {viewMode === 'days_log' && (
        <div className="glass-card rounded-[20px] border border-white/10 bg-[#121215]/90 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-slate-400 font-medium">
                  <th className="sticky left-0 z-20 bg-[#141418] px-4 py-3 min-w-[170px] border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{language === 'pl' ? 'Data' : 'Date'}</span>
                    </div>
                  </th>

                  <th className="px-3 py-3 min-w-[120px] text-center border-r border-white/5">
                    <span>{language === 'pl' ? 'Wynik dnia' : 'Day Score'}</span>
                  </th>

                  <th className="px-3 py-3 min-w-[110px] text-center border-r border-white/5">
                    <span>{language === 'pl' ? 'Status' : 'Status'}</span>
                  </th>

                  {/* One column per habit */}
                  {processedHabits.map(habit => (
                    <th 
                      key={habit.id}
                      className="px-3 py-2 text-center min-w-[90px] border-r border-white/5"
                      title={habit.name}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-sm">{habit.icon}</span>
                        <span className="truncate max-w-[70px] font-semibold text-slate-200">{habit.name}</span>
                      </div>
                    </th>
                  ))}

                  <th className="px-3 py-3 text-center min-w-[100px]">
                    <span>{language === 'pl' ? 'Akcje' : 'Actions'}</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5 font-sans">
                {dateColumns.slice().reverse().map(dateStr => {
                  const isCurrentDay = dateStr === todayStr;
                  const isYesterdayDate = dateStr === yesterdayStr;
                  const dateObj = parseISO(dateStr);
                  const isPast = dateStr < todayStr;

                  const activeHabits = processedHabits.filter(h => h.status !== 'archived');
                  const completedOnDay = activeHabits.filter(h => h.completedDates.includes(dateStr)).length;
                  const total = activeHabits.length;
                  const dayRate = total > 0 ? Math.round((completedOnDay / total) * 100) : 0;
                  const isAllDone = total > 0 && completedOnDay === total;
                  const isOverdueDay = isPast && completedOnDay < total;

                  return (
                    <tr 
                      key={dateStr}
                      onContextMenu={(e) => handleDayRowContextMenu(e, dateStr)}
                      className={`hover:bg-white/[0.04] transition-colors ${
                        isCurrentDay ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      {/* Date Title Column */}
                      <td className="sticky left-0 z-10 bg-[#141418] px-4 py-3 border-r border-white/10 shadow-[2px_0_10px_rgba(0,0,0,0.5)]">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isAllDone ? 'bg-emerald-400' : isCurrentDay ? 'bg-purple-400 animate-ping' : isOverdueDay ? 'bg-amber-400' : 'bg-slate-600'
                          }`} />
                          <div>
                            <span className="font-bold text-slate-100 block text-xs">
                              {isCurrentDay 
                                ? (language === 'pl' ? 'Dzisiaj' : 'Today')
                                : isYesterdayDate 
                                  ? (language === 'pl' ? 'Wczoraj' : 'Yesterday')
                                  : format(dateObj, 'd MMMM', { locale: language === 'pl' ? pl : undefined })}
                            </span>
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
                              {format(dateObj, 'EEEE', { locale: language === 'pl' ? pl : undefined })}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Day Score */}
                      <td className="px-3 py-3 border-r border-white/5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className="flex items-center gap-1.5 font-mono font-bold text-xs">
                            <span className={isAllDone ? 'text-emerald-400' : 'text-slate-200'}>
                              {completedOnDay}/{total}
                            </span>
                            <span className="text-[10px] text-slate-500">({dayRate}%)</span>
                          </div>
                          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                isAllDone ? 'bg-emerald-400' : 'bg-purple-500'
                              }`}
                              style={{ width: `${dayRate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="px-3 py-3 border-r border-white/5 text-center">
                        {isAllDone ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold border border-emerald-500/30">
                            {language === 'pl' ? 'Perfekcyjnie 🌟' : 'Perfect 🌟'}
                          </span>
                        ) : isOverdueDay ? (
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-medium border border-amber-500/30">
                            {language === 'pl' ? 'Zaległości' : 'Overdue'}
                          </span>
                        ) : isCurrentDay ? (
                          <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 text-[10px] font-medium border border-purple-500/30">
                            {language === 'pl' ? 'W toku' : 'In progress'}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {dayRate}%
                          </span>
                        )}
                      </td>

                      {/* Habits Checkbox columns */}
                      {processedHabits.map(habit => {
                        const isCompleted = habit.completedDates.includes(dateStr);
                        const isOverdue = isPast && !isCompleted && !habit.skippedDates?.includes(dateStr);

                        return (
                          <td 
                            key={habit.id} 
                            onContextMenu={(e) => handleCellContextMenu(e, habit, dateStr)}
                            className="p-2 border-r border-white/5 text-center"
                          >
                            <button
                              type="button"
                              onClick={() => handleCellClick(habit, dateStr)}
                              className={`w-6 h-6 mx-auto rounded-md flex items-center justify-center transition-all cursor-pointer ${
                                isCompleted 
                                  ? 'shadow-sm' 
                                  : isOverdue 
                                    ? 'border border-dashed border-amber-500/50 hover:bg-amber-500/20' 
                                    : 'border border-white/15 hover:border-white/40'
                              }`}
                              style={{
                                backgroundColor: isCompleted ? habit.color : undefined,
                                borderColor: isCompleted ? habit.color : undefined
                              }}
                            >
                              {isCompleted && <Check className="w-3.5 h-3.5 text-white" />}
                              {isOverdue && !isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                            </button>
                          </td>
                        );
                      })}

                      {/* Day Actions */}
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => {
                            activeHabits.forEach(h => {
                              if (!h.completedDates.includes(dateStr)) {
                                toggleHabit(h.id, dateStr);
                              }
                            });
                          }}
                          className="px-2 py-1 rounded text-[10px] font-medium bg-white/10 hover:bg-white/20 text-slate-300 transition-colors cursor-pointer"
                        >
                          {language === 'pl' ? 'Zalicz dzień' : 'Complete all'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 3: GALLERY VIEW (Notion Cards & Deep Stats) */}
      {viewMode === 'gallery' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {processedHabits.map(habit => {
            const stats = calculateHabitStats(habit.completedDates);
            const last14Days = Array.from({ length: 14 }).map((_, i) => getLocalDateStr(subDays(new Date(), 13 - i)));
            
            // Check overdue in past 7 days
            const overdueDaysLast7 = Array.from({ length: 7 })
              .map((_, i) => getLocalDateStr(subDays(new Date(), i + 1)))
              .filter(d => !habit.completedDates.includes(d) && !habit.skippedDates?.includes(d));

            return (
              <div 
                key={habit.id}
                onClick={() => setSelectedHabitForDetail(habit)}
                onContextMenu={(e) => handleHabitRowContextMenu(e, habit)}
                className="glass-card rounded-[22px] border border-white/10 hover:border-purple-500/40 transition-all p-5 bg-[#141418]/90 hover:bg-[#181820] cursor-pointer group shadow-xl relative overflow-hidden flex flex-col justify-between"
              >
                {/* Top Accent line */}
                <div 
                  className="absolute top-0 inset-x-0 h-1 transition-all group-hover:h-1.5"
                  style={{ backgroundColor: habit.color }}
                />

                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl shadow-inner shrink-0"
                        style={{ backgroundColor: `${habit.color}25` }}
                      >
                        {habit.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm group-hover:text-purple-300 transition-colors">
                          {habit.name}
                        </h3>
                        <p className="text-slate-500 text-[11px] font-medium">
                          {habit.target_count > 1 
                            ? `${language === 'pl' ? 'Cel' : 'Goal'}: ${habit.target_count} ${habit.unit || ''}` 
                            : (language === 'pl' ? '1 raz dziennie' : '1x daily')}
                        </p>
                      </div>
                    </div>

                    <span className="p-1.5 rounded-lg bg-white/5 text-slate-400 group-hover:text-white transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  {/* Streak & Metrics Grid */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5 mb-4 text-center">
                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                        {language === 'pl' ? 'Seria' : 'Streak'}
                      </span>
                      <span className="text-sm font-bold font-mono text-orange-400 flex items-center justify-center gap-0.5">
                        <Flame className="w-3 h-3 text-orange-500" />
                        {stats.currentStreak}d
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                        {language === 'pl' ? 'Rekord' : 'Best'}
                      </span>
                      <span className="text-sm font-bold font-mono text-amber-300 flex items-center justify-center gap-0.5">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        {stats.longestStreak}d
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase text-slate-500 font-semibold block">
                        {language === 'pl' ? '30 dni' : '30 days'}
                      </span>
                      <span className="text-sm font-bold font-mono text-purple-300">
                        {stats.completionRate30Days}%
                      </span>
                    </div>
                  </div>

                  {/* 14-day Mini Matrix dots */}
                  <div className="mb-4">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block mb-1.5">
                      {language === 'pl' ? 'Ostatnie 14 dni' : 'Last 14 days'}
                    </span>
                    <div className="grid grid-cols-14 gap-1">
                      {last14Days.map(dateStr => {
                        const isDone = habit.completedDates.includes(dateStr);
                        const isMissed = dateStr < todayStr && !isDone;
                        const isCurrent = dateStr === todayStr;

                        return (
                          <div 
                            key={dateStr}
                            className={`h-4 rounded-sm transition-all ${
                              isDone 
                                ? 'shadow-sm' 
                                : isMissed 
                                  ? 'bg-amber-500/20 border border-amber-500/30' 
                                  : 'bg-white/5'
                            }`}
                            style={{ 
                              backgroundColor: isDone ? habit.color : undefined 
                            }}
                            title={`${dateStr}: ${isDone ? 'Ukończono' : isMissed ? 'Zaległy' : 'Brak'}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs">
                  {overdueDaysLast7.length > 0 ? (
                    <span className="text-amber-400 text-[11px] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {overdueDaysLast7.length} {language === 'pl' ? 'zaległych w tym tyg.' : 'overdue this week'}
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      {language === 'pl' ? 'Brak zaległości' : 'Up to date'}
                    </span>
                  )}

                  <span className="text-slate-400 group-hover:text-purple-300 font-medium text-[11px] flex items-center gap-1">
                    {language === 'pl' ? 'Otwórz bazę' : 'Open'} →
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* NOTION HABIT DETAIL DRAWER / PAGE MODAL */}
      <AnimatePresence>
        {selectedHabitForDetail && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4 font-sans text-white">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/75 backdrop-blur-md"
              onClick={() => setSelectedHabitForDetail(null)}
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#18181c] border border-white/15 rounded-[28px] shadow-2xl z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Cover Banner */}
              <div 
                className="h-28 sm:h-36 w-full relative"
                style={{ 
                  background: `linear-gradient(135deg, ${selectedHabitForDetail.color}40 0%, #18181c 100%)` 
                }}
              >
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <button
                    onClick={() => setSelectedHabitForDetail(null)}
                    className="p-1.5 rounded-full bg-black/40 hover:bg-black/60 text-slate-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div 
                  className="absolute -bottom-6 left-6 w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-2xl border border-white/20"
                  style={{ backgroundColor: selectedHabitForDetail.color }}
                >
                  {selectedHabitForDetail.icon}
                </div>
              </div>

              {/* Modal Body */}
              <div className="pt-9 p-6 overflow-y-auto flex-1 space-y-6">
                
                {/* Title & Description */}
                <div>
                  <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                    {selectedHabitForDetail.name}
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    {language === 'pl' ? 'Wpis w bazie danych Notion' : 'Notion Database Entry'} • {selectedHabitForDetail.frequency === 'weekly' ? (language === 'pl' ? 'Tygodniowy' : 'Weekly') : (language === 'pl' ? 'Codzienny' : 'Daily')}
                  </p>
                </div>

                {/* Notion Property Table */}
                <div className="rounded-2xl border border-white/10 bg-black/40 overflow-hidden divide-y divide-white/5 text-xs">
                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      {language === 'pl' ? 'Status' : 'Status'}
                    </span>
                    <div className="col-span-2">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        selectedHabitForDetail.status === 'archived' ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {selectedHabitForDetail.status === 'archived' ? (language === 'pl' ? 'Zarchiwizowany' : 'Archived') : (language === 'pl' ? 'Aktywny' : 'Active')}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" />
                      {language === 'pl' ? 'Aktualna seria' : 'Current Streak'}
                    </span>
                    <div className="col-span-2 font-mono font-bold text-orange-400 text-sm">
                      {calculateHabitStats(selectedHabitForDetail.completedDates).currentStreak} {language === 'pl' ? 'dni z rzędu' : 'days streak'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      {language === 'pl' ? 'Najlepsza seria' : 'Best Streak'}
                    </span>
                    <div className="col-span-2 font-mono font-bold text-amber-300 text-sm">
                      {calculateHabitStats(selectedHabitForDetail.completedDates).longestStreak} {language === 'pl' ? 'dni' : 'days'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-400" />
                      {language === 'pl' ? 'Wskaźnik (30D)' : 'Completion (30D)'}
                    </span>
                    <div className="col-span-2 font-mono font-bold text-purple-300 text-sm">
                      {calculateHabitStats(selectedHabitForDetail.completedDates).completionRate30Days}%
                    </div>
                  </div>

                  <div className="grid grid-cols-3 p-3 items-center">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                      {language === 'pl' ? 'Cel dzienny' : 'Target'}
                    </span>
                    <div className="col-span-2 text-slate-200">
                      {selectedHabitForDetail.target_count} {selectedHabitForDetail.unit || ''}
                    </div>
                  </div>
                </div>

                {/* 60-Day Interactive Calendar Heatmap */}
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {language === 'pl' ? 'Historia i zaległości (ostatnie 60 dni)' : 'History & Overdue (Last 60 Days)'}
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      {language === 'pl' ? 'Kliknij pole, aby uzupełnić zaległy dzień' : 'Click a box to complete overdue day'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10">
                    <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                      {(() => {
                        const days = [];
                        for (let i = 59; i >= 0; i--) {
                          days.push(getLocalDateStr(subDays(new Date(), i)));
                        }
                        return days.map(dStr => {
                          const isDone = selectedHabitForDetail.completedDates.includes(dStr);
                          const isMissed = dStr < todayStr && !isDone;
                          const isCur = dStr === todayStr;

                          return (
                            <button
                              key={dStr}
                              type="button"
                              onClick={() => {
                                handleCellClick(selectedHabitForDetail, dStr);
                                // Refresh current detail habit view
                                const fresh = habits.find(h => h.id === selectedHabitForDetail.id);
                                if (fresh) setSelectedHabitForDetail(fresh);
                              }}
                              className={`w-6 h-6 rounded-md transition-all cursor-pointer flex items-center justify-center text-[10px] ${
                                isDone 
                                  ? 'hover:scale-110 shadow-sm' 
                                  : isMissed 
                                    ? 'bg-amber-500/15 border border-dashed border-amber-500/40 hover:bg-amber-500/30' 
                                    : 'bg-white/5 hover:bg-white/10 border border-white/10'
                              }`}
                              style={{ 
                                backgroundColor: isDone ? selectedHabitForDetail.color : undefined 
                              }}
                              title={`${dStr}: ${isDone ? 'Ukończono' : isMissed ? 'Zaległy - kliknij by zaliczyć' : 'Nieukończono'}`}
                            >
                              {isDone ? (
                                <Check className="w-3 h-3 text-white" />
                              ) : isMissed ? (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                              ) : null}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>

                {/* Overdue Days Catch-Up List */}
                {(() => {
                  const overdueList = Array.from({ length: 30 })
                    .map((_, i) => getLocalDateStr(subDays(new Date(), i + 1)))
                    .filter(d => !selectedHabitForDetail.completedDates.includes(d) && !selectedHabitForDetail.skippedDates?.includes(d));

                  if (overdueList.length === 0) return null;

                  return (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {language === 'pl' ? `Zaległe dni (${overdueList.length} w ost. 30 dniach)` : `Overdue days (${overdueList.length} in last 30d)`}
                        </h4>
                        <button
                          onClick={() => {
                            overdueList.forEach(d => toggleHabit(selectedHabitForDetail.id, d));
                            const fresh = habits.find(h => h.id === selectedHabitForDetail.id);
                            if (fresh) setSelectedHabitForDetail(fresh);
                          }}
                          className="text-[11px] text-amber-300 hover:text-white underline cursor-pointer"
                        >
                          {language === 'pl' ? 'Zalicz wszystkie zaległe' : 'Catch up all'}
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-3 rounded-xl bg-amber-950/20 border border-amber-500/20">
                        {overdueList.map(dStr => (
                          <button
                            key={dStr}
                            onClick={() => {
                              toggleHabit(selectedHabitForDetail.id, dStr);
                              const fresh = habits.find(h => h.id === selectedHabitForDetail.id);
                              if (fresh) setSelectedHabitForDetail(fresh);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 text-xs font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <span>{dStr}</span>
                            <Check className="w-3 h-3 text-amber-300" />
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notion Database Custom Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenu.items}
          title={contextMenu.title}
          onClose={() => setContextMenu(null)}
        />
      )}

    </div>
  );
}
