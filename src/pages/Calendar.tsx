import React, { useState, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  CalendarRange, 
  Lock, 
  Plus, 
  Trash2, 
  Loader2, 
  RefreshCw, 
  LogOut, 
  MapPin, 
  Clock, 
  X, 
  Check,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon
} from 'lucide-react';
import { EventType, CalendarEvent } from '../types';
import { GenieModal } from '../components/GenieModal';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

type CalViewMode = 'daily' | 'weekly' | 'monthly' | 'agenda';

export function Calendar() {
  const { 
    events, 
    googleEvents, 
    user, 
    googleToken, 
    isAuthLoading, 
    isSyncingCalendar, 
    loginGoogle, 
    logoutGoogle, 
    syncCalendar,
    addEvent,
    updateEvent,
    deleteEvent 
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calendar View states
  const [calViewMode, setCalViewMode] = useState<CalViewMode>('monthly');
  const [currentDateState, setCurrentDateState] = useState<Date>(() => new Date());
  const [isDraggingEventId, setIsDraggingEventId] = useState<string | null>(null);

  // Combine Google events and local events
  const isGoogleConnected = !!googleToken;
  const activeEvents = isGoogleConnected ? googleEvents : events;

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Sort and group events for standard agenda/list view as a fallback
  const eventsByDate = useMemo(() => {
    return activeEvents.reduce((acc, ev) => {
      if (!acc[ev.date]) acc[ev.date] = [];
      acc[ev.date].push(ev);
      return acc;
    }, {} as Record<string, typeof activeEvents>);
  }, [activeEvents]);

  const sortedDates = useMemo(() => {
    return Object.keys(eventsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  }, [eventsByDate]);

  // Handle Event submit
  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await addEvent({
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        type,
        description,
        location: 'Wydarzenie Google'
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventTitle: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć wydarzenie: "${eventTitle}"?`)) {
      await deleteEvent(id);
    }
  };

  const openAddForm = () => {
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('10:00');
    setEndTime('11:00');
    setType('meeting');
    setIsModalOpen(true);
  };

  // Pre-fill date when clicking a cell
  const handleCellClick = (selectedDateStr: string) => {
    setDate(selectedDateStr);
    setTitle('');
    setDescription('');
    setStartTime('10:00');
    setEndTime('11:00');
    setType('meeting');
    setIsModalOpen(true);
  };

  // Pre-fill date and hour when clicking daily grid row
  const handleHourlySlotClick = (selectedDateStr: string, hourStr: string) => {
    setDate(selectedDateStr);
    setStartTime(hourStr);
    const [h, m] = hourStr.split(':').map(Number);
    setEndTime(`${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    setTitle('');
    setDescription('');
    setType('meeting');
    setIsModalOpen(true);
  };

  // View state date manipulators
  const handlePrevDate = () => {
    setCurrentDateState(prev => {
      const d = new Date(prev);
      if (calViewMode === 'monthly') {
        d.setMonth(d.getMonth() - 1);
      } else if (calViewMode === 'weekly') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setDate(d.getDate() - 1);
      }
      return d;
    });
  };

  const handleNextDate = () => {
    setCurrentDateState(prev => {
      const d = new Date(prev);
      if (calViewMode === 'monthly') {
        d.setMonth(d.getMonth() + 1);
      } else if (calViewMode === 'weekly') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setDate(d.getDate() + 1);
      }
      return d;
    });
  };

  const handleSetToday = () => {
    setCurrentDateState(new Date());
  };

  // Format active timeframe header label
  const getHeaderDateString = () => {
    if (calViewMode === 'monthly') {
      return currentDateState.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' });
    } else if (calViewMode === 'weekly') {
      const startOfWeek = new Date(currentDateState);
      const currentDay = currentDateState.getDay();
      const diffFromMonday = (currentDay === 0 ? -6 : 1 - currentDay);
      startOfWeek.setDate(currentDateState.getDate() + diffFromMonday);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      if (startOfWeek.getMonth() === endOfWeek.getMonth()) {
        return `${startOfWeek.getDate()} - ${endOfWeek.getDate()} ${startOfWeek.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })}`;
      }
      return `${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString('pl-PL', { month: 'short' })} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString('pl-PL', { month: 'short', year: 'numeric' })}`;
    } else if (calViewMode === 'daily') {
      return currentDateState.toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }
    return 'Agenda i wszystkie nadchodzące wydarzenia';
  };

  // Drag and drop events handlers
  const handleEventDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setIsDraggingEventId(id);
  };

  const handleEventDragEnd = () => {
    setIsDraggingEventId(null);
  };

  const handleEventDropOnDate = async (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    if (eventId) {
      await updateEvent(eventId, { date: targetDateStr });
    }
    setIsDraggingEventId(null);
  };

  const handleEventDropOnHour = async (e: React.DragEvent, targetHourStr: string) => {
    e.preventDefault();
    const eventId = e.dataTransfer.getData('text/plain');
    if (eventId) {
      const [h, m] = targetHourStr.split(':').map(Number);
      const endHourStr = `${String((h + 1) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      await updateEvent(eventId, { start_time: targetHourStr, end_time: endHourStr });
    }
    setIsDraggingEventId(null);
  };

  // Event visual backgrounds helper
  const getEventColors = (type: EventType) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-500/10 text-blue-300 border border-blue-500/20 hover:bg-blue-500/20';
      case 'lesson':
        return 'bg-purple-500/10 text-purple-300 border border-purple-500/20 hover:bg-purple-500/20';
      case 'personal':
        return 'bg-emerald-500/10 text-[#75d36e] border border-[#75d36e]/20 hover:bg-emerald-500/20';
      case 'deadline':
        return 'bg-red-500/10 text-red-350 border border-red-500/20 hover:bg-red-500/20';
      default:
        return 'bg-zinc-500/10 text-zinc-300 border border-zinc-500/20 hover:bg-zinc-500/20';
    }
  };

  // Monthly views list generation
  const monthlyDaysList = useMemo(() => {
    const year = currentDateState.getFullYear();
    const month = currentDateState.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDayOffset = (firstDayOfMonth.getDay() + 6) % 7; // Monday is 0, Sunday is 6
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days: { date: Date; isCurrentMonth: boolean; keyStr: string }[] = [];
    
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, keyStr: d.toISOString().split('T')[0] });
    }
    
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, isCurrentMonth: true, keyStr: d.toISOString().split('T')[0] });
    }
    
    const totalSlotsNeeded = Math.ceil(days.length / 7) * 7;
    const remainingSlots = totalSlotsNeeded - days.length;
    for (let i = 1; i <= remainingSlots; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, keyStr: d.toISOString().split('T')[0] });
    }
    return days;
  }, [currentDateState]);

  // Weekly views list generation
  const weeklyDaysList = useMemo(() => {
    const startOfWeek = new Date(currentDateState);
    const currentDay = currentDateState.getDay();
    const diffFromMonday = (currentDay === 0 ? -6 : 1 - currentDay);
    startOfWeek.setDate(currentDateState.getDate() + diffFromMonday);
    
    const days: { date: Date; keyStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      days.push({ date: d, keyStr: d.toISOString().split('T')[0] });
    }
    return days;
  }, [currentDateState]);

  // Daily miniweek list generation (for rescheduling from Daily view header day capsules)
  const miniWeekDays = useMemo(() => {
    const startOfWeekFD = new Date(currentDateState);
    const currentDayFD = currentDateState.getDay();
    const diffFromMondayFD = (currentDayFD === 0 ? -6 : 1 - currentDayFD);
    startOfWeekFD.setDate(currentDateState.getDate() + diffFromMondayFD);

    const days: { date: Date; keyStr: string }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeekFD);
      d.setDate(startOfWeekFD.getDate() + i);
      days.push({ date: d, keyStr: d.toISOString().split('T')[0] });
    }
    return days;
  }, [currentDateState]);

  const hourSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00', '22:00'];

  const polishWeekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Kalendarz</h1>
          <p className="text-slate-400 mt-1">
            {isGoogleConnected 
              ? 'Twój połączony Google Kalendarz zsynchronizowany w czasie rzeczywistym.' 
              : 'Zarządzaj wydarzeniami i integruj swój harmonogram.'}
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isGoogleConnected && !isAuthLoading && (
            <button 
              onClick={() => syncCalendar()}
              disabled={isSyncingCalendar}
              className="p-2.5 rounded-xl border border-[#222222] bg-[#111111] text-slate-300 hover:text-white transition-colors disabled:opacity-40"
              title="Synchronizuj teraz"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncingCalendar ? 'animate-spin text-[#75d36e]' : ''}`} />
            </button>
          )}
          <button 
            onClick={openAddForm}
            className="flex items-center gap-2 bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] px-4 py-2.5 rounded-xl font-bold transition-transform cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            Dodaj spotkanie
          </button>
        </div>
      </header>

      {/* Connection status section */}
      {isAuthLoading ? (
        <div className="glass-card rounded-3xl p-8 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#75d36e] mx-auto" />
            <p className="text-slate-400 text-sm">Inicjalizacja i sprawdzanie sesji Google...</p>
          </div>
        </div>
      ) : !isGoogleConnected ? (
        <div className="p-5 rounded-2xl glass-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-sm text-slate-400 border border-[#222222]">
          <div className="space-y-1">
            <span className="text-white font-semibold block">Wypróbuj Google Calendar integration</span>
            <span className="text-xs">Zsynchronizuj terminówki i planuj spotkania w czasie rzeczywistym bezpośrednio ze swoim kontem Google.</span>
          </div>
          <button 
            onClick={loginGoogle}
            className="inline-flex items-center justify-center bg-white hover:bg-neutral-100 text-neutral-800 font-bold px-4 py-2 rounded-xl transition-all shadow-sm gap-2 text-xs shrink-0 cursor-pointer"
          >
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            Połącz z Google
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl glass-card text-xs text-slate-400 gap-4 border border-[#222222]">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Google'} className="w-7 h-7 rounded-full border border-[#75d36e]/30" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-[#75d36e]/10 border border-[#75d36e]/30 flex items-center justify-center text-[#75d36e] font-bold">
                {user?.displayName?.substring(0, 1) || 'G'}
              </div>
            )}
            <div>
              <span className="text-white font-medium">{user?.displayName || user?.email}</span>
              <span className="mx-2 text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 font-mono px-1.5 py-0.5 rounded bg-[#75d36e]/10 text-[#75d36e] text-[10px]">
                <Check className="w-3 h-3" /> Synchronizacja Google aktywna
              </span>
            </div>
          </div>
          <button 
            onClick={logoutGoogle}
            className="flex items-center gap-1.5 hover:text-red-400 transition-colors font-semibold cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Rozłącz Google Calendar
          </button>
        </div>
      )}

      {/* Main interactive Toolbar (Toggles and Navigators) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141414] p-3 rounded-2xl border border-[#222222]">
        
        {/* Navigation arrow buttons */}
        <div className="flex items-center gap-2">
          {calViewMode !== 'agenda' && (
            <div className="flex items-center bg-[#1c1c1c] rounded-xl border border-white/5 p-1">
              <button 
                onClick={handlePrevDate} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Wstecz"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button 
                onClick={handleSetToday} 
                className="text-xs px-3 py-1.5 text-slate-350 hover:text-white hover:bg-white/5 rounded-lg font-semibold transition-all cursor-pointer"
              >
                Dzisiaj
              </button>
              <button 
                onClick={handleNextDate} 
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                title="Dalej"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          <span className="text-sm font-semibold text-white ml-2">
            {getHeaderDateString()}
          </span>
        </div>

        {/* View Mode Switching Tabs (Daily, Weekly, Monthly, Agenda) */}
        <div className="flex bg-[#1c1c1c] p-1 rounded-xl border border-white/5 overflow-x-auto">
          <button 
            onClick={() => setCalViewMode('daily')}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer",
              calViewMode === 'daily' ? 'bg-[#2a2a2a] text-[#75d36e] shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            )}
          >
            Dzień
          </button>
          <button 
            onClick={() => setCalViewMode('weekly')}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer",
              calViewMode === 'weekly' ? 'bg-[#2a2a2a] text-[#75d36e] shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            )}
          >
            Tydzień
          </button>
          <button 
            onClick={() => setCalViewMode('monthly')}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer",
              calViewMode === 'monthly' ? 'bg-[#2a2a2a] text-[#75d36e] shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            )}
          >
            Miesiąc
          </button>
          <button 
            onClick={() => setCalViewMode('agenda')}
            className={cn(
              "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-lg whitespace-nowrap transition-all cursor-pointer",
              calViewMode === 'agenda' ? 'bg-[#2a2a2a] text-[#75d36e] shadow-sm font-semibold' : 'text-slate-400 hover:text-white'
            )}
          >
            Agenda
          </button>
        </div>
      </div>

      {/* Drag & Drop Hint Ribbon */}
      <div className="flex items-center gap-2 bg-[#75d36e]/5 border border-[#75d36e]/20 p-3 rounded-xl text-xs text-[#75d36e] font-mono select-none">
        <span className="animate-pulse flex h-2 w-2 rounded-full bg-[#75d36e]" />
        <span>Przeciągnij wydarzenie na inny dzień lub godzinę, aby natychmiast przenieść termin (D&D)!</span>
      </div>

      {/* Rendering calendar widgets */}
      <div className="min-h-[450px]">
        
        {/* 1. MONTHLY VIEW */}
        {calViewMode === 'monthly' && (
          <div className="glass-card p-5 rounded-3xl border border-[#222222]">
            {/* Weekday headers row */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              {polishWeekdays.map(wd => <div key={wd} className="py-1">{wd}</div>)}
            </div>

            {/* Cells grid */}
            <div className="grid grid-cols-7 gap-2">
              {monthlyDaysList.map(({ date: dayDate, isCurrentMonth, keyStr }) => {
                const dayEvents = activeEvents.filter(ev => ev.date === keyStr);
                const isToday = keyStr === todayStr;
                const isSelectedMonth = dayDate.getMonth() === currentDateState.getMonth();

                return (
                  <div 
                    key={keyStr}
                    onClick={() => handleCellClick(keyStr)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleEventDropOnDate(e, keyStr)}
                    className={cn(
                      "min-h-[110px] p-2 bg-[#121212]/40 rounded-xl border transition-all duration-150 flex flex-col justify-between group cursor-pointer",
                      isCurrentMonth ? "border-white/5 hover:border-[#75d36e]/40" : "border-transparent opacity-30 hover:opacity-75",
                      isToday ? "bg-[#75d36e]/5 border-[#75d36e]/40 shadow-[0_0_15px_rgba(117,211,110,0.05)]" : "",
                      isDraggingEventId ? "border-dashed border-white/20 hover:bg-[#75d36e]/10" : ""
                    )}
                  >
                    {/* Header cell */}
                    <div className="flex justify-between items-center">
                      <span className={cn(
                        "text-xs font-mono font-bold flex items-center justify-center w-5 h-5 rounded-full select-none",
                        isToday ? "bg-[#75d36e] text-[#1a1a1a]" : "text-slate-400 group-hover:text-white"
                      )}>
                        {dayDate.getDate()}
                      </span>
                    </div>

                    {/* Events contents */}
                    <div className="mt-1.5 space-y-1 flex-1 overflow-y-auto max-h-[80px] scrollbar-none">
                      {dayEvents.map(ev => (
                        <div 
                          key={ev.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleEventDragStart(e, ev.id); }}
                          onDragEnd={handleEventDragEnd}
                          onClick={(e) => { e.stopPropagation(); }}
                          className={cn(
                            "px-1.5 py-0.5 rounded text-[10px] truncate cursor-grab active:cursor-grabbing font-medium select-none capitalize transition-all",
                            getEventColors(ev.type),
                            isDraggingEventId === ev.id ? "opacity-30" : "opacity-100"
                          )}
                          title={`${ev.title} (${ev.start_time})`}
                        >
                          <span className="font-mono text-[9px] mr-0.5 font-semibold">{ev.start_time}</span>
                          {ev.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. WEEKLY VIEW */}
        {calViewMode === 'weekly' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-4 relative z-10">
            {weeklyDaysList.map(({ date: dayDate, keyStr }, index) => {
              const dayEvents = activeEvents.filter(ev => ev.date === keyStr);
              const isToday = keyStr === todayStr;
              const weekdayLabel = polishWeekdays[index];

              return (
                <div 
                  key={keyStr}
                  onClick={() => handleCellClick(keyStr)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleEventDropOnDate(e, keyStr)}
                  className={cn(
                    "glass-card p-3 rounded-2xl flex flex-col min-h-[400px] border border-[#222222] transition-colors cursor-pointer",
                    isToday ? "border-[#75d36e]/40 bg-[#75d36e]/5 shadow-[0_0_15px_rgba(117,211,110,0.05)]" : "",
                    isDraggingEventId ? "border-dashed border-white/20 hover:bg-[#75d36e]/10" : "hover:border-[#333333]"
                  )}
                >
                  <div className="text-center pb-2 border-b border-[#222222] mb-3 select-none">
                    <span className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest">{weekdayLabel}</span>
                    <span className={cn(
                      "inline-block text-base font-mono font-bold mt-1 px-2 py-0.5 rounded-full",
                      isToday ? "bg-[#75d36e] text-[#1a1a1a]" : "text-white"
                    )}>
                      {dayDate.getDate()}
                    </span>
                  </div>

                  {/* Day Events Stack */}
                  <div className="flex-1 space-y-2 overflow-y-auto max-h-[350px] pr-1 scrollbar-none">
                    {dayEvents.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-600 border border-dashed border-[#222222] rounded-xl p-3 text-center">
                        Brak spotkań
                      </div>
                    ) : (
                      dayEvents.map(ev => (
                        <div 
                          key={ev.id}
                          draggable
                          onDragStart={(e) => { e.stopPropagation(); handleEventDragStart(e, ev.id); }}
                          onDragEnd={handleEventDragEnd}
                          onClick={(e) => { e.stopPropagation(); }}
                          className={cn(
                            "group p-2.5 rounded-xl border transition-all cursor-grab active:cursor-grabbing hover:bg-white/5",
                            getEventColors(ev.type),
                            isDraggingEventId === ev.id ? "opacity-30" : "opacity-100"
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold truncate block select-none capitalize">{ev.title}</span>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id, ev.title); }}
                              className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-400 hover:text-red-400 transition-opacity"
                              title="Usuń"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-1 text-[9px] font-mono text-slate-450 select-none">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{ev.start_time} - {ev.end_time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. DAILY VIEW */}
        {calViewMode === 'daily' && (
          <div className="space-y-6">
            {/* Nav top slider of weekdays for dropping context */}
            <div className="grid grid-cols-7 gap-2 bg-[#121212]/50 p-2 rounded-2xl border border-[#222222] text-center select-none">
              {miniWeekDays.map(({ date: miniDate, keyStr }, index) => {
                const isSelectedDate = keyStr === currentDateState.toISOString().split('T')[0];
                const isToday = keyStr === todayStr;
                const weekday = polishWeekdays[index];

                return (
                  <div 
                    key={keyStr}
                    onClick={() => setCurrentDateState(miniDate)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleEventDropOnDate(e, keyStr)}
                    className={cn(
                      "p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center justify-center",
                      isSelectedDate ? "bg-[#75d36e] text-[#1a1a1a] border-[#75d36e]" : "text-slate-400 hover:text-white border-transparent hover:bg-white/5",
                      isToday && !isSelectedDate ? "border-[#75d36e]/40 text-[#75d36e]" : "",
                      isDraggingEventId ? "border-dashed border-[#75d36e]/40 bg-[#75d36e]/5 hover:bg-[#75d36e]/20" : ""
                    )}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider">{weekday}</span>
                    <span className="text-base font-mono font-bold mt-0.5">{miniDate.getDate()}</span>
                  </div>
                );
              })}
            </div>

            {/* main vertical scroll of hourly divisions */}
            <div className="glass-card p-5 rounded-3xl border border-[#222222] relative">
              <div className="space-y-1">
                {hourSlots.map(hour => {
                  const targetDateStr = currentDateState.toISOString().split('T')[0];
                  // Filter events falling into this hour
                  const hourEvents = activeEvents.filter(ev => ev.date === targetDateStr && ev.start_time.split(':')[0] === hour.split(':')[0]);

                  return (
                    <div 
                      key={hour}
                      onClick={() => handleHourlySlotClick(targetDateStr, hour)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleEventDropOnHour(e, hour)}
                      className={cn(
                        "grid grid-cols-[80px_1fr] items-start border-b border-white/5 min-h-[64px] hover:bg-white/1 flex items-center transition-all cursor-pointer group py-1.5",
                        isDraggingEventId ? "border-dashed border-[#75d36e]/20 hover:bg-[#75d36e]/5" : ""
                      )}
                    >
                      {/* Hour stamp */}
                      <span className="text-xs font-mono font-semibold text-slate-500 group-hover:text-white transition-colors">
                        {hour}
                      </span>

                      {/* Hour stack list */}
                      <div className="flex flex-wrap items-center gap-2 pl-4">
                        {hourEvents.length === 0 ? (
                          <span className="text-[10px] text-slate-650 opacity-0 group-hover:opacity-100 transition-opacity select-none italic">
                            Kliknij, aby zaplanować slot...
                          </span>
                        ) : (
                          hourEvents.map(ev => (
                            <div 
                              key={ev.id}
                              draggable
                              onDragStart={(e) => { e.stopPropagation(); handleEventDragStart(e, ev.id); }}
                              onDragEnd={handleEventDragEnd}
                              onClick={(e) => { e.stopPropagation(); }}
                              className={cn(
                                "group/pill px-3 py-1.5 rounded-xl font-medium text-xs flex items-center gap-3 cursor-grab active:cursor-grabbing",
                                getEventColors(ev.type),
                                isDraggingEventId === ev.id ? "opacity-30" : "opacity-100"
                              )}
                            >
                              <div className="flex items-center gap-1.5 font-bold">
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span className="capitalize">{ev.title}</span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 opacity-85 shrink-0 select-none">
                                {ev.start_time} - {ev.end_time}
                              </span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteEvent(ev.id, ev.title); }}
                                className="text-slate-400 hover:text-red-400 transition-colors cursor-pointer leading-none"
                                title="Usuń"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 4. AGENDA / FULL SEQUENCE VIEW */}
        {calViewMode === 'agenda' && (
          <div className="space-y-6">
            {sortedDates.length === 0 ? (
              <div className="glass-card rounded-3xl p-16 text-center text-slate-500 border border-[#222222]">
                <CalendarRange className="w-12 h-12 mx-auto stroke-[1.5] opacity-40 mb-3" />
                <p>Brak zaplanowanych wydarzeń w wybranym przedziale czasowym.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {sortedDates.map(dateStr => (
                  <div key={dateStr} className="space-y-2">
                    <h3 className="text-sm font-mono font-semibold text-[#75d36e] uppercase tracking-wider px-1">
                      {new Date(dateStr).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {eventsByDate[dateStr].map(ev => (
                        <div key={ev.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4 group hover:border-white/10 transition-all border border-[#222222]">
                          <div className="flex items-start gap-4">
                            <div className="h-10 w-10 shrink-0 bg-[#161616] border border-[#222222] rounded-lg flex flex-col items-center justify-center text-xs font-mono text-slate-400">
                              <Clock className="w-4 h-4 text-[#75d36e]" />
                            </div>
                            <div>
                              <div className="font-medium text-white flex items-center gap-2">
                                {ev.title}
                                <span className={cn("text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full", getEventColors(ev.type))}>
                                  {ev.type}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                                <span className="flex items-center gap-1 font-semibold"><Clock className="w-3" /> {ev.start_time} - {ev.end_time}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3" /> {ev.location || 'Brak lokacji'}</span>
                              </div>
                              {ev.description && (
                                <p className="text-xs text-slate-450 mt-2 line-clamp-1 max-w-xl">{ev.description}</p>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEvent(ev.id, ev.title)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Usuń wydarzenie"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Modal Add Appointment / Google Event */}
      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isGoogleConnected ? 'Dodaj do Google Calendar' : 'Dodaj termin lokalny'}
      >
        <form onSubmit={handleAddEventSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tytuł spotkania</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              placeholder="np. Sync z zespołem"
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Typ spotkania</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as EventType)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors capitalize"
                disabled={isSubmitting}
              >
                <option value="meeting">Spotkanie (Meeting)</option>
                <option value="lesson">Lekcja (Lesson)</option>
                <option value="personal">Prywatne (Personal)</option>
                <option value="deadline">Termin końcowy (Deadline)</option>
                <option value="reminder">Przemas (Reminder)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Godzina rozpoczęcia</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Godzina zakończenia</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Opis i szczegóły (opcjonalnie)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="np. Omówienie postępów kwartalnych i kroki milowe."
              rows={3}
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 border-t border-[#222222] flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#262626] text-slate-300 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm cursor-pointer"
              disabled={isSubmitting}
            >
              Anuluj
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm flex items-center gap-2 cursor-pointer"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGoogleConnected ? 'Dodaj do Google' : 'Dodaj lokalnie'}
            </button>
          </div>
        </form>
      </GenieModal>
    </div>
  );
}
