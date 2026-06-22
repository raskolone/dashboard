import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Plus, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { TaskPriority, TaskCategory, KnowledgeCategory, EventType } from '../types';
import { useLocation } from 'react-router-dom';

export function QuickAddModal() {
  const { addTask, addKnowledge, addHabit, addEvent, language } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'task' | 'note' | 'habit' | 'event'>('task');
  const [habitStep, setHabitStep] = useState<'list' | 'details'>('list');
  const location = useLocation();

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('work');

  // Habit state
  const [habitName, setHabitName] = useState('');
  const [habitIcon, setHabitIcon] = useState('🧘');
  const [habitFrequency, setHabitFrequency] = useState<'daily'|'weekly'>('daily');
  const [habitTargetCount, setHabitTargetCount] = useState(1);
  const [habitUnit, setHabitUnit] = useState('');
  const [habitColor, setHabitColor] = useState('#a855f7');
  const [habitTypeState, setHabitTypeState] = useState<'build' | 'break'>('build');
  const [habitList, setHabitList] = useState('none');
  const [habitReminder, setHabitReminder] = useState(false);
  
  const popularEmojis = ['🏃', '💧', '🧘', '📖', '🍎', '💤', '🧠', '✍️', '🦷', '💊'];
  const popularColors = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#06b6d4'];
  
  const suggestedHabitCategories = [
    {
      pl: 'Zdrowe nawyki',
      en: 'Healthy Habits',
      items: [
        { pl: 'Pij wodę', en: 'Drink water', icon: '💧', count: 1, unit_pl: '', unit_en: '', color: '#3b82f6' },
        { pl: 'Jedz warzywa', en: 'Eat veggies', icon: '🥕', count: 2, unit_pl: 'porcje', unit_en: 'servings', color: '#f59e0b' },
        { pl: 'Myj zęby', en: 'Brush teeth', icon: '🦷', count: 2, unit_pl: '', unit_en: '', color: '#d1d5db' },
      ]
    },
    {
      pl: 'Niezdrowe nawyki',
      en: 'Bad Habits to Break',
      items: [
        { pl: 'Mniej social media', en: 'Less social media', icon: '📱', count: 1, unit_pl: '', unit_en: '', color: '#3b82f6' },
        { pl: 'Mniej alkoholu', en: 'Less alcohol', icon: '🍺', count: 1, unit_pl: '', unit_en: '', color: '#fbbf24' },
        { pl: 'Mniej słodyczy', en: 'Less sweets', icon: '🧁', count: 1, unit_pl: '', unit_en: '', color: '#a855f7' }
      ]
    },
    {
      pl: 'Ciało',
      en: 'Physical Activity',
      items: [
        { pl: 'Idź na spacer', en: 'Go for a walk', icon: '🚶', count: 5000, unit_pl: 'kroki', unit_en: 'steps', color: '#8b5cf6' },
        { pl: 'Biegaj', en: 'Run', icon: '🏃', count: 1, unit_pl: '', unit_en: '', color: '#f43f5e' }
      ]
    }
  ];

  // Event state
  const [eventTitle, setEventTitle] = useState('');
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
  const [eventStartTime, setEventStartTime] = useState('09:00');
  const [eventEndTime, setEventEndTime] = useState('10:00');

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<KnowledgeCategory>('Notes');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModalBasedOnRoute();
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    
    const handleCustomOpen = (e: CustomEvent) => {
      if (e.detail?.type) {
        setType(e.detail.type);
      } else {
        openModalBasedOnRoute();
      }
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-quick-add', handleCustomOpen as EventListener);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-quick-add', handleCustomOpen as EventListener);
    };
  }, [isOpen, location.pathname]);

  const openModalBasedOnRoute = () => {
    const path = location.pathname;
    if (path.includes('/tasks')) setType('task');
    else if (path.includes('/habits')) setType('habit');
    else if (path.includes('/calendar')) setType('event');
    else if (path.includes('/notes')) setType('note');
    else setType('task');
    setHabitStep('list');
    setIsOpen(true);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const input = document.getElementById('quick-add-input');
        if (input) input.focus();
      }, 100);
    } else {
      setTaskTitle('');
      setTaskPriority('medium');
      setTaskCategory('work');
      setHabitStep('list');
      
      setHabitName('');
      setHabitIcon('🧘');
      setHabitFrequency('daily');
      setHabitTargetCount(1);
      setHabitUnit('');
      setHabitColor('#a855f7');
      setHabitTypeState('build');
      setHabitList('none');
      setHabitReminder(false);
      
      setEventTitle('');
      setNoteTitle('');
      setNoteContent('');
      setNoteCategory('Notes');
    }
  }, [isOpen]);

  const handleHabitSelect = (item: any) => {
    setHabitName(language === 'pl' ? item.pl : item.en);
    setHabitIcon(item.icon);
    setHabitTargetCount(item.count || 1);
    setHabitUnit(language === 'pl' ? (item.unit_pl || '') : (item.unit_en || ''));
    setHabitColor(item.color || '#a855f7');
    setHabitFrequency('daily');
    setHabitTypeState('build');
    setHabitList('none');
    setHabitReminder(false);
    setHabitStep('details');
  };

  const resetHabitFormToCustom = () => {
    setHabitName('');
    setHabitIcon('🧘');
    setHabitTargetCount(1);
    setHabitUnit('');
    setHabitColor('#a855f7');
    setHabitFrequency('daily');
    setHabitTypeState('build');
    setHabitList('none');
    setHabitReminder(false);
    setHabitStep('details');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'task') {
      if (!taskTitle.trim()) return;
      addTask({
        title: taskTitle.trim(),
        due_date: new Date().toISOString().split('T')[0],
        status: 'todo',
        priority: taskPriority,
        category: taskCategory
      });
    } else if (type === 'habit') {
      if (!habitName.trim()) return;
      
      const tags = [];
      if (habitTypeState) {
        tags.push(habitTypeState === 'build' 
          ? (language === 'pl' ? 'Zbuduj nawyk' : 'Build a habit') 
          : (language === 'pl' ? 'Przełam nawyk' : 'Break a habit'));
      }
      if (habitList !== 'none') tags.push(habitList);

      addHabit({
        name: habitName.trim(),
        icon: habitIcon,
        frequency: habitFrequency,
        target_count: habitTargetCount,
        unit: habitUnit,
        color: habitColor,
        tags
      });
    } else if (type === 'event') {
      if (!eventTitle.trim()) return;
      await addEvent({
        title: eventTitle.trim(),
        date: eventDate,
        start_time: eventStartTime,
        end_time: eventEndTime,
        type: 'meeting'
      });
    } else {
      if (!noteTitle.trim() || !noteContent.trim()) return;
      addKnowledge({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory,
        tags: [],
        is_pinned: false
      });
    }
    setIsOpen(false);
  };

  return (
    <>
      <button 
        onClick={openModalBasedOnRoute}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-[#4ade80] text-[#1a1a1a] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-[150] cursor-pointer"
        title={language === 'pl' ? "Szybkie dodawanie (Cmd+K)" : "Quick Add (Cmd+K)"}
      >
        <Plus size={28} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <React.Fragment>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-[#0a0a0a]/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-[201] p-1"
            >
              <div className="glass-card border border-white/10 rounded-[2rem] p-6 shadow-2xl bg-[#1c1c1e]/80 backdrop-blur-3xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1 overflow-x-auto scrollbar-none p-1 bg-[#161616]/50 rounded-xl border border-[#262626]">
                    <button
                      type="button"
                      onClick={() => setType('task')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors cursor-pointer ${type === 'task' ? 'bg-[#4ade80] text-[#1a1a1a]' : 'text-slate-400 hover:text-white'}`}
                    >
                      {language === 'pl' ? 'Zadanie' : 'Task'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('habit')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors cursor-pointer ${type === 'habit' ? 'bg-[#a855f7] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      {language === 'pl' ? 'Nawyk' : 'Habit'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('event')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors cursor-pointer ${type === 'event' ? 'bg-[#3b82f6] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      {language === 'pl' ? 'Wydarzenie' : 'Event'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('note')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors cursor-pointer ${type === 'note' ? 'bg-[#eab308] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      {language === 'pl' ? 'Notatka' : 'Note'}
                    </button>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 ml-2 shrink-0 hover:text-white hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {type === 'habit' && habitStep === 'list' ? (
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-none pb-4">
                    <button 
                      type="button"
                      onClick={resetHabitFormToCustom}
                      className="w-full flex items-center justify-between bg-[#161616]/50 hover:bg-[#222]/50 transition-colors rounded-2xl p-4 border border-white/5 group cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#a855f7]/20 text-[#a855f7] flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-white">
                          {language === 'pl' ? 'Stwórz własny nawyk' : 'Create Custom Habit'}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <div className="space-y-6">
                      {suggestedHabitCategories.map((group, idx) => (
                        <div key={idx}>
                          <h3 className="text-xs font-bold text-slate-500 mb-3 pl-1">
                            {language === 'pl' ? group.pl : group.en}
                          </h3>
                          <div className="bg-[#161616]/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                            {group.items.map((item, i) => (
                              <button 
                                key={i}
                                type="button"
                                onClick={() => handleHabitSelect(item)}
                                className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left cursor-pointer ${i !== group.items.length - 1 ? 'border-b border-white/5' : ''}`}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-xl">{item.icon}</span>
                                  <span className="font-medium text-slate-200">
                                    {language === 'pl' ? item.pl : item.en}
                                  </span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-600" />
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {type !== 'habit' && (
                    <input
                      id="quick-add-input"
                      type="text"
                      required
                      placeholder={
                        type === 'task' 
                          ? (language === 'pl' ? "Co masz do zrobienia?" : "What needs to be done?") 
                          : type === 'event' 
                            ? (language === 'pl' ? "Tytuł wydarzenia" : "Event Title") 
                            : (language === 'pl' ? "Tytuł notatki" : "Note Title")
                      }
                      className="w-full bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors"
                      value={type === 'task' ? taskTitle : type === 'event' ? eventTitle : noteTitle}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (type === 'task') setTaskTitle(val);
                        else if (type === 'event') setEventTitle(val);
                        else setNoteTitle(val);
                      }}
                    />
                  )}

                  {type === 'habit' && (
                    <div className="space-y-4">
                      <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                        <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                          <span className="text-[13px] font-medium text-slate-300">
                            {language === 'pl' ? 'Nazwa' : 'Name'}
                          </span>
                          <input 
                            id="quick-add-input"
                            type="text" 
                            value={habitName} 
                            onChange={e => setHabitName(e.target.value)} 
                            required
                            placeholder={language === 'pl' ? 'Wpisz nazwę' : 'Enter name'}
                            className="bg-transparent text-[#a855f7] text-[13px] font-semibold text-right focus:outline-none w-1/2 placeholder:text-slate-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pr-4 py-3">
                          <span className="text-[13px] font-medium text-slate-300">
                            {language === 'pl' ? 'Ikona' : 'Icon'}
                          </span>
                          <div className="flex items-center gap-1">
                            {popularEmojis.slice(0, 6).map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setHabitIcon(emoji)}
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors cursor-pointer ${habitIcon === emoji ? 'bg-white/10' : 'hover:bg-white/5'}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                        <div className="flex justify-between items-center pr-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
                          <span className="text-[13px] font-medium text-slate-300">
                            {language === 'pl' ? 'Listy' : 'Lists'}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-500">
                              {language === 'pl' ? 'Brak' : 'None'}
                            </span>
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-slate-500 mb-1 ml-4">
                          {language === 'pl' ? 'Szczegóły' : 'Details'}
                        </div>
                        <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-slate-300">
                              {language === 'pl' ? 'Chcę' : 'I want to'}
                            </span>
                            <div className="flex items-center gap-1">
                              <select 
                                value={habitTypeState}
                                onChange={(e) => setHabitTypeState(e.target.value as 'build' | 'break')}
                                className="bg-transparent text-white text-[13px] font-semibold focus:outline-none outline-none appearance-none cursor-pointer"
                                dir="rtl"
                              >
                                <option value="build" className="bg-[#1c1c1e]">
                                  {language === 'pl' ? 'Zbudować nawyk' : 'Build habit'}
                                </option>
                                <option value="break" className="bg-[#1c1c1e]">
                                  {language === 'pl' ? 'Przełamać nawyk' : 'Break habit'}
                                </option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-slate-300">
                              {language === 'pl' ? 'Jak często?' : 'How often?'}
                            </span>
                            <div className="flex items-center gap-1">
                              <select 
                                value={habitFrequency}
                                onChange={(e) => setHabitFrequency(e.target.value as 'daily' | 'weekly')}
                                className="bg-transparent text-white text-[13px] font-semibold focus:outline-none outline-none appearance-none cursor-pointer"
                                dir="rtl"
                              >
                                <option value="daily" className="bg-[#1c1c1e]">
                                  {language === 'pl' ? 'Cel dzienny' : 'Daily Goal'}
                                </option>
                                <option value="weekly" className="bg-[#1c1c1e]">
                                  {language === 'pl' ? 'Cel tygodniowy' : 'Weekly Goal'}
                                </option>
                              </select>
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-slate-300">
                              {language === 'pl' ? 'Przypomnij mi' : 'Remind me'}
                            </span>
                            <button
                              type="button"
                              onClick={() => setHabitReminder(!habitReminder)}
                              className={`w-10 h-6 rounded-full transition-colors relative flex items-center cursor-pointer ${habitReminder ? 'bg-[#a855f7]' : 'bg-[#fff]/10'}`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute transition-transform transform ${habitReminder ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3">
                            <span className="text-[13px] font-medium text-slate-300">
                              {language === 'pl' ? 'Kolor' : 'Color'}
                            </span>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              {popularColors.slice(0, 6).map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setHabitColor(c)}
                                  className="w-5 h-5 rounded-full border-2 transition-transform cursor-pointer"
                                  style={{ backgroundColor: c, borderColor: habitColor === c ? 'white' : 'transparent' }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-slate-500 mb-1 ml-4">
                          {habitFrequency === 'weekly' 
                            ? (language === 'pl' ? 'Mój tygodniowy cel' : 'My weekly goal') 
                            : (habitTypeState === 'break' 
                              ? (language === 'pl' ? 'Moje dzienne maksimum' : 'My daily maximum') 
                              : (language === 'pl' ? 'Mój dzienny cel' : 'My daily goal'))}
                        </div>
                        <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-white">{habitTargetCount}</span>
                            <div className="flex items-center bg-[#222] rounded-lg border border-white/5 overflow-hidden">
                              <button type="button" onClick={() => setHabitTargetCount(Math.max(1, habitTargetCount - 1))} className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg cursor-pointer">-</button>
                              <div className="w-px h-5 bg-white/10" />
                              <button type="button" onClick={() => setHabitTargetCount(habitTargetCount + 1)} className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg cursor-pointer">+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3">
                            <span className="text-[13px] font-medium text-slate-300">
                              {language === 'pl' ? 'Jednostka' : 'Unit'}
                            </span>
                            <input 
                              type="text" 
                              value={habitUnit} 
                              onChange={e => setHabitUnit(e.target.value)} 
                              placeholder={language === 'pl' ? 'Własna jednostka (np. porcje, kroki)' : 'Custom unit (e.g. portions, steps)'}
                              className="bg-transparent text-white text-[13px] font-semibold text-right focus:outline-none w-1/2 placeholder:text-slate-500 border-none"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {type === 'event' && (
                    <div className="grid grid-cols-3 gap-2">
                       <input 
                        type="date"
                        value={eventDate}
                        onChange={e => setEventDate(e.target.value)}
                        className="col-span-3 bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        required
                      />
                      <input 
                        type="time" 
                        value={eventStartTime}
                        onChange={e => setEventStartTime(e.target.value)}
                        className="col-span-1 bg-[#161616]/50 border border-[#262626] rounded-xl px-2 py-2 text-white text-sm focus:outline-none"
                        required
                      />
                      <span className="col-span-1 text-center text-slate-500 self-center">-</span>
                      <input 
                        type="time" 
                        value={eventEndTime}
                        onChange={e => setEventEndTime(e.target.value)}
                        className="col-span-1 bg-[#161616]/50 border border-[#262626] rounded-xl px-2 py-2 text-white text-sm focus:outline-none"
                        required
                      />
                    </div>
                  )}

                  {type === 'note' && (
                    <textarea
                      placeholder={language === 'pl' ? "Zanotuj swoje myśli..." : "Write down your thoughts..."}
                      className="w-full bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors min-h-[100px] resize-y"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                    />
                  )}

                  {type === 'task' && (
                    <div className="flex gap-4">
                       <select 
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                          className="flex-1 bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="low">{language === 'pl' ? 'Niski priorytet' : 'Low Priority'}</option>
                          <option value="medium">{language === 'pl' ? 'Średni' : 'Medium'}</option>
                          <option value="high">{language === 'pl' ? 'Wysoki' : 'High'}</option>
                          <option value="urgent">{language === 'pl' ? 'Pilne' : 'Urgent'}</option>
                        </select>
                        <select 
                          value={taskCategory}
                          onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                          className="flex-1 bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="work">{language === 'pl' ? 'Praca' : 'Work'}</option>
                          <option value="personal">{language === 'pl' ? 'Osobiste' : 'Personal'}</option>
                          <option value="learning">{language === 'pl' ? 'Nauka' : 'Learning'}</option>
                          <option value="health">{language === 'pl' ? 'Zdrowie' : 'Health'}</option>
                          <option value="project">{language === 'pl' ? 'Projekt' : 'Project'}</option>
                        </select>
                    </div>
                  )}
                  {type === 'note' && (
                    <div>
                      <select 
                          value={noteCategory}
                          onChange={(e) => setNoteCategory(e.target.value as KnowledgeCategory)}
                          className="w-full bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="Notes">{language === 'pl' ? 'Notatki' : 'Notes'}</option>
                          <option value="Ideas">{language === 'pl' ? 'Pomysły' : 'Ideas'}</option>
                          <option value="Bookmarks">{language === 'pl' ? 'Zakładki' : 'Bookmarks'}</option>
                          <option value="Resources">{language === 'pl' ? 'Zasoby' : 'Resources'}</option>
                          <option value="Snippets">{language === 'pl' ? 'Snippety' : 'Snippets'}</option>
                        </select>
                    </div>
                  )}

                  <div className="pt-4 flex justify-between items-center text-slate-500 text-xs mt-2 border-t border-white/5">
                    {type === 'habit' && habitStep === 'details' ? (
                       <button
                         type="button"
                         onClick={() => setHabitStep('list')}
                         className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                       >
                         {language === 'pl' ? 'Wstecz' : 'Back'}
                       </button>
                    ) : (
                       <span className="hidden sm:inline">
                         {language === 'pl' ? 'Wciśnij ' : 'Press '}<kbd className="bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">Enter</kbd>{language === 'pl' ? ' by zapisać' : ' to save'}
                       </span>
                    )}
                    
                    <div className="flex gap-2 ml-auto">
                       <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        {language === 'pl' ? 'Anuluj' : 'Cancel'}
                      </button>
                      <button
                        type="submit"
                        className={`px-4 py-2 rounded-xl text-[#1a1a1a] font-bold flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer ${
                          type === 'task' ? 'bg-[#4ade80]' : 
                          type === 'habit' ? 'bg-[#a855f7] text-white' : 
                          type === 'event' ? 'bg-[#3b82f6] text-white' : 
                          'bg-[#eab308] text-white'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {type === 'task' 
                          ? (language === 'pl' ? 'Dodaj zadanie' : 'Add task') 
                          : type === 'habit' 
                            ? (language === 'pl' ? 'Zapisz Nawyk' : 'Save Habit') 
                            : type === 'event' 
                              ? (language === 'pl' ? 'Dodaj wydarzenie' : 'Add event') 
                              : (language === 'pl' ? 'Zapisz notatkę' : 'Save note')}
                      </button>
                    </div>
                  </div>
                </form>
                )}
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </>
  );
}
