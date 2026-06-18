import React from 'react';
import { useAppStore } from '../store/AppContext';
import { CheckCircle2, Clock, CalendarIcon, Target, Activity, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductivityChart } from '../components/ProductivityChart';
import { PomodoroTimer } from '../components/PomodoroTimer';

export function Dashboard() {
  const { tasks, habits, events, googleEvents, googleToken } = useAppStore();
  const [activeFilterTag, setActiveFilterTag] = React.useState<string | null>(null);

  const predefinedTags = ['Health', 'Work', 'Personal', 'Learning', 'Fitness'];

  const filteredHabits = activeFilterTag ? habits.filter(h => h.tags?.includes(activeFilterTag)) : habits;

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const todayStr = new Date().toISOString().split('T')[0];
  
  const isGoogleConnected = !!googleToken;
  const activeEvents = isGoogleConnected ? googleEvents : events;
  const todaysEvents = activeEvents.filter(e => e.date === todayStr);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dzień dobry';
    if (hour < 18) return 'Dobrego popołudnia';
    return 'Dobry wieczór';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[#75d36e] text-sm font-semibold tracking-wider uppercase">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <h1 className="text-4xl font-display font-bold text-white mt-1 leading-tight">
            {getGreeting()}
          </h1>
          <p className="text-slate-400 mt-2 text-lg">Oto podsumowanie Twojego dnia.</p>
        </div>
        
        {/* Dashboard Habit Tag Filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none w-full md:w-auto">
          <button
            onClick={() => setActiveFilterTag(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
              activeFilterTag === null ? 'bg-[#75d36e] text-[#1a1a1a]' : 'bg-[#161616] border border-[#262626] text-slate-400 hover:text-white'
            }`}
          >
            Wszystkie Tagi
          </button>
          {predefinedTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilterTag(tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeFilterTag === tag ? 'bg-[#75d36e] text-[#1a1a1a]' : 'bg-[#161616] border border-[#262626] text-slate-400 hover:text-white'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: "Zadania do zrobienia", value: activeTasks.length, icon: CheckCircle2, color: "text-blue-400", bg: "bg-blue-400/10" },
          { title: "Dzisiejsze eventy", value: todaysEvents.length, icon: CalendarIcon, color: "text-purple-400", bg: "bg-purple-400/10" },
          { title: "Zwyczaje ukończone", value: filteredHabits.filter(h => h.completedDates.includes(todayStr)).length, icon: Target, color: "text-[#75d36e]", bg: "bg-[#75d36e]/10" },
          { title: "W toku", value: tasks.filter(t => t.status === 'in_progress').length, icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10" },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-3xl flex items-center justify-between group hover:border-[#75d36e]/30 transition-colors duration-300"
          >
            <div>
              <span className="text-slate-400 text-sm font-medium">{stat.title}</span>
              <div className="text-3xl font-display font-bold text-white mt-2">{stat.value}</div>
            </div>
            <div className={`p-4 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
             <Target className="w-5 h-5 text-[#75d36e]" />
             Dzisiejsze Zadania
          </h2>

          {/* Visual Progress Bar for Tasks */}
          {tasks.length > 0 && (() => {
            const completedCount = tasks.filter(t => t.status === 'done').length;
            const totalCount = tasks.length;
            const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
            return (
              <div className="mb-6 p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md relative overflow-hidden">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-slate-400 font-medium font-mono uppercase tracking-wider">Postęp ogólny zadań</span>
                  <span className="text-xs text-[#75d36e] font-bold font-mono">{Math.round(progressPercent)}% ({completedCount}/{totalCount})</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-[#75d36e] to-[#3b82f6] rounded-full shadow-[0_0_10px_rgba(117,211,110,0.3)]"
                  />
                </div>
              </div>
            );
          })()}

          <div className="space-y-3">
            {activeTasks.length === 0 ? (
              <p className="text-slate-500 text-sm">Masz czysto! Żadnych zadań na ten moment.</p>
            ) : (
               activeTasks.slice(0, 5).map(task => (
                <div key={task.id} className="p-4 rounded-xl bg-[#141414] border border-[#222222] hover:border-[#333333] transition-colors relative overflow-hidden">
                  {task.color && (
                    <div 
                      className="absolute left-0 top-0 bottom-0 w-1" 
                      style={{ backgroundColor: task.color }}
                    />
                  )}
                  <div className="font-medium text-white">{task.title}</div>
                  <div className="flex gap-2 mt-2">
                     <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#75d36e]/10 text-[#75d36e]">
                       {task.status.replace('_', ' ')}
                     </span>
                     <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                       {task.priority}
                     </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
             <CalendarIcon className="w-5 h-5 text-purple-400" />
             Agenda (Dzisiaj)
          </h2>
          <div className="space-y-3">
             {todaysEvents.length === 0 ? (
               <p className="text-slate-500 text-sm">Brak zaplanowanych spotkań na dzisiaj.</p>
             ) : (
               todaysEvents.map(ev => (
                 <div key={ev.id} className="p-4 rounded-xl bg-[#141414] border border-[#222222] flex items-start gap-4">
                    <div className="text-slate-400 font-mono text-xs pt-1 shrink-0 w-12">{ev.start_time}</div>
                    <div>
                       <div className="font-medium text-white">{ev.title}</div>
                       <div className="text-xs text-slate-400 mt-1">{ev.type} • {ev.location || 'Brak lokacji'}</div>
                    </div>
                 </div>
               ))
             )}
          </div>
        </section>
      </div>

      <PomodoroTimer />

      {/* Productivity Chart Section */}
      <section className="glass-card rounded-3xl p-6 mb-8">
        <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
           <Activity className="w-5 h-5 text-[#3b82f6]" />
           Produktywność (Ostatnie 7 Dni) {activeFilterTag && `- ${activeFilterTag}`}
        </h2>
        <ProductivityChart tasks={tasks} habits={filteredHabits} />
      </section>
    </div>
  );
}
