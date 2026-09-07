import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  X, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Trash2, 
  RotateCcw, 
  ExternalLink,
  Layers,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import { format, parseISO, isToday, isTomorrow, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Task, TaskPriority } from '../types';
import { getEventDurationInfo } from '../lib/utils';

interface DayAgendaModalProps {
  dateStr: string;
  onClose: () => void;
  onOpenEditTask: (task: Task) => void;
}

export function DayAgendaModal({ dateStr, onClose, onOpenEditTask }: DayAgendaModalProps) {
  const { tasks, updateTask, addTask, deleteTask, googleEvents, language } = useAppStore();

  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority>('medium');
  const [isAddingTask, setIsAddingTask] = useState(false);

  const dateObj = useMemo(() => {
    try {
      return parseISO(dateStr);
    } catch {
      return new Date();
    }
  }, [dateStr]);

  const dateBadge = useMemo(() => {
    if (isToday(dateObj)) return language === 'pl' ? 'Dzisiaj' : 'Today';
    if (isTomorrow(dateObj)) return language === 'pl' ? 'Jutro' : 'Tomorrow';
    if (isYesterday(dateObj)) return language === 'pl' ? 'Wczoraj' : 'Yesterday';
    return null;
  }, [dateObj, language]);

  // Tasks for this date
  const dayTasks = useMemo(() => {
    return tasks.filter(t => t.due_date === dateStr);
  }, [tasks, dateStr]);

  const allDayTasks = useMemo(() => {
    return dayTasks.filter(t => t.all_day || !t.due_time);
  }, [dayTasks]);

  const timedTasks = useMemo(() => {
    return dayTasks.filter(t => !t.all_day && !!t.due_time).sort((a, b) => (a.due_time || '').localeCompare(b.due_time || ''));
  }, [dayTasks]);

  // Google Calendar events for this date
  const dayGoogleEvents = useMemo(() => {
    return googleEvents.filter(e => e.date === dateStr).sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
  }, [googleEvents, dateStr]);

  // Completed stats
  const completedCount = dayTasks.filter(t => t.status === 'done').length;

  const handleToggleTask = (task: Task) => {
    updateTask(task.id, {
      status: task.status === 'done' ? 'todo' : 'done'
    });
  };

  const handleReturnToPool = (task: Task) => {
    updateTask(task.id, {
      due_date: '',
      due_time: undefined,
      all_day: false,
      in_pool: true
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      priority: selectedPriority,
      status: 'todo',
      due_date: dateStr,
      due_time: isAllDay ? undefined : newTaskTime,
      all_day: isAllDay,
      in_pool: false
    });

    setNewTaskTitle('');
    setIsAddingTask(false);
  };

  const TIMELINE_HOURS = Array.from({ length: 18 }, (_, i) => i + 5); // 05:00 to 22:00

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-2 sm:p-4 text-white font-sans">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }} 
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }} 
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl bg-[#141419] border border-white/15 rounded-[28px] shadow-2xl z-10 flex flex-col max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-white/10 bg-white/[0.02] flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xl p-2 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {format(dateObj, 'EEEE, d MMMM yyyy', { locale: language === 'pl' ? pl : undefined })}
                  </h2>
                  {dateBadge && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-semibold">
                      {dateBadge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {language === 'pl' 
                    ? `Pełna agenda dnia: ${dayTasks.length} zadań (${completedCount} ukończonych), ${dayGoogleEvents.length} wydarzeń w kalendarzu.`
                    : `Full day agenda: ${dayTasks.length} tasks (${completedCount} completed), ${dayGoogleEvents.length} calendar events.`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddingTask(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{language === 'pl' ? 'Dodaj zadanie' : 'Add task'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Inline Add Task Form */}
        <AnimatePresence>
          {isAddingTask && (
            <motion.form 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleCreateTask}
              className="p-4 bg-purple-950/20 border-b border-purple-500/30 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder={language === 'pl' ? 'Tytuł nowego zadania na ten dzień...' : 'New task title for this day...'}
                  autoFocus
                  className="flex-1 px-3 py-2 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                />

                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllDay}
                      onChange={(e) => setIsAllDay(e.target.checked)}
                      className="rounded border-white/20 bg-black/40 text-purple-500"
                    />
                    <span>{language === 'pl' ? 'Cały dzień' : 'All day'}</span>
                  </label>

                  {!isAllDay && (
                    <input
                      type="time"
                      value={newTaskTime}
                      onChange={(e) => setNewTaskTime(e.target.value)}
                      className="px-2.5 py-1.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white"
                    />
                  )}

                  <select
                    value={selectedPriority}
                    onChange={(e) => setSelectedPriority(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-black/50 border border-white/15 rounded-xl text-xs text-slate-200"
                  >
                    <option value="low">{language === 'pl' ? 'Niski' : 'Low'}</option>
                    <option value="medium">{language === 'pl' ? 'Średni' : 'Medium'}</option>
                    <option value="high">{language === 'pl' ? 'Wysoki' : 'High'}</option>
                    <option value="urgent">{language === 'pl' ? 'Pilny' : 'Urgent'}</option>
                  </select>

                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold rounded-xl shadow cursor-pointer"
                  >
                    {language === 'pl' ? 'Zapisz' : 'Save'}
                  </button>
                </div>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Agenda Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Section: All-Day Tasks */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>{language === 'pl' ? 'Zadania całodniowe' : 'All-Day Tasks'} ({allDayTasks.length})</span>
              </h3>
            </div>

            {allDayTasks.length === 0 ? (
              <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-white/[0.02] border border-white/5">
                {language === 'pl' ? 'Brak zadań całodniowych na ten dzień.' : 'No all-day tasks scheduled.'}
              </p>
            ) : (
              <div className="space-y-1.5">
                {allDayTasks.map(task => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      task.status === 'done'
                        ? 'bg-emerald-950/15 border-emerald-500/20 text-slate-400'
                        : 'bg-white/[0.03] hover:bg-white/[0.06] border-white/10 text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className="cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                      >
                        {task.status === 'done' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-4 h-4" />
                        )}
                      </button>
                      <span 
                        onClick={() => onOpenEditTask(task)}
                        className={`text-xs font-medium truncate cursor-pointer hover:text-purple-300 transition-colors ${
                          task.status === 'done' ? 'line-through text-slate-500' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleReturnToPool(task)}
                        className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 cursor-pointer"
                        title={language === 'pl' ? 'Przenieś z powrotem do puli' : 'Return to pool'}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer"
                        title={language === 'pl' ? 'Usuń zadanie' : 'Delete task'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Timeline (Hour by Hour with Tasks & Google Calendar Events) */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-3">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === 'pl' ? 'Oś czasu dnia (05:00 - 22:00)' : 'Day Timeline (05:00 - 22:00)'}</span>
            </h3>

            <div className="space-y-2 divide-y divide-white/5 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
              {TIMELINE_HOURS.map(hour => {
                const hourFormatted = `${String(hour).padStart(2, '0')}:00`;
                
                // Tasks matching this hour
                const tasksInHour = timedTasks.filter(t => {
                  if (!t.due_time) return false;
                  const h = parseInt(t.due_time.split(':')[0], 10);
                  return h === hour;
                });

                // Google Calendar events starting this hour
                const startingEventsInHour = dayGoogleEvents.filter(e => {
                  if (!e.start_time || e.start_time === '00:00') return false;
                  const h = parseInt(e.start_time.split(':')[0], 10);
                  return h === hour;
                });

                // Google Calendar events ongoing during this hour
                const ongoingEventsInHour = dayGoogleEvents.filter(e => {
                  if (!e.start_time || e.start_time === '00:00') return false;
                  const sh = parseInt(e.start_time.split(':')[0], 10);
                  const eh = e.end_time ? parseInt(e.end_time.split(':')[0], 10) : sh + 1;
                  const em = e.end_time ? parseInt(e.end_time.split(':')[1], 10) : 0;
                  return hour > sh && (hour < eh || (hour === eh && em > 5));
                });

                const hasItems = tasksInHour.length > 0 || startingEventsInHour.length > 0 || ongoingEventsInHour.length > 0;

                return (
                  <div 
                    key={hour}
                    className={`flex items-start gap-3 p-3 transition-colors ${
                      hasItems ? 'bg-white/[0.02]' : 'hover:bg-white/[0.01]'
                    }`}
                  >
                    <span className="w-12 text-[11px] font-mono font-semibold text-slate-500 shrink-0 pt-1">
                      {hourFormatted}
                    </span>

                    <div className="flex-1 space-y-2">
                      {/* Starting Google Calendar Events */}
                      {startingEventsInHour.map(gEvent => {
                        const durInfo = getEventDurationInfo(gEvent.start_time, gEvent.end_time, language);
                        return (
                          <div
                            key={gEvent.id}
                            className="p-2.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs flex items-center justify-between gap-2 shadow-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-300 font-mono text-[10px] font-bold">
                                Google
                              </span>
                              <span className="font-semibold truncate text-white">{gEvent.title}</span>
                              <span className="text-[10px] text-blue-300 font-mono">
                                {durInfo.timeSpan}
                              </span>
                              {!durInfo.isAllDay && (
                                <span className="px-1.5 py-0.2 rounded bg-blue-400/20 text-blue-200 text-[10px] font-mono font-medium">
                                  {durInfo.formattedDuration}
                                </span>
                              )}
                            </div>
                            {gEvent.location && (
                              <a
                                href={gEvent.location.startsWith('http') ? gEvent.location : undefined}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-blue-400 hover:underline shrink-0 flex items-center gap-1"
                              >
                                <span>Spotkanie</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}

                      {/* Ongoing Google Calendar Events */}
                      {ongoingEventsInHour.map(gEvent => {
                        const durInfo = getEventDurationInfo(gEvent.start_time, gEvent.end_time, language);
                        return (
                          <div
                            key={`ongoing-${gEvent.id}-${hour}`}
                            className="p-2 rounded-lg bg-blue-950/30 border-l-2 border-blue-400/70 text-blue-200/90 text-xs flex items-center justify-between gap-2"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                              <span className="truncate font-medium text-slate-300">{gEvent.title}</span>
                              <span className="text-[10px] text-blue-300/80 font-mono">
                                ({language === 'pl' ? `do ${gEvent.end_time}` : `until ${gEvent.end_time}`})
                              </span>
                            </div>
                            <span className="text-[10px] text-blue-400 font-mono shrink-0">
                              {durInfo.formattedDuration}
                            </span>
                          </div>
                        );
                      })}

                      {/* Scheduled Tasks */}
                      {tasksInHour.map(task => (
                        <div
                          key={task.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all ${
                            task.status === 'done'
                              ? 'bg-emerald-950/20 border-emerald-500/20 text-slate-400'
                              : 'bg-white/5 border-white/10 text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <button
                              onClick={() => handleToggleTask(task)}
                              className="cursor-pointer text-slate-400 hover:text-emerald-400 transition-colors shrink-0"
                            >
                              {task.status === 'done' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Circle className="w-4 h-4" />
                              )}
                            </button>
                            <span 
                              onClick={() => onOpenEditTask(task)}
                              className={`text-xs font-semibold truncate cursor-pointer hover:text-purple-300 ${
                                task.status === 'done' ? 'line-through text-slate-500' : ''
                              }`}
                            >
                              {task.title}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">
                              {task.due_time}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleReturnToPool(task)}
                              className="p-1 rounded hover:bg-white/10 text-slate-500 hover:text-slate-300 cursor-pointer"
                              title={language === 'pl' ? 'Przenieś do puli' : 'Return to pool'}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1 rounded hover:bg-red-500/20 text-slate-500 hover:text-red-400 cursor-pointer"
                              title={language === 'pl' ? 'Usuń' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {!hasItems && (
                        <div className="h-5 flex items-center">
                          <span className="text-[10px] text-slate-600 font-mono">—</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
