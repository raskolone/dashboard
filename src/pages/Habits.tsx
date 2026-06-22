import React, { useState, useMemo, useRef } from 'react';
import { useAppStore } from '../store/AppContext';
import { Plus, X, Trash2, Milestone, CalendarDays, Flame, Trophy, Activity, Check, Edit2, Settings, BarChart2, List, Archive, ChevronLeft, ChevronRight } from 'lucide-react';
import { subDays, format, addDays, startOfWeek, isSameDay, isToday, isYesterday } from 'date-fns';
import { pl } from 'date-fns/locale';
import confetti from 'canvas-confetti';
import { calculateHabitStats, getLocalDateStr } from '../lib/utils';
import { useLongPress } from '../hooks/useLongPress';
import { GenieModal } from '../components/GenieModal';
import { motion, AnimatePresence } from 'motion/react';

// Circle Progress Component
const CircleProgress = ({ percentage, size, strokeWidth, color, text }: { percentage: number, size: number, strokeWidth: number, color: string, text?: React.ReactNode }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        {/* Background Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/10"
        />
        {/* Progress Circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500 ease-in-out"
        />
      </svg>
      {text && (
        <div className="absolute inset-0 flex items-center justify-center font-display font-bold">
          {text}
        </div>
      )}
    </div>
  );
};

const HoldableAction = ({ isCompleted, isSkipped, currentProgress, targetCount, percentage, color, onLongPressComplete, onShortClick, streakValue }: any) => {
  const [isHolding, setIsHolding] = useState(false);
  const timeoutRef = useRef<any>(null);

  const startHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    // Only allow hold if not completed? Wait, if they short click, they can uncomplete. So yes let's allow hold to complete.
    setIsHolding(true);
    timeoutRef.current = setTimeout(() => {
      onLongPressComplete();
      setIsHolding(false);
      timeoutRef.current = null;
    }, 2000);
  };

  const endHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsHolding(false);
      onShortClick();
    }
  };

  const cancelHold = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setIsHolding(false);
    }
  };

  const isSimple = targetCount === 1;
  const size = isSimple ? 48 : 52;
  const strokeWidth = isSimple ? 2 : 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  // The long press fills a progress ring.
  // The regular ring shows the current state (percentage) unless it's simple which is just solid or border.
  // We can layer an animated ring on top that fills to 100% over 2s when holding.

  return (
    <div 
      className="relative cursor-pointer transition-transform hover:scale-105 shrink-0"
      onPointerDown={startHold}
      onPointerUp={endHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
      onClick={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
      style={{ width: size, height: size, touchAction: 'none' }}
    >
      <div className="absolute inset-0 liquid-glass-circle pointer-events-none">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
        <div className="absolute inset-x-2 top-0.5 h-1/3 rounded-full bg-gradient-to-b from-white/20 to-transparent blur-[1px]" />
      </div>

      {isSimple ? (
        <div 
          className="absolute inset-0 rounded-full border-2 flex items-center justify-center transition-all"
          style={{ 
            borderColor: isCompleted ? color : 'rgba(255,255,255,0.1)',
            backgroundColor: isCompleted ? `${color}40` : 'transparent'
          }}
        >
          {isCompleted && <Check className="w-6 h-6 drop-shadow-md" style={{ color }} />}
          {!isCompleted && !isSkipped && <Check className="w-5 h-5 text-white/20" />}
        </div>
      ) : (
        <div className="absolute inset-0">
          <CircleProgress 
            percentage={percentage} 
            size={size} 
            strokeWidth={strokeWidth} 
            color={color} 
          />
          <div className="absolute inset-0 flex items-center justify-center">
            {isCompleted ? <Check className="w-5 h-5 drop-shadow-md" style={{ color }} /> : <span className="text-xs font-bold text-white drop-shadow-md">{currentProgress}</span>}
          </div>
        </div>
      )}

      {/* Hold Animation Ring overlay */}
      <svg className="absolute inset-0 pointer-events-none" width={size} height={size}>
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: isHolding ? 0 : circumference }}
          transition={{ duration: isHolding ? 2 : 0.2, ease: 'linear' }}
          className="origin-center -rotate-90 opacity-60"
        />
      </svg>
    </div>
  );
};

const HabitListItem = ({ habit, selectedDate, setInteractionHabit, toggleHabit, updateHabitProgress }: any) => {
  const isCompleted = habit.completedDates.includes(selectedDate);
  const isSkipped = habit.skippedDates?.includes(selectedDate);
  const currentProgress = isCompleted ? habit.target_count : (habit.progress?.[selectedDate] || 0);
  const percentage = (currentProgress / habit.target_count) * 100;

  const handleCompleteLongPress = () => {
    updateHabitProgress(habit.id, selectedDate, habit.target_count, true);
  };

  const handleCompleteClick = () => {
    if (habit.target_count === 1) {
      toggleHabit(habit.id, selectedDate);
    } else {
      if (isCompleted) {
        toggleHabit(habit.id, selectedDate);
      } else {
        const nextProgress = Math.min(habit.target_count, currentProgress + 1);
        updateHabitProgress(habit.id, selectedDate, nextProgress, nextProgress >= habit.target_count);
      }
    }
  };

  const stats = calculateHabitStats(habit.completedDates);

  return (
    <div 
      onClick={() => {
        setInteractionHabit({
          habit,
          progressValue: currentProgress
        });
      }}
      className={`glass-card hover:border-[#a855f7]/30 transition-colors rounded-[24px] p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer group ${isSkipped ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center gap-4 mb-3 sm:mb-0">
        <div 
          className="w-12 h-12 flex items-center justify-center rounded-full text-2xl shadow-inner shrink-0"
          style={{ backgroundColor: `${habit.color}15` }}
        >
          {habit.icon}
        </div>
        <div>
          <h3 className={`font-semibold text-[17px] tracking-tight ${isSkipped ? 'line-through text-slate-500' : 'text-white'}`}>{habit.name}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-slate-500 text-xs font-medium">
              {habit.target_count > 1 ? `Cel: ${habit.target_count} ${habit.unit || ''}` : 'Cel: 1'} 
              {isSkipped && ' (Pominięto)'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="shrink-0 flex items-center justify-between sm:justify-start gap-3">
        <div className="flex items-center justify-center gap-1.5 min-w-[36px] bg-[#222]/80 px-2 py-1 rounded-lg">
          <Flame className="w-3.5 h-3.5" style={{ color: habit.color }} />
          <span className="text-xs font-bold" style={{ color: habit.color }}>{stats.currentStreak}</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); toggleHabit(habit.id, selectedDate); }}
          className="px-4 py-2 sm:hidden rounded-xl text-xs font-semibold bg-white/5 mr-4"
        >
          {isCompleted ? 'Odznacz' : 'Wykonane'}
        </button>
        <HoldableAction 
          isCompleted={isCompleted}
          isSkipped={isSkipped}
          currentProgress={currentProgress}
          targetCount={habit.target_count}
          percentage={percentage}
          color={habit.color}
          onLongPressComplete={handleCompleteLongPress}
          onShortClick={handleCompleteClick}
          streakValue={stats.currentStreak}
        />
      </div>
    </div>
  );
};

export function Habits() {
  const { habits, addHabit, updateHabit, toggleHabit, updateHabitProgress, skipHabit, deleteHabit } = useAppStore();
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'home' | 'history'>('home');
  const [historySubTab, setHistorySubTab] = useState<'trends' | 'habits' | 'archive'>('habits');

  // Home State
  const [selectedDate, setSelectedDate] = useState(getLocalDateStr(new Date()));
  
  // Interaction Modal State
  const [interactionHabit, setInteractionHabit] = useState<any>(null);

  // Settings & Edit Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedEditingHabit, setSelectedEditingHabit] = useState<any>(null);

  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('🧘');
  const [editFrequency, setEditFrequency] = useState<'daily'|'weekly'>('daily');
  const [editTargetCount, setEditTargetCount] = useState(1);
  const [editUnit, setEditUnit] = useState('');
  const [editColor, setEditColor] = useState('#a855f7');

  const startEditingHabit = (habit: any) => {
    setSelectedEditingHabit(habit);
    setEditName(habit.name);
    setEditIcon(habit.icon || '🧘');
    setEditFrequency(habit.frequency || 'daily');
    setEditTargetCount(habit.target_count || 1);
    setEditUnit(habit.unit || '');
    setEditColor(habit.color || '#a855f7');
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    updateHabit(selectedEditingHabit.id, {
      name: editName.trim(),
      icon: editIcon,
      frequency: editFrequency,
      target_count: editTargetCount,
      unit: editUnit,
      color: editColor
    });
    setSelectedEditingHabit(null);
  };

  // Week generator
  const currentWeekDays = useMemo(() => {
    const list = [];
    const today = new Date();
    // Start from 6 days ago up to today
    for (let i = 6; i >= 0; i--) {
      const d = subDays(today, i);
      list.push(d);
    }
    return list;
  }, []);

  const handleInteractionComplete = () => {
    if (!interactionHabit) return;
    const { habit, progressValue } = interactionHabit;
    if (habit.target_count === 1) {
      if (!habit.completedDates.includes(selectedDate)) {
        toggleHabit(habit.id, selectedDate);
      }
    } else {
      updateHabitProgress(habit.id, selectedDate, progressValue, progressValue >= habit.target_count);
    }
    setInteractionHabit(null);
  };
  
  const handleInteractionSkip = () => {
    if (!interactionHabit) return;
    skipHabit(interactionHabit.habit.id, selectedDate);
    setInteractionHabit(null);
  };

  // Home View Calcs
  const habitsForDate = habits; // In a real app we might filter by creation date or active status
  const completedCountForDate = habitsForDate.filter(h => h.completedDates.includes(selectedDate)).length;
  const skippedCountForDate = habitsForDate.filter(h => h.skippedDates?.includes(selectedDate)).length;
  const activeCountForDate = habitsForDate.length - skippedCountForDate;
  const progressPercentage = activeCountForDate > 0 ? (completedCountForDate / activeCountForDate) * 100 : 0;

  const prevProgressRef = useRef(progressPercentage);
  React.useEffect(() => {
    if (progressPercentage === 100 && prevProgressRef.current !== 100 && selectedDate === getLocalDateStr(new Date())) {
      confetti({
        particleCount: 150,
        spread: 90,
        origin: { y: 0.5 },
        colors: ['#a855f7', '#4ade80', '#3b82f6', '#f43f5e'],
        disableForReducedMotion: true
      });
    }
    prevProgressRef.current = progressPercentage;
  }, [progressPercentage, selectedDate]);

  const renderHome = () => (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      
      {/* Header / Week Selector */}
      <div className="flex flex-col items-center space-y-6 pt-4">
        <div className="flex items-center gap-4">
          {currentWeekDays.map(date => {
            const dateStr = getLocalDateStr(date);
            const isSel = selectedDate === dateStr;
            const dayName = format(date, 'eeeee', { locale: pl }).toUpperCase(); 
            
            // Calc mini progress for this day
            const dCompleted = habits.filter(h => h.completedDates.includes(dateStr)).length;
            const dSkipped = habits.filter(h => h.skippedDates?.includes(dateStr)).length;
            const dActive = habits.length - dSkipped;
            const dProg = dActive > 0 ? (dCompleted / dActive) * 100 : 0;

            return (
              <button 
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className="flex flex-col items-center gap-2 group"
              >
                <div className="relative">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#1a1a1a] shadow-inner border border-[#333]">
                    <span className={`text-[11px] font-bold ${isSel ? 'text-white' : 'text-slate-400 group-hover:text-white'}`}>
                      {dayName}
                    </span>
                  </div>
                  {/* Mini ring */}
                  <div className="absolute inset-0 pointer-events-none" style={{ background: isSel ? 'rgba(255,255,255,0.05)' : '', borderRadius: '9999px' }}>
                     <CircleProgress percentage={dProg} size={40} strokeWidth={3} color={isSel ? '#a855f7' : '#6b21a8'} />
                  </div>
                  {isSel && <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white" />}
                </div>
              </button>
            );
          })}
        </div>

        <h2 className="text-3xl font-display font-bold text-white tracking-tight">
          {selectedDate === getLocalDateStr(new Date()) ? 'Dzisiaj' : 
           selectedDate === getLocalDateStr(subDays(new Date(), 1)) ? 'Wczoraj' : 
           format(new Date(selectedDate), 'd MMMM, yyyy', { locale: pl })}
        </h2>

        {/* Big Ring */}
        <div className="relative flex items-center justify-center my-6">
          <div className="relative rounded-full p-6 liquid-glass-circle shadow-[0_0_40px_rgba(147,51,234,0.4)] overflow-hidden">
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
            <div className="absolute inset-x-8 top-2 h-1/3 rounded-full bg-gradient-to-b from-white/20 to-transparent blur-md pointer-events-none" />
            <CircleProgress 
              percentage={progressPercentage} 
              size={160} 
              strokeWidth={14} 
              color="#9333ea" 
              text={<span className="text-4xl text-white tracking-tighter drop-shadow-md">{Math.round(progressPercentage)}<span className="text-lg text-slate-300 ml-1 drop-shadow-none">%</span></span>}
            />
          </div>
        </div>
      </div>

      {/* Habit List */}
      <div className="space-y-3">
        {habitsForDate.map(habit => (
          <HabitListItem
            key={habit.id}
            habit={habit}
            selectedDate={selectedDate}
            setInteractionHabit={setInteractionHabit}
            toggleHabit={toggleHabit}
            updateHabitProgress={updateHabitProgress}
          />
        ))}
        {habitsForDate.length === 0 && (
          <div className="text-center py-12 text-slate-500 bg-white/5 backdrop-blur-md rounded-[24px] border border-dashed border-white/10">
            <p className="mb-4">Brak nawyków.</p>
            <button 
              onClick={() => window.dispatchEvent(new CustomEvent('open-quick-add', { detail: { type: 'habit' } }))}
              className="px-6 py-2 bg-white/10 rounded-full text-white font-medium hover:bg-white/20 transition-colors"
            >
              Stwórz swój pierwszy nawyk
            </button>
          </div>
        )}
      </div>

    </div>
  );

  const renderHistory = () => (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Sub Tabs */}
      <div className="flex justify-center mb-8 pt-4">
        <div className="flex gap-6 border-b border-[#222222] px-8">
          <button onClick={() => setHistorySubTab('trends')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${historySubTab === 'trends' ? 'border-[#a855f7] text-[#a855f7]' : 'border-transparent text-slate-400'}`}>
            <BarChart2 className="w-4 h-4" /> Trendy
          </button>
          <button onClick={() => setHistorySubTab('habits')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${historySubTab === 'habits' ? 'border-[#a855f7] text-[#a855f7]' : 'border-transparent text-slate-400'}`}>
            <List className="w-4 h-4" /> Nawyki
          </button>
          <button onClick={() => setHistorySubTab('archive')} className={`pb-3 flex items-center gap-2 text-sm font-medium border-b-2 transition-colors ${historySubTab === 'archive' ? 'border-[#a855f7] text-[#a855f7]' : 'border-transparent text-slate-400'}`}>
            <Archive className="w-4 h-4" /> Archiwum
          </button>
        </div>
      </div>

      {historySubTab === 'habits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-white tracking-tight">Dzienne cele</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-[#222] rounded-lg text-xs font-bold text-slate-400">14D</span>
            </div>
          </div>
          
          <div className="space-y-4">
            {habits.map(habit => {
              const stats = calculateHabitStats(habit.completedDates);
              const last14Days = Array.from({ length: 14 }).map((_, i) => getLocalDateStr(subDays(new Date(), 13 - i))).reverse();
              
              return (
                <div key={habit.id} className="bg-white/5 backdrop-blur-md rounded-[24px] p-5 border border-white/10 relative overflow-hidden group">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-xl">{habit.icon}</div>
                    <div>
                      <h3 className="font-bold text-white tracking-tight">{habit.name}</h3>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400 font-mono mt-1">
                        <span>Seria: <span className="text-white font-bold">{stats.currentStreak}</span></span>
                        <span>Najdł.: <span className="text-white font-bold">{stats.longestStreak}</span></span>
                        <span>Ukończono: <span className="text-white font-bold">{habit.completedDates.length}</span></span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Mini mini bar chart for 14 days */}
                  <div className="flex justify-between items-end h-16 w-full">
                    {last14Days.map((dateStr, idx) => {
                      const isComp = habit.completedDates.includes(dateStr);
                      const isSkip = habit.skippedDates?.includes(dateStr);
                      const currentProgress = isComp ? habit.target_count : (habit.progress?.[dateStr] || 0);
                      const heightPerc = habit.target_count > 1 ? (currentProgress / habit.target_count) * 100 : (isComp ? 100 : 0);
                      
                      return (
                        <div key={dateStr} className="flex flex-col items-center flex-1 gap-2 shrink-0">
                          <div className="w-2.5 sm:w-3 h-10 bg-[#2a2a2a] rounded-full relative overflow-hidden">
                            {(heightPerc > 0 || isComp) && (
                              <div 
                                className="absolute bottom-0 left-0 right-0 rounded-full" 
                                style={{ 
                                  height: `${Math.max(10, heightPerc)}%`, 
                                  backgroundColor: habit.color 
                                }} 
                              />
                            )}
                            {isSkip && !isComp && (
                              <div className="absolute bottom-0 left-0 right-0 h-[20%] rounded-full bg-slate-600" />
                            )}
                          </div>
                          <span className="text-[9px] text-slate-600 font-medium h-3 truncate overflow-hidden max-w-[1.2rem]">
                            {idx >= 9 ? format(new Date(dateStr), 'eeeee', { locale: pl }).toUpperCase() : format(new Date(dateStr), 'd/MM')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  
                  <button 
                    onClick={() => {
                        if (window.confirm(`Usunąć nawyk: "${habit.name}"?`)) {
                          deleteHabit(habit.id);
                        }
                    }}
                    className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 transition-opacity"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {historySubTab === 'trends' && (
        <div className="space-y-8">
           <div className="grid grid-cols-3 gap-4 text-center pb-8 border-b border-[#222]">
             <div>
               <div className="w-10 h-10 mx-auto bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-2"><Check className="w-5 h-5"/></div>
               <div className="text-2xl font-bold text-white">{habits.reduce((acc, h) => acc + h.completedDates.length, 0)}</div>
               <div className="text-xs text-slate-400 mt-1">Ukończono<br/>ogółem</div>
             </div>
             <div>
               <div className="w-10 h-10 mx-auto bg-purple-500/20 text-purple-400 rounded-full flex items-center justify-center mb-2"><Trophy className="w-5 h-5"/></div>
               <div className="text-2xl font-bold text-white">{habits.length > 0 ? Math.max(...habits.map(h => calculateHabitStats(h.completedDates).longestStreak), 0) : 0}</div>
               <div className="text-xs text-slate-400 mt-1">Najdłuższa<br/>seria</div>
             </div>
             <div>
               <div className="w-10 h-10 mx-auto bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2"><Flame className="w-5 h-5"/></div>
               <div className="text-2xl font-bold text-white">{habits.length > 0 ? Math.max(...habits.map(h => calculateHabitStats(h.completedDates).currentStreak), 0) : 0}</div>
               <div className="text-xs text-slate-400 mt-1">Obecna<br/>seria</div>
             </div>
           </div>
           
           <div className="p-12 text-center text-slate-500 border border-dashed border-[#333] rounded-3xl">
             <BarChart2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
             <p>Szczegółowe wykresy wkrótce...</p>
           </div>
        </div>
      )}
      
      {historySubTab === 'archive' && (
        <div className="p-12 text-center text-slate-500">
           <Archive className="w-12 h-12 mx-auto mb-4 opacity-20" />
           <p>Brak zarchiwizowanych nawyków.</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative min-h-[calc(100vh-8rem)] text-white overflow-x-hidden">
      
      {/* App Header (Top Nav) */}
      <header className="flex items-center justify-between py-6 sticky top-0 z-20 bg-[#0A0A0A]/50 backdrop-blur-xl px-4 h-[88px] max-w-2xl mx-auto w-full">
        <div className="w-10 opacity-0 pointer-events-none" />
        <div className="flex liquid-glass-pill p-1 shadow-2xl">
          <button 
            onClick={() => setActiveTab('home')}
            className={`px-6 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${activeTab === 'home' ? 'bg-gradient-to-tr from-[#8b5cf6] to-[#a855f7] text-white shadow-[0_4px_14px_rgba(168,85,247,0.45),_inset_0_1px_0_rgba(255,255,255,0.35)] border border-[#c084fc]/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Główna
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-full text-[13px] font-bold transition-all duration-300 ${activeTab === 'history' ? 'bg-gradient-to-tr from-[#8b5cf6] to-[#a855f7] text-white shadow-[0_4px_14px_rgba(168,85,247,0.45),_inset_0_1px_0_rgba(255,255,255,0.35)] border border-[#c084fc]/30' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            Historia
          </button>
        </div>
        <button 
          onClick={() => setIsSettingsOpen(true)}
          className="w-10 h-10 liquid-glass-circle flex items-center justify-center hover:border-[#a855f7]/60 hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] active:scale-95 transition-all duration-300"
          title="Ustawienia nawyków"
        >
          <Settings className="w-4 h-4 text-slate-300 hover:text-white transition-colors" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="py-4">
        {activeTab === 'home' ? renderHome() : renderHistory()}
      </main>

      {/* Interaction Bottom Sheet Modal */}
      <AnimatePresence>
        {interactionHabit && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setInteractionHabit(null)}
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#1c1c1e] border border-[#2c2c2e] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl z-10 overflow-hidden"
            >
              {/* Top Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6" />
              
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: `${interactionHabit.habit.color}20` }}>{interactionHabit.habit.icon}</div>
                <h2 className="text-2xl font-bold text-white tracking-tight">{interactionHabit.habit.name}</h2>
                <p className="text-slate-400 text-sm mt-1">Cel dzienny: {interactionHabit.habit.target_count} {interactionHabit.habit.unit}</p>
              </div>

              {(() => {
                const stats = calculateHabitStats(interactionHabit.habit.completedDates);
                return (
                  <div className="grid grid-cols-3 gap-2 mb-6 text-center">
                    <div className="bg-[#2c2c2e] rounded-2xl p-3">
                      <div className="text-xl font-bold text-white leading-none">{stats.currentStreak}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-2 font-semibold">Aktualna<br/>seria</div>
                    </div>
                    <div className="bg-[#2c2c2e] rounded-2xl p-3">
                      <div className="text-xl font-bold text-white leading-none">{stats.longestStreak}</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-2 font-semibold">Najlepsza<br/>seria</div>
                    </div>
                    <div className="bg-[#2c2c2e] rounded-2xl p-3">
                      <div className="text-xl font-bold text-white leading-none">{stats.completionRate30Days}%</div>
                      <div className="text-[10px] uppercase tracking-wide text-slate-500 mt-2 font-semibold">Wskaźnik<br/>(30 dni)</div>
                    </div>
                  </div>
                );
              })()}

              <div className="mb-8">
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wide px-1">Ostatnie 30 dni</p>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const latestHabit = habits.find(h => h.id === interactionHabit.habit.id) || interactionHabit.habit;
                    const dates = [];
                    const d = new Date();
                    d.setDate(d.getDate() - 29);
                    for (let i = 0; i < 30; i++) {
                       dates.push(getLocalDateStr(d));
                       d.setDate(d.getDate() + 1);
                    }
                    return dates.map(dateStr => {
                      const isCompleted = latestHabit.completedDates.includes(dateStr);
                      const isSkipped = latestHabit.skippedDates?.includes(dateStr);
                      
                      let bg = '#2c2c2e';
                      let opacity = 1;
                      if (isCompleted) { bg = latestHabit.color; }
                      else if (isSkipped) { bg = '#555'; opacity = 0.5; }
                      return (
                        <div 
                          key={dateStr} 
                          onClick={() => {
                            if (latestHabit.target_count === 1) {
                              toggleHabit(latestHabit.id, dateStr);
                            } else {
                              const newProg = isCompleted ? 0 : latestHabit.target_count;
                              updateHabitProgress(latestHabit.id, dateStr, newProg, newProg >= latestHabit.target_count);
                            }
                          }}
                          className="w-[18px] h-[18px] rounded-sm sm:w-[22px] sm:h-[22px] cursor-pointer hover:scale-110 hover:brightness-125 transition-all" 
                          style={{ backgroundColor: bg, opacity }} 
                          title={dateStr} 
                        />
                      )
                    });
                  })()}
                </div>
              </div>

              {interactionHabit.habit.target_count > 1 ? (
                <div className="flex items-center justify-center gap-8 mb-10">
                  <button 
                    onClick={() => setInteractionHabit((prev: any) => ({ ...prev, progressValue: Math.max(0, prev.progressValue - 1) }))}
                    className="w-12 h-12 rounded-full bg-[#2c2c2e] flex items-center justify-center text-2xl font-bold active:scale-95 transition-transform hover:bg-[#3c3c3e]"
                  >-</button>
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20" style={{ background: `radial-gradient(circle, ${interactionHabit.habit.color} 0%, transparent 70%)` }} />
                    <span className="text-5xl font-display font-bold relative z-10">{interactionHabit.progressValue}</span>
                    <div className="absolute inset-0 border-[6px] border-[#333] rounded-full pointer-events-none" />
                    <svg className="absolute inset-0 transform -rotate-90 pointer-events-none w-full h-full">
                      <circle
                        cx="64" cy="64" r="61"
                        stroke={interactionHabit.habit.color}
                        strokeWidth="6"
                        fill="transparent"
                        strokeDasharray={2 * Math.PI * 61}
                        strokeDashoffset={2 * Math.PI * 61 - ((interactionHabit.progressValue / interactionHabit.habit.target_count) * (2 * Math.PI * 61))}
                        strokeLinecap="round"
                        className="transition-all duration-300"
                      />
                    </svg>
                  </div>
                  <button 
                    onClick={() => setInteractionHabit((prev: any) => ({ ...prev, progressValue: Math.min(interactionHabit.habit.target_count, prev.progressValue + 1) }))}
                    className="w-12 h-12 rounded-full bg-[#2c2c2e] flex items-center justify-center text-2xl font-bold active:scale-95 transition-transform hover:bg-[#3c3c3e]"
                  >+</button>
                </div>
              ) : (
                <div className="mb-10 text-center">
                   <p className="text-slate-500 mb-6">Czy ten nawyk został wykonany?</p>
                </div>
              )}

              <div className="space-y-3">
                <button 
                  onClick={handleInteractionComplete}
                  className="w-full py-4 rounded-2xl font-bold text-white text-[15px] shadow-lg active:scale-[0.98] transition-transform"
                  style={{ backgroundColor: interactionHabit.habit.color }}
                >
                  {interactionHabit.progressValue >= interactionHabit.habit.target_count || interactionHabit.habit.target_count === 1 ? 'Wykonany' : 'Zapisz postęp'}
                </button>
                <button 
                  onClick={handleInteractionSkip}
                  className="w-full py-3 rounded-2xl font-bold text-slate-300 text-[15px] bg-[#2c2c2e] hover:bg-[#3c3c3e] active:scale-[0.98] transition-transform"
                >
                  Pomiń
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Global Habits Settings & Editing Modal */}
        {isSettingsOpen && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center p-0 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setIsSettingsOpen(false);
                setSelectedEditingHabit(null);
              }}
            />
            <motion.div 
              initial={{ y: '100%' }} 
              animate={{ y: 0 }} 
              exit={{ y: '100%' }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-md bg-[#1c1c1e] border border-[#2c2c2e] rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl z-10 overflow-hidden max-h-[85vh] flex flex-col"
            >
              {/* Top Handle */}
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 shrink-0" />
              
              {!selectedEditingHabit ? (
                <>
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Ustawienia nawyków</h2>
                    <button 
                      onClick={() => setIsSettingsOpen(false)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colorsOn"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-4">
                    {habits.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        Brak nawyków do skonfigurowania.
                      </div>
                    ) : (
                      habits.map(habit => (
                        <div 
                          key={habit.id}
                          onClick={() => startEditingHabit(habit)}
                          className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:border-[#a855f7]/40 cursor-pointer hover:bg-white/10 transition-all group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{habit.icon}</span>
                            <div>
                              <h4 className="font-semibold text-white group-hover:text-[#a855f7] transition-colors">{habit.name}</h4>
                              <p className="text-slate-500 text-xs">Cel: {habit.target_count} {habit.unit}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6 shrink-0">
                    <h2 className="text-xl font-bold text-white tracking-tight">Edycja: {selectedEditingHabit.name}</h2>
                    <button 
                      onClick={() => setSelectedEditingHabit(null)}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-5 pr-1 pb-4">
                    {/* Habit Name input */}
                    <div className="bg-[#161616]/50 rounded-2xl border border-white/10 overflow-hidden flex flex-col pl-4">
                      <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                        <span className="text-[13px] font-medium text-slate-300">Nazwa</span>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          required
                          placeholder="Wpisz nazwę"
                          className="bg-transparent text-[#a855f7] text-[13px] font-semibold text-right focus:outline-none w-1/2 placeholder:text-slate-500"
                        />
                      </div>
                      
                      {/* Emojis selection */}
                      <div className="flex flex-col pr-4 py-3 gap-2">
                        <span className="text-[13px] font-medium text-slate-300">Ikona</span>
                        <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                          {['🏃', '💧', '🧘', '📖', '🍎', '💤', '🧠', '✍️', '🦷', '💊', '🧗', '🚲', '🥗', '☕', '🚭'].map(emoji => (
                            <button
                              key={emoji}
                              type="button"
                              onClick={() => setEditIcon(emoji)}
                              className={`w-8 h-8 flex items-center justify-center rounded-full text-base transition-colors ${editIcon === emoji ? 'bg-white/10 border border-white/10' : 'hover:bg-white/5'}`}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Freq & details */}
                    <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                      <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                        <span className="text-[13px] font-medium text-slate-300">Częstotliwość</span>
                        <select 
                          value={editFrequency}
                          onChange={(e) => setEditFrequency(e.target.value as 'daily' | 'weekly')}
                          className="bg-transparent text-white text-[13px] font-semibold focus:outline-none outline-none appearance-none cursor-pointer"
                          dir="rtl"
                        >
                          <option value="daily" className="bg-[#1c1c1e]">Cel dzienny</option>
                          <option value="weekly" className="bg-[#1c1c1e]">Cel tygodniowy</option>
                        </select>
                      </div>

                      <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                        <span className="text-[13px] font-medium text-slate-300">Kolor</span>
                        <div className="flex gap-1.5 flex-wrap justify-end">
                          {['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'].map(c => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className="w-5 h-5 rounded-full border-2 transition-transform"
                              style={{ backgroundColor: c, borderColor: editColor === c ? 'white' : 'transparent' }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Target & Units */}
                    <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                      <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                        <span className="text-[13px] font-medium text-slate-300">Cel</span>
                        <div className="flex items-center bg-[#222] rounded-lg border border-white/5 overflow-hidden">
                          <button type="button" onClick={() => setEditTargetCount(Math.max(1, editTargetCount - 1))} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg">-</button>
                          <span className="px-3 text-sm text-white font-semibold">{editTargetCount}</span>
                          <button type="button" onClick={() => setEditTargetCount(editTargetCount + 1)} className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg">+</button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pr-4 py-3">
                        <span className="text-[13px] font-medium text-slate-300">Jednostka</span>
                        <input 
                          type="text" 
                          value={editUnit} 
                          onChange={e => setEditUnit(e.target.value)} 
                          placeholder="np. porcje, kroki"
                          className="bg-transparent text-white text-[13px] font-semibold text-right focus:outline-none w-1/2 placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 space-y-3 shrink-0">
                      <button 
                        onClick={handleSaveEdit}
                        className="w-full py-4 rounded-2xl font-bold text-white text-[15px] shadow-lg active:scale-[0.98] transition-transform"
                        style={{ backgroundColor: editColor }}
                      >
                        Zapisz zmiany
                      </button>
                      <button 
                        onClick={() => {
                          if (window.confirm(`Czy na pewno chcesz usunąć nawyk: "${selectedEditingHabit.name}"?`)) {
                            deleteHabit(selectedEditingHabit.id);
                            setSelectedEditingHabit(null);
                          }
                        }}
                        className="w-full py-3 rounded-2xl font-bold text-red-400 text-[15px] bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 active:scale-[0.98] transition-transform"
                      >
                        Usuń nawyk
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
