import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/AppContext';
import { Bot, Sparkles, Send, BrainCircuit, Activity, CalendarDays, Zap, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { askSiftAIAssistant, AI_MODEL_NAME, AI_MODEL_ID, AIMessage } from '../lib/aiService';

export function Assistant() {
  const { tasks, habits, language, t } = useAppStore();
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const initialGreeting = language === 'pl'
    ? `Hej! Jestem Twoim inteligentnym asystentem zasilanym przez model **${AI_MODEL_NAME}**.\n\nMam wgląd w Twoją bieżącą bazę: widzę pulę zadań ogólnych, zadania zaplanowane w osi czasu 05:00–22:00 oraz aktywne nawyki. W czym mogę Ci pomóc?`
    : `Hello! I am your intelligent productivity assistant powered by **${AI_MODEL_NAME}**.\n\nI have real-time access to your workspace: your general task pool, timeline schedule (05:00–22:00), and active habit streaks. How can I assist you today?`;

  const [messages, setMessages] = useState<AIMessage[]>([
    {
      role: 'assistant',
      content: initialGreeting,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelBadge: AI_MODEL_NAME
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (userPrompt?: string) => {
    const textToSend = userPrompt || query;
    if (!textToSend.trim() || isTyping) return;

    const userMessage: AIMessage = {
      role: 'user',
      content: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsTyping(true);

    try {
      const reply = await askSiftAIAssistant(
        textToSend.trim(),
        { tasks, habits, language },
        messages
      );

      const aiMessage: AIMessage = {
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelBadge: AI_MODEL_NAME
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch {
      const fallbackReply = language === 'pl'
        ? `Przepraszam, wystąpił chwilowy problem z odpowiedzią modelu ${AI_MODEL_NAME}. Spróbuj ponownie za moment.`
        : `Sorry, a temporary issue occurred with model ${AI_MODEL_NAME}. Please try again shortly.`;

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelBadge: AI_MODEL_NAME
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSend();
  };

  const poolCount = tasks.filter(t => !t.due_date || t.due_date.trim() === '').length;
  const scheduledCount = tasks.filter(t => !!t.due_date && t.due_date.trim() !== '').length;

  return (
    <div className="max-w-5xl mx-auto font-sans pb-12">
      {/* Header with glowing AI Model Badge */}
      <header className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#4ade80]/15 border border-[#4ade80]/40 flex items-center justify-center text-[#4ade80] shadow-[0_0_20px_rgba(74,222,128,0.2)]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white flex items-center gap-3">
                {t('assistant.title')}
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
                {t('assistant.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Model Spec Badge */}
        <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/[0.04] border border-white/10 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ade80]"></span>
          </span>
          <div className="text-xs">
            <span className="text-slate-400 block text-[10px] leading-tight">Model AI</span>
            <span className="text-[#4ade80] font-bold font-mono tracking-wide">{AI_MODEL_NAME}</span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 font-semibold ml-1">
            Aktywny
          </span>
        </div>
      </header>

      {/* Main Grid: Chat + Context Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chat Section */}
        <div className="lg:col-span-2 flex flex-col h-[640px]">
          <div className="glass-card rounded-3xl flex flex-col h-full overflow-hidden border border-white/10 bg-[#141416]/90 shadow-2xl">
            
            {/* Top Chat Info Bar */}
            <div className="px-5 py-3 border-b border-white/5 bg-white/[0.02] flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>Silnik: <strong className="text-white">{AI_MODEL_NAME}</strong> ({AI_MODEL_ID})</span>
              </div>
              <div className="flex items-center gap-3">
                <span>Pula: <strong className="text-emerald-400">{poolCount}</strong></span>
                <span>Kalendarz: <strong className="text-blue-400">{scheduledCount}</strong></span>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {messages.map((m, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  key={idx}
                  className={`flex gap-3.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    m.role === 'assistant' 
                      ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30 shadow-sm' 
                      : 'bg-[#252528] border border-white/10 text-slate-200'
                  }`}>
                    {m.role === 'assistant' ? <Bot className="w-4 h-4" /> : <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                  </div>

                  <div className={`flex flex-col space-y-1 max-w-[86%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                    {m.modelBadge && (
                      <span className="text-[10px] font-mono text-[#4ade80]/80 font-bold px-1">
                        {m.modelBadge}
                      </span>
                    )}

                    <div className={`p-4 rounded-2xl text-sm ${
                      m.role === 'assistant'
                        ? 'bg-[#1c1c1f] border border-white/10 text-slate-200 leading-relaxed shadow-sm'
                        : 'bg-[#4ade80] text-[#0a120d] font-semibold leading-relaxed shadow-[0_0_15px_rgba(74,222,128,0.25)]'
                    }`}>
                      {m.role === 'assistant' ? (
                        <div className="markdown-body space-y-2 [&_h3]:font-bold [&_h3]:text-white [&_h3]:text-base [&_h3]:mt-2 [&_h3]:mb-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-[#4ade80] [&_p]:leading-relaxed">
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {m.content}
                          </Markdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>

                    {m.timestamp && (
                      <span className="text-[10px] text-slate-500 px-1 font-mono">
                        {m.timestamp}
                      </span>
                    )}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3.5"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/30">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3.5 rounded-2xl bg-[#1c1c1f] border border-white/10 text-slate-300 flex items-center gap-2">
                    <span className="text-xs text-[#4ade80] font-mono font-medium">{AI_MODEL_NAME} pisze...</span>
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <div className="p-3 sm:p-4 border-t border-white/10 bg-[#111113]">
              <form onSubmit={handleSubmit} className="relative flex items-center">
                <input
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder={t('assistant.inputPlaceholder')}
                  disabled={isTyping}
                  className="w-full bg-[#1c1c20] border border-white/15 rounded-2xl pl-4 pr-12 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#4ade80] focus:ring-1 focus:ring-[#4ade80] transition-all"
                />
                <button
                  type="submit"
                  disabled={!query.trim() || isTyping}
                  className="absolute right-2 p-2 rounded-xl text-[#0a120d] bg-[#4ade80] hover:bg-[#3ec470] transition-all disabled:opacity-30 disabled:bg-slate-700 disabled:text-slate-400 cursor-pointer"
                  title="Wyślij zapytanie do SiftAI"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        </div>

        {/* Sidebar: Quick Actions & Live Model Status */}
        <div className="space-y-4">
          
          {/* Quick Prompts */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 bg-[#141416]/90 space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#4ade80]" />
              <span>Szybkie akcje SiftAI</span>
            </h3>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? "Przeanalizuj moją pulę zadań i wskaż co zaplanować." : "Analyze my task pool and tell me what to schedule.")}
                disabled={isTyping}
                className="w-full text-left p-3 rounded-xl bg-[#1c1c20] border border-white/5 hover:border-[#4ade80]/50 hover:bg-[#232328] text-xs font-medium text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base">📊</span>
                <span>{language === 'pl' ? 'Przeanalizuj pulę zadań' : 'Analyze task pool'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? "Zaproponuj harmonogram dnia na osi czasu (05:00 - 22:00)." : "Propose a timeline daily schedule (05:00 - 22:00).")}
                disabled={isTyping}
                className="w-full text-left p-3 rounded-xl bg-[#1c1c20] border border-white/5 hover:border-[#4ade80]/50 hover:bg-[#232328] text-xs font-medium text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base">📅</span>
                <span>{language === 'pl' ? 'Ułóż harmonogram (05:00 - 22:00)' : 'Schedule timeline (05:00-22:00)'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? "Które zadanie z puli powinienem zrobić jako pierwsze?" : "Which task from the pool should I do first?")}
                disabled={isTyping}
                className="w-full text-left p-3 rounded-xl bg-[#1c1c20] border border-white/5 hover:border-[#4ade80]/50 hover:bg-[#232328] text-xs font-medium text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base">⚡</span>
                <span>{language === 'pl' ? 'Wskaż zadanie priorytetowe' : 'Identify highest priority task'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleSend(language === 'pl' ? "Jak wygląda moja passa nawyków i regularność?" : "How is my habit streak and consistency?")}
                disabled={isTyping}
                className="w-full text-left p-3 rounded-xl bg-[#1c1c20] border border-white/5 hover:border-[#4ade80]/50 hover:bg-[#232328] text-xs font-medium text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
              >
                <span className="text-base">🎯</span>
                <span>{language === 'pl' ? 'Raport nawyków i passy' : 'Habit & streak report'}</span>
              </button>
            </div>
          </div>

          {/* Model Specification Card */}
          <div className="glass-card rounded-3xl p-5 border border-white/10 bg-[#141416]/90 relative overflow-hidden space-y-3">
            <div className="flex items-center gap-2 text-[#4ade80]">
              <BrainCircuit className="w-5 h-5" />
              <span className="font-bold text-sm text-white">{AI_MODEL_NAME}</span>
            </div>

            <p className="text-slate-400 text-xs leading-relaxed">
              {language === 'pl'
                ? `Domyślny model sztucznej inteligencji odpowiedzialny za całą aplikację. Integruje pulę ogólną, harmonogramowanie w osi czasu oraz analitykę nawyków.`
                : `The primary AI model powering Base44. Orchestrates task pool triage, 05:00-22:00 timeline optimization, and habit streak analytics.`}
            </p>

            <div className="pt-2 border-t border-white/5 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Wersja modelu:</span>
                <span className="font-mono text-white text-[11px]">{AI_MODEL_ID}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Pula zadań:</span>
                <span className="text-[#4ade80] font-semibold">{poolCount} zadań</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Nawyki:</span>
                <span className="text-white font-semibold">{habits.length} aktywnych</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
