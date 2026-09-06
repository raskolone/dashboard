import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Sparkles, 
  Bot, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Send, 
  X, 
  ChevronRight, 
  AlertCircle, 
  Layers, 
  CalendarDays, 
  Sun, 
  ArrowRight,
  MessageSquare,
  Compass,
  Check
} from 'lucide-react';
import { format, addDays, isSameDay, parseISO } from 'date-fns';
import { pl } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askLunaAssistant, AI_MODEL_NAME, AIMessage } from '../lib/aiService';
import { getLocalDateStr } from '../lib/utils';
import { Task } from '../types';

export function LunaBriefingCard({ onOpenPool }: { onOpenPool?: () => void }) {
  const { tasks, habits, googleEvents, language, addTask } = useAppStore();

  const [isChatModalOpen, setIsChatModalOpen] = useState(false);
  const [chatQuery, setChatQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateStr(todayDate), [todayDate]);
  const tomorrowDate = useMemo(() => addDays(todayDate, 1), [todayDate]);
  const tomorrowStr = useMemo(() => getLocalDateStr(tomorrowDate), [tomorrowDate]);
  const isSunday = useMemo(() => todayDate.getDay() === 0, [todayDate]);

  // Today's stats
  const todayTasks = useMemo(() => tasks.filter(t => t.due_date === todayStr), [tasks, todayStr]);
  const todayDone = useMemo(() => todayTasks.filter(t => t.status === 'done').length, [todayTasks]);
  const todayPending = useMemo(() => todayTasks.filter(t => t.status !== 'done').length, [todayTasks]);
  const todayGoogleEvents = useMemo(() => googleEvents.filter(e => e.date === todayStr), [googleEvents, todayStr]);

  // Tomorrow's stats
  const tomorrowTasks = useMemo(() => tasks.filter(t => t.due_date === tomorrowStr), [tasks, tomorrowStr]);
  const tomorrowGoogleEvents = useMemo(() => googleEvents.filter(e => e.date === tomorrowStr), [googleEvents, tomorrowStr]);

  // Next 7 days stats (for Sunday weekly forecast)
  const next7DaysStats = useMemo(() => {
    let count = 0;
    const next7DaysStr: string[] = [];
    for (let i = 0; i < 7; i++) {
      next7DaysStr.push(getLocalDateStr(addDays(todayDate, i)));
    }
    count = tasks.filter(t => t.due_date && next7DaysStr.includes(t.due_date)).length;
    return { count, days: next7DaysStr };
  }, [tasks, todayDate]);

  // Pool tasks count that need scheduling
  const poolCount = useMemo(() => {
    return tasks.filter(t => !t.due_date || t.due_date.trim() === '' || t.in_pool).length;
  }, [tasks]);

  // Chat conversation state
  const initialGreeting = useMemo(() => {
    return language === 'pl'
      ? `Cześć! Jestem **${AI_MODEL_NAME}**, Twój asystent produktywności.\n\nWidzę wszystkie Twoje zadania, pulę (${poolCount} zadań do posortowania) oraz zsynchronizowany kalendarz. W czym mogę Ci pomóc? Mogę ułożyć harmonogram dnia, posegregować pulę zadań lub przygotować plan działania.`
      : `Hello! I am **${AI_MODEL_NAME}**, your productivity advisor.\n\nI see all your tasks, your general pool (${poolCount} tasks waiting to be sorted), and your timeline. How can I assist you right now?`;
  }, [language, poolCount]);

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelBadge: AI_MODEL_NAME
    }
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatQuery;
    if (!textToSend.trim() || isTyping) return;

    const userMsg: AIMessage = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setChatQuery('');
    setIsTyping(true);

    try {
      const reply = await askLunaAssistant(
        textToSend.trim(),
        { tasks, habits, language },
        messages
      );

      const aiMsg: AIMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelBadge: AI_MODEL_NAME
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: language === 'pl' 
            ? `Wystąpił problem z połączeniem z ${AI_MODEL_NAME}. Spróbuj ponownie.` 
            : `Could not connect to ${AI_MODEL_NAME}. Please try again.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelBadge: AI_MODEL_NAME
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* Executive Briefing Banner Card */}
      <div className="glass-card rounded-[22px] border border-white/10 bg-gradient-to-r from-[#141419]/90 via-[#181822]/90 to-[#121217]/90 p-4 sm:p-5 backdrop-blur-xl shadow-xl relative overflow-hidden">
        
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-56 h-56 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Left section: Model Badge + Dynamic Summary */}
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>{AI_MODEL_NAME}</span>
              </div>

              <span className="text-xs text-slate-400 font-medium">
                {language === 'pl' ? 'Inteligentne podsumowanie dnia' : 'Daily Intelligence Briefing'}
              </span>

              {isSunday && (
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold flex items-center gap-1">
                  <Sun className="w-3 h-3 text-amber-400" />
                  {language === 'pl' ? 'Niedziela • Plan na nadchodzący tydzień' : 'Sunday • Weekly Forecast'}
                </span>
              )}
            </div>

            {/* Structured Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
              
              {/* 1. Today's summary */}
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>{language === 'pl' ? 'Dzisiaj' : 'Today'}</span>
                </div>
                <p className="text-xs text-slate-200">
                  {todayTasks.length === 0 && todayGoogleEvents.length === 0 ? (
                    language === 'pl' ? 'Brak zaplanowanych zadań na dziś.' : 'No tasks scheduled for today.'
                  ) : (
                    language === 'pl' ? (
                      <>
                        <span className="font-bold text-emerald-400">{todayDone}</span> zrobione,{' '}
                        <span className="font-bold text-white">{todayPending}</span> do zrobienia
                        {todayGoogleEvents.length > 0 && (
                          <span className="text-blue-300"> • {todayGoogleEvents.length} spotkań</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-emerald-400">{todayDone}</span> done,{' '}
                        <span className="font-bold text-white">{todayPending}</span> pending
                        {todayGoogleEvents.length > 0 && (
                          <span className="text-blue-300"> • {todayGoogleEvents.length} events</span>
                        )}
                      </>
                    )
                  )}
                </p>
              </div>

              {/* 2. Tomorrow's preview */}
              <div className="p-2.5 rounded-xl bg-black/30 border border-white/5">
                <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium mb-1">
                  <Calendar className="w-3.5 h-3.5 text-purple-400" />
                  <span>{language === 'pl' ? 'Jutro' : 'Tomorrow'}</span>
                </div>
                <p className="text-xs text-slate-200">
                  {tomorrowTasks.length === 0 && tomorrowGoogleEvents.length === 0 ? (
                    language === 'pl' ? 'Jutro czysty kalendarz.' : 'Clear schedule tomorrow.'
                  ) : (
                    language === 'pl' ? (
                      <>
                        <span className="font-bold text-purple-300">{tomorrowTasks.length}</span> zadań zaplanowanych
                        {tomorrowGoogleEvents.length > 0 && (
                          <span className="text-blue-300"> • {tomorrowGoogleEvents.length} spotkań</span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="font-bold text-purple-300">{tomorrowTasks.length}</span> tasks scheduled
                        {tomorrowGoogleEvents.length > 0 && (
                          <span className="text-blue-300"> • {tomorrowGoogleEvents.length} events</span>
                        )}
                      </>
                    )
                  )}
                </p>
              </div>

              {/* 3. Pool alert or Sunday forecast */}
              <div className={`p-2.5 rounded-xl border ${
                isSunday 
                  ? 'bg-amber-950/20 border-amber-500/20' 
                  : poolCount > 0 
                    ? 'bg-purple-950/20 border-purple-500/20' 
                    : 'bg-black/30 border-white/5'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                  {isSunday ? (
                    <>
                      <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-amber-300">{language === 'pl' ? 'Tydzień przed Tobą' : 'Week Ahead'}</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-purple-300">{language === 'pl' ? 'Pula zadań' : 'Task Pool'}</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-slate-200">
                  {isSunday ? (
                    language === 'pl' 
                      ? `W nadchodzącym tygodniu masz zaplanowane ${next7DaysStats.count} zadań.`
                      : `You have ${next7DaysStats.count} tasks scheduled for the coming week.`
                  ) : (
                    poolCount > 0 ? (
                      language === 'pl' 
                        ? <>W puli znajduje się <span className="font-bold text-amber-300">{poolCount} zadań</span> wymagających posortowania.</>
                        : <>You have <span className="font-bold text-amber-300">{poolCount} tasks</span> in the pool to sort.</>
                    ) : (
                      language === 'pl' ? 'Pula ogólna jest pusta - wszystko rozplanowane!' : 'General pool is empty - all scheduled!'
                    )
                  )}
                </p>
              </div>

            </div>
          </div>

          {/* Right section: Interactive Trigger Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              onClick={() => setIsChatModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium text-xs sm:text-sm shadow-md hover:shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <Bot className="w-4 h-4 text-purple-200" />
              <span>{language === 'pl' ? 'Porozmawiaj z Luną' : 'Ask Luna AI'}</span>
              <ArrowRight className="w-3.5 h-3.5 text-purple-300" />
            </button>
          </div>

        </div>
      </div>

      {/* FULL LUNA ASSISTANT INTERACTIVE CHAT MODAL */}
      <AnimatePresence>
        {isChatModalOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-2 sm:p-4 text-white font-sans">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
              onClick={() => setIsChatModalOpen(false)}
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 15 }} 
              animate={{ scale: 1, opacity: 1, y: 0 }} 
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-2xl bg-[#141419] border border-white/15 rounded-[26px] shadow-2xl z-10 flex flex-col h-[85vh] max-h-[700px] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{AI_MODEL_NAME}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30">
                        {language === 'pl' ? 'Aktywny' : 'Active'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      {language === 'pl' ? 'Inteligentny asystent planowania i zadań' : 'Intelligent task & schedule assistant'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsChatModalOpen(false)}
                  className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick suggestion chips */}
              <div className="px-5 py-2.5 bg-black/30 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto">
                {[
                  { label: language === 'pl' ? '⚡ Ułóż plan na dziś' : '⚡ Plan my day', prompt: language === 'pl' ? 'Ułóż dla mnie optymalny harmonogram na dzisiejszy dzień bazując na zadaniach i osi czasu.' : 'Create an optimal schedule for today based on my tasks.' },
                  { label: language === 'pl' ? '📦 Posortuj pulę zadań' : '📦 Sort pool tasks', prompt: language === 'pl' ? 'Przeanalizuj moją pulę zadań i powiedz, które powinienem zrealizować w pierwszej kolejności i w jakich dniach.' : 'Analyze my task pool and recommend priorities.' },
                  { label: language === 'pl' ? '🗓️ Zapowiedź tygodnia' : '🗓️ Weekly preview', prompt: language === 'pl' ? 'Przedstaw mi podsumowanie i zapowiedź nadchodzącego tygodnia.' : 'Give me a forecast and summary for the upcoming week.' }
                ].map(chip => (
                  <button
                    key={chip.label}
                    onClick={() => handleSendMessage(chip.prompt)}
                    className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-[11px] font-medium whitespace-nowrap cursor-pointer transition-colors"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((m, idx) => (
                  <div 
                    key={idx}
                    className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      m.role === 'user' 
                        ? 'bg-purple-600 text-white rounded-br-none shadow-md' 
                        : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-none'
                    }`}>
                      <div className="prose prose-invert prose-xs max-w-none">
                        <Markdown remarkPlugins={[remarkGfm]}>
                          {m.content}
                        </Markdown>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1.5 block text-right font-mono">
                        {m.timestamp}
                      </span>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-none p-3 flex items-center gap-2 text-xs text-slate-400">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                      <span>{language === 'pl' ? `${AI_MODEL_NAME} analizuje dane...` : `${AI_MODEL_NAME} is thinking...`}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="p-4 border-t border-white/10 bg-black/40">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={chatQuery}
                    onChange={(e) => setChatQuery(e.target.value)}
                    placeholder={language === 'pl' ? `Zapytaj ${AI_MODEL_NAME} o zadania, priorytety lub harmonogram...` : `Ask ${AI_MODEL_NAME} anything about tasks or schedules...`}
                    className="flex-1 px-4 py-2.5 bg-black/50 border border-white/15 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500"
                  />
                  <button
                    type="submit"
                    disabled={!chatQuery.trim() || isTyping}
                    className="p-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
