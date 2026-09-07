import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/AppContext';
import { 
  CheckCircle2, 
  Clock, 
  Calendar as CalendarIcon, 
  Target, 
  Activity, 
  Brain, 
  Flame, 
  Plus, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Timer, 
  TrendingUp, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductivityChart } from '../components/ProductivityChart';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { calculateHabitStats } from '../lib/utils';
import confetti from 'canvas-confetti';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { setDocumentWithMerge } from '../lib/db';

export function Dashboard() {
  const navigate = useNavigate();
  const { 
    tasks, 
    habits, 
    events, 
    googleEvents, 
    googleToken, 
    user,
    updateTask, 
    toggleHabit, 
    addHabit, 
    t, 
    language 
  } = useAppStore();

  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);
  const [showHabitCreator, setShowHabitCreator] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitIcon, setNewHabitIcon] = useState('🔥');
  const [newHabitColor, setNewHabitColor] = useState('#4ade80');

  // Collapsible section states (stored in localStorage & Firestore for persistent memory)
  const [collapsedSections, setCollapsedSections] = useState<{
    tasksCalendar: boolean;
    habits: boolean;
    focusTools: boolean;
  }>(() => {
    try {
      const saved = localStorage.getItem('dashboard_collapsed_v3');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      tasksCalendar: false, // open by default
      habits: false,        // open by default
      focusTools: true      // collapsed by default for maximum simplicity
    };
  });

  const toggleSection = (key: 'tasksCalendar' | 'habits' | 'focusTools') => {
    setCollapsedSections(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('dashboard_collapsed_v3', JSON.stringify(updated));
      } catch {}
      if (user && user.uid && user.uid !== 'demo_user') {
        setDocumentWithMerge(`users/${user.uid}/settings`, 'general', {
          dashboardSections: updated,
          updatedAt: new Date().toISOString()
        }).catch(() => {});
      }
      return updated;
    });
  };

  const areAllCollapsed = collapsedSections.tasksCalendar && collapsedSections.habits && collapsedSections.focusTools;

  const toggleCollapseAll = () => {
    const newState = areAllCollapsed
      ? { tasksCalendar: false, habits: false, focusTools: false }
      : { tasksCalendar: true, habits: true, focusTools: true };
    
    setCollapsedSections(newState);
    try {
      localStorage.setItem('dashboard_collapsed_v3', JSON.stringify(newState));
    } catch {}
    if (user && user.uid && user.uid !== 'demo_user') {
      setDocumentWithMerge(`users/${user.uid}/settings`, 'general', {
        dashboardSections: newState,
        updatedAt: new Date().toISOString()
      }).catch(() => {});
    }
  };

  const predefinedTags = ['Health', 'Work', 'Personal', 'Learning', 'Fitness'];
  const filteredHabits = activeFilterTag ? habits.filter(h => h.tags?.includes(activeFilterTag)) : habits;
  const activeTasks = tasks.filter(t => t.status !== 'done');

  const getLocalDateStr = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getLocalDateStr(new Date());

  const isGoogleConnected = Boolean(googleToken || localStorage.getItem('google_calendar_connected') === 'true');
  
  // Combine local and Google Calendar events safely
  const activeEvents = useMemo(() => {
    const map = new Map<string, typeof events[0]>();
    events.forEach(e => map.set(e.id, e));
    googleEvents.forEach(e => map.set(e.id, e));
    return Array.from(map.values());
  }, [events, googleEvents]);

  const todaysEvents = activeEvents.filter(e => e.date === todayStr);
  const todaysActiveTasks = tasks.filter(t => t.status !== 'done' && t.due_date === todayStr);
  const todaysCompletedTasks = tasks.filter(t => t.status === 'done' && t.due_date === todayStr);
  const completedHabitsToday = filteredHabits.filter(h => h.completedDates.includes(todayStr));

  // Calculate daily completion score
  const totalActionable = todaysActiveTasks.length + todaysCompletedTasks.length + filteredHabits.length;
  const totalCompleted = todaysCompletedTasks.length + completedHabitsToday.length;
  const dailyProgressPercent = totalActionable > 0 ? Math.round((totalCompleted / totalActionable) * 100) : 0;

  // Daily top focus items
  const focusItems = useMemo(() => {
    const items: Array<{
      id: string;
      type: 'task' | 'habit';
      title: string;
      subtitle: string;
      completed: boolean;
      score: number;
      color?: string;
      icon?: string;
      streak?: number;
    }> = [];

    tasks.forEach(tCode => {
      const isCompletedToday = tCode.status === 'done' && tCode.updatedAt?.startsWith(todayStr);
      if (tCode.status !== 'done' || isCompletedToday) {
        let score = 50;
        let priorityLabel = language === 'pl' ? 'Niski' : 'Low';
        if (tCode.priority === 'urgent') { score = 100; priorityLabel = language === 'pl' ? 'Pilny!' : 'Urgent!'; } 
        else if (tCode.priority === 'high') { score = 90; priorityLabel = language === 'pl' ? 'Wysoki' : 'High'; } 
        else if (tCode.priority === 'medium') { score = 70; priorityLabel = language === 'pl' ? 'Średni' : 'Medium'; }
        if (tCode.due_date === todayStr) score += 20;
        if (isCompletedToday) score -= 50;
        items.push({
          id: tCode.id,
          type: 'task',
          title: tCode.title,
          subtitle: language === 'pl' 
            ? `Zadanie • ${priorityLabel}${tCode.due_date === todayStr ? ' • Dziś' : ''}` 
            : `Task • ${priorityLabel}${tCode.due_date === todayStr ? ' • Today' : ''}`,
          completed: isCompletedToday,
          score,
          color: tCode.color || '#4ade80'
        });
      }
    });

    filteredHabits.forEach(h => {
      const isCompletedToday = h.completedDates.includes(todayStr);
      let score = 80;
      if (isCompletedToday) score -= 50;
      const { currentStreak } = calculateHabitStats(h.completedDates);
      items.push({
        id: h.id,
        type: 'habit',
        title: h.name,
        subtitle: language === 'pl' ? 'Nawyk dnia' : 'Daily habit',
        completed: isCompletedToday,
        score,
        icon: h.icon,
        color: h.color || '#4ade80',
        streak: currentStreak
      });
    });

    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 3);
  }, [tasks, filteredHabits, todayStr, language]);

  const handleToggleFocusItem = (item: typeof focusItems[0]) => {
    if (item.type === 'task') {
      updateTask(item.id, { status: item.completed ? 'todo' : 'done' });
    } else {
      toggleHabit(item.id, todayStr);
    }
    if (!item.completed) {
      try { confetti({ particleCount: 35, spread: 45, origin: { y: 0.7 } }); } catch {}
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'pl' ? 'Dzień dobry' : 'Good morning';
    if (hour < 18) return language === 'pl' ? 'Dobrego popołudnia' : 'Good afternoon';
    return language === 'pl' ? 'Dobry wieczór' : 'Good evening';
  };

  const handleQuickAddHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;
    addHabit({
      name: newHabitName.trim(),
      icon: newHabitIcon,
      color: newHabitColor,
      target_count: 1,
      frequency: 'daily',
      tags: activeFilterTag ? [activeFilterTag] : ['Personal']
    });
    setNewHabitName('');
    setShowHabitCreator(false);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-16 animate-in fade-in duration-500">
      
      {/* 1. Header with Calm Title and Quick Controls */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-medium text-[#4ade80] uppercase tracking-wider">
            <span>{new Date().toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            {isGoogleConnected && (
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 font-sans">
                <Check className="w-3 h-3" /> Google Calendar
              </span>
            )}
          </div>
          <h1 className="text-3xl font-display font-bold text-white mt-1 tracking-tight">{getGreeting()}</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {language === 'pl' 
              ? `Podsumowanie dnia: ${todaysActiveTasks.length} zadań i ${todaysEvents.length} spotkań.` 
              : `Today's overview: ${todaysActiveTasks.length} tasks and ${todaysEvents.length} events.`}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Collapse/Expand All Button */}
          <button
            onClick={toggleCollapseAll}
            className="h-9 px-3.5 rounded-xl bg-[#141414] hover:bg-[#1f1f1f] text-slate-300 hover:text-white border border-[#262626] transition-all flex items-center gap-1.5 text-xs font-medium cursor-pointer"
            title={areAllCollapsed ? (language === 'pl' ? 'Rozwiń wszystkie sekcje' : 'Expand all') : (language === 'pl' ? 'Zwiń wszystkie sekcje' : 'Collapse all')}
          >
            {areAllCollapsed ? (
              <>
                <Eye className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>{language === 'pl' ? 'Rozwiń wszystko' : 'Expand all'}</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>{language === 'pl' ? 'Zwiń wszystko' : 'Collapse all'}</span>
              </>
            )}
          </button>

          {/* Filter by Tag Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={`h-9 px-3.5 rounded-xl font-medium transition-all border flex items-center gap-1.5 text-xs cursor-pointer ${activeFilterTag ? 'bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30' : 'bg-[#141414] text-slate-300 border-[#262626] hover:text-white'}`}>
                <Filter className="w-3.5 h-3.5" />
                <span>{activeFilterTag || (language === 'pl' ? 'Tagi' : 'Tags')}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[150px] bg-[#1a1a1a] border border-[#333] rounded-2xl p-1.5 shadow-2xl animate-in fade-in zoom-in-95" sideOffset={8}>
                <DropdownMenu.Item 
                  onClick={() => setActiveFilterTag(null)}
                  className={`px-3 py-2 text-xs rounded-xl cursor-pointer outline-none ${!activeFilterTag ? 'bg-[#4ade80]/20 text-[#4ade80] font-semibold' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {language === 'pl' ? 'Wszystkie tagi' : 'All tags'}
                </DropdownMenu.Item>
                {predefinedTags.map(tag => (
                  <DropdownMenu.Item 
                    key={tag}
                    onClick={() => setActiveFilterTag(tag)}
                    className={`px-3 py-2 text-xs rounded-xl cursor-pointer outline-none ${activeFilterTag === tag ? 'bg-[#4ade80]/20 text-[#4ade80] font-semibold' : 'text-slate-300 hover:bg-white/10'}`}
                  >
                    {tag}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* 2. Compact Unified 4-Metric Strip */}
      <div className="bg-[#121212] border border-[#222222] rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-[#222222]">
        
        {/* Metric 1: Tasks */}
        <div 
          onClick={() => navigate('/tasks')} 
          className="flex items-center gap-3.5 px-2 pt-2 md:pt-0 cursor-pointer group hover:opacity-85 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium truncate">{language === 'pl' ? 'Zadania na dziś' : "Today's Tasks"}</div>
            <div className="text-xl font-display font-bold text-white flex items-center gap-1.5">
              <span>{todaysActiveTasks.length}</span>
              <span className="text-xs text-slate-500 font-mono font-normal">/ {tasks.length} {language === 'pl' ? 'wszystkich' : 'total'}</span>
            </div>
          </div>
        </div>

        {/* Metric 2: Events */}
        <div 
          onClick={() => navigate('/calendar')} 
          className="flex items-center gap-3.5 px-2 pt-2 md:pt-0 cursor-pointer group hover:opacity-85 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium truncate">{language === 'pl' ? 'Spotkania' : 'Meetings'}</div>
            <div className="text-xl font-display font-bold text-white flex items-center gap-1.5">
              <span>{todaysEvents.length}</span>
              <span className="text-xs text-slate-500 font-mono font-normal">{language === 'pl' ? 'dzisiaj' : 'today'}</span>
            </div>
          </div>
        </div>

        {/* Metric 3: Habits */}
        <div 
          onClick={() => navigate('/habits')} 
          className="flex items-center gap-3.5 px-2 pt-2 md:pt-0 cursor-pointer group hover:opacity-85 transition-opacity"
        >
          <div className="w-10 h-10 rounded-xl bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center text-[#4ade80] shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-slate-400 font-medium truncate">{language === 'pl' ? 'Nawyki' : 'Habits'}</div>
            <div className="text-xl font-display font-bold text-white flex items-center gap-1.5">
              <span>{completedHabitsToday.length}</span>
              <span className="text-xs text-slate-500 font-mono font-normal">/ {filteredHabits.length} {language === 'pl' ? 'ukończone' : 'done'}</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Overall Progress */}
        <div className="flex items-center gap-3.5 px-2 pt-2 md:pt-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex justify-between items-center text-xs text-slate-400 font-medium mb-1">
              <span>{language === 'pl' ? 'Postęp dnia' : 'Day Progress'}</span>
              <span className="font-mono text-[#4ade80] font-bold">{dailyProgressPercent}%</span>
            </div>
            <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#4ade80] rounded-full transition-all duration-500" 
                style={{ width: `${dailyProgressPercent}%` }} 
              />
            </div>
          </div>
        </div>

      </div>

      {/* 3. Daily Focus (Always visible, prominent, actionable) */}
      <section className="bg-[#121212] border border-[#222222] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-[#4ade80]" />
            <h2 className="text-base font-display font-bold text-white">
              {language === 'pl' ? 'Priorytety na dzisiaj' : 'Daily Priorities'}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">
            {focusItems.filter(i => i.completed).length}/{focusItems.length} {language === 'pl' ? 'zrobione' : 'completed'}
          </span>
        </div>

        {focusItems.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-sm">
            {language === 'pl' ? 'Brak pilnych zadań i nawyków na dzisiaj. Czysty umysł!' : 'All clear for today. Great job!'}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {focusItems.map(item => (
              <div 
                key={`${item.type}-${item.id}`}
                onClick={() => handleToggleFocusItem(item)}
                className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all cursor-pointer relative overflow-hidden group ${
                  item.completed 
                    ? 'bg-[#161616] border-[#222222] opacity-60' 
                    : 'bg-[#181818] border-[#2a2a2a] hover:border-[#4ade80]/40'
                }`}
              >
                {item.color && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1" 
                    style={{ backgroundColor: item.color }} 
                  />
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleFocusItem(item);
                  }}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all ${
                    item.completed 
                      ? 'bg-[#4ade80] border-[#4ade80] text-[#1a1a1a]' 
                      : 'border-slate-600 hover:border-[#4ade80]'
                  }`}
                >
                  {item.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-semibold truncate ${item.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    {item.title}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono truncate mt-0.5">
                    {item.subtitle}
                  </div>
                </div>
                {item.type === 'habit' && item.streak !== undefined && item.streak > 0 && (
                  <span className="flex items-center gap-1 text-[11px] font-mono font-bold text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded-full shrink-0">
                    <Flame className="w-3 h-3 fill-current" /> {item.streak}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. Collapsible Section: Zadania i Agenda */}
      <section className="bg-[#121212] border border-[#222222] rounded-2xl overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('tasksCalendar')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#171717] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm">
                {language === 'pl' ? 'Zadania na dziś i Agenda' : "Today's Tasks & Agenda"}
              </span>
              <span className="ml-2 text-xs font-mono text-slate-400">
                ({todaysActiveTasks.length} {language === 'pl' ? 'zadań' : 'tasks'}, {todaysEvents.length} {language === 'pl' ? 'spotkań' : 'events'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>{collapsedSections.tasksCalendar ? (language === 'pl' ? 'Rozwiń' : 'Expand') : (language === 'pl' ? 'Zwiń' : 'Collapse')}</span>
            {collapsedSections.tasksCalendar ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsed Preview Line */}
        {collapsedSections.tasksCalendar && (
          <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2 text-xs text-slate-400">
            {todaysActiveTasks.slice(0, 2).map(t => (
              <span key={t.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] border border-[#282828] text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span className="truncate max-w-[150px]">{t.title}</span>
              </span>
            ))}
            {todaysEvents.slice(0, 1).map(e => (
              <span key={e.id} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#181818] border border-[#282828] text-purple-300">
                <Clock className="w-3 h-3 text-purple-400" />
                <span className="truncate max-w-[150px]">{e.title} ({e.start_time})</span>
              </span>
            ))}
            {todaysActiveTasks.length === 0 && todaysEvents.length === 0 && (
              <span className="text-slate-500 italic">{language === 'pl' ? 'Brak zaplanowanych pozycji na dziś.' : 'No scheduled items for today.'}</span>
            )}
          </div>
        )}

        {/* Expanded Content */}
        <AnimatePresence initial={false}>
          {!collapsedSections.tasksCalendar && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 pt-2 border-t border-[#222222]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Left: Today's Tasks */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span>{language === 'pl' ? 'Zadania (termin: dzisiaj)' : "Tasks (Due today)"}</span>
                    <button 
                      onClick={() => navigate('/tasks')} 
                      className="text-[#4ade80] hover:underline flex items-center gap-1 font-sans text-xs capitalize"
                    >
                      {language === 'pl' ? 'Otwórz zadania' : 'View all'} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  {todaysActiveTasks.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 italic">
                      {language === 'pl' ? 'Wszystkie dzisiejsze zadania ukończone!' : 'All of today\'s tasks are done!'}
                    </p>
                  ) : (
                    todaysActiveTasks.slice(0, 5).map(task => (
                      <div 
                        key={task.id}
                        onClick={() => updateTask(task.id, { status: 'done' })}
                        className="p-3 rounded-xl bg-[#161616] border border-[#242424] hover:border-[#333] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button 
                            type="button" 
                            className="w-4 h-4 rounded border border-slate-600 group-hover:border-[#4ade80] shrink-0" 
                          />
                          <span className="text-sm font-medium text-white truncate">{task.title}</span>
                        </div>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 shrink-0">
                          {task.priority}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Right: Today's Agenda */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    <span>{language === 'pl' ? 'Kalendarz (spotkania)' : 'Calendar agenda'}</span>
                    <button 
                      onClick={() => navigate('/calendar')} 
                      className="text-purple-400 hover:underline flex items-center gap-1 font-sans text-xs capitalize"
                    >
                      {language === 'pl' ? 'Otwórz kalendarz' : 'Open calendar'} <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                  {todaysEvents.length === 0 ? (
                    <p className="text-xs text-slate-500 py-3 italic">
                      {language === 'pl' ? 'Brak spotkań w kalendarzu na dzisiaj.' : 'No meetings scheduled for today.'}
                    </p>
                  ) : (
                    todaysEvents.slice(0, 5).map(ev => (
                      <div 
                        key={ev.id}
                        onClick={() => navigate('/calendar')}
                        className="p-3 rounded-xl bg-[#161616] border border-[#242424] hover:border-purple-500/30 transition-all flex items-center justify-between gap-3 cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-xs font-mono text-purple-400 font-semibold shrink-0">
                            {ev.start_time}
                          </span>
                          <span className="text-sm font-medium text-white truncate">{ev.title}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono shrink-0">
                          {ev.type}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 5. Collapsible Section: Nawyki i Serie */}
      <section className="bg-[#121212] border border-[#222222] rounded-2xl overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('habits')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#171717] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm">
                {language === 'pl' ? 'Nawyki i serie' : 'Habits & Streaks'}
              </span>
              <span className="ml-2 text-xs font-mono text-slate-400">
                ({completedHabitsToday.length}/{filteredHabits.length} {language === 'pl' ? 'ukończonych dziś' : 'done today'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>{collapsedSections.habits ? (language === 'pl' ? 'Rozwiń' : 'Expand') : (language === 'pl' ? 'Zwiń' : 'Collapse')}</span>
            {collapsedSections.habits ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsed Mini Chips Row (Quick tap to toggle habit!) */}
        {collapsedSections.habits && (
          <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2">
            {filteredHabits.map(habit => {
              const isCompletedToday = habit.completedDates.includes(todayStr);
              return (
                <button
                  key={habit.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleHabit(habit.id, todayStr);
                    if (!isCompletedToday) {
                      try { confetti({ particleCount: 30, spread: 40 }); } catch {}
                    }
                  }}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    isCompletedToday 
                      ? 'bg-purple-500/20 border-purple-500/40 text-white' 
                      : 'bg-[#181818] border-[#2a2a2a] text-slate-400 hover:text-white hover:border-[#383838]'
                  }`}
                  title={isCompletedToday ? (language === 'pl' ? 'Ukończono! Kliknij aby odznaczyć' : 'Completed') : (language === 'pl' ? 'Kliknij aby oznaczyć na dziś' : 'Click to check')}
                >
                  <span className="text-sm">{habit.icon}</span>
                  <span className="truncate max-w-[120px]">{habit.name}</span>
                  {isCompletedToday ? (
                    <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-600" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Expanded Full Habits Cards */}
        <AnimatePresence initial={false}>
          {!collapsedSections.habits && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="px-5 pb-5 pt-2 border-t border-[#222222]"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400">
                  {language === 'pl' ? 'Kliknij nawyk, aby oznaczyć go na dziś.' : 'Click to complete for today.'}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowHabitCreator(!showHabitCreator)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> {language === 'pl' ? 'Dodaj nawyk' : 'Add habit'}
                  </button>
                  <button
                    onClick={() => navigate('/habits')}
                    className="text-xs text-purple-400 hover:underline flex items-center gap-1"
                  >
                    {language === 'pl' ? 'Wszystkie nawyki' : 'View all'} <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Quick Habit Creator */}
              {showHabitCreator && (
                <form onSubmit={handleQuickAddHabit} className="mb-4 p-3.5 rounded-xl bg-[#181818] border border-[#2a2a2a] space-y-3">
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newHabitIcon}
                      onChange={e => setNewHabitIcon(e.target.value)}
                      className="w-10 text-center bg-[#141414] border border-[#333] rounded-lg text-sm text-white"
                      placeholder="🔥"
                    />
                    <input 
                      type="text"
                      value={newHabitName}
                      onChange={e => setNewHabitName(e.target.value)}
                      placeholder={language === 'pl' ? 'Nazwa nowego nawyku...' : 'New habit name...'}
                      className="flex-1 bg-[#141414] border border-[#333] rounded-lg px-3 text-sm py-1.5 text-white focus:outline-none focus:border-[#4ade80]"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex gap-1.5">
                      {['#4ade80', '#60a5fa', '#c084fc', '#f472b6', '#fbbf24'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewHabitColor(c)}
                          className={`w-4 h-4 rounded-full border transition-transform ${newHabitColor === c ? 'scale-125 border-white' : 'border-transparent'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2 text-xs">
                      <button 
                        type="button" 
                        onClick={() => setShowHabitCreator(false)} 
                        className="px-2.5 py-1 text-slate-400 hover:text-white"
                      >
                        {language === 'pl' ? 'Anuluj' : 'Cancel'}
                      </button>
                      <button 
                        type="submit" 
                        className="px-3 py-1 bg-[#4ade80] text-[#1a1a1a] font-bold rounded-lg hover:bg-[#5bb255]"
                      >
                        {language === 'pl' ? 'Zapisz' : 'Save'}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredHabits.map(habit => {
                  const isCompletedToday = habit.completedDates.includes(todayStr);
                  const stats = calculateHabitStats(habit.completedDates);
                  return (
                    <div 
                      key={habit.id}
                      onClick={() => {
                        toggleHabit(habit.id, todayStr);
                        if (!isCompletedToday) {
                          try { confetti({ particleCount: 30, spread: 45 }); } catch {}
                        }
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isCompletedToday 
                          ? 'bg-purple-500/10 border-purple-500/30' 
                          : 'bg-[#161616] border-[#262626] hover:border-[#383838]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                            isCompletedToday 
                              ? 'bg-[#a855f7] border-[#a855f7] text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]' 
                              : 'border-slate-600 hover:border-[#a855f7]'
                          }`}
                        >
                          {isCompletedToday && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                        </button>
                        <span className="text-base">{habit.icon}</span>
                        <div className="min-w-0 truncate">
                          <span className="text-sm font-semibold text-white block truncate">{habit.name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {habit.frequency === 'daily' ? (language === 'pl' ? 'Codziennie' : 'Daily') : (language === 'pl' ? 'Co tydzień' : 'Weekly')}
                          </span>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-mono font-bold text-[#a855f7] bg-[#a855f7]/10 px-2 py-0.5 rounded-full shrink-0">
                        <Flame className="w-3 h-3 fill-current" /> {stats.currentStreak}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* 6. Collapsible Section: Narzędzia skupienia (Pomodoro & Wykres) - Collapsed by default */}
      <section className="bg-[#121212] border border-[#222222] rounded-2xl overflow-hidden transition-colors">
        <button
          onClick={() => toggleSection('focusTools')}
          className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#171717] transition-colors cursor-pointer text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
              <Timer className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display font-bold text-white text-sm">
                {language === 'pl' ? 'Narzędzia skupienia i Analityka' : 'Focus Tools & Analytics'}
              </span>
              <span className="ml-2 text-xs font-mono text-slate-500">
                ({language === 'pl' ? 'Pomodoro Timer + Wykres produktywności' : 'Pomodoro Timer + Chart'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span>{collapsedSections.focusTools ? (language === 'pl' ? 'Pokaż narzędzia' : 'Show tools') : (language === 'pl' ? 'Ukryj narzędzia' : 'Hide tools')}</span>
            {collapsedSections.focusTools ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </button>

        {/* Collapsed subtle teaser */}
        {collapsedSections.focusTools && (
          <div className="px-5 pb-4 pt-1 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Timer className="w-3.5 h-3.5 text-orange-400" /> Pomodoro Timer
            </span>
            <span>•</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <Activity className="w-3.5 h-3.5 text-[#4ade80]" /> {language === 'pl' ? 'Tygodniowy wykres wykonania' : 'Weekly execution chart'}
            </span>
          </div>
        )}

        {/* Expanded Rich Tools */}
        <AnimatePresence initial={false}>
          {!collapsedSections.focusTools && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="px-5 pb-5 pt-3 border-t border-[#222222]"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* Pomodoro Timer component */}
                <div className="bg-[#161616] border border-[#262626] rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Timer className="w-4 h-4 text-orange-400" />
                    <h3 className="text-sm font-bold text-white">Pomodoro Timer</h3>
                  </div>
                  <PomodoroTimer size="medium" />
                </div>

                {/* Productivity Chart component */}
                <div className="bg-[#161616] border border-[#262626] rounded-2xl p-4 flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity className="w-4 h-4 text-[#4ade80]" />
                    <h3 className="text-sm font-bold text-white">
                      {language === 'pl' ? 'Wykres Produktywności' : 'Productivity Chart'}
                    </h3>
                  </div>
                  <div className="flex-1 min-h-[220px]">
                    <ProductivityChart tasks={tasks} habits={filteredHabits} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

    </div>
  );
}
