import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { TaskPriority, TaskCategory, KnowledgeCategory } from '../types';

export function QuickAddModal() {
  const { addTask, addKnowledge } = useAppStore();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'task' | 'note'>('task');

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskPriority, setTaskPriority] = useState<TaskPriority>('medium');
  const [taskCategory, setTaskCategory] = useState<TaskCategory>('work');

  // Note state
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [noteCategory, setNoteCategory] = useState<KnowledgeCategory>('dev');

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
      setNoteTitle('');
      setNoteContent('');
      setNoteCategory('dev');
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
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
    } else {
      if (!noteTitle.trim() || !noteContent.trim()) return;
      addKnowledge({
        title: noteTitle.trim(),
        content: noteContent.trim(),
        category: noteCategory
      });
    }
    setIsOpen(false);
  };

  return (
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
            <div className="glass-card rounded-3xl p-6 shadow-2xl bg-white/40 dark:bg-[#111111]/80 backdrop-blur-3xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-2 p-1 bg-[#161616] rounded-xl border border-[#262626]">
                  <button
                    onClick={() => setType('task')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${type === 'task' ? 'bg-[#75d36e] text-[#1a1a1a]' : 'text-slate-400 hover:text-white'}`}
                  >
                    Zadanie
                  </button>
                  <button
                    onClick={() => setType('note')}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${type === 'note' ? 'bg-[#3b82f6] text-[#fff]' : 'text-slate-400 hover:text-white'}`}
                  >
                    Notatka
                  </button>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  id="quick-add-input"
                  type="text"
                  placeholder={type === 'task' ? "Co masz do zrobienia?" : "Tytuł notatki"}
                  className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#75d36e] transition-colors"
                  value={type === 'task' ? taskTitle : noteTitle}
                  onChange={(e) => type === 'task' ? setTaskTitle(e.target.value) : setNoteTitle(e.target.value)}
                />

                {type === 'note' && (
                  <textarea
                    placeholder="Zanotuj swoje myśli..."
                    className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#3b82f6] transition-colors min-h-[100px] resize-y"
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                  />
                )}

                {type === 'task' && (
                  <div className="flex gap-4">
                     <select 
                        value={taskPriority}
                        onChange={(e) => setTaskPriority(e.target.value as TaskPriority)}
                        className="flex-1 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#75d36e]"
                      >
                        <option value="low">Niski priorytet</option>
                        <option value="medium">Średni</option>
                        <option value="high">Wysoki</option>
                        <option value="urgent">Pilne</option>
                      </select>
                      <select 
                        value={taskCategory}
                        onChange={(e) => setTaskCategory(e.target.value as TaskCategory)}
                        className="flex-1 bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#75d36e]"
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
                        className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-2 text-white focus:outline-none focus:border-[#3b82f6]"
                      >
                        <option value="dev">Dev</option>
                        <option value="design">Design</option>
                        <option value="business">Biznes</option>
                        <option value="marketing">Marketing</option>
                        <option value="personal">Osobiste</option>
                      </select>
                  </div>
                )}

                <div className="pt-2 flex justify-between items-center text-slate-500 text-xs">
                  <span>Wciśnij <kbd className="bg-[#161616] px-1.5 py-0.5 rounded border border-[#262626]">Enter</kbd> by zapisać</span>
                  <button
                    type="submit"
                    className={`px-4 py-2 rounded-xl text-[#1a1a1a] font-bold flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${type === 'task' ? 'bg-[#75d36e]' : 'bg-[#3b82f6] text-white'}`}
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
  );
}
