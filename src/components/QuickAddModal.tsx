import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Plus, ChevronRight } from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { TaskPriority, TaskCategory, KnowledgeCategory, EventType } from '../types';
import { useLocation } from 'react-router-dom';

export function QuickAddModal() {
  const { addTask, addKnowledge, addHabit, addEvent } = useAppStore();
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
      category: 'Zdrowe nawyki', items: [
        { name: 'Pij wodę', icon: '💧', count: 1, unit: '', color: '#3b82f6' },
        { name: 'Jedz warzywa', icon: '🥕', count: 2, unit: 'porcje', color: '#f59e0b' },
        { name: 'Myj zęby', icon: '🦷', count: 2, unit: '', color: '#d1d5db' },
      ]
    },
    {
      category: 'Niezdrowe nawyki', items: [
        { name: 'Mniej social media', icon: '📱', count: 1, unit: '', color: '#3b82f6' },
        { name: 'Mniej alkoholu', icon: '🍺', count: 1, unit: '', color: '#fbbf24' },
        { name: 'Mniej słodyczy', icon: '🧁', count: 1, unit: '', color: '#a855f7' }
      ]
    },
    {
      category: 'Ciało', items: [
        { name: 'Idź na spacer', icon: '🚶', count: 5000, unit: 'kroki', color: '#8b5cf6' },
        { name: 'Biegaj', icon: '🏃', count: 1, unit: '', color: '#f43f5e' }
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
      // Cmd/Ctrl + K
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

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const input = document.getElementById('quick-add-input');
        if (input) input.focus();
      }, 100);
    } else {
      // Reset forms on close
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
    setHabitName(item.name);
    setHabitIcon(item.icon);
    setHabitTargetCount(item.count || 1);
    setHabitUnit(item.unit || '');
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
      if (habitTypeState) tags.push(habitTypeState === 'build' ? 'Zbuduj nawyk' : 'Przełam nawyk');
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
      {/* Floating Action Button */}
      <button 
        onClick={openModalBasedOnRoute}
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-[#4ade80] text-[#1a1a1a] rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-transform z-[150]"
        title="Szybkie dodawanie (Cmd+K)"
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
                      onClick={() => setType('task')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'task' ? 'bg-[#4ade80] text-[#1a1a1a]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Zadanie
                    </button>
                    <button
                      onClick={() => setType('habit')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'habit' ? 'bg-[#a855f7] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Nawyk
                    </button>
                    <button
                      onClick={() => setType('event')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'event' ? 'bg-[#3b82f6] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Wydarzenie
                    </button>
                    <button
                      onClick={() => setType('note')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'note' ? 'bg-[#eab308] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Notatka
                    </button>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 text-slate-400 ml-2 shrink-0 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {type === 'habit' && habitStep === 'list' ? (
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-none pb-4">
                    <button 
                      onClick={resetHabitFormToCustom}
                      className="w-full flex items-center justify-between bg-[#161616]/50 hover:bg-[#222]/50 transition-colors rounded-2xl p-4 border border-white/5 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#a855f7]/20 text-[#a855f7] flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-white">Stwórz własny nawyk</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" />
                    </button>

                    <div className="space-y-6">
                      {suggestedHabitCategories.map((group, idx) => (
                        <div key={idx}>
                          <h3 className="text-xs font-bold text-slate-500 mb-3 pl-1">{group.category}</h3>
                          <div className="bg-[#161616]/50 rounded-3xl border border-white/5 overflow-hidden flex flex-col">
                            {group.items.map((item, i) => (
                              <button 
                                key={i}
                                onClick={() => handleHabitSelect(item)}
                                className={`flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left ${i !== group.items.length - 1 ? 'border-b border-white/5' : ''}`}
                              >
                                <div className="flex items-center gap-4">
                                  <span className="text-xl">{item.icon}</span>
                                  <span className="font-medium text-slate-200">{item.name}</span>
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
                      placeholder={type === 'task' ? "Co masz do zrobienia?" : type === 'event' ? "Tytuł wydarzenia" : "Tytuł notatki"}
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
                          <span className="text-[13px] font-medium text-slate-300">Nazwa</span>
                          <input 
                            id="quick-add-input"
                            type="text" 
                            value={habitName} 
                            onChange={e => setHabitName(e.target.value)} 
                            required
                            placeholder="Wpisz nazwę"
                            className="bg-transparent text-[#a855f7] text-[13px] font-semibold text-right focus:outline-none w-1/2 placeholder:text-slate-500"
                          />
                        </div>
                        <div className="flex items-center justify-between pr-4 py-3">
                          <span className="text-[13px] font-medium text-slate-300">Ikona</span>
                          <div className="flex items-center gap-1">
                            {popularEmojis.slice(0, 6).map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => setHabitIcon(emoji)}
                                className={`w-7 h-7 flex items-center justify-center rounded-full text-sm transition-colors ${habitIcon === emoji ? 'bg-white/10' : 'hover:bg-white/5'}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                        <div className="flex justify-between items-center pr-4 py-3 cursor-pointer hover:bg-white/5 transition-colors">
                          <span className="text-[13px] font-medium text-slate-300">Listy</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold text-slate-500">Brak</span>
                            <ChevronRight className="w-4 h-4 text-slate-600" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-slate-500 mb-1 ml-4">Szczegóły</div>
                        <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-slate-300">Chcę</span>
                            <div className="flex items-center gap-1">
                              <select 
                                value={habitTypeState}
                                onChange={(e) => setHabitTypeState(e.target.value as 'build' | 'break')}
                                className="bg-transparent text-white text-[13px] font-semibold focus:outline-none outline-none appearance-none cursor-pointer"
                                dir="rtl"
                              >
                                <option value="build" className="bg-[#1c1c1e]">Zbudować nawyk</option>
                                <option value="break" className="bg-[#1c1c1e]">Przełamać nawyk</option>
                              </select>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-slate-300">Jak często?</span>
                            <div className="flex items-center gap-1">
                              <select 
                                value={habitFrequency}
                                onChange={(e) => setHabitFrequency(e.target.value as 'daily' | 'weekly')}
                                className="bg-transparent text-white text-[13px] font-semibold focus:outline-none outline-none appearance-none cursor-pointer"
                                dir="rtl"
                              >
                                <option value="daily" className="bg-[#1c1c1e]">Cel dzienny</option>
                                <option value="weekly" className="bg-[#1c1c1e]">Cel tygodniowy</option>
                              </select>
                              <ChevronRight className="w-3 h-3 text-slate-600" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-slate-300">Przypomnij mi</span>
                            <button
                              type="button"
                              onClick={() => setHabitReminder(!habitReminder)}
                              className={`w-10 h-6 rounded-full transition-colors relative flex items-center ${habitReminder ? 'bg-[#a855f7]' : 'bg-[#fff]/10'}`}
                            >
                              <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute transition-transform transform ${habitReminder ? 'translate-x-[18px]' : 'translate-x-[2px]'}`} />
                            </button>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3">
                            <span className="text-[13px] font-medium text-slate-300">Kolor</span>
                            <div className="flex gap-1.5 flex-wrap justify-end">
                              {popularColors.slice(0, 6).map(c => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => setHabitColor(c)}
                                  className="w-5 h-5 rounded-full border-2 transition-transform"
                                  style={{ backgroundColor: c, borderColor: habitColor === c ? 'white' : 'transparent' }}
                                />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-slate-500 mb-1 ml-4">{habitFrequency === 'weekly' ? 'Mój tygodniowy cel' : (habitTypeState === 'break' ? 'Moje dzienne maksimum' : 'Mój dzienny cel')}</div>
                        <div className="bg-[#161616]/50 rounded-2xl border border-white/5 overflow-hidden flex flex-col pl-4">
                          <div className="flex justify-between items-center pr-4 py-3 border-b border-white/5">
                            <span className="text-[13px] font-medium text-white">{habitTargetCount}</span>
                            <div className="flex items-center bg-[#222] rounded-lg border border-white/5 overflow-hidden">
                              <button type="button" onClick={() => setHabitTargetCount(Math.max(1, habitTargetCount - 1))} className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg">-</button>
                              <div className="w-px h-5 bg-white/10" />
                              <button type="button" onClick={() => setHabitTargetCount(habitTargetCount + 1)} className="w-10 h-8 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-colors text-lg">+</button>
                            </div>
                          </div>
                          <div className="flex justify-between items-center pr-4 py-3">
                            <span className="text-[13px] font-medium text-slate-300">Jednostka</span>
                            <input 
                              type="text" 
                              value={habitUnit} 
                              onChange={e => setHabitUnit(e.target.value)} 
                              placeholder="Własna jednostka (np. porcje, kroki)"
                              className="bg-transparent text-white text-[13px] font-semibold text-right focus:outline-none w-1/2 placeholder:text-slate-500"
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
                      placeholder="Zanotuj swoje myśli..."
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
                          <option value="low">Niski priorytet</option>
                          <option value="medium">Średni</option>
                          <option value="high">Wysoki</option>
                          <option value="urgent">Pilne</option>
                        </select>
                        <select 
                          value={taskCategory}
                          onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                          className="flex-1 bg-[#161616]/50 border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="work">Praca</option>
                          <option value="personal">Osobiste</option>
                          <option value="learning">Nauka</option>
                          <option value="health">Zdrowie</option>
                          <option value="project">Projekt</option>
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
                          <option value="Notes">Notatki</option>
                          <option value="Ideas">Pomysły</option>
                          <option value="Bookmarks">Zakładki</option>
                          <option value="Resources">Zasoby</option>
                          <option value="Snippets">Snippety</option>
                        </select>
                    </div>
                  )}

                  <div className="pt-4 flex justify-between items-center text-slate-500 text-xs mt-2 border-t border-white/5">
                    {type === 'habit' && habitStep === 'details' ? (
                       <button
                         type="button"
                         onClick={() => setHabitStep('list')}
                         className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-colors"
                       >
                         Wstecz
                       </button>
                    ) : (
                       <span className="hidden sm:inline">Wciśnij <kbd className="bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">Enter</kbd> by zapisać</span>
                    )}
                    
                    <div className="flex gap-2 ml-auto">
                       <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className={`px-4 py-2 rounded-xl border border-white/10 text-slate-300 font-semibold hover:bg-white/5 transition-colors`}
                      >
                        Anuluj
                      </button>
                      <button
                        type="submit"
                        className={`px-4 py-2 rounded-xl text-[#1a1a1a] font-bold flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                          type === 'task' ? 'bg-[#4ade80]' : 
                          type === 'habit' ? 'bg-[#a855f7] text-white' : 
                          type === 'event' ? 'bg-[#3b82f6] text-white' : 
                          'bg-[#eab308] text-white'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        {type === 'task' ? 'Dodaj zadanie' : type === 'habit' ? 'Zapisz Nawyk' : type === 'event' ? 'Dodaj wydarzenie' : 'Zapisz notatkę'}
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
