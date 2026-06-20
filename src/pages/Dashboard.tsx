import React from 'react';
import { useAppStore } from '../store/AppContext';
import { CheckCircle2, Clock, CalendarIcon, Target, Activity, Brain } from 'lucide-react';
import { motion } from 'motion/react';
import { ProductivityChart } from '../components/ProductivityChart';
import { PomodoroTimer } from '../components/PomodoroTimer';

export function Dashboard() {
  const { tasks, habits, events, googleEvents, googleToken, updateTask, toggleHabit } = useAppStore();
  const [activeFilterTag, setActiveFilterTag] = React.useState<string | null>(null);

  const predefinedTags = ['Health', 'Work', 'Personal', 'Learning', 'Fitness'];

  const filteredHabits = activeFilterTag ? habits.filter(h => h.tags?.includes(activeFilterTag)) : habits;

  const activeTasks = tasks.filter(t => t.status !== 'done');
  const todayStr = new Date().toISOString().split('T')[0];
  
  const isGoogleConnected = !!googleToken;
  const activeEvents = isGoogleConnected ? googleEvents : events;
  const todaysEvents = activeEvents.filter(e => e.date === todayStr);

  const focusItems = React.useMemo(() => {
    const items: Array<{
      id: string;
      type: 'task' | 'habit';
      title: string;
      subtitle: string;
      completed: boolean;
      score: number;
      color?: string;
      icon?: string;
    }> = [];

    // 1. Add tasks
    tasks.forEach(t => {
      const isCompletedToday = t.status === 'done' && t.updatedAt?.startsWith(todayStr);
      
      if (t.status !== 'done' || isCompletedToday) {
        let score = 50;
        let priorityLabel = 'Niski';
        if (t.priority === 'urgent') {
          score = 100;
          priorityLabel = 'Pilny!';
        } else if (t.priority === 'high') {
          score = 90;
          priorityLabel = 'Wysoki';
        } else if (t.priority === 'medium') {
          score = 70;
          priorityLabel = 'Średni';
        }

        if (t.due_date === todayStr) {
          score += 20;
        }

        if (isCompletedToday) {
          score -= 50; // push completed to bottom
        }

        items.push({
          id: t.id,
          type: 'task',
          title: t.title,
          subtitle: `Zadanie • ${priorityLabel} priorytet${t.due_date === todayStr ? ' • Na dziś' : ''}`,
          completed: isCompletedToday,
          score,
          color: t.color || '#4ade80',
        });
      }
    });

    // 2. Add habits
    habits.forEach(h => {
      const isCompletedToday = h.completedDates.includes(todayStr);
      let score = 80;
      
      if (isCompletedToday) {
        score -= 50; // push completed to bottom
      }

      items.push({
        id: h.id,
        type: 'habit',
        title: h.name,
        subtitle: `Nawyk • Częstotliwość: ${h.frequency === 'daily' ? 'Codziennie' : 'Tygodniowo'}`,
        completed: isCompletedToday,
        score,
        icon: h.icon,
        color: h.color || '#4ade80',
      });
    });

    items.sort((a, b) => b.score - a.score);
    return items.slice(0, 3);
  }, [tasks, habits, todayStr]);

  const handleToggleFocusItem = (item: typeof focusItems[0]) => {
    if (item.type === 'task') {
      updateTask(item.id, { status: item.completed ? 'todo' : 'done' });
    } else {
      toggleHabit(item.id, todayStr);
    }
  };

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
          <span className="text-[#4ade80] text-sm font-semibold tracking-wider uppercase">{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
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
              activeFilterTag === null ? 'bg-[#4ade80] text-[#1a1a1a]' : 'bg-[#161616] border border-[#262626] text-slate-400 hover:text-white'
            }`}
          >
            Wszystkie Tagi
          </button>
          {predefinedTags.map(tag => (
            <button
              key={tag}
              onClick={() => setActiveFilterTag(tag)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                activeFilterTag === tag ? 'bg-[#4ade80] text-[#1a1a1a]' : 'bg-[#161616] border border-[#262626] text-slate-400 hover:text-white'
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
          { title: "Zwyczaje ukończone", value: filteredHabits.filter(h => h.completedDates.includes(todayStr)).length, icon: Target, color: "text-[#4ade80]", bg: "bg-[#4ade80]/10" },
          { title: "W toku", value: tasks.filter(t => t.status === 'in_progress').length, icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10" },
        ].map((stat, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 rounded-3xl flex items-center justify-between group hover:border-[#4ade80]/30 transition-colors duration-300"
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

      {/* Today's Focus Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 rounded-3xl"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <Brain className="w-5 h-5 text-[#4ade80]" />
              Skupienie na dziś
            </h2>
            <p className="text-sm text-slate-400 mt-1">Niezbędne kroki, aby dzisiejszy dzień był udany (Top 3 priorytety).</p>
          </div>
          {focusItems.length > 0 && (
            <span className="text-xs font-mono font-bold text-[#4ade80] bg-[#4ade80]/10 px-3 py-1.5 rounded-full border border-[#4ade80]/20 self-start sm:self-center">
              Ukończono: {focusItems.filter(i => i.completed).length}/{focusItems.length}
            </span>
          )}
        </div>

        {focusItems.length === 0 ? (
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-slate-400 text-sm">Wszystkie kluczowe zadania i nawyki na dziś zostały zaliczone! Czas na odpoczynek! 🎉</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {focusItems.map(item => (
              <div 
                key={`${item.type}-${item.id}`} 
                className={`flex items-center gap-3 p-4 rounded-xl bg-[#141414] border hover:border-[#4ade80]/30 transition-all relative overflow-hidden group ${
                  item.completed ? 'border-[#222222] opacity-75' : 'border-[#222222]'
                }`}
              >
                {item.color && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1 transition-all" 
                    style={{ backgroundColor: item.color }}
                  />
                )}
                
                <button 
                  onClick={() => handleToggleFocusItem(item)}
                  aria-label={item.completed ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}
                  className={`shrink-0 flex items-center justify-center w-5 h-5 rounded-md border transition-all duration-200 focus:outline-none ${
                    item.completed 
                      ? 'bg-[#4ade80] border-[#4ade80] text-[#1a1a1a]' 
                      : 'border-slate-600 hover:border-[#4ade80]'
                  }`}
                >
                  {item.completed && (
                    <svg className="w-3.5 h-3.5 stroke-current" fill="none" viewBox="0 0 24 24" strokeWidth="3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                <div 
                  className="flex-1 min-w-0 cursor-pointer select-none" 
                  onClick={() => handleToggleFocusItem(item)}
                >
                  <span className={`block truncate text-sm font-semibold ${item.completed ? 'text-slate-500 line-through' : 'text-white'}`}>
                    {item.icon && <span className="mr-1.5">{item.icon}</span>}
                    {item.title}
                  </span>
                  <span className="block truncate text-[10px] text-slate-500 font-mono mt-0.5">
                    {item.subtitle}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section className="glass-card rounded-3xl p-6">
          <h2 className="text-xl font-display font-bold text-white mb-6 flex items-center gap-2">
             <Target className="w-5 h-5 text-[#4ade80]" />
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
                  <span className="text-xs text-[#4ade80] font-bold font-mono">{Math.round(progressPercent)}% ({completedCount}/{totalCount})</span>
                </div>
                <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="h-full bg-[#4ade80] rounded-full shadow-[0_0_10px_rgba(74,222,128,0.2)]"
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
                     <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#4ade80]/10 text-[#4ade80]">
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
           <Activity className="w-5 h-5 text-[#4ade80]" />
           Produktywność (Ostatnie 7 Dni) {activeFilterTag && `- ${activeFilterTag}`}
        </h2>
        <ProductivityChart tasks={tasks} habits={filteredHabits} />
      </section>
    </div>
  );
}
