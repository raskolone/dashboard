import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/AppContext';
import { CheckCircle2, Clock, CalendarIcon, Target, Activity, Brain, Flame, Plus, MoreVertical, LayoutGrid, X, Filter, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ProductivityChart } from '../components/ProductivityChart';
import { PomodoroTimer } from '../components/PomodoroTimer';
import { calculateHabitStats } from '../lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, TouchSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as ContextMenu from '@radix-ui/react-context-menu';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
  id: string;
  type: string;
  size: WidgetSize;
  visible: boolean;
  order: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'w-stat-tasks', type: 'stat-tasks', size: 'small', visible: true, order: 0 },
  { id: 'w-stat-events', type: 'stat-events', size: 'small', visible: true, order: 1 },
  { id: 'w-stat-habits', type: 'stat-habits', size: 'small', visible: true, order: 2 },
  { id: 'w-stat-progress', type: 'stat-progress', size: 'small', visible: true, order: 3 },
  { id: 'w-focus', type: 'focus', size: 'large', visible: true, order: 4 },
  { id: 'w-tasks', type: 'tasks-list', size: 'medium', visible: true, order: 5 },
  { id: 'w-agenda', type: 'agenda', size: 'medium', visible: true, order: 6 },
  { id: 'w-pomodoro', type: 'pomodoro', size: 'large', visible: true, order: 7 },
  { id: 'w-chart', type: 'chart', size: 'large', visible: true, order: 8 },
];

const SortableWidget = ({ widget, children, onChangeSize, onRemove, language }: { widget: WidgetConfig, children: React.ReactNode, onChangeSize: (w: WidgetConfig, s: WidgetSize) => void, onRemove: (w: WidgetConfig) => void, language: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const colSpan = widget.size === 'small' ? 'col-span-1 md:col-span-1' : widget.size === 'medium' ? 'col-span-2 md:col-span-2' : 'col-span-2 md:col-span-4';
  const rowSpan = widget.size === 'large' && widget.type !== 'stat' ? 'row-span-2' : 'row-span-1';

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div
          ref={setNodeRef}
          style={style}
          {...attributes}
          {...listeners}
          className={`${colSpan} ${rowSpan} relative group touch-manipulation sm:touch-auto cursor-grab active:cursor-grabbing outline-none`}
        >
           <div className="absolute top-4 right-4 flex items-center gap-2 z-50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
             <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                   <button className="p-1.5 rounded-lg bg-black/40 text-white/50 hover:text-white backdrop-blur-md border border-white/10 cursor-pointer transition-colors" title={language === 'pl' ? 'Opcje widgetu' : 'Widget options'}>
                     <MoreVertical className="w-4 h-4" />
                   </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content className="z-[100] min-w-[160px] bg-[#1a1a1a] border border-[#333] rounded-2xl p-1 shadow-2xl animate-in fade-in zoom-in-95" sideOffset={8}>
                    <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === 'pl' ? 'Rozmiar' : 'Size'}</div>
                    <DropdownMenu.Item onSelect={() => onChangeSize(widget, 'small')} className={`px-3 py-2 text-sm rounded-xl transition-colors outline-none cursor-pointer ${widget.size === 'small' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white hover:bg-white/10'}`}>
                      {language === 'pl' ? 'Mały' : 'Small'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => onChangeSize(widget, 'medium')} className={`px-3 py-2 text-sm rounded-xl transition-colors outline-none cursor-pointer ${widget.size === 'medium' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white hover:bg-white/10'}`}>
                      {language === 'pl' ? 'Średni' : 'Medium'}
                    </DropdownMenu.Item>
                    <DropdownMenu.Item onSelect={() => onChangeSize(widget, 'large')} className={`px-3 py-2 text-sm rounded-xl transition-colors outline-none cursor-pointer ${widget.size === 'large' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white hover:bg-white/10'}`}>
                      {language === 'pl' ? 'Duży' : 'Large'}
                    </DropdownMenu.Item>
                    <div className="h-px bg-[#333] my-1 mx-2" />
                    <DropdownMenu.Item onSelect={() => onRemove(widget)} className="px-3 py-2 text-sm rounded-xl text-red-400 hover:bg-red-500/10 transition-colors outline-none cursor-pointer">
                      {language === 'pl' ? 'Usuń widget' : 'Remove widget'}
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
             </DropdownMenu.Root>
           </div>
           {children}
        </div>
      </ContextMenu.Trigger>
      
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-[100] min-w-[160px] bg-[#1a1a1a] border border-[#333] rounded-2xl p-1 shadow-2xl animate-in fade-in zoom-in-95">
          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">{language === 'pl' ? 'Rozmiar' : 'Size'}</div>
          <ContextMenu.Item onSelect={() => onChangeSize(widget, 'small')} className={`px-3 py-2 text-sm rounded-xl transition-colors outline-none cursor-pointer ${widget.size === 'small' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white hover:bg-white/10'}`}>
            {language === 'pl' ? 'Mały' : 'Small'}
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => onChangeSize(widget, 'medium')} className={`px-3 py-2 text-sm rounded-xl transition-colors outline-none cursor-pointer ${widget.size === 'medium' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white hover:bg-white/10'}`}>
            {language === 'pl' ? 'Średni' : 'Medium'}
          </ContextMenu.Item>
          <ContextMenu.Item onSelect={() => onChangeSize(widget, 'large')} className={`px-3 py-2 text-sm rounded-xl transition-colors outline-none cursor-pointer ${widget.size === 'large' ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-white hover:bg-white/10'}`}>
            {language === 'pl' ? 'Duży' : 'Large'}
          </ContextMenu.Item>
          <div className="h-px bg-[#333] my-1 mx-2" />
          <ContextMenu.Item onSelect={() => onRemove(widget)} className="px-3 py-2 text-sm rounded-xl text-red-400 hover:bg-red-500/10 transition-colors outline-none cursor-pointer">
            {language === 'pl' ? 'Usuń widget' : 'Remove widget'}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export function Dashboard() {
  const { tasks, habits, events, googleEvents, googleToken, updateTask, toggleHabit, t, language } = useAppStore();
  const [activeFilterTag, setActiveFilterTag] = React.useState<string | null>(null);
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    const saved = localStorage.getItem('dashboard_widgets');
    return saved ? JSON.parse(saved) : DEFAULT_WIDGETS;
  });

  useEffect(() => {
    localStorage.setItem('dashboard_widgets', JSON.stringify(widgets));
  }, [widgets]);

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
  
  const isGoogleConnected = !!googleToken;
  const activeEvents = isGoogleConnected ? googleEvents : events;
  const todaysEvents = activeEvents.filter(e => e.date === todayStr);

  const focusItems = React.useMemo(() => {
    const items: Array<{ id: string; type: 'task' | 'habit'; title: string; subtitle: string; completed: boolean; score: number; color?: string; icon?: string; streak?: number; }> = [];
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
        items.push({ id: tCode.id, type: 'task', title: tCode.title, subtitle: language === 'pl' ? `Zadanie • ${priorityLabel} priorytet${tCode.due_date === todayStr ? ' • Na dziś' : ''}` : `Task • ${priorityLabel} priority${tCode.due_date === todayStr ? ' • For today' : ''}`, completed: isCompletedToday, score, color: tCode.color || '#4ade80' });
      }
    });
    habits.forEach(h => {
      const isCompletedToday = h.completedDates.includes(todayStr);
      let score = 80;
      if (isCompletedToday) score -= 50;
      const { currentStreak } = calculateHabitStats(h.completedDates);
      items.push({ id: h.id, type: 'habit', title: h.name, subtitle: language === 'pl' ? `Nawyk • Częstotliwość: ${h.frequency === 'daily' ? 'Codziennie' : 'Tygodniowo'}` : `Habit • Frequency: ${h.frequency === 'daily' ? 'Daily' : 'Weekly'}`, completed: isCompletedToday, score, icon: h.icon, color: h.color || '#4ade80', streak: currentStreak });
    });
    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 3);
  }, [tasks, habits, todayStr, language]);

  const handleToggleFocusItem = (item: typeof focusItems[0]) => {
    if (item.type === 'task') updateTask(item.id, { status: item.completed ? 'todo' : 'done' });
    else toggleHabit(item.id, todayStr);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return language === 'pl' ? 'Dzień dobry' : 'Good morning';
    if (hour < 18) return language === 'pl' ? 'Dobrego popołudnia' : 'Good afternoon';
    return language === 'pl' ? 'Dobry wieczór' : 'Good evening';
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setWidgets(items => {
        const activeIndex = items.findIndex(i => i.id === active.id);
        const overIndex = items.findIndex(i => i.id === over.id);
        const newItems = [...items];
        const [moved] = newItems.splice(activeIndex, 1);
        newItems.splice(overIndex, 0, moved);
        return newItems.map((w, i) => ({ ...w, order: i }));
      });
    }
  };

  const changeWidgetSize = (widget: WidgetConfig, size: WidgetSize) => {
    setWidgets(ws => ws.map(w => w.id === widget.id ? { ...w, size } : w));
  };

  const removeWidget = (widget: WidgetConfig) => {
    setWidgets(ws => ws.map(w => w.id === widget.id ? { ...w, visible: false } : w));
  };

  const addWidget = (id: string) => {
    setWidgets(ws => {
      const items = [...ws];
      const widget = items.find(w => w.id === id);
      if (widget) {
        widget.visible = true;
        // place at the end
        widget.order = Math.max(...items.map(i => i.order)) + 1;
      }
      return items.sort((a, b) => a.order - b.order).map((w, i) => ({ ...w, order: i }));
    });
  };

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
  const hiddenWidgets = widgets.filter(w => !w.visible);

  const renderWidgetContent = (widget: WidgetConfig) => {
    if (widget.type.startsWith('stat-')) {
      let stat = null;
      if (widget.type === 'stat-tasks') stat = { title: t('dashboard.tasksTodo'), value: activeTasks.length, icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400/10" };
      else if (widget.type === 'stat-events') stat = { title: t('dashboard.todaysEvents'), value: todaysEvents.length, icon: CalendarIcon, color: "text-purple-400", bg: "bg-purple-400/10" };
      else if (widget.type === 'stat-habits') stat = { title: t('dashboard.habitsCompleted'), value: filteredHabits.filter(h => h.completedDates.includes(todayStr)).length, icon: Target, color: "text-[#4ade80]", bg: "bg-[#4ade80]/10" };
      else if (widget.type === 'stat-progress') stat = { title: t('dashboard.inProgress'), value: tasks.filter(t => t.status === 'in_progress').length, icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10" };
      
      if (!stat) return null;

      return (
        <div className={`glass-card ${widget.size === 'small' ? 'p-4' : 'p-6'} rounded-3xl flex ${widget.size === 'small' ? 'flex-col justify-center text-center' : 'items-center justify-between'} h-full group hover:border-[#4ade80]/30 transition-colors duration-300`}>
          {widget.size === 'small' ? (
             <div className="flex flex-col items-center gap-2">
               <div className={`p-3 rounded-xl ${stat.bg}`}><stat.icon className={`w-5 h-5 ${stat.color}`} /></div>
               <div className="text-2xl font-display font-bold text-white leading-none">{stat.value}</div>
             </div>
          ) : widget.size === 'medium' ? (
             <>
               <div>
                 <span className="text-slate-400 text-xs sm:text-sm font-medium">{stat.title}</span>
                 <div className="text-3xl font-display font-bold text-white mt-1 sm:mt-2">{stat.value}</div>
               </div>
               <div className={`p-4 rounded-xl ${stat.bg}`}><stat.icon className={`w-6 h-6 ${stat.color}`} /></div>
             </>
          ) : (
             <>
               <div>
                 <span className="text-slate-400 text-sm font-medium">{stat.title}</span>
                 <div className="text-4xl font-display font-bold text-white mt-2">{stat.value}</div>
               </div>
               <div className={`p-5 rounded-2xl ${stat.bg}`}><stat.icon className={`w-8 h-8 ${stat.color}`} /></div>
             </>
          )}
        </div>
      );
    }

    if (widget.type === 'focus') {
      return (
        <div className={`glass-card ${widget.size === 'small' ? 'p-4' : 'p-6'} rounded-3xl h-full flex flex-col min-h-[160px]`}>
          <div className={`flex flex-col ${widget.size === 'small' ? 'gap-2 mb-4' : 'sm:flex-row sm:items-center gap-4 mb-6'} justify-between`}>
            <div>
              <h2 className={`${widget.size === 'small' ? 'text-base sm:text-lg' : 'text-xl'} font-display font-bold text-white flex items-center gap-2`}><Brain className={`${widget.size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} text-[#4ade80]`} />{t('dashboard.focusForToday')}</h2>
              {widget.size !== 'small' && <p className="text-sm text-slate-400 mt-1">{t('dashboard.focusDescription')}</p>}
            </div>
            {focusItems.length > 0 && widget.size === 'large' && (
              <span className="text-xs font-mono font-bold text-[#4ade80] bg-[#4ade80]/10 px-3 py-1.5 rounded-full border border-[#4ade80]/20 self-start sm:self-center">
                {t('dashboard.completedRatio')}: {focusItems.filter(i => i.completed).length}/{focusItems.length}
              </span>
            )}
          </div>
          {focusItems.length === 0 ? (
            <div className="p-4 sm:p-6 rounded-2xl bg-white/5 border border-white/10 text-center flex-1 flex items-center justify-center">
              <p className={`text-slate-400 ${widget.size === 'small' ? 'text-xs' : 'text-sm'}`}>{t('dashboard.allDone')}</p>
            </div>
          ) : (
            <div className={`grid grid-cols-1 ${widget.size === 'large' ? 'md:grid-cols-3' : 'md:grid-cols-1'} gap-3 sm:gap-4 flex-1 overflow-y-auto pr-1`}>
              {focusItems.slice(0, widget.size === 'small' ? 2 : widget.size === 'medium' ? 3 : 6).map(item => (
                <div key={`${item.type}-${item.id}`} className={`flex items-center gap-3 ${widget.size === 'small' ? 'p-3' : 'p-4'} rounded-xl bg-[#141414] border hover:border-[#4ade80]/30 transition-all relative overflow-hidden group ${item.completed ? 'border-[#222222] opacity-75' : 'border-[#222222]'}`}>
                  {item.color && <div className="absolute left-0 top-0 bottom-0 w-1 transition-all" style={{ backgroundColor: item.color }} />}
                  <button onClick={() => handleToggleFocusItem(item)} className={`shrink-0 flex items-center justify-center ${widget.size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} rounded-md border transition-all duration-200 focus:outline-none ${item.completed ? 'bg-[#4ade80] border-[#4ade80] text-[#1a1a1a]' : 'border-slate-600 hover:border-[#4ade80]'}`}>
                    {item.completed && <svg className={`${widget.size === 'small' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} stroke-current`} fill="none" viewBox="0 0 24 24" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <div className="flex-1 min-w-0 cursor-pointer select-none" onClick={() => handleToggleFocusItem(item)}>
                    <span className={`block truncate ${widget.size === 'small' ? 'text-xs' : 'text-sm'} font-semibold ${item.completed ? 'text-slate-500 line-through' : 'text-white'}`}>{item.icon && <span className="mr-1.5">{item.icon}</span>}{item.title}</span>
                    {widget.size !== 'small' && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="block truncate text-[10px] text-slate-500 font-mono">{item.subtitle}</span>
                        {item.type === 'habit' && item.streak !== undefined && item.streak > 0 && <span className="flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-full border border-current bg-current/10" style={{ color: item.color || '#4ade80' }}><Flame className="w-3 h-3 fill-current" />{item.streak}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (widget.type === 'tasks-list') {
      const completedCount = tasks.filter(t => t.status === 'done').length;
      const totalCount = tasks.length;
      const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
      return (
        <div className={`glass-card rounded-3xl ${widget.size === 'small' ? 'p-4' : 'p-6'} h-full flex flex-col min-h-[160px]`}>
          <h2 className={`${widget.size === 'small' ? 'text-base sm:text-lg mb-4' : 'text-xl mb-6'} font-display font-bold text-white flex items-center gap-2`}><Target className={`${widget.size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} text-[#4ade80]`} />{language === 'pl' ? 'Dzisiejsze Zadania' : "Today's Tasks"}</h2>
          {widget.size === 'large' && tasks.length > 0 && (
            <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden shrink-0">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">{language === 'pl' ? 'Postęp ogólny zadań' : 'Overall Task Progress'}</span>
                <span className="text-xs text-[#4ade80] font-bold font-mono">{Math.round(progressPercent)}% ({completedCount}/{totalCount})</span>
              </div>
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden"><div style={{ width: `${progressPercent}%` }} className="h-full bg-[#4ade80] rounded-full shadow-[0_0_10px_rgba(74,222,128,0.2)] transition-all duration-1000" /></div>
            </div>
          )}
          <div className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto pr-1">
            {activeTasks.length === 0 ? <p className={`text-slate-500 ${widget.size === 'small' ? 'text-xs' : 'text-sm'}`}>{language === 'pl' ? 'Masz czysto! Żadnych zadań.' : 'All clear! No tasks.'}</p> : activeTasks.slice(0, widget.size === 'small' ? 3 : widget.size === 'medium' ? 5 : 8).map(task => (
              <div key={task.id} className={`${widget.size === 'small' ? 'p-3' : 'p-4'} rounded-xl bg-[#141414] border border-[#222222] hover:border-[#333333] transition-colors relative overflow-hidden`}>
                {task.color && <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: task.color }} />}
                <div className={`font-medium text-white ${widget.size === 'small' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'} truncate`}>{task.title}</div>
                {widget.size !== 'small' && (
                  <div className="flex gap-2 mt-2">
                     <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80]">{task.status.replace('_', ' ')}</span>
                     <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{task.priority}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (widget.type === 'agenda') {
      return (
        <div className={`glass-card rounded-3xl ${widget.size === 'small' ? 'p-4' : 'p-6'} h-full flex flex-col min-h-[160px]`}>
          <h2 className={`${widget.size === 'small' ? 'text-base sm:text-lg mb-4' : 'text-xl mb-6'} font-display font-bold text-white flex items-center gap-2`}><CalendarIcon className={`${widget.size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} text-purple-400`} />{language === 'pl' ? 'Agenda (Dzisiaj)' : "Agenda (Today)"}</h2>
          <div className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto pr-1">
             {todaysEvents.length === 0 ? <p className={`text-slate-500 ${widget.size === 'small' ? 'text-xs' : 'text-sm'}`}>{language === 'pl' ? 'Brak spotkań.' : 'No meetings.'}</p> : todaysEvents.slice(0, widget.size === 'small' ? 3 : widget.size === 'medium' ? 4 : 10).map(ev => (
               <div key={ev.id} className={`${widget.size === 'small' ? 'p-3' : 'p-4'} rounded-xl bg-[#141414] border border-[#222222] flex items-start gap-3 sm:gap-4`}>
                  <div className={`text-slate-400 font-mono pt-1 shrink-0 ${widget.size === 'small' ? 'text-[10px] w-8' : 'text-xs w-12'}`}>{ev.start_time}</div>
                  <div className="min-w-0 flex-1">
                     <div className={`font-medium text-white truncate ${widget.size === 'small' ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'}`}>{ev.title}</div>
                     {widget.size !== 'small' && <div className="text-xs text-slate-400 mt-1 truncate">{ev.type} • {ev.location || (language === 'pl' ? 'Brak' : 'None')}</div>}
                  </div>
               </div>
             ))}
          </div>
        </div>
      );
    }

    if (widget.type === 'pomodoro') {
      return (
        <div className="h-full relative z-0 flex items-center justify-center glass-card rounded-3xl p-4 sm:p-6 overflow-hidden min-h-[160px]">
          <div className={`origin-center transition-transform duration-300 ${widget.size === 'small' ? 'scale-50 sm:scale-75' : widget.size === 'medium' ? 'scale-75 sm:scale-90 md:scale-100' : 'scale-90 sm:scale-100'}`}>
            <div className="pointer-events-auto">
              <PomodoroTimer />
            </div>
          </div>
        </div>
      );
    }

    if (widget.type === 'chart') {
      return (
        <div className={`glass-card rounded-3xl ${widget.size === 'small' ? 'p-4' : 'p-6'} h-full flex flex-col min-h-[220px]`}>
          <h2 className={`${widget.size === 'small' ? 'text-base sm:text-lg mb-4' : 'text-xl mb-6'} font-display font-bold text-white flex items-center gap-2`}><Activity className={`${widget.size === 'small' ? 'w-4 h-4' : 'w-5 h-5'} text-[#4ade80]`} />{language === 'pl' ? 'Produktywność' : 'Productivity'}</h2>
          <div className={`flex-1 ${widget.size === 'small' ? 'min-h-[100px] -mx-2' : 'min-h-[150px]'}`}>
            <ProductivityChart tasks={tasks} habits={filteredHabits} />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-sans pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[#4ade80] text-sm font-semibold tracking-wider uppercase">
            {new Date().toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
          <h1 className="text-4xl font-display font-bold text-white mt-1 leading-tight">{getGreeting()}</h1>
          <p className="text-slate-400 mt-2 text-lg">{language === 'pl' ? 'Oto podsumowanie Twojego dnia.' : 'Here is a quick summary of your day.'}</p>
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Add Widget Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="h-9 px-4 rounded-full bg-white/10 hover:bg-white/20 text-white font-medium transition-colors border border-white/10 flex items-center gap-2">
                <Plus className="w-4 h-4" />
                {language === 'pl' ? 'Widget' : 'Widget'}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[200px] bg-[#1a1a1a] border border-[#333] rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95" sideOffset={8}>
                {hiddenWidgets.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">{language === 'pl' ? 'Wszystkie dodane' : 'All added'}</div>
                ) : (
                  hiddenWidgets.map(w => (
                    <DropdownMenu.Item 
                      key={w.id}
                      onClick={() => addWidget(w.id)}
                      className="px-3 py-2 text-sm text-white hover:bg-white/10 outline-none rounded-xl cursor-pointer flex justify-between items-center"
                    >
                      <span>{w.type.replace('stat-', '').replace('-', ' ')}</span>
                      <Plus className="w-4 h-4 text-slate-400" />
                    </DropdownMenu.Item>
                  ))
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          {/* Tags Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className={`h-9 px-4 rounded-full font-medium transition-colors border flex items-center gap-2 ${activeFilterTag ? 'bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30' : 'bg-[#161616] text-slate-400 border-[#262626] hover:text-white'}`}>
                <Filter className="w-4 h-4" />
                {activeFilterTag || (language === 'pl' ? 'Tagi' : 'Tags')}
                <ChevronDown className="w-4 h-4" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content className="z-50 min-w-[150px] bg-[#1a1a1a] border border-[#333] rounded-2xl p-2 shadow-2xl animate-in fade-in zoom-in-95" sideOffset={8}>
                <DropdownMenu.Item 
                  onClick={() => setActiveFilterTag(null)}
                  className={`px-3 py-2 text-sm outline-none rounded-xl cursor-pointer ${!activeFilterTag ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {language === 'pl' ? 'Wszystkie' : 'All'}
                </DropdownMenu.Item>
                {predefinedTags.map(tag => (
                  <DropdownMenu.Item 
                    key={tag}
                    onClick={() => setActiveFilterTag(tag)}
                    className={`px-3 py-2 text-sm outline-none rounded-xl cursor-pointer ${activeFilterTag === tag ? 'bg-[#4ade80]/20 text-[#4ade80]' : 'text-slate-300 hover:bg-white/10'}`}
                  >
                    {tag}
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* Widget Grid */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={visibleWidgets.map(w => w.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[minmax(140px,auto)]">
            {visibleWidgets.map((widget) => (
              <SortableWidget key={widget.id} widget={widget} onChangeSize={changeWidgetSize} onRemove={removeWidget} language={language}>
                {renderWidgetContent(widget)}
              </SortableWidget>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
