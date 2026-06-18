import React, { useState, useEffect } from 'react';
import { PlayCircle, PauseCircle, RotateCcw, Target, Settings, Brain, Minimize2, Maximize2, Square } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GenieModal } from './GenieModal';
import { ParticleBackground } from './ParticleBackground';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export function PomodoroTimer() {
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('pomodoro_settings_m_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
      sessionsBeforeLongBreak: 4
    };
  });

  useEffect(() => {
    localStorage.setItem('pomodoro_settings_m_v1', JSON.stringify(settings));
  }, [settings]);

  const [mode, setMode] = useState<TimerMode>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(settings.pomodoro * 60);
  const [isActive, setIsActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  // Deep Focus modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    let interval: number;

    if (isActive && timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      handleComplete();
    }

    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const toggleTimer = () => {
    if (!isActive) {
      setIsActive(true);
      setIsFullscreen(true);
    } else {
      setIsActive(false);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    
    if (mode === 'pomodoro') {
      const newSessionCount = sessionCount + 1;
      setSessionCount(newSessionCount);
      
      if (newSessionCount % settings.sessionsBeforeLongBreak === 0) {
        switchMode('longBreak');
      } else {
        switchMode('shortBreak');
      }
    } else {
      switchMode('pomodoro');
    }
  };

  const switchMode = (newMode: TimerMode) => {
    setMode(newMode);
    // newMode time setting converted to seconds
    setTimeLeft(settings[newMode] * 60);
    setIsActive(false);
  };

  const resetTimer = () => {
    setTimeLeft(settings[mode] * 60);
    setIsActive(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = settings[mode] * 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  
  // SVG Ring properties
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleSettingChange = (key: keyof typeof settings, val: string) => {
    const num = parseInt(val) || 1;
    setSettings((prev: typeof settings) => {
      const next = { ...prev, [key]: num };
      // If we are currently in the mode being changed and the timer is not running
      // we can optionally update timeLeft immediately. For simplicity, just update settings.
      return next;
    });
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      {/* Vibrant Atmospheric Background for Pomodoro */}
      <div className="absolute inset-0 z-[-1] pointer-events-none opacity-40 dark:opacity-50 overflow-hidden dark:mix-blend-screen" style={{ willChange: 'transform' }}>
        <motion.div 
          animate={{ x: [0, -20, 0], y: [0, 10, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] right-[-10%] w-[300px] h-[300px] rounded-full blur-[60px]"
          style={{ willChange: 'transform', background: mode === 'pomodoro' ? '#75d36e' : mode === 'shortBreak' ? '#3b82f6' : '#a855f7' }}
        />
        <motion.div 
          animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear", delay: 1 }}
          className="absolute bottom-[-20%] left-[-10%] w-[250px] h-[250px] rounded-full blur-[60px]"
          style={{ willChange: 'transform', background: mode === 'pomodoro' ? '#3b82f6' : mode === 'shortBreak' ? '#75d36e' : '#ec4899' }}
        />
      </div>

      {/* Background progress indicator fallback */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none transition-all duration-1000 mix-blend-overlay"
        style={{
          background: `radial-gradient(circle at center, ${
             mode === 'pomodoro' ? '#75d36e' : mode === 'shortBreak' ? '#3b82f6' : '#a855f7'
          } ${100 - progress}%, transparent 100%)`
        }}
      />
      
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
           <Brain className="w-5 h-5 text-[#a855f7]" />
           Timer Focus
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsFullscreen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Focus Mode"
          >
            <Maximize2 className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title="Deep Focus Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex justify-center gap-2 mb-8 bg-[#161616] p-1 rounded-xl border border-[#262626] mx-auto max-w-fit">
        <button 
          onClick={() => switchMode('pomodoro')}
          className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
            mode === 'pomodoro' ? 'bg-[#75d36e] text-[#1a1a1a]' : 'text-slate-400 hover:text-white'
          }`}
        >
          Pomodoro
        </button>
        <button 
          onClick={() => switchMode('shortBreak')}
          className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
            mode === 'shortBreak' ? 'bg-[#3b82f6] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Przerwa (5m)
        </button>
        <button 
          onClick={() => switchMode('longBreak')}
          className={`px-4 py-1.5 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors ${
            mode === 'longBreak' ? 'bg-[#a855f7] text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          Długa (15m)
        </button>
      </div>

      <div className="relative flex justify-center items-center mb-8 mx-auto w-[280px] h-[280px]">
        {/* SVG Progress Ring */}
        <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 280 280">
          <circle 
            cx="140" cy="140" r={radius}
            className="stroke-[#222] dark:stroke-[#222] fill-transparent"
            strokeWidth="8"
          />
          <motion.circle 
            cx="140" cy="140" r={radius}
            className="fill-transparent drop-shadow-md"
            strokeWidth="8"
            strokeLinecap="round"
            stroke={mode === 'pomodoro' ? '#75d36e' : mode === 'shortBreak' ? '#3b82f6' : '#a855f7'}
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "linear" }}
          />
        </svg>

        <div className="text-center relative z-10 flex flex-col items-center justify-center">
          <motion.div 
            key={timeLeft}
            initial={{ opacity: 0.8, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-6xl font-display font-bold text-white tracking-widest font-variant-numeric"
          >
            {formatTime(timeLeft)}
          </motion.div>
          <p className="text-sm font-mono text-slate-500 mt-2 uppercase tracking-widest">
            Sesja: {(sessionCount % settings.sessionsBeforeLongBreak) + 1} / {settings.sessionsBeforeLongBreak}
          </p>
        </div>
      </div>

      <div className="flex justify-center items-center gap-4">
        <button 
          onClick={toggleTimer}
          className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] ${
            isActive 
              ? 'bg-[#161616] border border-[#262626] text-white hover:border-[#333333]' 
              : mode === 'pomodoro' ? 'bg-[#75d36e] text-[#1a1a1a] hover:bg-[#5bb255]' 
                : mode === 'shortBreak' ? 'bg-[#3b82f6] text-white hover:bg-blue-500'
                  : 'bg-[#a855f7] text-white hover:bg-purple-500'
          }`}
        >
          {isActive ? (
            <>
              <PauseCircle className="w-5 h-5" />
              Pauza
            </>
          ) : (
            <>
              <PlayCircle className="w-5 h-5" />
              Start sesji
            </>
          )}
        </button>
        <button 
          onClick={resetTimer}
          className="p-3 rounded-xl bg-[#161616] border border-[#262626] text-slate-400 hover:text-white transition-colors"
          title="Od nowa"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Ustawienia sesji Deep Focus"
      >
        <div className="p-6 space-y-4">
          <div className="text-slate-300 text-sm mb-4">
            Tryb pracy głębokiej ma na celu maksymalizację produktywności. Składa się z bloków czasowych skupienia (Pomodoro) oddzielonych krótkimi przerwami. Dłuższa przerwa następuje po wykonaniu określonej liczby sesji.
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161616] border border-[#262626] p-4 rounded-xl">
              <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Długość pracy (min)</label>
              <input 
                type="number" min="1"
                value={settings.pomodoro}
                onChange={e => handleSettingChange('pomodoro', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none"
              />
            </div>
            <div className="bg-[#161616] border border-[#262626] p-4 rounded-xl">
              <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Krótka przerwa (min)</label>
              <input 
                type="number" min="1"
                value={settings.shortBreak}
                onChange={e => handleSettingChange('shortBreak', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none"
              />
            </div>
            <div className="bg-[#161616] border border-[#262626] p-4 rounded-xl">
              <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Długa przerwa (min)</label>
              <input 
                type="number" min="1"
                value={settings.longBreak}
                onChange={e => handleSettingChange('longBreak', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none"
              />
            </div>
            <div className="bg-[#161616] border border-[#262626] p-4 rounded-xl">
              <label className="block text-xs font-mono uppercase text-slate-500 mb-2">Cykle do długiej</label>
              <input 
                type="number" min="1"
                value={settings.sessionsBeforeLongBreak}
                onChange={e => handleSettingChange('sessionsBeforeLongBreak', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-[#222222] flex justify-between items-center">
            <span className="text-xs text-slate-500">Zmiany będą widoczne po zresetowaniu timera.</span>
            <button 
              onClick={() => {
                setIsModalOpen(false);
                resetTimer();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm"
            >
              Zapisz i zresetuj
            </button>
          </div>
        </div>
      </GenieModal>

      <AnimatePresence>
        {isFullscreen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            style={{ backgroundColor: '#0a0a0a' }}
          >
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-screen opacity-70" style={{ willChange: 'transform' }}>
              <motion.div 
                animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] right-[10%] w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none"
                style={{
                  willChange: 'transform', background: mode === 'pomodoro' ? '#75d36e' : mode === 'shortBreak' ? '#3b82f6' : '#a855f7'
                }}
              />
              <motion.div 
                animate={{ x: [0, -50, 0], y: [0, 50, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear", delay: 2 }}
                className="absolute bottom-[-10%] left-[5%] w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none"
                style={{
                  willChange: 'transform', background: mode === 'pomodoro' ? '#3b82f6' : mode === 'shortBreak' ? '#75d36e' : '#ec4899'
                }}
              />
            </div>
            
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[#a855f7] font-bold tracking-[0.2em] uppercase mb-8 flex items-center gap-3 text-lg">
                <Brain className="w-6 h-6" /> Deep Focus
              </span>
              
              <div className="text-8xl md:text-[180px] font-display font-bold text-white tracking-widest font-variant-numeric drop-shadow-[0_0_20px_rgba(255,255,255,0.1)] mb-12">
                {formatTime(timeLeft)}
              </div>

              <div className="flex gap-6 items-center">
                <button 
                  onClick={toggleTimer}
                  className={`px-12 py-4 rounded-2xl font-bold flex items-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] text-xl ${
                    isActive 
                      ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md' 
                      : mode === 'pomodoro' ? 'bg-[#75d36e] text-[#1a1a1a] shadow-[0_0_30px_rgba(117,211,110,0.5)]' 
                        : mode === 'shortBreak' ? 'bg-[#3b82f6] text-white shadow-[0_0_30px_rgba(59,130,246,0.5)]'
                          : 'bg-[#a855f7] text-white shadow-[0_0_30px_rgba(168,85,247,0.5)]'
                  }`}
                >
                  {isActive ? (
                    <>
                      <PauseCircle className="w-6 h-6" />
                      Pauza
                    </>
                  ) : (
                    <>
                      <PlayCircle className="w-6 h-6" />
                      Wznów
                    </>
                  )}
                </button>
                <div className="flex gap-3">
                  <button 
                    onClick={() => {
                      resetTimer();
                      setIsFullscreen(false);
                    }}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-red-400 transition-colors backdrop-blur-md"
                    title="Stop (Resetuj)"
                  >
                    <Square className="w-6 h-6 fill-current" />
                  </button>
                  <button 
                    onClick={() => setIsFullscreen(false)}
                    className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors backdrop-blur-md"
                    title="Opuść Focus Mode"
                  >
                    <Minimize2 className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
