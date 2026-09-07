import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  Sparkles,
  ArrowRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Mail,
  AlertTriangle,
  Clock,
  Send,
  Plus,
  RefreshCw,
  FileText,
  ShieldCheck,
  Bot,
  Zap,
  CheckSquare,
  ChevronRight
} from 'lucide-react';
import { fetchGmailMessages, GmailMessage } from '../lib/gmail';
import { buildAgendaReport } from '../lib/agendaService';
import { AgendaReportModal } from './AgendaReportModal';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

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
  const navigate = useNavigate();
  const {
    tasks,
    googleEvents,
    events,
    language,
    user,
    googleToken,
    t
  } = useAppStore();

  const [gmailMessages, setGmailMessages] = useState<GmailMessage[]>([]);
  const [isGmailLoading, setIsGmailLoading] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);

  const activeEvents = googleToken ? googleEvents : events;

  // Fetch recent inbox emails if Google token exists
  const loadEmails = async () => {
    if (!googleToken) return;
    setIsGmailLoading(true);
    try {
      const res = await fetchGmailMessages({ maxResults: 30 });
      setGmailMessages(res.messages || []);
    } catch (e) {
      console.warn('Agenda email fetch error:', e);
    } finally {
      setIsGmailLoading(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      loadEmails();
    }
  }, [googleToken]);

  // Build the complete Agenda Report using the agenda skill
  const report = useMemo(() => {
    return buildAgendaReport({
      events: activeEvents,
      tasks,
      emails: gmailMessages,
      language
    });
  }, [activeEvents, tasks, gmailMessages, language]);

  // Polish Vocative Name
  const greetingName = useMemo(() => {
    const rawName = user?.displayName || user?.email?.split('@')[0] || 'Maciej';
    if (language === 'pl') {
      return getPolishVocative(rawName);
    }
    return rawName.trim().split(' ')[0];
  }, [user, language]);

  const hasUrgentAction = report.actionRequiredList.length > 0;

  const handleOpenSiftAIChat = () => {
    window.dispatchEvent(new CustomEvent('open-siftai'));
  };

  return (
    <>
      <div className="glass-card rounded-3xl border border-white/10 bg-gradient-to-br from-[#12141a]/95 via-[#161822]/95 to-[#0e1015]/95 p-5 sm:p-6 backdrop-blur-2xl shadow-xl relative overflow-hidden text-white transition-all">
        {/* Ambient subtle glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-60 h-60 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          {/* Left: Greeting & High-level Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[11px] font-semibold font-mono">
                <Sparkles className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>SiftAI Command Center</span>
              </div>
              {googleToken && (
                <span className="px-2 py-0.5 rounded-full bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Gmail & Kalendarz Live
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
              {language === 'pl' ? `Witaj, ${greetingName}.` : `Welcome, ${greetingName}.`}
            </h2>

            <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
              {report.quickSummary}
            </p>

            {/* Quick Status Chips */}
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5 text-[11px] text-slate-300 font-medium">
                <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
                <span>{report.eventsCount} {language === 'pl' ? 'zajęć (7 dni)' : 'sessions'}</span>
              </span>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.04] border border-white/5 text-[11px] text-slate-300 font-medium">
                <CheckSquare className="w-3.5 h-3.5 text-[#4ade80]" />
                <span>{report.tasksCount} {language === 'pl' ? 'zadań na dziś' : 'tasks today'}</span>
              </span>

              {report.emailsNeedReplyCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 font-semibold">
                  <Mail className="w-3.5 h-3.5 text-amber-400" />
                  <span>{report.emailsNeedReplyCount} {language === 'pl' ? 'maili do odpowiedzi' : 'to reply'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right: Main AI Agenda Modal Trigger Button & SiftAI Assistant */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            {/* PRIMARY BUTTON: SiftAI Agenda & Mail Analysis (PULSES IF ACTION REQUIRED) */}
            <button
              type="button"
              onClick={() => setIsAgendaModalOpen(true)}
              className={`relative group px-5 py-3.5 rounded-2xl flex items-center justify-between sm:justify-start gap-3.5 transition-all duration-300 cursor-pointer text-left shadow-xl ${
                hasUrgentAction
                  ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-[#4ade80] text-slate-950 font-bold ring-2 ring-amber-400 ring-offset-2 ring-offset-[#12141a] animate-pulse hover:animate-none'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/15 font-semibold hover:border-white/30'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  hasUrgentAction ? 'bg-black/20 text-black' : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {hasUrgentAction ? (
                    <AlertTriangle className="w-5 h-5 text-black" />
                  ) : (
                    <Bot className="w-5 h-5 text-purple-300" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold tracking-tight">
                      {language === 'pl' ? '⚡ Raport Agendy & Poczty AI' : '⚡ AI Agenda & Mail Report'}
                    </span>
                    {hasUrgentAction && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping shrink-0" />
                    )}
                  </div>

                  {/* Subtitle informing about action required */}
                  <div className={`text-[11px] font-semibold flex items-center gap-1 mt-0.5 ${
                    hasUrgentAction ? 'text-black/85' : 'text-slate-400'
                  }`}>
                    {hasUrgentAction ? (
                      <>
                        <span className="underline underline-offset-2">
                          {language === 'pl' 
                            ? `Wymaga Twojej akcji (${report.actionRequiredList.length})` 
                            : `Action required (${report.actionRequiredList.length})`}
                        </span>
                      </>
                    ) : (
                      <span>{language === 'pl' ? 'Wszystko ogarnięte • Otwórz raport' : 'All clear • Open report'}</span>
                    )}
                  </div>
                </div>
              </div>

              <ChevronRight className={`w-5 h-5 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                hasUrgentAction ? 'text-black' : 'text-slate-400'
              }`} />
            </button>

            {/* SiftAI Chat Trigger */}
            <button
              type="button"
              onClick={handleOpenSiftAIChat}
              className="px-4 py-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/25 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
              title="Zapytaj SiftAI o dowolne zadanie lub plan"
            >
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>SiftAI</span>
            </button>
          </div>
        </div>
      </div>

      {/* The Separate Full AI Agenda & Mail Intelligence Modal Window */}
      <AgendaReportModal
        isOpen={isAgendaModalOpen}
        onClose={() => setIsAgendaModalOpen(false)}
        report={report}
        onRefresh={loadEmails}
        isLoading={isGmailLoading}
        onOpenPool={onOpenPool}
      />
    </>
  );
}
