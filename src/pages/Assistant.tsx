import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Bot, Sparkles, Send, BrainCircuit, Activity, CalendarDays, LineChart } from 'lucide-react';
import { motion } from 'motion/react';
import { calculateHabitStats } from '../lib/utils';
import { format, subDays } from 'date-fns';

export function Assistant() {
  const { tasks, habits } = useAppStore();
  const [query, setQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user', text: string }[]>([
    {
      role: 'ai',
      text: 'Hej! Jestem Twoim osobistym asystentem produktywności. Mogę przeanalizować Twoje nawyki, podsumować postępy z tego tygodnia lub pomóc zaplanować kolejne wpisy. W czym mogę pomóc?'
    }
  ]);

  // Provide initial static analysis context
  const getBasicAnalysisText = () => {
    let summaryText = 'Analizuję Twoje dane... \n\n';
    
    // Check habits
    if (habits.length > 0) {
      const bestHabit = [...habits].sort((a, b) => calculateHabitStats(b.completedDates).currentStreak - calculateHabitStats(a.completedDates).currentStreak)[0];
      const stats = calculateHabitStats(bestHabit.completedDates);
      if (stats.currentStreak > 0) {
        summaryText += `🔥 Zauważyłem świetną passę w nawyku "${bestHabit.name}" (${stats.currentStreak} dni z rzędu!). Oby tak dalej.\n\n`;
      }
    }

    const tasksCompleted = tasks.filter(t => t.status === 'done').length;
    const tasksPending = tasks.filter(t => t.status !== 'done').length;

    summaryText += `Zadania: Masz ukończone ${tasksCompleted} zadań i ${tasksPending} czeka na realizację.\nCzego dowiedzieć się więcej? (Pamiętaj, że obecnie jestem w trybie DEMO).`;
    return summaryText;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userMessage = query.trim();
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsTyping(true);

    // Placeholder AI response simulation
    setTimeout(() => {
      let responseText = getBasicAnalysisText();
      
      if (userMessage.toLowerCase().includes('tydzień') || userMessage.toLowerCase().includes('plan')) {
        responseText = 'Z punktu widzenia planowania, sugeruję przydzielenie maksymalnie 3 priorytetów dziennie, by nie stracić płynności w działaniu.';
      }

      setMessages(prev => [...prev, { role: 'ai', text: responseText }]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-display font-bold text-white flex items-center gap-3">
          <Bot className="w-8 h-8 text-[#75d36e]" />
          AI Asystent
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Twój osobisty doradca ds. zarządzania czasem i nawykami.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Section */}
        <div className="lg:col-span-2 flex flex-col h-[600px]">
          <div className="glass-card rounded-3xl flex flex-col h-full overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messages.map((m, idx) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={idx} 
                  className={`flex gap-4 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    m.role === 'ai' ? 'bg-[#75d36e]/20 text-[#75d36e]' : 'bg-[#161616] border border-[#262626] text-slate-300'
                  }`}>
                    {m.role === 'ai' ? <Bot className="w-4 h-4" /> : <div className="w-4 h-4 bg-white/20 rounded-full" />}
                  </div>
                  <div className={`p-4 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap ${
                    m.role === 'ai' ? 'bg-[#161616] border border-[#262626] text-slate-300' : 'bg-[#75d36e] text-[#1a1a1a] font-medium'
                  }`}>
                    {m.text}
                  </div>
                </motion.div>
              ))}
              
              {isTyping && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-[#75d36e]/20 text-[#75d36e]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-[#161616] border border-[#262626] text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-slate-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </div>

            <div className="p-4 border-t border-[#222222] bg-[#111111]">
              <form onSubmit={handleSubmit} className="relative">
                <input 
                  type="text" 
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Zapytaj o analizę tygodnia lub rady na temat nawyków..."
                  className="w-full bg-[#161616] border border-[#262626] rounded-xl pl-4 pr-12 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                />
                <button 
                  type="submit"
                  disabled={!query.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-400 hover:text-[#75d36e] hover:bg-[#75d36e]/10 transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Quick Insights Sidebar */}
        <div className="space-y-4">
          <div className="glass-card rounded-3xl p-6">
            <h3 className="text-sm font-mono uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#75d36e]" />
              Szybkie akcje
            </h3>
            <div className="space-y-2">
              <button onClick={() => setQuery("Jak wygląda moje wykonanie zadań w tym tygodniu?")} className="w-full text-left p-3 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#75d36e]/50 text-sm text-slate-300 transition-colors">
                📊 Podsumuj mój tydzień
              </button>
              <button onClick={() => setQuery("Gdzie widzę największe luki w nawykach?")} className="w-full text-left p-3 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#75d36e]/50 text-sm text-slate-300 transition-colors">
                🎯 Analiza luk w nawykach
              </button>
              <button onClick={() => setQuery("Zaproponuj plan działania na jutro.")} className="w-full text-left p-3 rounded-xl bg-[#161616] border border-[#262626] hover:border-[#75d36e]/50 text-sm text-slate-300 transition-colors">
                📅 Zaplanuj mi jutro
              </button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-[#75d36e]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <BrainCircuit className="w-8 h-8 text-[#75d36e] mb-4 opacity-75" />
            <h3 className="text-white font-bold mb-2">Automatyzacja</h3>
            <p className="text-slate-400 text-sm">W przyszłości asystent zyska połączenie z Twoim Google Calendar, aby autonomicznie sugerować bloki czasu na rozwój osobisty i przypominać o celach z Knowledge Base.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
