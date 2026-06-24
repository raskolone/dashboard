import React, { useState, useEffect } from 'react';
import { 
  PlayCircle, PauseCircle, RotateCcw, Target, Settings, Brain, Minimize2, 
  Maximize2, Square, Sparkles, Sliders, Volume2, VolumeX, EyeOff, Eye, Expand 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../store/AppContext';
import { GenieModal } from './GenieModal';

type TimerMode = 'pomodoro' | 'shortBreak' | 'longBreak';

export function PomodoroTimer({ size = 'large' }: { size?: 'small' | 'medium' | 'large' }) {
  const { language } = useAppStore();

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
  const [isExpanded, setIsExpanded] = useState(false); // Controls full system overlay (Genie mode)
  const [isImmersiveFocus, setIsImmersiveFocus] = useState(false); // Controls Focus Mode (Minimalist, no distractions)
  const [isBrowserFullscreen, setIsBrowserFullscreen] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Settings modal internal toggle (inside expanded view)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Refresh clock time when settings or mode changed and timer is not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(settings[mode] * 60);
    }
  }, [settings, mode]);

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

  // Listen to browser fullscreen changes to sync state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsBrowserFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Listen to Escape key to close settings or exit the expanded Pomodoro view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
        } else if (isExpanded) {
          setIsExpanded(false);
          setIsImmersiveFocus(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, isSettingsOpen]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Sweet meditative chime: high sine wave fading out
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(523.25, context.currentTime); // C5
      oscillator.frequency.exponentialRampToValueAtTime(880.00, context.currentTime + 0.15); // A5 chime up
      
      gainNode.gain.setValueAtTime(0.3, context.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, context.currentTime + 1.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      oscillator.start();
      oscillator.stop(context.currentTime + 1.5);
    } catch (e) {
      console.warn("Sound generation was blocked/failed", e);
    }
  };

  const handleComplete = () => {
    setIsActive(false);
    playChime();
    
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
    setTimeLeft(settings[newMode] * 60);
    setIsActive(false);
  };

  const resetTimer = () => {
    setTimeLeft(settings[mode] * 60);
    setIsActive(false);
  };

  const toggleBrowserFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn(`Could not request fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalTime = settings[mode] * 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  
  // Progress circular properties
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleSettingChange = (key: keyof typeof settings, val: string) => {
    const num = Math.max(1, parseInt(val) || 1);
    setSettings((prev: typeof settings) => ({
      ...prev,
      [key]: num
    }));
  };

  const getModeLabelSelected = (tMode: TimerMode) => {
    if (language === 'pl') {
      switch (tMode) {
        case 'pomodoro': return 'Praca Głęboka';
        case 'shortBreak': return 'Krótka Przerwa';
        case 'longBreak': return 'Długa Przerwa';
      }
    } else {
      switch (tMode) {
        case 'pomodoro': return 'Deep Work';
        case 'shortBreak': return 'Short Break';
        case 'longBreak': return 'Long Break';
      }
    }
  };

  return (
    <>
      {/* 1. COMPACT TILE MODULE MATCHING DASHBOARD DESIGN CEILING */}
      <div className={`glass-card hover:border-[#4ade80]/30 transition-all duration-300 ${size === 'small' ? 'p-4' : 'p-5 sm:p-6'} rounded-3xl relative overflow-hidden flex ${size === 'small' ? 'flex-col justify-center text-center items-center' : 'flex-col md:flex-row justify-between items-center'} gap-4 w-full h-full min-h-[160px]`}>
        {/* Subtle Liquid Highlight Line */}
        <div 
          className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-[#4ade80] to-[#5bb255] transition-all duration-1000"
          style={{ width: `${progress}%` }}
        />

        {/* Small Ambient Glow behind the tile */}
        <div className="absolute right-0 top-0 w-32 h-32 bg-[#4ade80]/5 rounded-full blur-2xl pointer-events-none" />

        <div className={`flex ${size === 'small' ? 'flex-col items-center gap-2' : 'items-center gap-4'} w-full md:w-auto`}>
          <div className={`${size === 'small' ? 'p-2' : 'p-3'} bg-[#4ade80]/10 rounded-2xl shrink-0 text-[#4ade80]`}>
            <Brain className={`${size === 'small' ? 'w-5 h-5' : 'w-6 h-6'} animate-pulse`} />
          </div>
          <div className="min-w-0">
            {size !== 'small' && (
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-mono text-slate-500 font-bold">
                  {language === 'pl' ? 'Produktywność' : 'Productivity'}
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-[#4ade80] animate-ping" />
              </div>
            )}
            <h3 className={`${size === 'small' ? 'text-sm font-bold' : 'text-lg font-display font-medium'} text-white truncate`}>
              {getModeLabelSelected(mode)}
            </h3>
            {size !== 'small' && (
              <p className="text-[11px] text-slate-400 font-mono">
                {language === 'pl' ? 'Ukończono cykle: ' : 'Completed cycles: '}
                <span className="font-bold text-white">{sessionCount}</span>
              </p>
            )}
          </div>
        </div>

        {/* Big visual time inside mini tile */}
        <div className={`flex ${size === 'small' ? 'flex-col items-center gap-3' : 'items-center gap-4'} w-full md:w-auto justify-between md:justify-end`}>
          <div className={size === 'small' ? 'text-center' : 'text-right'}>
            <div className={`${size === 'small' ? 'text-3xl' : 'text-4xl'} font-display font-bold text-white tracking-widest font-variant-numeric leading-none`}>
              {formatTime(timeLeft)}
            </div>
            {size !== 'small' && (
              <div className="text-[10px] text-slate-500 font-mono mt-1">
                {language === 'pl' 
                  ? `Cel: ${settings.sessionsBeforeLongBreak} sesje` 
                  : `Goal: ${settings.sessionsBeforeLongBreak} sessions`}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Start session / Pause primary buttons */}
            <button
              onClick={toggleTimer}
              className={`${size === 'small' ? 'px-3 py-1.5 text-[10px]' : 'px-5 py-2.5 text-xs'} rounded-xl font-bold font-display uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97] flex items-center gap-2 cursor-pointer ${
                isActive 
                  ? 'bg-slate-800 text-white hover:bg-slate-700 hover:text-[#4ade80]' 
                  : 'bg-[#4ade80] text-black shadow-[0_0_24px_rgba(74,222,128,0.15)] hover:shadow-[0_0_35px_rgba(74,222,128,0.35)]'
              }`}
            >
              {isActive ? (
                <>
                  <PauseCircle className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} /> {language === 'pl' ? 'Pauza' : 'Pause'}
                </>
              ) : (
                <>
                  <PlayCircle className={size === 'small' ? 'w-3 h-3' : 'w-4 h-4'} /> {language === 'pl' ? (size === 'small' ? 'Start' : 'Start Sesji') : 'Start'}
                </>
              )}
            </button>

            {/* Expand button (Launches GENIE EFFECT with full system screen) */}
            {size !== 'small' && (
              <button
                onClick={() => setIsExpanded(true)}
                className="p-3 bg-white/5 hover:bg-white/10 hover:text-white text-slate-400 rounded-xl transition-colors border border-white/5 cursor-pointer"
                title={language === 'pl' ? "Otwórz pełny ekran Pomodoro" : "Open full-screen Pomodoro"}
              >
                <Expand className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. EXPANDED FULL SYSTEM VIEW WITH GORGEOUS REPRODUCED GENIE EFFECT TRANSITIONS */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ 
              opacity: 0,
              scaleY: 0.05,
              scaleX: 0.2,
              y: '40vh',
              filter: 'blur(16px)',
              borderRadius: '3rem'
            }}
            animate={{ 
              opacity: 1,
              scaleY: 1,
              scaleX: 1,
              y: 0,
              filter: 'blur(0px)',
              borderRadius: '0px'
            }}
            exit={{ 
              opacity: 0,
              scaleY: 0.05,
              scaleX: 0.2,
              y: '45vh',
              filter: 'blur(16px)',
              borderRadius: '3rem'
            }}
            style={{ originY: 1 }}
            transition={{ 
              type: 'spring', 
              damping: 24, 
              stiffness: 160,
              mass: 0.95
            }}
            className="fixed inset-0 z-50 overflow-y-auto bg-black text-white flex flex-col justify-between"
          >
            {/* Animated liquid background blobs in expanded window */}
            <div className="absolute inset-0 z-0 pointer-events-none opacity-40 overflow-hidden mix-blend-screen">
              <motion.div 
                animate={{ x: [0, 80, 0], y: [0, -40, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] right-[-5%] w-[550px] h-[550px] rounded-full blur-[110px]"
                style={{ background: '#4ade80' }}
              />
              <motion.div 
                animate={{ x: [0, -60, 0], y: [0, 80, 0], scale: [1.1, 0.9, 1.1] }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear", delay: 2 }}
                className="absolute bottom-[-15%] left-[2%] w-[450px] h-[450px] rounded-full blur-[100px]"
                style={{ background: '#5bb255' }}
              />
            </div>

            {/* Immersive Dark overlay filter for Focus view */}
            <div className={`absolute inset-0 bg-black/90 pointer-events-none z-10 transition-opacity duration-1000 ${isImmersiveFocus ? 'opacity-95' : 'opacity-20'}`} />

            {/* HEADER AREA */}
            <header className="relative z-20 px-8 py-6 border-b border-white/5 flex justify-between items-center bg-[#0a0a0a]/40 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <Brain className="w-6 h-6 text-[#4ade80] animate-pulse" />
                <div>
                  <h2 className="text-lg font-display font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    {language === 'pl' ? 'Skupienie Pomodoro' : 'Pomodoro Focus'}
                    <Sparkles className="w-4 h-4 text-[#4ade80]" />
                  </h2>
                  <p className="text-xs text-slate-400 font-mono">
                    {language === 'pl' ? 'Moduł Głębokiej Synchronizacji Myśli' : 'Deep Cognitive Focus Module'}
                  </p>
                </div>
              </div>

              {/* Utility Panel */}
              <div className="flex items-center gap-4">
                {/* Sound Toggle */}
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={
                    soundEnabled 
                      ? (language === 'pl' ? "Wycisz powiadomienie dźwiękowe" : "Mute chime notification")
                      : (language === 'pl' ? "Włącz powiadomienie dźwiękowe" : "Unmute chime notification")
                  }
                >
                  {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-red-400" />}
                </button>

                {/* Settings Tab */}
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title={language === 'pl' ? "Dostosuj czasy" : "Adjust intervals"}
                >
                  <Sliders className="w-5 h-5" />
                </button>

                {/* Focus Mode (Immersive View) Trigger */}
                <button
                  onClick={() => setIsImmersiveFocus(!isImmersiveFocus)}
                  className={`p-2.5 rounded-xl transition-all duration-300 flex items-center gap-2 cursor-pointer ${
                    isImmersiveFocus 
                      ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30' 
                      : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
                  }`}
                  title={language === 'pl' ? "Tryb bez rozpraszania (Zen Focus)" : "Zen Focus Mode"}
                >
                  {isImmersiveFocus ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">
                    {language === 'pl' ? 'Tryb Zen' : 'Zen Mode'}
                  </span>
                </button>

                {/* Fullscreen actual screen trigger */}
                <button
                  onClick={toggleBrowserFullscreen}
                  className={`p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer ${isBrowserFullscreen && 'text-[#4ade80]'}`}
                  title={language === 'pl' ? "Pełny ekran przeglądarki" : "Toggle browser fullscreen"}
                >
                  <Minimize2 className="w-5 h-5" />
                </button>

                {/* Exit expanded view (Genie minimizes) */}
                <button 
                  onClick={() => {
                    setIsExpanded(false);
                    setIsImmersiveFocus(false);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-red-950/40 text-red-400 hover:bg-red-900/30 font-bold tracking-wide transition-all border border-red-950/80 cursor-pointer"
                >
                  {language === 'pl' ? 'Wróć do Pulpitu' : 'Return to Dashboard'}
                </button>
              </div>
            </header>

            {/* MAIN CONTENT PORTAL */}
            <main className="relative z-20 flex-1 flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-4xl flex flex-col items-center">
                
                {/* Immersive focus title that shows when tryb zen is enabled */}
                <AnimatePresence>
                  {isImmersiveFocus ? (
                     <motion.div 
                       initial={{ opacity: 0, y: -20 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -20 }}
                       className="text-center mb-10 pointer-events-none"
                     >
                       <span className="text-[#4ade80] text-sm font-bold tracking-[0.3em] uppercase block mb-2">
                         {language === 'pl' ? 'Trwa Sesja Skupienia' : 'Focus Session in Progress'}
                       </span>
                       <h1 className="text-2xl font-serif italic text-slate-400">
                         {language === 'pl' 
                           ? 'Wyłącz powiadomienia, weź głęboki oddech i myśl...' 
                           : 'Turn off notifications, take a deep breath and clear your mind...'}
                       </h1>
                     </motion.div>
                  ) : (
                     /* Mode switcher tab menu */
                     <div className="flex gap-2 p-1.5 bg-[#141414]/90 backdrop-blur-xl border border-white/5 rounded-2xl mb-12 shadow-2xl overflow-x-auto scrollbar-none">
                       <button
                         onClick={() => switchMode('pomodoro')}
                         className={`px-6 py-2.5 rounded-xl font-bold font-display uppercase tracking-wider text-xs transition-all cursor-pointer whitespace-nowrap ${
                           mode === 'pomodoro' 
                             ? 'bg-[#4ade80] text-black shadow-lg shadow-[#4ade80]/20' 
                             : 'text-slate-400 hover:text-white hover:bg-white/5'
                         }`}
                       >
                         {language === 'pl' ? 'Praca Głęboka (25m)' : 'Deep Work (25m)'}
                       </button>
                       <button
                         onClick={() => switchMode('shortBreak')}
                         className={`px-6 py-2.5 rounded-xl font-bold font-display uppercase tracking-wider text-xs transition-all cursor-pointer whitespace-nowrap ${
                           mode === 'shortBreak' 
                             ? 'bg-[#4ade80] text-black shadow-lg' 
                             : 'text-slate-400 hover:text-white hover:bg-white/5'
                         }`}
                       >
                         {language === 'pl' ? 'Krótka Przerwa (5m)' : 'Short Break (5m)'}
                       </button>
                       <button
                         onClick={() => switchMode('longBreak')}
                         className={`px-6 py-2.5 rounded-xl font-bold font-display uppercase tracking-wider text-xs transition-all cursor-pointer whitespace-nowrap ${
                           mode === 'longBreak' 
                             ? 'bg-[#4ade80] text-black shadow-lg' 
                             : 'text-slate-400 hover:text-white hover:bg-white/5'
                         }`}
                       >
                         {language === 'pl' ? 'Długa Przerwa (15m)' : 'Long Break (15m)'}
                       </button>
                     </div>
                  )}
                </AnimatePresence>

                {/* Elegant Liquid-Glass Core Circular Clock */}
                <div className={`liquid-glass-card p-12 md:p-16 flex flex-col items-center justify-center transition-all duration-700 relative overflow-hidden ${
                  isImmersiveFocus ? 'scale-110 !border-white/5 bg-transparent shadow-none' : 'max-w-[480px] w-full'
                }`}>
                  
                  {/* SVG progress circle around */}
                  <div className="relative w-[280px] h-[280px] md:w-[320px] md:h-[320px] flex items-center justify-center">
                    <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 320 320">
                      <circle 
                        cx="160" cy="160" r={radius}
                        className="stroke-white/5 fill-transparent"
                        strokeWidth="10"
                      />
                      <motion.circle 
                        cx="160" cy="160" r={radius}
                        className="fill-transparent filter drop-shadow-[0_0_15px_rgba(74,222,128,0.3)]"
                        strokeWidth="10"
                        strokeLinecap="round"
                        stroke='#4ade80'
                        strokeDasharray={circumference}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1, ease: "linear" }}
                      />
                    </svg>

                    {/* Clock core text */}
                    <div className="text-center z-10 flex flex-col items-center justify-center">
                      <motion.div 
                        key={timeLeft}
                        initial={{ opacity: 0.82, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="text-6xl md:text-7xl font-display font-light text-white tracking-widest font-variant-numeric drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]"
                      >
                        {formatTime(timeLeft)}
                      </motion.div>
                      <p className="text-xs font-mono text-slate-500 mt-3 uppercase tracking-widest font-bold">
                        {getModeLabelSelected(mode)}
                      </p>
                    </div>
                  </div>

                  {/* Settings status indicator when not in zen */}
                  {!isImmersiveFocus && (
                    <div className="mt-8 text-center bg-black/40 border border-white/5 px-4 py-2 rounded-xl text-xs text-slate-400 font-mono flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-[#4ade80]" />
                      <span>
                        {language === 'pl' ? 'Sesja: ' : 'Session: '}
                        <b className="text-white">{(sessionCount % settings.sessionsBeforeLongBreak) + 1}</b> 
                        {language === 'pl' ? ' z ' : ' of '}
                        <b className="text-white">{settings.sessionsBeforeLongBreak}</b>
                      </span>
                      <span className="text-slate-600">|</span>
                      <span>
                        {language === 'pl' ? 'Ogółem: ' : 'Total: '}
                        <b className="text-[#4ade80]">{sessionCount}</b>
                      </span>
                    </div>
                  )}

                </div>

                {/* Primary Session Operation Panel */}
                <div className="mt-12 flex items-center justify-center gap-6">
                  {/* Reset Timer */}
                  {!isImmersiveFocus && (
                    <button
                      onClick={resetTimer}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                      title={language === 'pl' ? "Od nowa" : "Reset"}
                    >
                      <RotateCcw className="w-5 h-5" />
                    </button>
                  )}

                  {/* Play & Pause Action */}
                  <button
                    onClick={toggleTimer}
                    className={`px-12 py-4.5 rounded-2xl font-bold font-display uppercase tracking-widest transition-all duration-300 transform hover:scale-[1.03] active:scale-[0.97] flex items-center gap-3 text-sm flex-row shrink-0 cursor-pointer ${
                      isActive 
                        ? 'bg-white/15 text-white hover:bg-white/20 border border-white/20 shadow-xl' 
                        : 'bg-[#4ade80] text-black shadow-[0_0_40px_rgba(74,222,128,0.25)] hover:shadow-[0_0_60px_rgba(74,222,128,0.45)]'
                    }`}
                  >
                    {isActive ? (
                      <>
                        <PauseCircle className="w-5 h-5 text-current animate-spin-slow" /> {language === 'pl' ? 'Pauza' : 'Pause'}
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-5 h-5 text-current" /> {language === 'pl' ? 'Rozpocznij' : 'Start'}
                      </>
                    )}
                  </button>

                  {/* Stop Session completely */}
                  {!isImmersiveFocus && (
                    <button
                      onClick={() => {
                        setIsActive(false);
                        setTimeLeft(settings[mode] * 60);
                      }}
                      className="p-4 rounded-xl bg-white/5 border border-white/10 text-red-400 hover:text-red-300 hover:border-red-500/20 transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer"
                      title={language === 'pl' ? "Zatrzymaj" : "Stop"}
                    >
                      <Square className="w-5 h-5" />
                    </button>
                  )}
                </div>

              </div>
            </main>

            {/* EXPANDED FOOTER METRICS BAR */}
            {!isImmersiveFocus && (
              <footer className="relative z-20 px-8 py-6 border-t border-white/5 bg-[#0a0a0a]/30 backdrop-blur-md flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#4ade80]" />
                  <span>
                    {language === 'pl' 
                      ? 'Szyfrowany System Głębokiej Organizacji Czasowej.' 
                      : 'Secure Temporal Focus Infrastructure System.'}
                  </span>
                </div>
                <div className="flex gap-6">
                  <span>
                    {language === 'pl' ? 'Długość Pracy: ' : 'Work Block: '}
                    <b className="text-slate-400">{settings.pomodoro} min</b>
                  </span>
                  <span>
                    {language === 'pl' ? 'Przerwy: ' : 'Breaks: '}
                    <b className="text-slate-400">{settings.shortBreak} / {settings.longBreak} min</b>
                  </span>
                  <span>
                    {language === 'pl' ? 'Cel: ' : 'Goal: '}
                    <b className="text-slate-400">{settings.sessionsBeforeLongBreak} {language === 'pl' ? 'cykle' : 'cycles'}</b>
                  </span>
                </div>
              </footer>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. SETTINGS DIALOG CONVECTION */}
      <GenieModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title={language === 'pl' ? "Konfigurowanie czasów Focus" : "Configure Focus Intervals"}
      >
        <div className="p-6 space-y-4 font-sans text-white">
          <p className="text-slate-400 text-sm leading-relaxed">
            {language === 'pl' 
              ? 'Dostosuj bloki czasowe do swojego rytmu pracy (np. technika Ultra-Skupienia 50/10). Zmiany zostaną zaaplikowane do kolejnych sesji.'
              : 'Customize temporal blocks for your cognitive rhythm (e.g., Ultra-focus technique 50/10). Changes apply to new sessions.'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#161616] border border-white/5 p-4 rounded-2xl">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-500 mb-2">
                {language === 'pl' ? 'Czas Pracy (min)' : 'Work Duration (min)'}
              </label>
              <input 
                type="number" min="1" max="180"
                value={settings.pomodoro}
                onChange={e => handleSettingChange('pomodoro', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none border-none outline-none"
              />
            </div>
            <div className="bg-[#161616] border border-white/5 p-4 rounded-2xl">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-500 mb-2">
                {language === 'pl' ? 'Krótka Przerwa (min)' : 'Short Break (min)'}
              </label>
              <input 
                type="number" min="1" max="60"
                value={settings.shortBreak}
                onChange={e => handleSettingChange('shortBreak', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none border-none outline-none"
              />
            </div>
            <div className="bg-[#161616] border border-white/5 p-4 rounded-2xl">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-500 mb-2">
                {language === 'pl' ? 'Długa Przerwa (min)' : 'Long Break (min)'}
              </label>
              <input 
                type="number" min="1" max="120"
                value={settings.longBreak}
                onChange={e => handleSettingChange('longBreak', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none border-none outline-none"
              />
            </div>
            <div className="bg-[#161616] border border-white/5 p-4 rounded-2xl">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-500 mb-2">
                {language === 'pl' ? 'Liczba cykli do długiej' : 'Cycles before long break'}
              </label>
              <input 
                type="number" min="1" max="20"
                value={settings.sessionsBeforeLongBreak}
                onChange={e => handleSettingChange('sessionsBeforeLongBreak', e.target.value)}
                className="w-full bg-transparent text-xl text-white font-bold focus:outline-none border-none outline-none"
              />
            </div>
          </div>
          
          <div className="pt-4 border-t border-white/5 flex justify-between items-center bg-transparent">
            <span className="text-[11px] text-slate-500 font-mono">
              {language === 'pl' ? 'Dane zapisane lokalnie.' : 'Data stored locally.'}
            </span>
            <button 
              onClick={() => {
                setIsSettingsOpen(false);
                resetTimer();
              }}
              className="px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#5bb255] text-black font-bold font-display uppercase tracking-wider text-xs transition-colors cursor-pointer"
            >
              {language === 'pl' ? 'Zapisz i Zresetuj' : 'Save & Reset'}
            </button>
          </div>
        </div>
      </GenieModal>
    </>
  );
}
