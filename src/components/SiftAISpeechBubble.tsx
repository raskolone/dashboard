import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Send, Bot, Clock, Calendar, CheckSquare, Target, ArrowRight, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { askSiftAIAssistantDetailed, SiftAIAction, AIMessage } from '../lib/aiService';

export const SiftAISpeechBubble: React.FC = () => {
  const { 
    tasks, 
    habits, 
    events, 
    language, 
    user,
    addTask, 
    updateTask, 
    deleteTask,
    addEvent, 
    deleteEvent,
    addHabit, 
    toggleHabit 
  } = useAppStore();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Listen to global open event
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      setTimeout(() => inputRef.current?.focus(), 150);
    };
    window.addEventListener('open-siftai', handleOpen);
    return () => window.removeEventListener('open-siftai', handleOpen);
  }, []);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const displayName = user?.displayName || user?.email?.split('@')[0] || '';
      const firstName = displayName.split(' ')[0];
      const greetingName = firstName ? (language === 'pl' ? `${firstName}` : firstName) : '';

      setMessages([
        {
          role: 'assistant',
          content: language === 'pl'
            ? `Cześć${greetingName ? ` ${greetingName}` : ''}! Jestem **SiftAI** — Twoim asystentem produktywności.
Mam pełny dostęp do Twojego **kalendarza**, **puli zadań** oraz **Habit Trackera**.

W czym mogę Ci pomóc? Możesz mnie poprosić np. o:
- *"Dodaj spotkanie z Adamem Zawadzkim we wtorek o 7:30 do 8:30"*
- *"Dodaj zadanie do puli: Przygotować prezentację"*
- *"Zaznacz nawyk na dzisiaj"*
- *"Zaplanuj mój dzisiejszy dzień"*`
            : `Hello${greetingName ? ` ${greetingName}` : ''}! I am **SiftAI** — your productivity assistant.
I have full access to your **calendar**, **task pool**, and **Habit Tracker**.

How can I help you? You can ask me to:
- *"Add meeting with Adam Zawadzki on Tuesday from 7:30 to 8:30"*
- *"Add task to pool: Prepare presentation"*
- *"Check off habit for today"*
- *"Plan my day"*`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    }
  }, [language, user]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const executeAction = (action?: SiftAIAction) => {
    if (!action) return;

    try {
      if (action.type === 'create_event' && action.payload) {
        addEvent({
          title: action.payload.title || 'Wydarzenie',
          date: action.payload.date || new Date().toISOString().split('T')[0],
          start_time: action.payload.start_time || '08:00',
          end_time: action.payload.end_time || '09:00',
          type: action.payload.type || 'meeting',
          description: action.payload.description || 'Utworzone przez SiftAI'
        });
        setLastAction(`📅 Dodano wydarzenie: ${action.payload.title} (${action.payload.start_time} - ${action.payload.end_time})`);
      } else if (action.type === 'create_task' && action.payload) {
        addTask({
          title: action.payload.title || 'Nowe zadanie',
          priority: action.payload.priority || 'medium',
          due_date: action.payload.due_date || '',
          due_time: action.payload.due_time || '',
          in_pool: action.payload.in_pool ?? true,
          status: 'todo',
          checklist: []
        });
        setLastAction(`📥 Dodano zadanie: ${action.payload.title}`);
      } else if (action.type === 'complete_task' && action.payload) {
        const found = tasks.find(t => t.title.toLowerCase().includes(action.payload.title?.toLowerCase()));
        if (found) {
          updateTask(found.id, { status: 'done', updatedAt: new Date().toISOString() });
          setLastAction(`✅ Ukończono zadanie: ${found.title}`);
        }
      } else if (action.type === 'toggle_habit' && action.payload) {
        const habitId = action.payload.id || habits.find(h => h.name.toLowerCase().includes(action.payload.name?.toLowerCase()))?.id;
        if (habitId) {
          toggleHabit(habitId, action.payload.date || new Date().toISOString().split('T')[0]);
          setLastAction(`🎯 Zaktualizowano nawyk!`);
        }
      } else if (action.type === 'create_habit' && action.payload) {
        addHabit({
          name: action.payload.name || 'Nowy nawyk',
          icon: action.payload.icon || '🎯',
          frequency: action.payload.frequency || 'daily',
          target_count: action.payload.target_count || 1,
          unit: action.payload.unit || 'razy',
          color: action.payload.color || '#4ade80',
          tags: action.payload.tags || []
        });
        setLastAction(`🎯 Utworzono nawyk: ${action.payload.name}`);
      }
    } catch (e) {
      console.error('Action execution failed:', e);
    }
  };

  const handleSend = async (queryText?: string) => {
    const text = (queryText || inputValue).trim();
    if (!text || isLoading) return;

    const userMsg: AIMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);
    setLastAction(null);

    try {
      const result = await askSiftAIAssistantDetailed(
        text,
        { tasks, habits, events, language: language as 'pl' | 'en' },
        messages
      );

      const assistantMsg: AIMessage = {
        role: 'assistant',
        content: result.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, assistantMsg]);

      // Execute action if provided
      if (result.action) {
        executeAction(result.action);
      }
    } catch (error) {
      console.error('SiftAI error:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: language === 'pl' 
            ? 'Przepraszam, wystąpił chwilowy błąd połączenia z modułem AI. Spróbuj ponownie.' 
            : 'Sorry, a temporary AI connection error occurred. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button: Right above the Green Plus button */}
      <button
        id="siftai-floating-trigger"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setTimeout(() => inputRef.current?.focus(), 150);
        }}
        className={`fixed bottom-22 right-6 md:bottom-24 md:right-8 w-13 h-13 rounded-full shadow-2xl flex items-center justify-center transition-all z-[145] cursor-pointer ${
          isOpen
            ? 'bg-purple-600 text-white shadow-purple-500/40 scale-105 ring-2 ring-purple-400'
            : 'bg-gradient-to-tr from-purple-700 via-indigo-600 to-purple-500 text-white shadow-purple-900/50 hover:scale-110 active:scale-95'
        }`}
        title="SiftAI Assistant"
      >
        <Sparkles className={`w-6 h-6 ${isOpen ? 'rotate-12' : 'animate-pulse'}`} />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#4ade80] rounded-full border-2 border-[#121215]" />
      </button>

      {/* Floating Speech Bubble (Chmurka asystenta) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 16, x: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 16 }}
            transition={{ type: 'spring', damping: 26, stiffness: 320 }}
            className="fixed bottom-37 right-4 sm:right-6 md:right-8 w-[92vw] sm:w-[390px] md:w-[420px] max-h-[580px] bg-[#141418]/95 backdrop-blur-xl border border-purple-500/30 rounded-3xl shadow-[0_16px_50px_rgba(0,0,0,0.6),0_0_30px_rgba(168,85,247,0.15)] flex flex-col z-[140] overflow-hidden"
          >
            {/* Speech bubble pointer / tail at the bottom right */}
            <div className="absolute -bottom-2 right-6 md:right-7 w-4 h-4 bg-[#141418] border-r border-b border-purple-500/30 rotate-45" />

            {/* Bubble Header */}
            <div className="px-4 py-3 border-b border-white/10 bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-transparent flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold font-display text-white tracking-wide">SiftAI</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono border border-purple-500/30">
                      Asystent
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-[#4ade80]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-pulse" />
                    <span>{language === 'pl' ? 'Pełny dostęp do aplikacji' : 'Full workspace access'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setLastAction(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  title={language === 'pl' ? 'Wyczyść rozmowę' : 'Clear chat'}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                  title={language === 'pl' ? 'Zwiń chmurkę' : 'Close bubble'}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Action Suggestion Chips */}
            <div className="px-3 py-2 bg-black/20 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? 'Zaplanuj mój dzień' : 'Plan my day')}
                className="px-2.5 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 shrink-0 transition-colors cursor-pointer"
              >
                📅 {language === 'pl' ? 'Plan dnia' : 'Plan day'}
              </button>
              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? 'Dodaj spotkanie z Adamem Zawadzkim we wtorek o 7:30 do 8:30' : 'Add meeting with Adam Zawadzki on Tuesday from 7:30 to 8:30')}
                className="px-2.5 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/20 shrink-0 transition-colors cursor-pointer"
              >
                📆 {language === 'pl' ? 'Spotkanie z Adamem' : 'Adam meeting'}
              </button>
              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? 'Zaznacz nawyk na dzisiaj' : 'Check habit for today')}
                className="px-2.5 py-1 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 shrink-0 transition-colors cursor-pointer"
              >
                🎯 {language === 'pl' ? 'Nawyki' : 'Habits'}
              </button>
              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? 'Przeanalizuj pulę zadań' : 'Analyze task pool')}
                className="px-2.5 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 shrink-0 transition-colors cursor-pointer"
              >
                ⚡ {language === 'pl' ? 'Pula' : 'Pool'}
              </button>
            </div>

            {/* Notification / Action Confirmation Banner */}
            {lastAction && (
              <div className="px-3.5 py-2 bg-emerald-950/40 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
                <span className="font-medium truncate">{lastAction}</span>
                <button
                  type="button"
                  onClick={() => setLastAction(null)}
                  className="text-emerald-400 hover:text-white ml-2 text-xs"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Conversation Messages Container */}
            <div className="flex-1 p-3.5 space-y-3 overflow-y-auto max-h-[340px] scrollbar-thin text-xs text-slate-200">
              {messages.map((msg, idx) => (
                <div
                  key={`msg-${idx}`}
                  className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] p-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-purple-600 text-white rounded-br-xs shadow-md shadow-purple-900/30'
                        : 'bg-[#1e1e24] border border-white/10 text-slate-200 rounded-bl-xs shadow-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </div>
                  </div>
                  {msg.timestamp && (
                    <span className="text-[9px] text-slate-500 mt-1 px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 p-3 bg-[#1e1e24] border border-white/10 rounded-2xl rounded-bl-xs text-slate-400 w-fit">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                  <span className="text-[11px] animate-pulse">SiftAI myśli i przygotowuje odpowiedź...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 border-t border-white/10 bg-[#101013]/90">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={language === 'pl' ? 'Napisz do SiftAI... (np. dodaj spotkanie we wtorek)' : 'Ask SiftAI...'}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 border border-white/10 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || isLoading}
                  className="w-8 h-8 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600 text-white flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-md shadow-purple-950"
                  title={language === 'pl' ? 'Wyślij' : 'Send'}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
