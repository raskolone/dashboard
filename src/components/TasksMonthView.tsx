import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Plus, 
  Sparkles,
  CheckCircle2,
  Maximize2
} from 'lucide-react';
import { Task, CalendarEvent } from '../types';
import { cn, getEventDurationInfo } from '../lib/utils';

interface TasksMonthViewProps {
  currentDate: Date;
  onSelectDate: (dateStr: string) => void;
  onOpenDayAgenda: (dateStr: string) => void;
  onDropTaskOnDate?: (taskId: string, dateStr: string) => void;
  draggingTaskId: string | null;
}

export function TasksMonthView({
  currentDate,
  onSelectDate,
  onOpenDayAgenda,
  onDropTaskOnDate,
  draggingTaskId
}: TasksMonthViewProps) {
  const { tasks, googleEvents, language, updateTask } = useAppStore();
  const isPl = language === 'pl';

  const [activeMonthDate, setActiveMonthDate] = useState<Date>(() => new Date(currentDate));
  const [dragOverDateStr, setDragOverDateStr] = useState<string | null>(null);

  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }, []);

  const weekDayHeaders = isPl 
    ? ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const monthYearLabel = useMemo(() => {
    return activeMonthDate.toLocaleDateString(isPl ? 'pl-PL' : 'en-US', {
      month: 'long',
      year: 'numeric'
    });
  }, [activeMonthDate, isPl]);

  // Generate matrix of 35 or 42 days for the active month
  const monthCalendarGrid = useMemo(() => {
    const year = activeMonthDate.getFullYear();
    const month = activeMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Days from Monday (1) to Sunday (0 -> 7)
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7; // Sunday is 7th day

    const daysBefore = startDayOfWeek - 1;
    const totalDaysInMonth = lastDayOfMonth.getDate();

    const cells: {
      date: Date;
      dateStr: string;
      isCurrentMonth: boolean;
      dayNumber: number;
    }[] = [];

    // Preceding month days
    for (let i = daysBefore; i > 0; i--) {
      const d = new Date(year, month, 1 - i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({
        date: d,
        dateStr: `${y}-${m}-${day}`,
        isCurrentMonth: false,
        dayNumber: d.getDate()
      });
    }

    // Current month days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({
        date: d,
        dateStr: `${y}-${m}-${day}`,
        isCurrentMonth: true,
        dayNumber: i
      });
    }

    // Trailing next month days to complete 7-column rows
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({
        date: d,
        dateStr: `${y}-${m}-${day}`,
        isCurrentMonth: false,
        dayNumber: d.getDate()
      });
    }

    return cells;
  }, [activeMonthDate]);

  // Month navigation
  const handlePrevMonth = () => {
    setActiveMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() - 1);
      return d;
    });
  };

  const handleNextMonth = () => {
    setActiveMonthDate(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + 1);
      return d;
    });
  };

  const handleSetCurrentMonth = () => {
    setActiveMonthDate(new Date());
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDateStr(dateStr);
  };

  const handleDrop = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverDateStr(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (taskId) {
      if (onDropTaskOnDate) {
        onDropTaskOnDate(taskId, dateStr);
      } else {
        await updateTask(taskId, {
          due_date: dateStr,
          in_pool: false,
          updatedAt: new Date().toISOString()
        });
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header controls for Month Navigation */}
      <div className="flex items-center justify-between gap-3 pb-2 border-b border-white/5 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg font-bold text-white capitalize">
            {monthYearLabel}
          </span>
          <button
            type="button"
            onClick={handleSetCurrentMonth}
            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white border border-white/10 transition-all cursor-pointer"
          >
            {isPl ? 'Bieżący miesiąc' : 'Current month'}
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isPl ? 'Poprzedni miesiąc' : 'Previous month'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title={isPl ? 'Następny miesiąc' : 'Next month'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1.5 text-center select-none">
        {weekDayHeaders.map((header, idx) => (
          <div
            key={header}
            className={cn(
              "py-2 rounded-xl text-xs font-bold uppercase tracking-wider",
              idx >= 5 ? "text-amber-400/80 bg-amber-500/5" : "text-slate-400 bg-white/[0.02]"
            )}
          >
            {header}
          </div>
        ))}
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {monthCalendarGrid.map(cell => {
          const isToday = cell.dateStr === todayStr;
          const isDragOver = dragOverDateStr === cell.dateStr;

          // Tasks for this day
          const dayTasks = tasks.filter(t => t.due_date === cell.dateStr);
          // Google events for this day
          const dayGoogleEvents = googleEvents.filter(e => e.date === cell.dateStr);

          const totalItems = dayTasks.length + dayGoogleEvents.length;

          return (
            <div
              key={cell.dateStr}
              onDragOver={(e) => handleDragOver(e, cell.dateStr)}
              onDragLeave={() => setDragOverDateStr(null)}
              onDrop={(e) => handleDrop(e, cell.dateStr)}
              onClick={() => onOpenDayAgenda(cell.dateStr)}
              className={cn(
                "min-h-[110px] sm:min-h-[135px] p-2 rounded-xl sm:rounded-2xl border transition-all flex flex-col justify-between cursor-pointer group/cell relative overflow-hidden",
                cell.isCurrentMonth ? "bg-[#18181c]" : "bg-[#121214]/60 opacity-60",
                isToday 
                  ? "border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.15)] ring-1 ring-[#4ade80]/50" 
                  : "border-white/5 hover:border-white/20 hover:bg-[#202026]",
                isDragOver && "border-dashed border-[#4ade80] ring-2 ring-[#4ade80]/40 bg-[#4ade80]/10 scale-[0.98]"
              )}
            >
              {/* Day Cell Header */}
              <div className="flex items-center justify-between gap-1 select-none">
                <span className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-xs",
                  isToday 
                    ? "bg-[#4ade80] text-[#0a120d] shadow-sm" 
                    : "text-slate-300 group-hover/cell:text-white"
                )}>
                  {cell.dayNumber}
                </span>

                <div className="flex items-center gap-1 opacity-80 group-hover/cell:opacity-100">
                  {totalItems > 0 && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-md bg-white/10 text-slate-300">
                      {totalItems}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDayAgenda(cell.dateStr);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title={isPl ? 'Otwórz agendę dnia' : 'Open day agenda'}
                  >
                    <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Items List (max 3 displayed + remainder) */}
              <div className="flex-1 my-1.5 space-y-1 overflow-hidden">
                {/* Google Calendar Events with duration */}
                {dayGoogleEvents.slice(0, 2).map(gEv => {
                  const durationInfo = getEventDurationInfo(gEv.start_time, gEv.end_time, language);

                  return (
                    <div
                      key={`g-${gEv.id}`}
                      className="px-1.5 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-[10px] flex items-center justify-between gap-1 truncate"
                      title={`${gEv.title} (${durationInfo.timeSpan}${!durationInfo.isAllDay ? ' • ' + durationInfo.formattedDuration : ''}) - Google Calendar`}
                    >
                      <span className="truncate font-medium flex-1">
                        {gEv.title}
                      </span>
                      {!durationInfo.isAllDay && (
                        <span className="text-[9px] font-mono text-blue-300 shrink-0 font-bold">
                          {gEv.start_time}
                        </span>
                      )}
                    </div>
                  );
                })}

                {/* Tasks */}
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    className={cn(
                      "px-1.5 py-0.5 rounded-lg text-[10px] flex items-center justify-between gap-1 truncate border",
                      task.status === 'done' 
                        ? "bg-white/[0.02] border-white/5 text-slate-500 line-through" 
                        : "bg-purple-500/15 border-purple-500/30 text-purple-200 font-medium"
                    )}
                    title={`${task.title} ${task.due_time ? '@ ' + task.due_time : ''}`}
                  >
                    <span className="truncate flex-1">
                      {task.title}
                    </span>
                    {task.due_time && (
                      <span className="text-[9px] font-mono text-slate-400 shrink-0">
                        {task.due_time}
                      </span>
                    )}
                  </div>
                ))}

                {/* Overflows */}
                {totalItems > 3 && (
                  <div className="text-[9px] text-slate-400 font-mono pl-1">
                    +{totalItems - 3} {isPl ? 'więcej' : 'more'}
                  </div>
                )}
              </div>

              {/* Bottom bar indicator */}
              <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono select-none">
                <span className="capitalize">{cell.date.toLocaleDateString(isPl ? 'pl-PL' : 'en-US', { weekday: 'short' })}</span>
                <span className="opacity-0 group-hover/cell:opacity-100 text-[#4ade80] transition-opacity font-semibold">
                  + {isPl ? 'agenda' : 'agenda'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
