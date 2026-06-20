import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Plus } from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { TaskPriority, TaskCategory, KnowledgeCategory, EventType } from '../types';

export function QuickAddModal() {
  const { addTask, addKnowledge, addHabit, addEvent } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'task' | 'note' | 'habit' | 'event'>('task');

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('work');

  // Habit state
  const [habitName, setHabitName] = useState('');
  const [habitIcon, setHabitIcon] = useState('🌟');
  const [habitFrequency, setHabitFrequency] = useState<'daily'|'weekly'>('daily');

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
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

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
      setHabitName('');
      setEventTitle('');
      setNoteTitle('');
      setNoteContent('');
      setNoteCategory('Notes');
    }
  }, [isOpen]);

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
      addHabit({
        name: habitName.trim(),
        icon: habitIcon,
        frequency: habitFrequency,
        target_count: habitFrequency === 'daily' ? 7 : 3,
        color: '#4ade80',
        tags: ['Osobiste'] // default tag placeholder
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
        onClick={() => setIsOpen(true)}
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
              className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[201] p-1"
            >
              <div className="glass-card rounded-[2rem] p-6 shadow-2xl bg-white/40 dark:bg-[#111111]/80 backdrop-blur-3xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-1 overflow-x-auto scrollbar-none p-1 bg-[#161616] rounded-xl border border-[#262626]">
                    <button
                      onClick={() => setType('task')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'task' ? 'bg-[#4ade80] text-[#1a1a1a]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Zadanie
                    </button>
                    <button
                      onClick={() => setType('habit')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'habit' ? 'bg-[#4ade80] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Nawyk
                    </button>
                    <button
                      onClick={() => setType('event')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'event' ? 'bg-[#4ade80] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                    >
                      Wydarzenie
                    </button>
                    <button
                      onClick={() => setType('note')}
                      className={`px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap font-medium rounded-lg transition-colors ${type === 'note' ? 'bg-[#4ade80] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
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

                <form onSubmit={handleSubmit} className="space-y-4">
                  <input
                    id="quick-add-input"
                    type="text"
                    required
                    placeholder={type === 'task' ? "Co masz do zrobienia?" : type === 'habit' ? "Nazwa nawyku" : type === 'event' ? "Tytuł wydarzenia" : "Tytuł notatki"}
                    className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors"
                    value={type === 'task' ? taskTitle : type === 'habit' ? habitName : type === 'event' ? eventTitle : noteTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (type === 'task') setTaskTitle(val);
                      else if (type === 'habit') setHabitName(val);
                      else if (type === 'event') setEventTitle(val);
                      else setNoteTitle(val);
                    }}
                  />

                  {type === 'habit' && (
                    <div className="flex gap-4">
                      <input
                        type="text"
                        placeholder="Ikona (np. 🌟)"
                        className="w-1/4 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        value={habitIcon}
                        onChange={(e) => setHabitIcon(e.target.value)}
                      />
                      <select 
                        value={habitFrequency}
                        onChange={(e) => setHabitFrequency(e.target.value as 'daily' | 'weekly')}
                        className="flex-1 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                      >
                        <option value="daily">Codziennie</option>
                        <option value="weekly">Cotygodniowo</option>
                      </select>
                    </div>
                  )}

                  {type === 'event' && (
                    <div className="grid grid-cols-3 gap-2">
                      <input 
                        type="date"
                        value={eventDate}
                        onChange={e => setEventDate(e.target.value)}
                        className="col-span-3 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        required
                      />
                      <input 
                        type="time" 
                        value={eventStartTime}
                        onChange={e => setEventStartTime(e.target.value)}
                        className="col-span-1 bg-[#161616] border border-[#262626] rounded-xl px-2 py-2 text-white text-sm focus:outline-none"
                        required
                      />
                      <span className="col-span-1 text-center text-slate-500 self-center">-</span>
                      <input 
                        type="time" 
                        value={eventEndTime}
                        onChange={e => setEventEndTime(e.target.value)}
                        className="col-span-1 bg-[#161616] border border-[#262626] rounded-xl px-2 py-2 text-white text-sm focus:outline-none"
                        required
                      />
                    </div>
                  )}

                  {type === 'note' && (
                    <textarea
                      placeholder="Zanotuj swoje myśli..."
                      className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors min-h-[100px] resize-y"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                    />
                  )}

                  {type === 'task' && (
                    <div className="flex gap-4">
                       <select 
                          value={taskPriority}
                          onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                          className="flex-1 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="low">Niski priorytet</option>
                          <option value="medium">Średni</option>
                          <option value="high">Wysoki</option>
                          <option value="urgent">Pilne</option>
                        </select>
                        <select 
                          value={taskCategory}
                          onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                          className="flex-1 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
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
                          className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none"
                        >
                          <option value="Notes">Notatki</option>
                          <option value="Ideas">Pomysły</option>
                          <option value="Bookmarks">Zakładki</option>
                          <option value="Resources">Zasoby</option>
                          <option value="Snippets">Snippety</option>
                        </select>
                    </div>
                  )}

                  <div className="pt-2 flex justify-between items-center text-slate-500 text-xs">
                    <span className="hidden sm:inline">Wciśnij <kbd className="bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">Enter</kbd> by zapisać</span>
                    <span className="sm:hidden">Zapisz zadanie</span>
                    <button
                      type="submit"
                      className={`px-4 py-2 rounded-xl text-[#1a1a1a] font-bold flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${type === 'task' ? 'bg-[#4ade80]' : type === 'habit' ? 'bg-[#4ade80] text-white' : type === 'event' ? 'bg-[#4ade80] text-white' : 'bg-[#4ade80] text-white'}`}
                    >
                      <Check className="w-4 h-4" />
                      Dodaj
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </React.Fragment>
        )}
      </AnimatePresence>
    </>
  );
}
