import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { Plus, X, Trash2, Milestone, CalendarDays, Flame, Trophy, Activity, Check } from 'lucide-react';
import { subDays, format } from 'date-fns';
import { calculateHabitStats } from '../lib/utils';
import { GenieModal } from '../components/GenieModal';
import { motion, AnimatePresence } from 'motion/react';

export function Habits() {
  const { habits, addHabit, toggleHabit, deleteHabit } = useAppStore();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🧘');
  const [frequency, setFrequency] = useState<'daily' | 'weekly'>('daily');
  const [targetCount, setTargetCount] = useState(1);
  const [color, setColor] = useState('#4ade80');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Filter state
  const [activeFilterTag, setActiveFilterTag] = useState<string | null>(null);

  const predefinedTags = ['Health', 'Work', 'Personal', 'Learning', 'Fitness'];

  const last14Days = Array.from({ length: 14 }).map((_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'));

  const popularEmojis = ['🧘', '📖', '💧', '🏃', '🥦', '✍️', '💻', '🦷', '🛌', '🍎'];
  const popularColors = [
    { code: '#4ade80', label: 'Neon Green' },
    { code: '#60a5fa', label: 'Blue' },
    { code: '#f87171', label: 'Red' },
    { code: '#fbbf24', label: 'Amber' },
    { code: '#4ade80', label: 'Purple' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addHabit({
      name,
      icon,
      frequency,
      target_count: targetCount,
      color,
      tags: selectedTags
    });

    setIsModalOpen(false);
    setName('');
    setIcon('🧘');
    setFrequency('daily');
    setTargetCount(1);
    setColor('#4ade80');
    setSelectedTags([]);
  };

  const handleDelete = (id: string, habitName: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć nawyk: "${habitName}"?`)) {
      deleteHabit(id);
    }
  };

  return (
    <div className="relative space-y-6 animate-in fade-in duration-500 min-h-[calc(100vh-8rem)] pb-12">
      <header className="flex items-center justify-between z-10 relative">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Zwyczaje</h1>
          <p className="text-slate-400 mt-1">Dążenie do perfekcji powtarzalnymi krokami.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#4ade80] hover:bg-[#5bb255] text-[#1a1a1a] px-4 py-2 rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="w-5 h-5" />
          Dodaj zwyczaj
        </button>
      </header>
      
      {/* Progress Tracking */}
      {habits.length > 0 && (
        <div className="glass-card p-6 relative overflow-hidden z-10">
          <div className="flex justify-between items-end mb-3">
            <div>
              <h3 className="text-white font-bold mb-1">Twój dzisiejszy cel</h3>
              <p className="text-slate-400 text-xs">Każdy krok ma znaczenie.</p>
            </div>
            {(() => {
              const today = format(new Date(), 'yyyy-MM-dd');
              const habitsCompletedToday = habits.filter(h => h.completedDates.includes(today)).length;
              const totalHabits = habits.length;
              const dailyProgress = totalHabits > 0 ? (habitsCompletedToday / totalHabits) * 100 : 0;
              return (
                <div className="text-2xl font-display font-bold text-[#4ade80]">
                  {Math.round(dailyProgress)}%
                </div>
              );
            })()}
          </div>
          {(() => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const habitsCompletedToday = habits.filter(h => h.completedDates.includes(today)).length;
            const totalHabits = habits.length;
            const dailyProgress = totalHabits > 0 ? (habitsCompletedToday / totalHabits) * 100 : 0;
            return (
              <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyProgress}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className="h-full bg-[#4ade80] rounded-full shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                />
              </div>
            );
          })()}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none relative z-10">
        <button
          onClick={() => setActiveFilterTag(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
            activeFilterTag === null ? 'bg-[#4ade80] text-[#1a1a1a]' : 'bg-[#161616] border border-[#262626] text-slate-400 hover:text-white'
          }`}
        >
          Wszystkie
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

      <motion.div layout className="space-y-4 relative z-10">
        <AnimatePresence mode="popLayout">
          {(() => {
            const filteredHabits = activeFilterTag ? habits.filter(h => h.tags?.includes(activeFilterTag)) : habits;
            
            if (filteredHabits.length === 0) {
              return (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }} 
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card p-12 text-center text-slate-500"
                >
                  <Milestone className="w-12 h-12 mx-auto stroke-[1.5] opacity-40 mb-3 text-[#4ade80]" />
                  <p>Brak śledzonych nawyków w tej kategorii.</p>
                </motion.div>
              );
            }
            
            return filteredHabits.map(habit => (
              <motion.div 
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                key={habit.id} 
                className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-x-auto group relative overflow-hidden"
              >
                {/* Completion Flash Gradient Overlay */}
                <AnimatePresence>
                  {habit.completedDates.includes(format(new Date(), 'yyyy-MM-dd')) && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 pointer-events-none z-0"
                      style={{
                        background: `radial-gradient(ellipse at right, ${habit.color}15 0%, transparent 60%)`
                      }}
                    />
                  )}
                </AnimatePresence>

                <div className="flex items-start justify-between md:justify-start gap-4 min-w-[250px] relative z-10">
                <div className="flex items-start gap-4">
                  <div 
                    className="w-12 h-12 flex items-center justify-center bg-[#141414] border rounded-xl text-2xl shrink-0"
                    style={{ borderColor: habit.color + '40' }}
                  >
                    {habit.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{habit.name}</h3>
                    <p className="text-slate-400 text-xs capitalize mb-3">{habit.frequency === 'daily' ? 'Codziennie' : 'Co tydzień'}</p>
                    
                    {(() => {
                      const stats = calculateHabitStats(habit.completedDates);
                      return (
                        <div className="flex items-center gap-4 text-[11px] font-mono whitespace-nowrap">
                          <div 
                            className="flex items-center gap-1.5" 
                            title="Obecny streak" 
                            style={{ 
                              color: stats.currentStreak >= 1 ? habit.color : '#64748b',
                              textShadow: stats.currentStreak >= 3 ? `0 0 10px ${habit.color}` : 'none'
                            }}
                          >
                            <motion.div
                              animate={stats.currentStreak >= 3 ? { scale: [1, 1.2, 1], rotate: [0, -10, 10, 0] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                            >
                              <Flame className={`w-3.5 h-3.5 ${stats.currentStreak >= 3 ? 'fill-current' : ''}`} />
                            </motion.div>
                            {stats.currentStreak} dni
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400" title="Najlepszy streak (Rekord)">
                            <Trophy className="w-3.5 h-3.5" />
                            {stats.longestStreak}
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400" title="Ukończenie (Ostatnie 7 dni)">
                            <Activity className="w-3.5 h-3.5" />
                            {stats.completionRate7Days}%
                          </div>
                        </div>
                      );
                    })()}

                    {habit.tags && habit.tags.length > 0 && (
                      <div className="flex gap-2 mt-3">
                        {habit.tags.map(tag => (
                          <span key={tag} className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                  </div>
                </div>
                <button 
                  onClick={() => handleDelete(habit.id, habit.name)}
                  className="md:opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all ml-4 shrink-0"
                  title="Usuń zwyczaj"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 md:mt-0 pt-4 md:pt-0 border-t border-[#222222] md:border-none w-full md:w-auto overflow-hidden">
                <div className="text-[10px] uppercase font-mono tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                  <CalendarDays className="w-3" /> Ostatnie 14 dni (Kliknij, aby odznaczyć)
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {last14Days.map(date => {
                    const isCompleted = habit.completedDates.includes(date);
                    const isToday = date === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <div key={date} className="flex flex-col items-center gap-1">
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => toggleHabit(habit.id, date)}
                          className={`w-8 h-8 rounded-lg border flex items-center justify-center relative overflow-hidden ${
                            isCompleted 
                              ? '' 
                              : 'border-[#333333] hover:border-[#555555] text-transparent'
                          } ${isToday && !isCompleted ? 'border-dashed border-white/40' : ''}`}
                          title={date}
                          style={isCompleted ? { color: habit.color, borderColor: habit.color, backgroundColor: habit.color + '19' } : {}}
                        >
                          <AnimatePresence>
                            {isCompleted && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0 }}
                                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.button>
                        <span className="text-[9px] font-mono text-slate-500">
                          {format(new Date(date), 'dd.MM')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                </div>
              </motion.div>
            ));
          })()}
        </AnimatePresence>
      </motion.div>

      {/* Modal Add Habit */}
      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Nowy nawyk"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Nazwa nawyku</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required
              placeholder="np. Pij 2l wody"
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Wybierz ikonę</label>
            <div className="flex flex-wrap gap-2">
              {popularEmojis.map(emoji => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setIcon(emoji)}
                  className={`w-10 h-10 text-xl flex items-center justify-center rounded-xl transition-all ${
                    icon === emoji 
                      ? 'bg-[#4ade80]/20 border border-[#4ade80] scale-110' 
                      : 'bg-[#161616] border border-[#262626] hover:bg-white/5'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Częstotliwość</label>
              <select 
                value={frequency} 
                onChange={e => setFrequency(e.target.value as 'daily' | 'weekly')}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#4ade80] transition-colors"
              >
                <option value="daily">Codziennie</option>
                <option value="weekly">Co tydzień</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Wybierz kolor</label>
              <div className="flex gap-2 h-full items-center mt-1">
                {popularColors.map(c => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setColor(c.code)}
                    className="w-6 h-6 rounded-full border transition-transform relative"
                    style={{ backgroundColor: c.code, borderColor: color === c.code ? '#ffffff' : 'transparent' }}
                    title={c.label}
                  >
                    {color === c.code && (
                      <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-bold font-sans">✓</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2">
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tagi kategorii</label>
            <div className="flex flex-wrap gap-2">
              {predefinedTags.map(tag => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(prev => prev.filter(t => t !== tag));
                      } else {
                        setSelectedTags(prev => [...prev, tag]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors border ${
                      isSelected 
                        ? 'bg-[#4ade80]/20 border-[#4ade80] text-[#4ade80]' 
                        : 'bg-[#161616] border-[#262626] text-slate-400 hover:text-white'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t border-[#222222] flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#262626] text-slate-300 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm"
            >
              Anuluj
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm"
            >
              Dodaj zwyczaj
            </button>
          </div>
        </form>
      </GenieModal>
    </div>
  );
}

