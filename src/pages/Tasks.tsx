import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  GripVertical, 
  Clock, 
  Sun, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  X, 
  Layers, 
  Check, 
  RotateCcw,
  Sparkles,
  CalendarDays,
  LayoutGrid,
  Kanban,
  Trash2,
  Edit2,
  NotebookPen,
  Send
} from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { Task, TaskPriority, TaskStatus } from '../types';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { 
  AI_MODEL_NAME, 
  getLunaQuickTimelineAdvice, 
  askLunaForNoteExecution, 
  askLunaAssistant,
  LunaNotePlan 
} from '../lib/aiService';
import { LunaBriefingCard } from '../components/LunaBriefingCard';
import { DayAgendaModal } from '../components/DayAgendaModal';
import { ContextMenu, ContextMenuItem } from '../components/ContextMenu';

export function Tasks() {
  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    language, 
    t, 
    googleEvents, 
    googleToken, 
    syncCalendar, 
    loginGoogle, 
    isSyncingCalendar 
  } = useAppStore();
  const navigate = useNavigate();

  // Two primary views requested: Planner (Pool + Calendar) & Statuses (Kanban board)
  const [activeTab, setActiveTab] = useState<'planner' | 'board'>('planner');

  // Quick add state (inline in pool tray) - simplified, no priority selector
  const [quickTitle, setQuickTitle] = useState('');

  // Note contextual modal & GPT 5.6 Luna
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isNoteAiLoading, setIsNoteAiLoading] = useState(false);
  const [noteAiPlan, setNoteAiPlan] = useState<LunaNotePlan | null>(null);
  const [noteChatInput, setNoteChatInput] = useState('');
  const [noteChatHistory, setNoteChatHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isNoteChatLoading, setIsNoteChatLoading] = useState(false);

  // Instant Pool Task Modal ("Jasny przycisk tworzenia nowego zadania - wpada do puli")
  const [isInstantPoolModalOpen, setIsInstantPoolModalOpen] = useState(false);
  const [instantPoolTitle, setInstantPoolTitle] = useState('');

  // GPT 5.6 Luna AI smart advice modal
  const [isLunaAdviceOpen, setIsLunaAdviceOpen] = useState(false);

  // Pool collapse state
  const [isPoolCollapsed, setIsPoolCollapsed] = useState(false);

  // Calendar config (3, 5, or 7 days) - default to 5 days
  const [dayCount, setDayCount] = useState<3 | 5 | 7>(5);
  const [currentStartDate, setCurrentStartDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Timeline hours from 05:00 to 22:00
  const TIMELINE_HOURS = useMemo(() => [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22], []);

  // Drag & Drop tracking
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<{
    dateStr: string;
    hour?: number;
    isAllDay?: boolean;
  } | null>(null);
  const [dragOverPool, setDragOverPool] = useState(false);

  // Schedule modal state (All-day vs specific time)
  const [schedulePrompt, setSchedulePrompt] = useState<{
    task: Task;
    targetDate: string;
  } | null>(null);
  const [promptMode, setPromptMode] = useState<'all_day' | 'time'>('all_day');
  const [promptTime, setPromptTime] = useState('10:00');

  // Quick task edit modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo');
  const [editDueDate, setEditDueDate] = useState('');
  const [editDueTime, setEditDueTime] = useState('');
  const [editAllDay, setEditAllDay] = useState(false);
  const [editDescription, setEditDescription] = useState('');
  const [editTargetMonth, setEditTargetMonth] = useState('');

  // Instant Pool Modal Month
  const [instantPoolMonth, setInstantPoolMonth] = useState('');

  // Selected Date for Full-Day Agenda Modal
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string | null>(null);

  // Monthly Task Pool Filter ('all' | 'current' | 'next' | 'unassigned' | 'YYYY-MM')
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<string>('all');

  // Month options helpers
  const availableMonths = useMemo(() => {
    const months: { value: string; label: string }[] = [];
    const curr = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(curr.getFullYear(), curr.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { month: 'long', year: 'numeric' });
      months.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return months;
  }, [language]);

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const nextMonthKey = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Quick task creation directly in timeline slot
  const [slotAddPrompt, setSlotAddPrompt] = useState<{
    dateStr: string;
    hour?: number;
    isAllDay?: boolean;
  } | null>(null);
  const [slotAddTitle, setSlotAddTitle] = useState('');
  const [slotAddPriority, setSlotAddPriority] = useState<TaskPriority>('medium');

  // Hovered task for compact tiles with detail popover
  const [hoveredTask, setHoveredTask] = useState<{
    task: Task;
    rect: DOMRect;
  } | null>(null);
  const hoverTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTileMouseEnter = (task: Task, e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingTaskId) return;
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredTask({ task, rect });
  };

  const handleTileMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTask(null);
    }, 120);
  };

  const handlePopoverMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
  };

  const handlePopoverMouseLeave = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTask(null);
    }, 120);
  };

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < dayCount; i++) {
      const d = new Date(currentStartDate);
      d.setDate(currentStartDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [currentStartDate, dayCount]);

  const gridColsClass = useMemo(() => {
    if (dayCount === 3) return "grid-cols-[60px_repeat(3,minmax(200px,1fr))]";
    if (dayCount === 5) return "grid-cols-[60px_repeat(5,minmax(170px,1fr))]";
    return "grid-cols-[60px_repeat(7,minmax(150px,1fr))]";
  }, [dayCount]);

  const formatDateISO = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayISO = formatDateISO(new Date());

  // Date range label
  const dateRangeLabel = useMemo(() => {
    if (calendarDays.length === 0) return '';
    const start = calendarDays[0];
    const end = calendarDays[calendarDays.length - 1];
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const locale = language === 'pl' ? 'pl-PL' : 'en-US';

    const startStr = start.toLocaleDateString(locale, options);
    const endStr = end.toLocaleDateString(locale, { ...options, year: 'numeric' });
    return `${startStr} — ${endStr}`;
  }, [calendarDays, language]);

  // Calendar Navigation
  const handlePrev = () => {
    setCurrentStartDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() - dayCount);
      return next;
    });
  };

  const handleNext = () => {
    setCurrentStartDate(prev => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + dayCount);
      return next;
    });
  };

  const handleToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentStartDate(d);
  };

  // Quick add to general pool (simplified, drops straight into pool without friction)
  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTitle.trim()) return;

    addTask({
      title: quickTitle.trim(),
      priority: 'medium',
      status: 'todo',
      due_date: '', // Unscheduled, sits in general pool
      all_day: false,
      in_pool: true
    });

    setQuickTitle('');
  };

  // Note Modal Actions:
  // 1. Drop note directly into pool (Główny motyw!)
  const handleDropNoteToPool = (customTitle?: string, customDesc?: string) => {
    const textToUse = (customDesc !== undefined ? customDesc : noteContent).trim();
    if (!textToUse && !customTitle) return;

    const firstLine = textToUse.split('\n')[0].replace(/^[#*-]\s*/, '').trim();
    const finalTitle = customTitle || (firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine) || (language === 'pl' ? 'Nowe zadanie z notatki' : 'New task from note');

    addTask({
      title: finalTitle,
      description: textToUse,
      priority: 'medium',
      status: 'todo',
      due_date: '',
      all_day: false,
      in_pool: true
    });

    setIsNoteModalOpen(false);
    setNoteContent('');
    setNoteAiPlan(null);
    setNoteChatHistory([]);
  };

  // 2. Ask GPT 5.6 Luna to suggest execution steps
  const handleAskLunaForNote = async () => {
    if (!noteContent.trim() || isNoteAiLoading) return;
    setIsNoteAiLoading(true);
    try {
      const plan = await askLunaForNoteExecution(noteContent, language);
      setNoteAiPlan(plan);
      setNoteChatHistory(prev => [
        ...prev,
        { role: 'user', content: `${language === 'pl' ? 'Zasugeruj sposób wykonania zadania:' : 'Suggest execution plan for:'}\n"${noteContent.trim()}"` },
        { role: 'assistant', content: plan.rawReply }
      ]);
    } catch {
      // Fallback
    } finally {
      setIsNoteAiLoading(false);
    }
  };

  // 3. Drop all suggested steps to pool as separate tasks
  const handleDropAllStepsToPool = () => {
    if (!noteAiPlan || !noteAiPlan.steps.length) return;
    noteAiPlan.steps.forEach(step => {
      addTask({
        title: step,
        description: `Krok z planu GPT 5.6 Luna dla: "${noteAiPlan.title}"`,
        priority: 'medium',
        status: 'todo',
        due_date: '',
        all_day: false,
        in_pool: true
      });
    });
    setIsNoteModalOpen(false);
    setNoteContent('');
    setNoteAiPlan(null);
    setNoteChatHistory([]);
  };

  // 4. Drop individual step
  const handleDropSingleStepToPool = (stepText: string) => {
    addTask({
      title: stepText,
      description: noteAiPlan ? `Krok z planu GPT 5.6 Luna dla: "${noteAiPlan.title}"` : '',
      priority: 'medium',
      status: 'todo',
      due_date: '',
      all_day: false,
      in_pool: true
    });
  };

  // 5. Send message in contextual Luna chat
  const handleSendNoteChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteChatInput.trim() || isNoteChatLoading) return;
    const userMsg = noteChatInput.trim();
    setNoteChatInput('');
    setNoteChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsNoteChatLoading(true);

    try {
      const reply = await askLunaAssistant(
        `W kontekście notatki "${noteContent}": ${userMsg}`,
        { tasks, habits: [], language }
      );
      setNoteChatHistory(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      // Fallback
    } finally {
      setIsNoteChatLoading(false);
    }
  };

  // Tasks in general pool (with Monthly Task Pool filter)
  const allPoolTasks = useMemo(() => {
    return tasks.filter(task => !task.due_date || task.due_date.trim() === '' || task.in_pool !== false);
  }, [tasks]);

  const poolTasks = useMemo(() => {
    if (selectedMonthFilter === 'all') return allPoolTasks;
    if (selectedMonthFilter === 'current') return allPoolTasks.filter(t => t.target_month === currentMonthKey);
    if (selectedMonthFilter === 'next') return allPoolTasks.filter(t => t.target_month === nextMonthKey);
    if (selectedMonthFilter === 'unassigned') return allPoolTasks.filter(t => !t.target_month);
    return allPoolTasks.filter(t => t.target_month === selectedMonthFilter);
  }, [allPoolTasks, selectedMonthFilter, currentMonthKey, nextMonthKey]);

  const currentMonthPoolCount = useMemo(() => allPoolTasks.filter(t => t.target_month === currentMonthKey).length, [allPoolTasks, currentMonthKey]);
  const nextMonthPoolCount = useMemo(() => allPoolTasks.filter(t => t.target_month === nextMonthKey).length, [allPoolTasks, nextMonthKey]);
  const unassignedPoolCount = useMemo(() => allPoolTasks.filter(t => !t.target_month).length, [allPoolTasks]);

  // Group tasks by calendar day and timeline hours (05:00 - 22:00)
  const tasksByDay = useMemo(() => {
    const map: Record<string, {
      allDay: Task[];
      byHour: Record<number, Task[]>;
      total: number;
    }> = {};

    calendarDays.forEach(d => {
      const dateStr = formatDateISO(d);
      const byHour: Record<number, Task[]> = {};
      TIMELINE_HOURS.forEach(h => {
        byHour[h] = [];
      });
      map[dateStr] = { allDay: [], byHour, total: 0 };
    });

    tasks.forEach(task => {
      if (task.due_date && map[task.due_date]) {
        map[task.due_date].total++;
        if (task.all_day || !task.due_time) {
          map[task.due_date].allDay.push(task);
        } else {
          const hourPart = parseInt(task.due_time.split(':')[0], 10);
          const hour = isNaN(hourPart) ? 9 : Math.max(5, Math.min(22, hourPart));
          if (!map[task.due_date].byHour[hour]) {
            map[task.due_date].byHour[hour] = [];
          }
          map[task.due_date].byHour[hour].push(task);
        }
      }
    });

    // Sort tasks in each hour chronologically by due_time
    Object.keys(map).forEach(dateStr => {
      TIMELINE_HOURS.forEach(h => {
        map[dateStr].byHour[h].sort((a, b) => (a.due_time || '').localeCompare(b.due_time || ''));
      });
    });

    return map;
  }, [tasks, calendarDays, TIMELINE_HOURS]);

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setHoveredTask(null);
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverDay(null);
    setDragOverStatus(null);
    setDragOverTarget(null);
    setDragOverPool(false);
  };

  // Calendar All-Day Drop
  const handleAllDayDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ dateStr, isAllDay: true });
  };

  const handleAllDayDrop = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    setDragOverTarget(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    setSchedulePrompt({ task, targetDate: dateStr });
    setPromptMode('all_day');
    setPromptTime('10:00');
    setDraggingTaskId(null);
  };

  // Timeline Hour Slot Drop
  const handleSlotDragOver = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTarget({ dateStr, hour });
  };

  const handleSlotDrop = (e: React.DragEvent, dateStr: string, hour: number) => {
    e.preventDefault();
    setDragOverTarget(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const formattedTime = `${String(hour).padStart(2, '0')}:00`;
    setSchedulePrompt({ task, targetDate: dateStr });
    setPromptMode('time');
    setPromptTime(formattedTime);
    setDraggingTaskId(null);
  };

  // Pool Drop (drop scheduled task back to pool to unschedule)
  const handlePoolDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverPool(true);
  };

  const handlePoolDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOverPool(false);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    const task = tasks.find(t => t.id === taskId);
    if (task && task.due_date) {
      handleReturnToPool(task);
    }
    setDraggingTaskId(null);
  };

  // Kanban Status Drop
  const handleStatusDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleStatusDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (!taskId) return;

    updateTask(taskId, { status });
    setDraggingTaskId(null);
  };

  // Confirm schedule modal
  const handleConfirmSchedule = () => {
    if (!schedulePrompt) return;
    const { task, targetDate } = schedulePrompt;

    if (promptMode === 'all_day') {
      updateTask(task.id, {
        due_date: targetDate,
        all_day: true,
        due_time: undefined,
        in_pool: true
      });
    } else {
      updateTask(task.id, {
        due_date: targetDate,
        all_day: false,
        due_time: promptTime || '10:00',
        in_pool: true
      });
    }

    setSchedulePrompt(null);
  };

  // Add task directly to slot (all-day or specific hour)
  const handleConfirmSlotAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!slotAddPrompt || !slotAddTitle.trim()) return;

    addTask({
      title: slotAddTitle.trim(),
      priority: slotAddPriority,
      status: 'todo',
      due_date: slotAddPrompt.dateStr,
      all_day: slotAddPrompt.isAllDay || false,
      due_time: slotAddPrompt.hour !== undefined ? `${String(slotAddPrompt.hour).padStart(2, '0')}:00` : undefined,
      in_pool: true
    });
    setSlotAddPrompt(null);
    setSlotAddTitle('');
  };

  // Return scheduled task back to general pool
  const handleReturnToPool = (task: Task) => {
    updateTask(task.id, {
      due_date: '',
      all_day: undefined,
      due_time: undefined,
      in_pool: true
    });
  };

  // Toggle status (todo -> in_progress -> done)
  const handleToggleStatus = (task: Task) => {
    const nextMap: Record<TaskStatus, TaskStatus> = {
      todo: 'in_progress',
      in_progress: 'done',
      done: 'todo'
    };
    updateTask(task.id, { status: nextMap[task.status] });
  };

  // Instant Pool Task handler ("jasny przycisk tworzenia nowego zadania - wpada do puli")
  const handleInstantPoolSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!instantPoolTitle.trim()) return;

    addTask({
      title: instantPoolTitle.trim(),
      priority: 'medium',
      status: 'todo',
      due_date: '', // No due date: drops directly into general pool!
      all_day: false,
      in_pool: true,
      target_month: instantPoolMonth || undefined
    });

    setInstantPoolTitle('');
    setInstantPoolMonth('');
    setIsInstantPoolModalOpen(false);
  };

  // Quick cycle task target month (none -> current month -> next month -> none)
  const handleCycleTaskMonth = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!task.target_month) {
      updateTask(task.id, { target_month: currentMonthKey });
    } else if (task.target_month === currentMonthKey) {
      updateTask(task.id, { target_month: nextMonthKey });
    } else {
      updateTask(task.id, { target_month: undefined });
    }
  };

  // Open task editor with full detail modification
  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditStatus(task.status);
    setEditDueDate(task.due_date || '');
    setEditDueTime(task.due_time || '');
    setEditAllDay(!!task.all_day);
    setEditDescription(task.description || '');
    setEditTargetMonth(task.target_month || '');
  };

  // Save task edits
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTitle.trim()) return;

    updateTask(editingTask.id, {
      title: editTitle.trim(),
      priority: editPriority,
      status: editStatus,
      due_date: editDueDate,
      due_time: editAllDay ? undefined : (editDueTime || undefined),
      all_day: editAllDay,
      description: editDescription.trim() || undefined,
      in_pool: !editDueDate || editDueDate.trim() === '' ? true : editingTask.in_pool,
      target_month: editTargetMonth || undefined
    });
    setEditingTask(null);
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case 'todo': 
        return <Circle className="w-4 h-4 text-slate-500 hover:text-white transition-colors" />;
      case 'in_progress': 
        return <PlayCircle className="w-4 h-4 text-orange-400" />;
      case 'done': 
        return <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />;
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'low': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getPriorityLabel = (p: TaskPriority) => {
    switch (p) {
      case 'urgent': return language === 'pl' ? 'Pilne' : 'Urgent';
      case 'high': return language === 'pl' ? 'Wysoki' : 'High';
      case 'medium': return language === 'pl' ? 'Średni' : 'Medium';
      case 'low': return language === 'pl' ? 'Niski' : 'Low';
    }
  };

  // Custom Right-Click Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    items: ContextMenuItem[];
    title?: string;
  } | null>(null);

  const handleDuplicateTask = (task: Task) => {
    addTask({
      title: `${task.title} (${language === 'pl' ? 'kopia' : 'copy'})`,
      description: task.description,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      due_time: task.due_time,
      all_day: task.all_day,
      target_month: task.target_month,
      in_pool: task.in_pool
    });
  };

  const handleTaskContextMenu = (e: React.MouseEvent, task: Task) => {
    e.preventDefault();
    e.stopPropagation();

    const isPl = language === 'pl';
    const todayISO = formatDateISO(new Date());
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1);
    const tomorrowISO = formatDateISO(tomorrowDate);

    const items: ContextMenuItem[] = [
      {
        id: 'header-title',
        header: `${isPl ? 'Zadanie' : 'Task'}: ${task.title.length > 24 ? task.title.slice(0, 24) + '...' : task.title}`
      },
      {
        id: 'status',
        label: isPl ? 'Zmień status' : 'Change status',
        icon: CheckCircle2,
        submenu: [
          {
            id: 'status-todo',
            label: isPl ? 'Do zrobienia' : 'To do',
            checked: task.status === 'todo',
            onClick: () => updateTask(task.id, { status: 'todo' })
          },
          {
            id: 'status-in_progress',
            label: isPl ? 'W toku' : 'In progress',
            checked: task.status === 'in_progress',
            onClick: () => updateTask(task.id, { status: 'in_progress' })
          },
          {
            id: 'status-done',
            label: isPl ? 'Zrobione' : 'Done',
            checked: task.status === 'done',
            onClick: () => updateTask(task.id, { status: 'done' })
          }
        ]
      },
      {
        id: 'priority',
        label: isPl ? 'Zmień priorytet' : 'Change priority',
        icon: Sparkles,
        submenu: [
          {
            id: 'prio-low',
            label: isPl ? 'Niski' : 'Low',
            checked: task.priority === 'low',
            onClick: () => updateTask(task.id, { priority: 'low' })
          },
          {
            id: 'prio-medium',
            label: isPl ? 'Średni' : 'Medium',
            checked: task.priority === 'medium',
            onClick: () => updateTask(task.id, { priority: 'medium' })
          },
          {
            id: 'prio-high',
            label: isPl ? 'Wysoki' : 'High',
            checked: task.priority === 'high',
            onClick: () => updateTask(task.id, { priority: 'high' })
          },
          {
            id: 'prio-urgent',
            label: isPl ? 'Pilny' : 'Urgent',
            checked: task.priority === 'urgent',
            onClick: () => updateTask(task.id, { priority: 'urgent' })
          }
        ]
      },
      { id: 'div-1', divider: true },
      {
        id: 'schedule',
        label: isPl ? 'Termin i kalendarz' : 'Schedule & Calendar',
        icon: CalendarDays,
        submenu: [
          {
            id: 'sched-today-allday',
            label: isPl ? 'Zaplanuj na Dziś (cały dzień)' : 'Schedule Today (All Day)',
            onClick: () => updateTask(task.id, { due_date: todayISO, due_time: undefined, all_day: true, in_pool: false })
          },
          {
            id: 'sched-today-09',
            label: isPl ? 'Zaplanuj na Dziś o 09:00' : 'Schedule Today at 09:00',
            onClick: () => updateTask(task.id, { due_date: todayISO, due_time: '09:00', all_day: false, in_pool: false })
          },
          {
            id: 'sched-today-14',
            label: isPl ? 'Zaplanuj na Dziś o 14:00' : 'Schedule Today at 14:00',
            onClick: () => updateTask(task.id, { due_date: todayISO, due_time: '14:00', all_day: false, in_pool: false })
          },
          {
            id: 'sched-tomorrow',
            label: isPl ? 'Przełóż na Jutro' : 'Move to Tomorrow',
            onClick: () => updateTask(task.id, { due_date: tomorrowISO, in_pool: false })
          },
          { id: 'div-sched-sub', divider: true },
          {
            id: 'sched-pool',
            label: isPl ? 'Zwróć do puli ogólnej' : 'Return to pool',
            onClick: () => handleReturnToPool(task)
          }
        ]
      },
      {
        id: 'month-pool',
        label: isPl ? 'Miesięczna pula' : 'Monthly task pool',
        icon: Layers,
        submenu: [
          {
            id: 'm-none',
            label: isPl ? 'Brak (pula ogólna)' : 'None (general pool)',
            checked: !task.target_month,
            onClick: () => updateTask(task.id, { target_month: undefined })
          },
          ...availableMonths.slice(0, 6).map(m => ({
            id: `m-${m.value}`,
            label: m.label,
            checked: task.target_month === m.value,
            onClick: () => updateTask(task.id, { target_month: m.value })
          }))
        ]
      },
      { id: 'div-2', divider: true },
      {
        id: 'edit',
        label: isPl ? 'Edytuj zadanie' : 'Edit task',
        icon: Edit2,
        onClick: () => handleOpenEdit(task)
      },
      {
        id: 'duplicate',
        label: isPl ? 'Duplikuj zadanie' : 'Duplicate task',
        icon: Plus,
        onClick: () => handleDuplicateTask(task)
      },
      { id: 'div-3', divider: true },
      {
        id: 'delete',
        label: isPl ? 'Usuń zadanie' : 'Delete task',
        icon: Trash2,
        danger: true,
        onClick: () => deleteTask(task.id)
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      title: isPl ? 'Zarządzaj zadaniem' : 'Manage Task'
    });
  };

  const handleSlotContextMenu = (e: React.MouseEvent, dateStr: string, hour?: number) => {
    e.preventDefault();
    e.stopPropagation();

    const isPl = language === 'pl';
    const hourLabel = hour !== undefined ? `${String(hour).padStart(2, '0')}:00` : undefined;

    const items: ContextMenuItem[] = [
      {
        id: 'header-slot',
        header: `${dateStr}${hourLabel ? ` @ ${hourLabel}` : ` (${isPl ? 'Całodniowe' : 'All-day'})`}`
      },
      ...(hour !== undefined ? [
        {
          id: 'add-at-hour',
          label: isPl ? `Dodaj zadanie o ${hourLabel}` : `Add task at ${hourLabel}`,
          icon: Plus,
          onClick: () => {
            setSlotAddPrompt({ dateStr, hour });
            setSlotAddTitle('');
            setSlotAddPriority('medium');
          }
        }
      ] : []),
      {
        id: 'add-allday',
        label: isPl ? 'Dodaj zadanie całodniowe' : 'Add all-day task',
        icon: CalendarDays,
        onClick: () => {
          setSlotAddPrompt({ dateStr, isAllDay: true });
          setSlotAddTitle('');
          setSlotAddPriority('medium');
        }
      },
      { id: 'div-slot-1', divider: true },
      {
        id: 'open-agenda',
        label: isPl ? 'Otwórz agendę tego dnia' : 'Open day agenda',
        icon: Clock,
        onClick: () => setSelectedAgendaDate(dateStr)
      },
      {
        id: 'luna-note',
        label: isPl ? 'Notatka z GPT 5.6 Luna' : 'Planning note with Luna',
        icon: Sparkles,
        onClick: () => setIsNoteModalOpen(true)
      }
    ];

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items,
      title: isPl ? 'Menu kalendarza' : 'Calendar Menu'
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto font-sans pb-16">
      
      {/* 1. Luna AI Briefing Card at Top (GPT 5.6 Luna - Podsumowanie dzisiejszego dnia, jutra, niedzieli i puli zadań) */}
      <LunaBriefingCard onOpenPool={() => setIsPoolCollapsed(false)} />

      {/* 2. Sleek Top Navigation & View Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display text-white flex items-center gap-2.5">
              <span>{t('tasks.poolTitle')}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 border border-white/10 font-mono font-medium">
                {allPoolTasks.length} {language === 'pl' ? 'w puli' : 'in pool'}
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {t('tasks.poolTrayHint')}
            </p>
          </div>
        </div>

        {/* Actions and View Switcher */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Przycisk tworzenia nowego zadania - wpada do puli */}
          <button
            type="button"
            onClick={() => {
              setIsInstantPoolModalOpen(true);
              setInstantPoolTitle('');
              setInstantPoolMonth('');
            }}
            className="px-3.5 py-2 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] font-bold text-xs sm:text-sm shadow-sm flex items-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
            title={language === 'pl' ? 'Utwórz zadanie bezpośrednio w puli ogólnej' : 'Create task directly into general pool'}
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{t('tasks.newPoolTaskBtn')}</span>
          </button>

          {/* GPT 5.6 Luna AI Smart Action */}
          <button
            type="button"
            onClick={() => setIsLunaAdviceOpen(true)}
            className="px-3 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 hover:border-purple-500/50 text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shrink-0"
            title="Asystent GPT 5.6 Luna: Rekomendacja planowania"
          >
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">GPT 5.6 Luna</span>
          </button>

          {/* View Switcher: Planer vs Statusy */}
          <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('planner')}
              className={cn(
                "px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'planner'
                  ? "bg-white/15 text-white shadow-sm font-bold border border-white/15"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <CalendarDays className="w-4 h-4 text-[#4ade80]" />
              {t('tasks.tabPlanner')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('board')}
              className={cn(
                "px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'board'
                  ? "bg-white/15 text-white shadow-sm font-bold border border-white/15"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Kanban className="w-4 h-4 text-purple-400" />
              {t('tasks.tabStatuses')}
            </button>
          </div>
        </div>
      </div>

      {/* VIEW 1: PLANER (PULA NA GÓRZE + KALENDARZ PONIŻEJ) */}
      {activeTab === 'planner' && (
        <div className="space-y-6">
          
          {/* ========================================================
              TOP SECTION: PULA ZADAŃ (TASK POOL ON TOP)
              ======================================================== */}
          <div 
            onDragOver={handlePoolDragOver}
            onDragLeave={() => setDragOverPool(false)}
            onDrop={handlePoolDrop}
            className={cn(
              "glass-card rounded-2xl border transition-all duration-200 bg-[#161616]/90 shadow-xl overflow-hidden",
              dragOverPool ? "border-[#4ade80] ring-2 ring-[#4ade80]/40 bg-[#13231a]" : "border-white/10"
            )}
          >
            
            {/* Header of Pool Tray */}
            <div className="p-4 sm:p-5 flex items-center justify-between border-b border-white/5 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#4ade80]/15 border border-[#4ade80]/30 flex items-center justify-center text-[#4ade80] shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    {t('tasks.poolTitle')}
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                      {poolTasks.length} {t('tasks.tasksInPool')}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 hidden sm:block">
                    {t('tasks.dragHint')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Jasny przycisk dodawania do puli bezpośrednio przy puli */}
                <button
                  type="button"
                  onClick={() => {
                    setIsInstantPoolModalOpen(true);
                    setInstantPoolTitle('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] text-xs font-bold shadow-[0_0_12px_rgba(74,222,128,0.3)] transition-all cursor-pointer active:scale-95"
                  title="Utwórz zadanie bezpośrednio w puli"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>{language === 'pl' ? '+ Do puli' : '+ To pool'}</span>
                </button>

                {/* Toggle Collapse Pool */}
                <button
                  type="button"
                  onClick={() => setIsPoolCollapsed(prev => !prev)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {isPoolCollapsed ? (
                    <>
                      <ChevronDown className="w-4 h-4 text-[#4ade80]" />
                      <span>{t('tasks.expandPool')}</span>
                    </>
                  ) : (
                    <>
                      <ChevronUp className="w-4 h-4 text-[#4ade80]" />
                      <span>{t('tasks.collapsePool')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Add Bar - Simplified, Clean, No filters or priorities */}
            <div className="p-4 sm:p-5 border-b border-white/5 bg-black/20">
              <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    placeholder={t('tasks.poolQuickAddPlaceholder')}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors pr-10"
                  />
                  {quickTitle && (
                    <button
                      type="button"
                      onClick={() => setQuickTitle('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Mała ikonka notatki - otwiera osobne okno kontekstowe połączone z GPT 5.6 Luna */}
                <button
                  type="button"
                  onClick={() => {
                    setIsNoteModalOpen(true);
                    if (quickTitle) setNoteContent(quickTitle);
                  }}
                  className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl bg-[#1e1e24] hover:bg-[#4ade80]/20 text-slate-300 hover:text-[#4ade80] border border-white/10 hover:border-[#4ade80]/40 transition-all cursor-pointer flex items-center gap-2 shrink-0 group shadow-sm"
                  title={t('tasks.noteIconTooltip')}
                >
                  <NotebookPen className="w-4 h-4 text-[#4ade80] group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold hidden sm:inline">{language === 'pl' ? 'Notatka Luna' : 'Luna Note'}</span>
                </button>

                <button
                  type="submit"
                  disabled={!quickTitle.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#1a1a1a] font-bold text-sm hover:bg-[#4ade80]/90 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t('tasks.poolQuickAddBtn')}</span>
                </button>
              </form>
            </div>

            {/* Miesięczna pula zadań (Monthly Task Pool Filter) */}
            <div className="px-4 sm:px-5 py-2.5 bg-black/40 border-b border-white/5 flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                  <span>{t('tasks.monthlyPoolFilter')}:</span>
                </span>

                <div className="flex items-center gap-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('all')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer",
                      selectedMonthFilter === 'all'
                        ? "bg-purple-500/25 text-purple-200 border border-purple-500/40 font-bold"
                        : "text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    )}
                  >
                    {t('tasks.allInPool')} ({allPoolTasks.length})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('current')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer",
                      selectedMonthFilter === 'current'
                        ? "bg-purple-500/25 text-purple-200 border border-purple-500/40 font-bold"
                        : "text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    )}
                  >
                    {t('tasks.currentMonth')} ({currentMonthPoolCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('next')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer",
                      selectedMonthFilter === 'next'
                        ? "bg-purple-500/25 text-purple-200 border border-purple-500/40 font-bold"
                        : "text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    )}
                  >
                    {t('tasks.nextMonth')} ({nextMonthPoolCount})
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMonthFilter('unassigned')}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs transition-all cursor-pointer",
                      selectedMonthFilter === 'unassigned'
                        ? "bg-purple-500/25 text-purple-200 border border-purple-500/40 font-bold"
                        : "text-slate-400 hover:text-white border border-transparent hover:border-white/10"
                    )}
                  >
                    {t('tasks.noMonth')} ({unassignedPoolCount})
                  </button>
                </div>
              </div>

              {/* Specific Month Select */}
              <div className="flex items-center gap-1.5">
                <select
                  value={['all', 'current', 'next', 'unassigned'].includes(selectedMonthFilter) ? '' : selectedMonthFilter}
                  onChange={(e) => {
                    if (e.target.value) {
                      setSelectedMonthFilter(e.target.value);
                    }
                  }}
                  className="bg-[#1e1e24] border border-white/10 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500 cursor-pointer"
                >
                  <option value="">{language === 'pl' ? 'Inny miesiąc...' : 'Other month...'}</option>
                  {availableMonths.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Task Pool Tray: Grid of Draggable Cards */}
            {!isPoolCollapsed && (
              <div className="p-4 sm:p-5 bg-black/10">
                {poolTasks.length === 0 ? (
                  <div className="text-center py-8 px-4 border border-dashed border-white/10 rounded-2xl">
                    <Sparkles className="w-6 h-6 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs text-slate-400">
                      {language === 'pl' ? 'Brak zadań w wybranym filtrze puli.' : 'No tasks in selected pool filter.'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {language === 'pl' ? 'Zmień filtr lub wpisz zadanie powyżej i wciśnij Enter!' : 'Change filter or type a task above!'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-none">
                    {poolTasks.map(task => {
                      const isScheduled = !!task.due_date && task.due_date.trim() !== '';

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => {
                            setHoveredTask(null);
                            handleDragStart(e, task.id);
                          }}
                          onDragEnd={handleDragEnd}
                          onMouseEnter={(e) => handleTileMouseEnter(task, e)}
                          onMouseLeave={handleTileMouseLeave}
                          onClick={() => {
                            if (draggingTaskId) return;
                            handleOpenEdit(task);
                          }}
                          onContextMenu={(e) => handleTaskContextMenu(e, task)}
                          className={cn(
                            "h-10 px-2.5 rounded-xl border transition-all duration-150 flex items-center gap-2 cursor-pointer select-none group bg-[#1c1c1e] hover:bg-[#252528] relative shadow-sm",
                            draggingTaskId === task.id ? "opacity-30 border-dashed border-[#4ade80] scale-95" : "border-white/10 hover:border-[#4ade80]/50 hover:shadow-md",
                            task.status === 'done' ? "opacity-50 bg-white/[0.02]" : ""
                          )}
                          title={language === 'pl' ? 'Kliknij, aby zmodyfikować lub przeciągnij na oś czasu' : 'Click to modify or drag to timeline'}
                        >
                          <div className="text-slate-600 group-hover:text-slate-400 shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(task);
                            }}
                            className="shrink-0 cursor-pointer text-slate-500 hover:text-white"
                            title={language === 'pl' ? 'Zmień status' : 'Change status'}
                          >
                            {getStatusIcon(task.status)}
                          </button>

                          <span className={cn(
                            "text-xs font-medium truncate flex-1 leading-none",
                            task.status === 'done' ? "line-through text-slate-500" : "text-slate-200 group-hover:text-white"
                          )}>
                            {task.title}
                          </span>

                          {/* Target Month Indicator */}
                          {task.target_month ? (
                            <button
                              type="button"
                              onClick={(e) => handleCycleTaskMonth(task, e)}
                              className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/35 transition-colors font-mono"
                              title={language === 'pl' ? `Miesiąc: ${task.target_month}. Kliknij, aby zmienić.` : `Month: ${task.target_month}. Click to change.`}
                            >
                              {task.target_month.slice(5)}/{task.target_month.slice(2,4)}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => handleCycleTaskMonth(task, e)}
                              className="shrink-0 opacity-0 group-hover:opacity-100 text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all font-mono"
                              title={language === 'pl' ? 'Przypisz miesiąc do zadania' : 'Assign month'}
                            >
                              +M
                            </button>
                          )}

                          {isScheduled && (
                            <span className="shrink-0 text-blue-400" title={`${task.due_date} ${task.due_time ? `@ ${task.due_time}` : ''}`}>
                              <CalendarIcon className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ========================================================
              BOTTOM SECTION: KALENDARZ Z OSIĄ CZASU 05:00 - 22:00
              ======================================================== */}
          <div className="glass-card p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#161616]/90 shadow-xl space-y-4">
            
            {/* Calendar Controls & Range */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-[#4ade80]" />
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">
                    {dateRangeLabel}
                  </h3>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
                  <Clock className="w-3.5 h-3.5 text-[#38bdf8]" />
                  <span>05:00 – 22:00</span>
                </div>
              </div>

              {/* 3, 5, 7 dni switcher + Google Calendar button + navigation */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end flex-wrap">
                {/* Google Calendar integration button */}
                {!googleToken ? (
                  <button
                    type="button"
                    onClick={loginGoogle}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title={language === 'pl' ? 'Połącz konto Google, aby widzieć spotkania z Kalendarza Google' : 'Connect Google Calendar'}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>{language === 'pl' ? 'Połącz Google Calendar' : 'Connect Google'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={syncCalendar}
                    disabled={isSyncingCalendar}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 text-xs font-semibold transition-all cursor-pointer shadow-sm"
                    title={language === 'pl' ? 'Zsynchronizowano z Google Calendar. Kliknij, aby odświeżyć.' : 'Synced with Google Calendar. Click to refresh.'}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 text-blue-400" />
                    <span>Google ({googleEvents.length})</span>
                    <RotateCcw className={cn("w-3 h-3 text-blue-300", isSyncingCalendar && "animate-spin")} />
                  </button>
                )}

                {/* 3, 5, 7 Days Switcher */}
                <div className="flex items-center p-1 bg-black/40 rounded-xl border border-white/10">
                  {([3, 5, 7] as const).map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setDayCount(count)}
                      className={cn(
                        "px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer",
                        dayCount === count 
                          ? "bg-[#4ade80] text-[#1a1a1a] shadow-sm font-bold" 
                          : "text-slate-400 hover:text-white"
                      )}
                    >
                      {count === 3 ? t('tasks.daysView3') : count === 5 ? t('tasks.daysView5') : t('tasks.daysView7')}
                    </button>
                  ))}
                </div>

                {/* Calendar Navigation Buttons */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrev}
                    type="button"
                    className="p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title={language === 'pl' ? 'Poprzedni okres' : 'Previous period'}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleToday}
                    type="button"
                    className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    {t('tasks.today')}
                  </button>
                  <button
                    onClick={handleNext}
                    type="button"
                    className="p-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title={language === 'pl' ? 'Następny okres' : 'Next period'}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Timeline Calendar Container */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-[#121215] shadow-2xl">
              <div className="min-w-[680px] divide-y divide-white/10">
                
                {/* 1. Header Row (Hours Column + Day Columns) */}
                <div className={cn("grid sticky top-0 z-20 bg-[#18181c] border-b border-white/10", gridColsClass)}>
                  {/* Top-Left Corner Header */}
                  <div className="p-3 flex flex-col items-center justify-center border-r border-white/10 bg-[#141416] text-slate-400">
                    <Clock className="w-4 h-4 text-[#4ade80]" />
                    <span className="text-[10px] font-mono font-bold mt-0.5 text-slate-400">05-22</span>
                  </div>

                  {/* Day Column Headers - Clickable to open DayAgendaModal */}
                  {calendarDays.map(date => {
                    const dateStr = formatDateISO(date);
                    const isToday = dateStr === todayISO;
                    const locale = language === 'pl' ? 'pl-PL' : 'en-US';
                    const dayName = date.toLocaleDateString(locale, { weekday: 'short' });
                    const dayNumber = date.getDate();
                    const monthName = date.toLocaleDateString(locale, { month: 'short' });
                    const dayTasks = tasksByDay[dateStr] || { allDay: [], byHour: {}, total: 0 };
                    const dayGoogleCount = googleEvents.filter(e => e.date === dateStr).length;

                    return (
                      <div
                        key={`header-${dateStr}`}
                        onClick={() => setSelectedAgendaDate(dateStr)}
                        onContextMenu={(e) => handleSlotContextMenu(e, dateStr)}
                        className={cn(
                          "p-3 border-r border-white/10 flex items-center justify-between transition-colors cursor-pointer group hover:bg-white/[0.08]",
                          isToday ? "bg-[#4ade80]/10 hover:bg-[#4ade80]/15" : "bg-transparent"
                        )}
                        title={language === 'pl' ? 'Kliknij lewym: agenda, prawym: menu kontekstowe' : 'Left-click: agenda, Right-click: context menu'}
                      >
                        <div>
                          <div className={cn(
                            "text-xs uppercase font-bold tracking-wider flex items-center gap-1.5",
                            isToday ? "text-[#4ade80]" : "text-slate-400 group-hover:text-slate-200"
                          )}>
                            <span>{dayName}</span>
                            <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity font-normal">
                              • Agenda ↗
                            </span>
                          </div>
                          <div className="text-base font-display font-bold text-white flex items-center gap-1.5">
                            {dayNumber} <span className="text-xs font-normal text-slate-400">{monthName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {isToday && (
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                              {language === 'pl' ? 'Dziś' : 'Today'}
                            </span>
                          )}
                          {dayGoogleCount > 0 && (
                            <span 
                              className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30"
                              title={`${dayGoogleCount} spotkań z Google Calendar`}
                            >
                              G:{dayGoogleCount}
                            </span>
                          )}
                          <span
                            className="text-xs font-mono font-semibold px-2 py-0.5 rounded-lg bg-white/5 text-slate-300 border border-white/5 group-hover:border-purple-500/40 transition-colors"
                            title={language === 'pl' ? 'Liczba zadań tego dnia' : 'Tasks this day'}
                          >
                            {dayTasks.total}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 2. All-Day Row */}
                <div className={cn("grid bg-[#141416]/80 border-b border-white/10", gridColsClass)}>
                  {/* Left All-day Label */}
                  <div className="p-2 border-r border-white/10 bg-[#161619] flex flex-col items-center justify-center text-center">
                    <Sun className="w-3.5 h-3.5 text-amber-400 mb-0.5" />
                    <span className="text-[9px] font-bold uppercase text-slate-400 leading-tight">
                      {language === 'pl' ? 'Cały dzień' : 'All-day'}
                    </span>
                  </div>

                  {/* All-Day Cells for each day */}
                  {calendarDays.map(date => {
                    const dateStr = formatDateISO(date);
                    const isDragOver = dragOverTarget?.dateStr === dateStr && dragOverTarget?.isAllDay;
                    const dayTasks = tasksByDay[dateStr] || { allDay: [], byHour: {}, total: 0 };
                    const dayGoogleAllDay = googleEvents.filter(e => e.date === dateStr && (!e.start_time || e.start_time === '00:00'));

                    return (
                      <div
                        key={`allday-${dateStr}`}
                        onDragOver={(e) => handleAllDayDragOver(e, dateStr)}
                        onDragLeave={() => setDragOverTarget(null)}
                        onDrop={(e) => handleAllDayDrop(e, dateStr)}
                        onContextMenu={(e) => handleSlotContextMenu(e, dateStr)}
                        className={cn(
                          "p-2 border-r border-white/10 min-h-[58px] transition-all flex flex-col gap-1.5 justify-center",
                          isDragOver ? "bg-amber-400/15 border-dashed border-amber-400 ring-2 ring-amber-400/30" : "hover:bg-white/[0.02]"
                        )}
                      >
                        {/* Google Calendar all-day events */}
                        {dayGoogleAllDay.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {dayGoogleAllDay.map(gEvent => (
                              <div
                                key={`g-allday-${gEvent.id}`}
                                onClick={() => setSelectedAgendaDate(dateStr)}
                                className="px-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-200 text-xs flex items-center justify-between gap-1 shadow-sm cursor-pointer hover:bg-blue-500/25 transition-colors"
                                title={`${gEvent.title} (Google Calendar) - Kliknij, aby zobaczyć agendę`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                                  <span className="font-semibold truncate text-[11px] text-blue-100">{gEvent.title}</span>
                                </div>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/30 text-blue-300 font-mono">GCal</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {dayTasks.allDay.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {dayTasks.allDay.map(task => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, task.id)}
                                onDragEnd={handleDragEnd}
                                onContextMenu={(e) => handleTaskContextMenu(e, task)}
                                className={cn(
                                  "px-2 py-1.5 rounded-lg bg-[#1e1e22] border border-white/10 hover:border-amber-400/40 transition-all text-xs group/item flex items-center justify-between gap-1.5 cursor-grab active:cursor-grabbing select-none shadow-sm",
                                  task.status === 'done' && "opacity-50 bg-white/[0.02]"
                                )}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(task)}
                                    className="shrink-0 cursor-pointer"
                                  >
                                    {getStatusIcon(task.status)}
                                  </button>
                                  <span
                                    className={cn(
                                      "w-1.5 h-1.5 rounded-full shrink-0",
                                      task.priority === 'urgent' ? "bg-red-400" :
                                      task.priority === 'high' ? "bg-orange-400" :
                                      task.priority === 'medium' ? "bg-blue-400" : "bg-slate-400"
                                    )}
                                  />
                                  <span className={cn(
                                    "font-medium truncate text-xs leading-none",
                                    task.status === 'done' ? "line-through text-slate-500" : "text-slate-200 group-hover/item:text-white"
                                  )}>
                                    {task.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => handleReturnToPool(task)}
                                    className="opacity-0 group-hover/item:opacity-100 text-slate-400 hover:text-amber-400 p-0.5 rounded transition-opacity cursor-pointer"
                                    title={t('tasks.removeFromDay')}
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : dayGoogleAllDay.length === 0 ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSlotAddPrompt({ dateStr, isAllDay: true });
                              setSlotAddTitle('');
                              setSlotAddPriority('medium');
                            }}
                            className={cn(
                              "h-7 w-full border border-dashed rounded-lg flex items-center justify-center text-[10px] transition-colors cursor-pointer",
                              isDragOver ? "border-amber-400 text-amber-300 font-semibold" : "border-white/5 text-slate-600 hover:border-white/20 hover:text-slate-400"
                            )}
                          >
                            {isDragOver ? (language === 'pl' ? 'Upuść całodniowe' : 'Drop all-day') : '+'}
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* 3. Hourly Timeline Rows (05:00 to 22:00) */}
                <div className="max-h-[600px] overflow-y-auto scrollbar-thin divide-y divide-white/5">
                  {TIMELINE_HOURS.map(hour => {
                    const hourLabel = `${String(hour).padStart(2, '0')}:00`;

                    return (
                      <div
                        key={`hour-row-${hour}`}
                        className={cn("grid group/hour transition-colors", gridColsClass)}
                      >
                        {/* Time label on the left */}
                        <div className="p-2 border-r border-white/10 bg-[#161619] sticky left-0 z-10 flex items-start justify-center text-xs font-mono font-bold text-slate-400 select-none">
                          <span>{hourLabel}</span>
                        </div>

                        {/* Each day's cell for this hour */}
                        {calendarDays.map(date => {
                          const dateStr = formatDateISO(date);
                          const isDragOver = dragOverTarget?.dateStr === dateStr && dragOverTarget?.hour === hour;
                          const dayTasks = tasksByDay[dateStr] || { allDay: [], byHour: {}, total: 0 };
                          const slotTasks = dayTasks.byHour[hour] || [];
                          const slotGoogleEvents = googleEvents.filter(e => {
                            if (e.date !== dateStr || !e.start_time || e.start_time === '00:00') return false;
                            const h = parseInt(e.start_time.split(':')[0], 10);
                            return h === hour;
                          });

                          return (
                            <div
                              key={`slot-${dateStr}-${hour}`}
                              onDragOver={(e) => handleSlotDragOver(e, dateStr, hour)}
                              onDragLeave={() => setDragOverTarget(null)}
                              onDrop={(e) => handleSlotDrop(e, dateStr, hour)}
                              onContextMenu={(e) => handleSlotContextMenu(e, dateStr, hour)}
                              className={cn(
                                "p-1.5 border-r border-white/5 min-h-[58px] relative transition-all group/slot flex flex-col gap-1.5 justify-center",
                                isDragOver
                                  ? "bg-[#4ade80]/20 border-dashed border-[#4ade80] ring-2 ring-[#4ade80]/40 scale-[0.99] rounded-lg"
                                  : "hover:bg-white/[0.03]"
                              )}
                            >
                              {/* Google Calendar Events for this hour */}
                              {slotGoogleEvents.length > 0 && (
                                <div className="flex flex-col gap-1">
                                  {slotGoogleEvents.map(gEvent => (
                                    <div
                                      key={`g-slot-${gEvent.id}`}
                                      onClick={() => setSelectedAgendaDate(dateStr)}
                                      className="p-1.5 rounded-xl bg-blue-950/40 border border-blue-500/30 hover:border-blue-400/60 shadow-sm transition-all text-xs flex flex-col gap-1 cursor-pointer"
                                      title={`${gEvent.title} (${gEvent.start_time}${gEvent.end_time ? ' - ' + gEvent.end_time : ''}) - Google Calendar`}
                                    >
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/25 text-blue-300 font-mono text-[10px] font-bold">
                                          {gEvent.start_time}
                                        </span>
                                        <span className="text-[9px] px-1 py-0.2 rounded bg-blue-500/20 text-blue-300 font-semibold uppercase">
                                          Google
                                        </span>
                                      </div>
                                      <div className="font-medium truncate text-xs text-white">
                                        {gEvent.title}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {slotTasks.length > 0 ? (
                                <div className="flex flex-col gap-1.5">
                                  {slotTasks.map(task => (
                                    <div
                                      key={task.id}
                                      draggable
                                      onDragStart={(e) => handleDragStart(e, task.id)}
                                      onDragEnd={handleDragEnd}
                                      onContextMenu={(e) => handleTaskContextMenu(e, task)}
                                      className={cn(
                                        "p-2 rounded-xl bg-[#1c1c20] border border-blue-500/20 hover:border-blue-400/50 shadow-sm transition-all text-xs group/card cursor-grab active:cursor-grabbing select-none flex flex-col gap-1",
                                        task.status === 'done' && "opacity-50 bg-white/[0.02]"
                                      )}
                                    >
                                      {/* Top line: time + actions */}
                                      <div className="flex items-center justify-between gap-1">
                                        <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px] font-bold">
                                          {task.due_time || hourLabel}
                                        </span>

                                        <div className="flex items-center gap-1 opacity-80 group-hover/card:opacity-100 transition-opacity">
                                          <button
                                            type="button"
                                            onClick={() => handleReturnToPool(task)}
                                            className="text-slate-500 hover:text-amber-400 p-0.5 rounded transition-colors cursor-pointer"
                                            title={t('tasks.removeFromDay')}
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleOpenEdit(task)}
                                            className="text-slate-500 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                                            title={t('tasks.editTask')}
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Middle line: status toggle & title */}
                                      <div className="flex items-start gap-1.5 min-w-0">
                                        <button
                                          type="button"
                                          onClick={() => handleToggleStatus(task)}
                                          className="shrink-0 mt-0.5 cursor-pointer"
                                        >
                                          {getStatusIcon(task.status)}
                                        </button>
                                        <span className={cn(
                                          "font-medium break-words leading-tight flex-1 text-xs",
                                          task.status === 'done' ? "line-through text-slate-500" : "text-slate-200 group-hover/card:text-white"
                                        )}>
                                          {task.title}
                                        </span>
                                      </div>

                                      {/* Priority badge */}
                                      <div className="flex items-center gap-1 pl-5">
                                        <span className={cn("px-1.5 py-0.2 rounded text-[9px] border font-medium", getPriorityColor(task.priority))}>
                                          {getPriorityLabel(task.priority)}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSlotAddPrompt({ dateStr, hour });
                                    setSlotAddTitle('');
                                    setSlotAddPriority('medium');
                                  }}
                                  className={cn(
                                    "w-full h-full min-h-[38px] rounded-lg border border-transparent flex items-center justify-center text-[10px] text-slate-600 group-hover/slot:text-slate-400 group-hover/slot:border-dashed group-hover/slot:border-white/10 transition-all cursor-pointer",
                                    isDragOver && "border-dashed border-[#4ade80] text-[#4ade80] font-bold"
                                  )}
                                >
                                  {isDragOver ? (
                                    <span className="flex items-center gap-1 text-[#4ade80]">
                                      <Plus className="w-3 h-3" />
                                      {language === 'pl' ? `Upuść o ${hourLabel}` : `Drop at ${hourLabel}`}
                                    </span>
                                  ) : (
                                    <span className="opacity-0 group-hover/slot:opacity-60 transition-opacity flex items-center gap-1">
                                      <Plus className="w-2.5 h-2.5" />
                                      {hourLabel}
                                    </span>
                                  )}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW 2: STATUSY ZADAŃ (KANBAN BOARD: DO ZROBIENIA | W TOKU | ZROBIONE) */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          {/* Quick Add Bar for Board */}
          <div className="glass-card p-4 rounded-2xl border border-white/10 bg-[#161616]/90 flex items-center gap-2.5">
            <input
              type="text"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              placeholder={t('tasks.poolQuickAddPlaceholder')}
              className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors"
            />
            <button
              type="button"
              onClick={() => {
                setIsNoteModalOpen(true);
                if (quickTitle) setNoteContent(quickTitle);
              }}
              className="p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl bg-[#1e1e24] hover:bg-[#4ade80]/20 text-slate-300 hover:text-[#4ade80] border border-white/10 hover:border-[#4ade80]/40 transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-sm"
              title={t('tasks.noteIconTooltip')}
            >
              <NotebookPen className="w-4 h-4 text-[#4ade80]" />
              <span className="text-xs font-semibold hidden sm:inline">{language === 'pl' ? 'Notatka Luna' : 'Luna Note'}</span>
            </button>
            <button
              onClick={handleQuickAdd}
              disabled={!quickTitle.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#1a1a1a] font-bold text-sm hover:bg-[#4ade80]/90 disabled:opacity-30 disabled:pointer-events-none transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>{t('tasks.poolQuickAddBtn')}</span>
            </button>
          </div>

          {/* 3 Columns Kanban */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {(['todo', 'in_progress', 'done'] as const).map(colStatus => {
              const colTasks = tasks.filter(t => t.status === colStatus);
              const isDragOver = dragOverStatus === colStatus;

              let colTitle = language === 'pl' ? 'Do zrobienia' : 'To Do';
              let colIcon = <Circle className="w-4 h-4 text-blue-400" />;
              let colBadgeColor = "bg-blue-500/20 text-blue-300 border-blue-500/30";

              if (colStatus === 'in_progress') {
                colTitle = language === 'pl' ? 'W toku' : 'In Progress';
                colIcon = <PlayCircle className="w-4 h-4 text-orange-400" />;
                colBadgeColor = "bg-orange-500/20 text-orange-300 border-orange-500/30";
              } else if (colStatus === 'done') {
                colTitle = language === 'pl' ? 'Zrobione' : 'Done';
                colIcon = <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />;
                colBadgeColor = "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/30";
              }

              return (
                <div
                  key={colStatus}
                  onDragOver={(e) => handleStatusDragOver(e, colStatus)}
                  onDragLeave={() => setDragOverStatus(null)}
                  onDrop={(e) => handleStatusDrop(e, colStatus)}
                  className={cn(
                    "glass-card p-4 sm:p-5 rounded-2xl border border-white/10 bg-[#161616]/90 shadow-xl flex flex-col min-h-[500px] transition-all",
                    isDragOver ? "ring-2 ring-[#4ade80]/40 border-dashed border-[#4ade80] bg-[#4ade80]/5" : ""
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      {colIcon}
                      <h3 className="font-display font-bold text-white text-base">
                        {colTitle}
                      </h3>
                    </div>
                    <span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-lg border", colBadgeColor)}>
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Tasks in Column */}
                  <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                    {colTasks.length === 0 ? (
                      <div className="py-12 text-center text-slate-500 text-xs border border-dashed border-white/5 rounded-xl">
                        {language === 'pl' ? 'Brak zadań w tym statusie' : 'No tasks in this status'}
                      </div>
                    ) : (
                      colTasks.map(task => {
                        const isScheduled = !!task.due_date && task.due_date.trim() !== '';

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            onDragEnd={handleDragEnd}
                            onContextMenu={(e) => handleTaskContextMenu(e, task)}
                            className={cn(
                              "p-3 rounded-xl border border-white/10 bg-[#1c1c1e] hover:bg-[#222224] transition-all group cursor-grab active:cursor-grabbing shadow-sm flex flex-col gap-2",
                              draggingTaskId === task.id ? "opacity-30 border-dashed border-[#4ade80]" : ""
                            )}
                          >
                            <div className="flex items-start gap-2">
                              <div className="pt-0.5 text-slate-600 group-hover:text-slate-400">
                                <GripVertical className="w-4 h-4" />
                              </div>
                              <p className={cn(
                                "text-sm font-medium leading-snug break-words flex-1",
                                task.status === 'done' ? "line-through text-slate-500" : "text-white"
                              )}>
                                {task.title}
                              </p>
                              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(task)}
                                  className="p-1 rounded text-slate-400 hover:text-white"
                                  title={t('tasks.editTask')}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteTask(task.id)}
                                  className="p-1 rounded text-slate-400 hover:text-red-400"
                                  title={t('tasks.deleteTask')}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5 pl-6">
                              <span className={cn("px-2 py-0.5 rounded-full font-medium border text-[10px]", getPriorityColor(task.priority))}>
                                {getPriorityLabel(task.priority)}
                              </span>

                              {isScheduled ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                                  <CalendarIcon className="w-2.5 h-2.5" />
                                  {task.due_date}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[10px]">
                                  {language === 'pl' ? 'W puli' : 'In pool'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SCHEDULE PROMPT MODAL (All-day vs specific hour) */}
      <AnimatePresence>
        {schedulePrompt && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSchedulePrompt(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#18181b] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-5"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white font-display">
                    {t('tasks.scheduleModalTitle')}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {t('tasks.scheduleModalSubtitle')}{' '}
                    <span className="text-[#4ade80] font-semibold">{schedulePrompt.targetDate}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSchedulePrompt(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Task Preview Card */}
              <div className="p-3 rounded-xl bg-black/40 border border-white/10 flex items-center gap-3">
                <div className="w-2 h-8 rounded-full bg-[#4ade80]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">
                    {schedulePrompt.task.title}
                  </p>
                  <span className={cn("text-[10px] px-2 py-0.5 rounded-full border font-medium", getPriorityColor(schedulePrompt.task.priority))}>
                    {getPriorityLabel(schedulePrompt.task.priority)}
                  </span>
                </div>
              </div>

              {/* Selection Options */}
              <div className="space-y-3">
                {/* Option 1: All-Day */}
                <button
                  type="button"
                  onClick={() => setPromptMode('all_day')}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer",
                    promptMode === 'all_day' 
                      ? "bg-[#4ade80]/15 border-[#4ade80] shadow-[0_0_15px_rgba(74,222,128,0.15)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    promptMode === 'all_day' ? "bg-[#4ade80] text-[#1a1a1a]" : "bg-white/10 text-slate-300"
                  )}>
                    <Sun className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      <span>{t('tasks.scheduleAllDay')}</span>
                      {promptMode === 'all_day' && <Check className="w-4 h-4 text-[#4ade80]" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('tasks.scheduleAllDayDesc')}
                    </p>
                  </div>
                </button>

                {/* Option 2: Specific Time */}
                <button
                  type="button"
                  onClick={() => setPromptMode('time')}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer",
                    promptMode === 'time' 
                      ? "bg-blue-500/15 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/[0.08]"
                  )}
                >
                  <div className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                    promptMode === 'time' ? "bg-blue-400 text-[#1a1a1a]" : "bg-white/10 text-slate-300"
                  )}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      <span>{t('tasks.scheduleWithTime')}</span>
                      {promptMode === 'time' && <Check className="w-4 h-4 text-blue-400" />}
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      {t('tasks.scheduleWithTimeDesc')}
                    </p>

                    {promptMode === 'time' && (
                      <div className="mt-3 pt-3 border-t border-white/10 space-y-2.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={promptTime}
                            onChange={(e) => setPromptTime(e.target.value)}
                            className="bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-400"
                          />
                          <span className="text-xs text-slate-400">
                            {language === 'pl' ? 'Godzina rozpoczęcia' : 'Start time'}
                          </span>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex gap-1.5 flex-wrap">
                          {['09:00', '11:00', '14:00', '16:30', '18:00'].map(tPreset => (
                            <button
                              key={tPreset}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPromptTime(tPreset);
                              }}
                              className={cn(
                                "px-2 py-1 rounded-lg text-xs font-mono transition-colors cursor-pointer border",
                                promptTime === tPreset 
                                  ? "bg-blue-500/30 text-blue-300 border-blue-400" 
                                  : "bg-black/40 text-slate-400 border-white/5 hover:text-white"
                              )}
                            >
                              {tPreset}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSchedulePrompt(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm font-semibold transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSchedule}
                  className="px-5 py-2.5 rounded-xl bg-[#4ade80] text-[#1a1a1a] hover:bg-[#4ade80]/90 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {promptMode === 'all_day' ? t('tasks.setAsAllDay') : t('tasks.setWithTime')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT TASK MODAL */}
      <AnimatePresence>
        {editingTask && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setEditingTask(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#18181b] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white font-display">
                  {t('tasks.editTask')}
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {t('tasks.titleInput')}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>

                {/* Status Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    {language === 'pl' ? 'Status' : 'Status'}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(['todo', 'in_progress', 'done'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setEditStatus(st)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer flex items-center justify-center gap-1.5",
                          editStatus === st ? "bg-[#4ade80]/20 text-[#4ade80] border-[#4ade80]/40" : "border-white/5 text-slate-400 hover:text-white"
                        )}
                      >
                        {getStatusIcon(st)}
                        <span>
                          {st === 'todo' ? (language === 'pl' ? 'Do zrobienia' : 'To do') :
                           st === 'in_progress' ? (language === 'pl' ? 'W toku' : 'In progress') :
                           (language === 'pl' ? 'Zrobione' : 'Done')}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    {t('tasks.priority')}
                  </label>
                  <div className="flex gap-1.5">
                    {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditPriority(p)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer flex-1",
                          editPriority === p ? getPriorityColor(p) : "border-white/5 text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {getPriorityLabel(p)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Schedule / Pool Placement */}
                <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>{language === 'pl' ? 'Lokalizacja i termin' : 'Location & schedule'}</span>
                    </span>
                    {editDueDate ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditDueDate('');
                          setEditDueTime('');
                        }}
                        className="text-[11px] text-amber-400 hover:underline cursor-pointer"
                      >
                        {language === 'pl' ? 'Zwróć do puli ogólnej' : 'Return to general pool'}
                      </button>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded bg-[#4ade80]/15 text-[#4ade80] font-semibold">
                        {language === 'pl' ? 'W puli ogólnej' : 'In general pool'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        {language === 'pl' ? 'Data (opcjonalnie)' : 'Date (optional)'}
                      </label>
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="w-full bg-[#1e1e24] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        {language === 'pl' ? 'Godzina (05:00 - 22:00)' : 'Time (05:00 - 22:00)'}
                      </label>
                      <input
                        type="time"
                        value={editDueTime}
                        disabled={!editDueDate || editAllDay}
                        onChange={(e) => setEditDueTime(e.target.value)}
                        className="w-full bg-[#1e1e24] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#4ade80] disabled:opacity-40"
                      />
                    </div>
                  </div>
                </div>

                {/* Miesięczna pula zadań */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {language === 'pl' ? 'Miesięczna pula zadań' : 'Monthly task pool'}
                  </label>
                  <select
                    value={editTargetMonth}
                    onChange={(e) => setEditTargetMonth(e.target.value)}
                    className="w-full bg-[#1e1e24] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 cursor-pointer"
                  >
                    <option value="">{language === 'pl' ? 'Brak przypisanego miesiąca (pula ogólna)' : 'No specific month (general pool)'}</option>
                    {availableMonths.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                {/* Description / Notes */}
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {language === 'pl' ? 'Notatka / Szczegóły' : 'Notes / Details'}
                  </label>
                  <textarea
                    rows={2}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={language === 'pl' ? 'Dodaj opcjonalny opis lub szczegóły...' : 'Add optional description...'}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4ade80] resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTask) deleteTask(editingTask.id);
                      setEditingTask(null);
                    }}
                    className="px-3 py-2 rounded-xl text-red-400 hover:bg-red-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'pl' ? 'Usuń' : 'Delete'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingTask(null)}
                      className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-semibold"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] font-bold text-xs shadow-md transition-colors cursor-pointer"
                    >
                      {t('common.saveChanges')}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INSTANT POOL TASK MODAL - ZERO DETAILS, STRAIGHT INTO POOL */}
      <AnimatePresence>
        {isInstantPoolModalOpen && (
          <div className="fixed inset-0 z-[270] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsInstantPoolModalOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#18181b] border border-[#4ade80]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(74,222,128,0.18)] z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 flex items-center justify-center text-[#4ade80] shrink-0">
                    <Plus className="w-6 h-6 stroke-[3]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-display">
                      {t('tasks.quickPoolModalTitle')}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('tasks.quickPoolModalDesc')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsInstantPoolModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleInstantPoolSubmit} className="space-y-4">
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={instantPoolTitle}
                    onChange={(e) => setInstantPoolTitle(e.target.value)}
                    placeholder={t('tasks.quickPoolInputPlaceholder')}
                    className="w-full bg-black/60 border-2 border-[#4ade80]/40 focus:border-[#4ade80] rounded-2xl px-4 py-3.5 text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4ade80]/30 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {language === 'pl' ? 'Miesięczna pula zadań (opcjonalnie)' : 'Monthly Task Pool (optional)'}
                  </label>
                  <select
                    value={instantPoolMonth}
                    onChange={(e) => setInstantPoolMonth(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-[#4ade80] cursor-pointer"
                  >
                    <option value="">{language === 'pl' ? 'Pula ogólna (bez przypisanego miesiąca)' : 'General pool (no month)'}</option>
                    {availableMonths.map(m => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <span className="text-[11px] text-slate-400">
                    {language === 'pl' ? 'Wciśnij Enter aby natychmiast dodać' : 'Press Enter to drop into pool'}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsInstantPoolModalOpen(false)}
                      className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      disabled={!instantPoolTitle.trim()}
                      className="px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(74,222,128,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1.5 transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>{t('tasks.quickPoolSubmit')}</span>
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FULL-DAY AGENDA MODAL (Otwierany po kliknięciu w nagłówek dnia) */}
      <AnimatePresence>
        {selectedAgendaDate && (
          <DayAgendaModal
            dateStr={selectedAgendaDate}
            onClose={() => setSelectedAgendaDate(null)}
            onOpenEditTask={(task) => {
              setSelectedAgendaDate(null);
              handleOpenEdit(task);
            }}
          />
        )}
      </AnimatePresence>

      {/* GPT 5.6 LUNA AI ADVICE MODAL */}
      <AnimatePresence>
        {isLunaAdviceOpen && (
          <div className="fixed inset-0 z-[280] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsLunaAdviceOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-[#161618] border border-[#4ade80]/40 rounded-3xl p-6 sm:p-7 shadow-[0_0_50px_rgba(74,222,128,0.2)] z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/15 border border-[#4ade80]/40 flex items-center justify-center text-[#4ade80]">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                      <span>{language === 'pl' ? 'Planowanie z GPT 5.6 Luna' : 'Planning with GPT 5.6 Luna'}</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      {language === 'pl' 
                        ? `Inteligentna analiza Twojej puli (${tasks.filter(t => !t.due_date).length} w puli) i osi czasu.`
                        : `Intelligent analysis of your pool (${tasks.filter(t => !t.due_date).length} in pool) and timeline.`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsLunaAdviceOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-[#1f1f23] border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-[#4ade80] font-mono text-xs font-bold uppercase tracking-wider">
                  <span>{AI_MODEL_NAME}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                </div>
                {(() => {
                  const tip = getLunaQuickTimelineAdvice(tasks, language);
                  return (
                    <div className="space-y-2">
                      <div className="font-bold text-white text-sm">{tip.headline}</div>
                      <p className="whitespace-pre-line text-slate-300 text-xs leading-relaxed">{tip.advice}</p>
                      <div className="pt-2 flex items-center gap-2 text-[11px] text-[#4ade80] font-medium border-t border-white/5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{language === 'pl' ? `Sugerowany blok czasowy: ${tip.suggestedSlot}` : `Suggested timeline block: ${tip.suggestedSlot}`}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsLunaAdviceOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white text-xs font-semibold cursor-pointer"
                >
                  {language === 'pl' ? 'Zamknij' : 'Close'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsLunaAdviceOpen(false);
                    navigate('/assistant');
                  }}
                  className="px-4 py-2 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <span>{language === 'pl' ? 'Otwórz pełny czat z Luną' : 'Open full Luna chat'}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* QUICK ADD IN TIMELINE SLOT MODAL */}
      <AnimatePresence>
        {slotAddPrompt && (
          <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSlotAddPrompt(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#18181b] border border-white/15 rounded-3xl p-6 shadow-2xl z-10 space-y-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white font-display flex items-center gap-2">
                    <Plus className="w-5 h-5 text-[#4ade80]" />
                    {language === 'pl' ? 'Dodaj zadanie do kalendarza' : 'Add Task to Calendar'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                    <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{slotAddPrompt.dateStr}</span>
                    {slotAddPrompt.isAllDay ? (
                      <span className="px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold text-[10px]">
                        {language === 'pl' ? 'Cały dzień' : 'All-day'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-[10px]">
                        {String(slotAddPrompt.hour).padStart(2, '0')}:00
                      </span>
                    )}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSlotAddPrompt(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleConfirmSlotAdd} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {t('tasks.titleInput')}
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={slotAddTitle}
                    onChange={(e) => setSlotAddTitle(e.target.value)}
                    placeholder={language === 'pl' ? 'Wpisz tytuł zadania...' : 'Enter task title...'}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#4ade80] placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                    {t('tasks.priority')}
                  </label>
                  <div className="flex gap-1.5">
                    {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSlotAddPriority(p)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer",
                          slotAddPriority === p ? getPriorityColor(p) : "border-white/5 text-slate-500 hover:text-slate-300"
                        )}
                      >
                        {getPriorityLabel(p)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setSlotAddPrompt(null)}
                    className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={!slotAddTitle.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#4ade80] disabled:opacity-50 text-[#1a1a1a] hover:bg-[#4ade80]/90 text-sm font-bold shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                  >
                    {language === 'pl' ? 'Dodaj do osi czasu' : 'Add to timeline'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* OKNO KONTEKSTOWE NOTATKI POŁĄCZONE Z CZATEM GPT 5.6 LUNA */}
      <AnimatePresence>
        {isNoteModalOpen && (
          <div className="fixed inset-0 z-[290] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNoteModalOpen(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-[#141417] border border-[#4ade80]/40 rounded-3xl p-5 sm:p-7 shadow-[0_0_60px_rgba(74,222,128,0.2)] z-10 space-y-5 max-h-[90vh] flex flex-col"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between shrink-0 pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/20 border border-[#4ade80]/40 flex items-center justify-center text-[#4ade80] shrink-0">
                    <NotebookPen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white font-display">
                        {t('tasks.noteModalTitle')}
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 text-[10px] font-mono font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                        {AI_MODEL_NAME}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {t('tasks.noteModalDesc')}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content */}
              <div className="overflow-y-auto space-y-4 pr-1 scrollbar-none flex-1">
                {/* Note Textarea */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                    {language === 'pl' ? 'Co jest do zrobienia?' : 'What needs to be done?'}
                  </label>
                  <textarea
                    autoFocus
                    rows={4}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder={t('tasks.notePlaceholder')}
                    className="w-full bg-black/60 border border-white/15 focus:border-[#4ade80] rounded-2xl p-4 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#4ade80]/25 transition-all resize-none font-sans leading-relaxed"
                  />
                </div>

                {/* Primary Action Buttons: Główny motyw = Wrzuć do puli */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {/* Główny przycisk: Wrzuć do puli */}
                  <button
                    type="button"
                    onClick={() => handleDropNoteToPool()}
                    disabled={!noteContent.trim()}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] font-bold text-xs sm:text-sm shadow-[0_0_20px_rgba(74,222,128,0.4)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>{t('tasks.dropNoteToPoolBtn')}</span>
                  </button>

                  {/* AI Prompt: Zasugeruj sposób wykonania */}
                  <button
                    type="button"
                    onClick={handleAskLunaForNote}
                    disabled={!noteContent.trim() || isNoteAiLoading}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-[#1e1e24] hover:bg-[#282830] text-[#4ade80] border border-[#4ade80]/40 hover:border-[#4ade80] font-semibold text-xs sm:text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 transition-all"
                  >
                    {isNoteAiLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-[#4ade80] border-t-transparent rounded-full animate-spin" />
                        <span>{language === 'pl' ? 'Luna analizuje...' : 'Luna is analyzing...'}</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{t('tasks.suggestExecutionBtn')}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* AI Plan / Suggestions Display */}
                {noteAiPlan && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-[#1a1a1e] border border-[#4ade80]/30 space-y-3"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-white/5">
                      <span className="text-xs font-bold text-[#4ade80] flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{language === 'pl' ? 'Sposób wykonania wg GPT 5.6 Luna' : 'Execution plan by GPT 5.6 Luna'}</span>
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {noteAiPlan.steps.length} {language === 'pl' ? 'kroków' : 'steps'}
                      </span>
                    </div>

                    {noteAiPlan.strategy && (
                      <p className="text-xs text-slate-300 italic bg-black/30 p-2.5 rounded-xl border border-white/5">
                        💡 {noteAiPlan.strategy}
                      </p>
                    )}

                    {/* Steps list with individual pool add */}
                    <div className="space-y-1.5">
                      {noteAiPlan.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2 rounded-xl bg-black/40 border border-white/5 hover:border-white/15 transition-colors"
                        >
                          <span className="text-xs text-slate-200 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-slate-400 text-[10px] flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <span>{step}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDropSingleStepToPool(step)}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#4ade80]/20 text-[#4ade80] text-[11px] font-semibold transition-colors cursor-pointer shrink-0 flex items-center gap-1"
                            title={language === 'pl' ? 'Wrzuć ten krok do puli' : 'Drop this step into pool'}
                          >
                            <Plus className="w-3 h-3" />
                            <span>{language === 'pl' ? 'Do puli' : 'To pool'}</span>
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Bulk Pool Actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={handleDropAllStepsToPool}
                        className="px-3.5 py-2 rounded-xl bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-[#4ade80] border border-[#4ade80]/50 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>{t('tasks.dropAllStepsToPoolBtn')}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDropNoteToPool(noteAiPlan.title, `${noteContent}\n\n--- Plan GPT 5.6 Luna ---\n${noteAiPlan.steps.map((s, i) => `${i+1}. ${s}`).join('\n')}`)}
                        className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium border border-white/10 transition-all cursor-pointer"
                      >
                        {t('tasks.dropSingleWithPlanBtn')}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Interactive Luna Chat Stream */}
                {noteChatHistory.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-white/10">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                      {language === 'pl' ? 'Rozmowa z modelem GPT 5.6 Luna' : 'Conversation with GPT 5.6 Luna'}
                    </span>
                    <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 scrollbar-none">
                      {noteChatHistory.map((msg, index) => (
                        <div
                          key={index}
                          className={cn(
                            "p-2.5 rounded-xl text-xs leading-relaxed",
                            msg.role === 'user'
                              ? "bg-white/5 text-slate-300 ml-4 border border-white/5"
                              : "bg-[#4ade80]/10 text-slate-200 mr-4 border border-[#4ade80]/20 whitespace-pre-line"
                          )}
                        >
                          <div className="font-bold text-[10px] text-slate-400 mb-0.5">
                            {msg.role === 'user' ? (language === 'pl' ? 'Ty' : 'You') : AI_MODEL_NAME}
                          </div>
                          <div>{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Chat follow-up input footer */}
              <form onSubmit={handleSendNoteChat} className="flex items-center gap-2 pt-2 border-t border-white/10 shrink-0">
                <input
                  type="text"
                  value={noteChatInput}
                  onChange={(e) => setNoteChatInput(e.target.value)}
                  placeholder={t('tasks.chatFollowUpPlaceholder')}
                  className="flex-1 bg-black/50 border border-white/10 focus:border-[#4ade80] rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!noteChatInput.trim() || isNoteChatLoading}
                  className="p-2 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shrink-0 transition-colors"
                  title="Wyślij"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FLOATING HOVER DETAILS POPOVER FOR COMPACT TILES */}
      <AnimatePresence>
        {hoveredTask && !draggingTaskId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: 0.12 }}
            onMouseEnter={handlePopoverMouseEnter}
            onMouseLeave={handlePopoverMouseLeave}
            style={{
              position: 'fixed',
              top: typeof window !== 'undefined' && hoveredTask.rect.bottom + 10 + 200 > window.innerHeight
                ? Math.max(12, hoveredTask.rect.top - 210)
                : hoveredTask.rect.bottom + 8,
              left: typeof window !== 'undefined'
                ? Math.max(16, Math.min(window.innerWidth - 336, hoveredTask.rect.left - 10))
                : 16,
              width: 320,
              zIndex: 9999
            }}
            className="glass-card bg-[#1a1a1d]/95 border border-white/20 rounded-2xl p-4 shadow-2xl backdrop-blur-xl pointer-events-auto space-y-3 select-none"
          >
            {/* Top row: Priority & Status badge */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className={cn("px-2.5 py-0.5 rounded-full text-[10px] font-bold border", getPriorityColor(hoveredTask.task.priority))}>
                {getPriorityLabel(hoveredTask.task.priority)}
              </span>

              <div className="flex items-center gap-1.5">
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                  hoveredTask.task.status === 'done' ? "bg-[#4ade80]/15 text-[#4ade80] border-[#4ade80]/30" :
                  hoveredTask.task.status === 'in_progress' ? "bg-orange-500/15 text-orange-400 border-orange-500/30" :
                  "bg-blue-500/15 text-blue-400 border-blue-500/30"
                )}>
                  {hoveredTask.task.status === 'done' ? (language === 'pl' ? 'Zrobione' : 'Done') :
                   hoveredTask.task.status === 'in_progress' ? (language === 'pl' ? 'W toku' : 'In Progress') :
                   (language === 'pl' ? 'Do zrobienia' : 'To Do')}
                </span>
              </div>
            </div>

            {/* Task Title */}
            <div>
              <p className={cn(
                "text-sm font-bold leading-snug break-words text-white",
                hoveredTask.task.status === 'done' && "line-through text-slate-400"
              )}>
                {hoveredTask.task.title}
              </p>
            </div>

            {/* Schedule Info Box */}
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs">
                <CalendarIcon className="w-3.5 h-3.5 text-[#4ade80]" />
                <span className="text-slate-300 font-medium">
                  {hoveredTask.task.due_date ? (
                    hoveredTask.task.all_day 
                      ? `${hoveredTask.task.due_date} (${language === 'pl' ? 'cały dzień' : 'all-day'})` 
                      : `${hoveredTask.task.due_date} @ ${hoveredTask.task.due_time || '10:00'}`
                  ) : (
                    <span className="text-slate-400 italic">
                      {language === 'pl' ? 'W puli ogólnej (niezaplanowane)' : 'In general pool (unscheduled)'}
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Actions Bar inside Popover */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-white/10 text-xs">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const tToPlan = hoveredTask.task;
                    setHoveredTask(null);
                    setSchedulePrompt({ task: tToPlan, targetDate: todayISO });
                    setPromptMode('all_day');
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[#4ade80]/15 text-[#4ade80] hover:bg-[#4ade80]/25 border border-[#4ade80]/30 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>{t('tasks.planAction')}</span>
                </button>

                {hoveredTask.task.due_date && (
                  <button
                    type="button"
                    onClick={() => {
                      handleReturnToPool(hoveredTask.task);
                      setHoveredTask(null);
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-white/5 transition-colors cursor-pointer"
                    title={t('tasks.removeFromDay')}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const tToEdit = hoveredTask.task;
                    setHoveredTask(null);
                    handleOpenEdit(tToEdit);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                  title={t('tasks.editTask')}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const idToDelete = hoveredTask.task.id;
                    setHoveredTask(null);
                    deleteTask(idToDelete);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                  title={t('tasks.deleteTask')}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Hint */}
            <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-0.5">
              <GripVertical className="w-3 h-3 text-[#4ade80]" />
              {language === 'pl' ? 'Przeciągnij kafelek i upuść na wybrany dzień kalendarza' : 'Drag tile and drop into calendar day below'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Right-Click Context Menu */}
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
