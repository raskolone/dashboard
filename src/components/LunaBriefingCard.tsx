import React, { useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import { Sparkles, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react';
import { addDays, format, getDay } from 'date-fns';
import { pl, enUS } from 'date-fns/locale';
import { getLocalDateStr } from '../lib/utils';

function getPolishVocative(name: string): string {
  if (!name) return 'Macieju';
  const firstName = name.trim().split(' ')[0];
  const lower = firstName.toLowerCase();

  const specialCases: Record<string, string> = {
    maciej: 'Macieju',
    piotr: 'Piotrze',
    paweł: 'Pawle',
    michał: 'Michale',
    tomasz: 'Tomaszu',
    krzysztof: 'Krzysztofie',
    adam: 'Adamie',
    jan: 'Janie',
    jakub: 'Jakubie',
    kamil: 'Kamilu',
    marek: 'Marku',
    łukasz: 'Łukaszu',
    marcin: 'Marcinie',
    bartosz: 'Bartoszu',
    mateusz: 'Mateuszu',
    wojciech: 'Wojciechu',
    grzegorz: 'Grzegorzu',
    filip: 'Filipie',
    kacper: 'Kacprze',
    aleksander: 'Aleksandrze',
    stanisław: 'Stanisławie',
    anna: 'Anno',
    ania: 'Aniu',
    katarzyna: 'Katarzyno',
    kasia: 'Kasiu',
    aleksandra: 'Aleksandro',
    ola: 'Olu',
    magdalena: 'Magdaleno',
    magda: 'Magdo',
    natalia: 'Natalio',
    julia: 'Julio',
    zuzanna: 'Zuzanno',
    karolina: 'Karolino',
    monika: 'Moniko',
    ewa: 'Ewo',
    agnieszka: 'Agnieszko',
    marta: 'Marto',
    barbara: 'Barbaro',
    basia: 'Basiu'
  };

  if (specialCases[lower]) {
    return specialCases[lower];
  }

  if (lower.endsWith('a')) {
    return firstName.slice(0, -1) + 'o';
  }
  if (lower.endsWith('ek')) {
    return firstName.slice(0, -2) + 'ku';
  }
  if (lower.endsWith('sz') || lower.endsWith('rz') || lower.endsWith('cz') || lower.endsWith('j')) {
    return firstName + 'u';
  }

  return firstName;
}

export function LunaBriefingCard({ onOpenPool }: { onOpenPool?: () => void }) {
  const { tasks, googleEvents, events, language, user, googleToken } = useAppStore();

  const activeEvents = googleToken ? googleEvents : events;

  const todayDate = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => getLocalDateStr(todayDate), [todayDate]);
  const tomorrowDate = useMemo(() => addDays(todayDate, 1), [todayDate]);
  const tomorrowStr = useMemo(() => getLocalDateStr(tomorrowDate), [tomorrowDate]);

  // User first name vocative
  const greetingName = useMemo(() => {
    const rawName = user?.displayName || user?.email?.split('@')[0] || 'Maciej';
    if (language === 'pl') {
      return getPolishVocative(rawName);
    }
    return rawName.trim().split(' ')[0];
  }, [user, language]);

  // Today's stats
  const todayTasks = useMemo(() => tasks.filter(t => t.due_date === todayStr), [tasks, todayStr]);
  const todayEvents = useMemo(() => activeEvents.filter(e => e.date === todayStr), [activeEvents, todayStr]);

  // Tomorrow's stats
  const tomorrowTasks = useMemo(() => tasks.filter(t => t.due_date === tomorrowStr), [tasks, tomorrowStr]);
  const tomorrowEvents = useMemo(() => activeEvents.filter(e => e.date === tomorrowStr), [activeEvents, tomorrowStr]);

  // Find upcoming busy day (e.g. Tuesday or next 2-5 days)
  const upcomingBusyDayInfo = useMemo(() => {
    let bestDay = null;
    let maxLoad = -1;

    for (let i = 2; i <= 6; i++) {
      const d = addDays(todayDate, i);
      const dStr = getLocalDateStr(d);
      const dayTasks = tasks.filter(t => t.due_date === dStr);
      const dayEvs = activeEvents.filter(e => e.date === dStr);
      const load = dayTasks.length + dayEvs.length * 2;
      const isTuesday = d.getDay() === 2; // Tuesday

      // Give Tuesday extra priority if it has key meetings
      const weight = isTuesday ? load + 3 : load;

      if (weight > maxLoad && (dayTasks.length > 0 || dayEvs.length > 0)) {
        maxLoad = weight;
        const dayNamePl = format(d, 'EEEE', { locale: pl });
        const dayNameEn = format(d, 'EEEE', { locale: enUS });
        bestDay = {
          date: d,
          dateStr: dStr,
          dayNamePl,
          dayNameEn,
          tasks: dayTasks,
          events: dayEvs,
          isTuesday
        };
      }
    }

    return bestDay;
  }, [todayDate, tasks, activeEvents]);

  // Generate the natural conversational paragraph
  const dynamicGreetingText = useMemo(() => {
    if (language === 'pl') {
      // 1. Today part
      let todayPhrase = '';
      const totalToday = todayTasks.length + todayEvents.length;
      if (totalToday === 0) {
        todayPhrase = 'Dzisiaj masz luźny dzień bez zaplanowanych spotkań.';
      } else if (totalToday <= 2) {
        todayPhrase = todayEvents.length > 0
          ? `Dzisiaj masz spokojny dzień z ${todayEvents.length === 1 ? '1 spotkaniem' : `${todayEvents.length} spotkaniami`}.`
          : `Dzisiaj masz luźny dzień z kilkoma drobnymi zadaniami.`;
      } else {
        todayPhrase = `Dzisiaj czeka Cię ${totalToday} zadań i spotkań.`;
      }

      // 2. Tomorrow part
      let tomorrowPhrase = '';
      const totalTomorrow = tomorrowTasks.length + tomorrowEvents.length;
      if (totalTomorrow === 0) {
        tomorrowPhrase = 'Jutro też będzie w porządku i masz wolny czas.';
      } else if (totalTomorrow <= 2) {
        tomorrowPhrase = 'Jutro też będzie w porządku.';
      } else {
        tomorrowPhrase = `Jutro masz zaplanowane ${totalTomorrow} rzeczy.`;
      }

      // 3. Upcoming busy day part (specifically Tuesday or next day with events)
      let upcomingPhrase = '';
      if (upcomingBusyDayInfo) {
        const dayName = upcomingBusyDayInfo.dayNamePl;
        const keyEvents = upcomingBusyDayInfo.events;
        const keyTasks = upcomingBusyDayInfo.tasks;

        if (keyEvents.length > 0) {
          const firstEventTitle = keyEvents[0].title;
          upcomingPhrase = `Natomiast ${dayName} jest dla Ciebie bardziej pracowity, bo masz m.in. ${firstEventTitle}${keyEvents.length > 1 ? ` oraz ${keyEvents.length - 1} inne spotkania` : ''}${keyTasks.length > 0 ? ` i ${keyTasks.length} zadania` : ''}.`;
        } else if (keyTasks.length > 0) {
          upcomingPhrase = `Natomiast ${dayName} jest dla Ciebie bardziej pracowity, bo masz zaplanowane ${keyTasks.length} zadań.`;
        }
      } else {
        upcomingPhrase = 'Najbliższe dni wyglądają przejrzyście i stabilnie.';
      }

      return `${todayPhrase} ${tomorrowPhrase} ${upcomingPhrase}`;
    } else {
      // English greeting
      const totalToday = todayTasks.length + todayEvents.length;
      const todayPhrase = totalToday <= 2 ? "Today looks light and relaxed." : `Today you have ${totalToday} items on your schedule.`;
      const tomorrowPhrase = "Tomorrow should also be smooth.";
      const upcomingPhrase = upcomingBusyDayInfo 
        ? `However, ${upcomingBusyDayInfo.dayNameEn} will be busier with upcoming meetings.` 
        : "Your upcoming days look clean and well-balanced.";

      return `${todayPhrase} ${tomorrowPhrase} ${upcomingPhrase}`;
    }
  }, [language, todayTasks, todayEvents, tomorrowTasks, tomorrowEvents, upcomingBusyDayInfo]);

  const handleOpenSiftAI = () => {
    window.dispatchEvent(new CustomEvent('open-siftai'));
  };

  return (
    <div className="glass-card rounded-2xl border border-white/10 bg-gradient-to-r from-[#141419]/90 via-[#181822]/90 to-[#121217]/90 p-4 sm:p-5 backdrop-blur-xl shadow-xl relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1">
          {/* Header with Greeting & SiftAI Tag */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold font-mono">
              <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
              <span>SiftAI</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold font-display text-white">
              {language === 'pl' ? `Witaj, ${greetingName}.` : `Welcome, ${greetingName}.`}
            </h2>
          </div>

          {/* Intelligent, single-paragraph personalized summary */}
          <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
            {dynamicGreetingText}
          </p>
        </div>

        {/* Action Button: Opens SiftAI Speech Bubble in Bottom Right */}
        <div className="shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenSiftAI}
            className="px-3.5 py-2 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 hover:border-purple-500/50 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm group"
            title={language === 'pl' ? 'Otwórz asystenta SiftAI' : 'Open SiftAI assistant'}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400 group-hover:scale-110 transition-transform" />
            <span>{language === 'pl' ? 'Zapytaj SiftAI' : 'Ask SiftAI'}</span>
            <ArrowRight className="w-3 h-3 text-purple-400 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
