import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Mail,
  Calendar as CalendarIcon,
  Clock,
  Send,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  UserCheck,
  ArrowRight,
  Bot,
  Layers,
  CheckSquare,
  Flame,
  Check,
  Search,
  Filter
} from 'lucide-react';
import { useAppStore } from '../store/AppContext';
import { AgendaReport, StudentAgendaItem } from '../lib/agendaService';
import { draftReplyWithSiftAI } from '../lib/aiService';
import { createGmailDraft } from '../lib/gmail';
import { useNavigate } from 'react-router-dom';

interface AgendaReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AgendaReport;
  onRefresh: () => Promise<void>;
  isLoading: boolean;
  onOpenPool?: () => void;
}

export function AgendaReportModal({
  isOpen,
  onClose,
  report,
  onRefresh,
  isLoading,
  onOpenPool
}: AgendaReportModalProps) {
  const navigate = useNavigate();
  const { language, googleToken, addTask, updateTask, t } = useAppStore();

  const [activeTab, setActiveTab] = useState<'action' | 'students' | 'emails' | 'tasks'>('action');
  const [draftingId, setDraftingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'needs_reply' | 'no_contact' | 'new_lead' | 'confirmed'>('all');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1-click Draft Creation
  const handleCreateDraft = async (item: {
    from: string;
    subject: string;
    snippet?: string;
    id?: string;
    name?: string;
  }) => {
    if (!googleToken) {
      showToast(language === 'pl' ? 'Połącz konto Google, aby zapisywać wersje robocze.' : 'Connect Google to save drafts.');
      return;
    }

    setDraftingId(item.id || item.from);
    try {
      const replyBody = await draftReplyWithSiftAI({
        from: item.from,
        subject: item.subject,
        body: item.snippet || item.subject,
        language
      });

      let cleanTo = item.from;
      const match = item.from.match(/<([^>]+)>/);
      if (match && match[1]) cleanTo = match[1];

      await createGmailDraft({
        to: cleanTo,
        subject: item.subject.toLowerCase().startsWith('re:') ? item.subject : `Re: ${item.subject}`,
        body: replyBody
      });

      showToast(language === 'pl' ? 'Szkic odpowiedzi został zapisany w Gmailu!' : 'Draft reply saved in Gmail!');
    } catch (err) {
      console.warn('Failed to draft reply:', err);
      showToast(language === 'pl' ? 'Nie udało się utworzyć szkicu.' : 'Failed to create draft.');
    } finally {
      setDraftingId(null);
    }
  };

  // Convert email or student action to task
  const handleAddToPool = (title: string, desc?: string) => {
    addTask({
      title: title,
      description: desc || '',
      priority: 'high',
      status: 'todo',
      due_date: '',
      in_pool: true
    });
    showToast(language === 'pl' ? 'Dodano zadanie do Puli Zadań!' : 'Added task to Task Pool!');
    if (onOpenPool) onOpenPool();
  };

  // Filtered student items
  const filteredStudents = useMemo(() => {
    return report.studentItems.filter(item => {
      if (selectedFilter !== 'all' && item.status !== selectedFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.name.toLowerCase().includes(q) ||
          item.contextText.toLowerCase().includes(q) ||
          (item.source && item.source.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [report.studentItems, selectedFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md">
        {/* Toast Alert */}
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 right-6 z-[60] px-4 py-2.5 rounded-2xl bg-[#4ade80] text-[#0a120d] font-bold text-xs shadow-2xl flex items-center gap-2 border border-[#4ade80]/40"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-4xl rounded-3xl bg-[#12141a] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        >
          {/* Top Decorative Ambient Background */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Modal Header */}
          <div className="relative z-10 p-5 sm:p-6 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/[0.02]">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 shadow-inner">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold font-display text-white">
                    {language === 'pl' ? 'Raport Agendy & Analiza Poczty AI' : 'Agenda Report & AI Mail Analysis'}
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3 h-3" />
                    {language === 'pl' ? 'Cross-check 7 dni' : '7-Day Cross-check'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {report.dateRangeStr} • {report.eventsCount} {language === 'pl' ? 'zajęć w kalendarzu' : 'scheduled events'} • {report.emailsNeedReplyCount} {language === 'pl' ? 'maili do odpowiedzi' : 'emails to reply'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                title="Odśwież dane z Gmail i Kalendarza"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#4ade80]' : ''}`} />
                <span className="hidden sm:inline">{language === 'pl' ? 'Odśwież' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* SiftAI Quick Insight Banner */}
          <div className="px-5 sm:px-6 pt-4 pb-2">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-[#181a24] to-emerald-950/30 border border-purple-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Bot className="w-5 h-5 text-purple-400 shrink-0" />
                <div className="text-xs text-slate-200 leading-relaxed">
                  <span className="font-bold text-white">SiftAI: </span>
                  {report.actionRequiredList.length > 0 ? (
                    <span>
                      {language === 'pl' 
                        ? `Wykryto ${report.actionRequiredList.length} pozycji wymagających pilnej akcji (maile bez odpowiedzi, brakujące linki lub nowe leady). Sprawdź poniższe rekomendacje.`
                        : `Detected ${report.actionRequiredList.length} items requiring urgent action (unanswered emails, missing links, new leads). Review recommendations below.`}
                    </span>
                  ) : (
                    <span>
                      {language === 'pl'
                        ? 'Wszystkie nadchodzące zajęcia mają potwierdzony status, a w skrzynce nie ma zaległych zapytań o lekcje. Świetna robota!'
                        : 'All upcoming sessions are confirmed and there are no overdue inquiries in your inbox. Great job!'}
                    </span>
                  )}
                </div>
              </div>

              {report.actionRequiredList.length > 0 && (
                <span className="px-2.5 py-1 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold shrink-0 self-start sm:self-center flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{language === 'pl' ? `Wymaga akcji: ${report.actionRequiredList.length}` : `Action needed: ${report.actionRequiredList.length}`}</span>
                </span>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="px-5 sm:px-6 pt-3 pb-2 flex items-center justify-between gap-2 overflow-x-auto border-b border-white/5">
            <div className="flex items-center gap-1.5 flex-nowrap">
              <button
                type="button"
                onClick={() => setActiveTab('action')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'action'
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                <span>{language === 'pl' ? 'Wymaga Twojej Akcji' : 'Action Required'}</span>
                {report.actionRequiredList.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px] font-bold">
                    {report.actionRequiredList.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('students')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'students'
                    ? 'bg-[#4ade80]/20 text-[#4ade80] border border-[#4ade80]/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>{language === 'pl' ? 'Status Kursantów & Spotkań' : 'Student & Meeting Status'}</span>
                <span className="text-[10px] opacity-70">({report.studentItems.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('emails')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'emails'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{language === 'pl' ? 'Poczta do Odpowiedzi' : 'Emails to Reply'}</span>
                {report.emailsNeedReplyCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                    {report.emailsNeedReplyCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('tasks')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shrink-0 ${
                  activeTab === 'tasks'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>{language === 'pl' ? 'Harmonogram & Zadania na Dziś' : 'Today Tasks & Schedule'}</span>
                <span className="text-[10px] opacity-70">({report.tasksCount})</span>
              </button>
            </div>
          </div>

          {/* Modal Body Content (Scrollable) */}
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4">
            {/* TAB 1: WYMAGA TWOJEJ AKCJI */}
            {activeTab === 'action' && (
              <div className="space-y-4">
                {report.actionRequiredList.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-3">
                    <CheckCircle2 className="w-10 h-10 mx-auto text-[#4ade80]" />
                    <h3 className="text-base font-bold text-white">
                      {language === 'pl' ? 'Wszystko ogarnięte!' : 'All clear!'}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto">
                      {language === 'pl'
                        ? 'Brak nieodebranych maili od kursantów, brakujących linków do lekcji czy nieobsłużonych zapytań. Twój harmonogram jest w pełni uporządkowany.'
                        : 'No pending student emails, missing meeting links or unhandled inquiries. Your schedule is perfectly organized.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-400 font-medium">
                      {language === 'pl'
                        ? 'Poniższe pozycje wymagają Twojej bezpośredniej reakcji (odpowiedź na maila, przesłanie linku lub zaproszenia):'
                        : 'The following items require your direct action (replying to email, sending links or invitations):'}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {report.actionRequiredList.map((item) => {
                        const isNeedsReply = item.status === 'needs_reply';
                        const isNoContact = item.status === 'no_contact';
                        const isLead = item.status === 'new_lead';

                        return (
                          <div
                            key={item.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                              isNeedsReply
                                ? 'bg-amber-950/30 border-amber-500/40 hover:border-amber-500/60'
                                : isNoContact
                                ? 'bg-red-950/30 border-red-500/40 hover:border-red-500/60'
                                : 'bg-purple-950/30 border-purple-500/40 hover:border-purple-500/60'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">
                                    {isNeedsReply ? '📩' : isNoContact ? '⚠️' : '🆕'}
                                  </span>
                                  <h4 className="font-bold text-sm text-white">
                                    {item.name}
                                  </h4>
                                </div>
                                {item.source && (
                                  <span className="px-2 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] font-semibold">
                                    {item.source}
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-slate-200 leading-relaxed">
                                {item.contextText}
                              </p>

                              {item.eventDate && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                                  <Clock className="w-3 h-3 text-[#4ade80]" />
                                  <span>{item.eventDate} {item.eventTime ? `(${item.eventTime})` : ''}</span>
                                </div>
                              )}
                            </div>

                            {/* Interactive Action Buttons */}
                            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => handleAddToPool(`Kontakt: ${item.name}`, item.contextText)}
                                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>+ Do Puli</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCreateDraft({
                                  from: item.email || item.name,
                                  subject: item.lastEmailSubject || `Lekcja / Spotkanie: ${item.name}`,
                                  snippet: item.lastEmailSnippet || item.contextText,
                                  id: item.id,
                                  name: item.name
                                })}
                                disabled={draftingId === item.id}
                                className="px-3 py-1.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-[#0a120d] font-bold text-xs flex items-center gap-1.5 shadow-[0_0_12px_rgba(74,222,128,0.2)] transition-all cursor-pointer disabled:opacity-50"
                              >
                                {draftingId === item.id ? (
                                  <>
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    <span>Tworzenie...</span>
                                  </>
                                ) : (
                                  <>
                                    <Sparkles className="w-3.5 h-3.5" />
                                    <span>{language === 'pl' ? 'Przygotuj szkic SiftAI' : 'Draft Reply'}</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: STATUS WSZYSTKICH KURSANTÓW I SPOTKAŃ (7 DNI) */}
            {activeTab === 'students' && (
              <div className="space-y-4">
                {/* Search & Filter Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={language === 'pl' ? 'Szukaj kursanta lub spotkania...' : 'Search student or session...'}
                      className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('all')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectedFilter === 'all' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Wszystkie ({report.studentItems.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('needs_reply')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectedFilter === 'needs_reply' ? 'bg-amber-500 text-black font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📩 Wymaga odpowiedzi
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFilter('confirmed')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                        selectedFilter === 'confirmed' ? 'bg-[#4ade80] text-black font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      ✅ Potwierdzone
                    </button>
                  </div>
                </div>

                {/* Students Table */}
                <div className="rounded-2xl border border-white/10 bg-black/30 divide-y divide-white/5 overflow-hidden">
                  {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      {language === 'pl' ? 'Brak pozycji pasujących do wyszukiwania.' : 'No items matching search filter.'}
                    </div>
                  ) : (
                    filteredStudents.map((st) => (
                      <div
                        key={st.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-base font-bold shrink-0">
                            {st.status === 'confirmed' ? '✅' : st.status === 'needs_reply' ? '📩' : st.status === 'no_contact' ? '⚠️' : '🆕'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-white">
                                {st.name}
                              </span>
                              {st.source && (
                                <span className="text-[10px] text-slate-400">
                                  ({st.source})
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {st.contextText}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          {st.eventDate && (
                            <span className="text-xs text-slate-400 font-mono px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                              {st.eventDate} {st.eventTime || ''}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCreateDraft({
                              from: st.email || st.name,
                              subject: st.lastEmailSubject || `Spotkanie: ${st.name}`,
                              snippet: st.lastEmailSnippet || st.contextText,
                              id: st.id,
                              name: st.name
                            })}
                            disabled={draftingId === st.id}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                          >
                            Szkic SiftAI
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: POCZTA DO ODPOWIEDZI */}
            {activeTab === 'emails' && (
              <div className="space-y-4">
                {report.emailsToReply.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-black/20 border border-white/5 text-xs text-slate-400">
                    <Mail className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    {language === 'pl' ? 'Brak wiadomości oczekujących na odpowiedź.' : 'No emails awaiting reply.'}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {report.emailsToReply.map((em) => (
                      <div
                        key={em.id}
                        className="p-4 rounded-2xl bg-black/30 border border-white/10 hover:border-white/20 transition-all space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                            <span className="font-bold text-sm text-white truncate">
                              {em.name}
                            </span>
                            {em.isLead && (
                              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-bold">
                                Lead
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-500 font-mono shrink-0">
                            {em.date}
                          </span>
                        </div>

                        <h5 className="text-xs font-semibold text-slate-200">
                          {em.subject}
                        </h5>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {em.snippet}
                        </p>

                        <div className="pt-2 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddToPool(`Odpisać do: ${em.name}`, em.snippet)}
                            className="px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Zadanie</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCreateDraft({
                              from: em.from,
                              subject: em.subject,
                              snippet: em.snippet,
                              id: em.id,
                              name: em.name
                            })}
                            disabled={draftingId === em.id}
                            className="px-3 py-1 rounded-xl bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {draftingId === em.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5" />
                            )}
                            <span>Szkic SiftAI</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: ZADANIA I HARMONOGRAM NA DZIŚ */}
            {activeTab === 'tasks' && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-black/30 divide-y divide-white/5 overflow-hidden">
                  {report.tasksTodo.length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-500">
                      {language === 'pl' ? 'Brak pilnych zadań na dziś.' : 'No urgent tasks for today.'}
                    </div>
                  ) : (
                    report.tasksTodo.map((task) => (
                      <div
                        key={task.id}
                        className="p-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={() => updateTask(task.id, { status: task.status === 'done' ? 'todo' : 'done' })}
                            className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 cursor-pointer ${
                              task.status === 'done'
                                ? 'bg-[#4ade80] border-[#4ade80] text-black'
                                : 'border-slate-600 hover:border-slate-400'
                            }`}
                          >
                            {task.status === 'done' && <CheckCircle2 className="w-3 h-3" />}
                          </button>
                          <span className={`text-xs truncate ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                            {task.title}
                          </span>
                        </div>
                        {task.isOverdue && (
                          <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold shrink-0">
                            {language === 'pl' ? 'Zaległe' : 'Overdue'}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 sm:p-5 border-t border-white/10 bg-black/40 flex items-center justify-between gap-3 text-xs text-slate-400">
            <span className="font-mono text-[11px]">
              {language === 'pl' ? 'SiftAI Agenda Engine • Tylko do odczytu dla poczty' : 'SiftAI Agenda Engine • Read-only mailbox access'}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold transition-colors cursor-pointer"
            >
              {language === 'pl' ? 'Zamknij' : 'Close'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
