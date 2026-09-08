import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  Sparkles,
  Calendar as CalendarIcon,
  CheckSquare,
  Mail,
  AlertTriangle,
  Clock,
  ArrowRight,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Inbox,
  CheckCircle2,
  CalendarCheck,
  Zap,
  ArrowUpRight,
  Filter,
  Send,
  User,
  ShieldCheck,
  Layers,
  Flame,
  Lightbulb,
  ExternalLink,
  MinusCircle,
  Archive,
  Undo2,
  Brain,
  Database,
  Search,
  Trash2,
  Info,
  SlidersHorizontal,
  Tag,
  Video,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatEventLocation, getEventTypeName } from '../lib/utils';
import {
  generatePeriodicReport,
  PeriodicAnalysis,
  draftReplyWithSiftAI,
  summarizeEmailWithSiftAI
} from '../lib/aiService';
import { fetchGmailMessages, GmailMessage, sendGmailMessage } from '../lib/gmail';
import {
  EmailActionRecord,
  EmailMemoryRule,
  classifyEmail,
  executeEmailAction,
  restoreEmailToInbox,
  loadLocalRules,
  saveLocalRules,
  loadLocalRegistry,
  saveLocalRegistry
} from '../lib/emailMemoryService';
import { subscribeToCollection, setDocumentWithMerge, updateDocument, deleteDocument, generateId } from '../lib/db';
import { Task, CalendarEvent, TaskCategory } from '../types';

type PeriodType = 'day' | 'week' | 'month';
type TabType = 'overview' | 'pool' | 'calendar' | 'mail';

export function DailyReport() {
  const {
    tasks,
    events,
    googleEvents,
    addTask,
    updateTask,
    deleteTask,
    user,
    googleToken,
    isGoogleConnected,
    loginGoogle,
    t,
    language
  } = useAppStore();

  // Selected period and base date
  const [period, setPeriod] = useState<PeriodType>('day');
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // AI Analysis state
  const [analysis, setAnalysis] = useState<PeriodicAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedTime, setLastAnalyzedTime] = useState<string | null>(null);

  // Gmail state
  const [emails, setEmails] = useState<GmailMessage[]>([]);
  const [isEmailsLoading, setIsEmailsLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<GmailMessage | null>(null);
  const [emailAiSummary, setEmailAiSummary] = useState<string | null>(null);
  const [emailAiReplyDraft, setEmailAiReplyDraft] = useState<string | null>(null);
  const [isDraftingReply, setIsDraftingReply] = useState(false);

  // Email Memory & Registry State
  const [emailRules, setEmailRules] = useState<EmailMemoryRule[]>(() => loadLocalRules());
  const [emailRegistry, setEmailRegistry] = useState<EmailActionRecord[]>(() => loadLocalRegistry());
  const [mailSubView, setMailSubView] = useState<'inbox' | 'registry' | 'rules'>('inbox');
  const [mailFilter, setMailFilter] = useState<'all' | 'important' | 'low_importance'>('all');
  const [registryFilter, setRegistryFilter] = useState<'all' | 'done' | 'low_importance'>('all');
  const [registrySearch, setRegistrySearch] = useState('');

  // Manual rule creation state
  const [isAddRuleOpen, setIsAddRuleOpen] = useState(false);
  const [newRuleType, setNewRuleType] = useState<'sender_email' | 'sender_domain' | 'keyword'>('sender_email');
  const [newRuleValue, setNewRuleValue] = useState('');
  const [newRuleCategory, setNewRuleCategory] = useState<'low_importance' | 'important'>('low_importance');

  // Quick Action Modal / Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('work');
  const [newTaskInPool, setNewTaskInPool] = useState(true);

  // Time slot picker state for pool scheduling
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [scheduleDate, setScheduleDate] = useState<string>('');
  const [scheduleTime, setScheduleTime] = useState<string>('10:00');

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Date formatting helpers
  const targetDateStr = useMemo(() => {
    return currentDate.toISOString().split('T')[0];
  }, [currentDate]);

  // Combined events (local + google)
  const allEvents = useMemo(() => {
    const combined: CalendarEvent[] = [...events];
    googleEvents.forEach(ge => {
      if (!combined.some(e => e.id === ge.id)) {
        combined.push(ge);
      }
    });
    return combined;
  }, [events, googleEvents]);

  // Tasks in pool (tasks without due_date or marked in_pool === true)
  const poolTasks = useMemo(() => {
    return tasks.filter(t => (!t.due_date || t.due_date.trim() === '' || t.in_pool === true) && t.status !== 'done');
  }, [tasks]);

  const urgentPoolTasks = useMemo(() => {
    return poolTasks.filter(t => t.priority === 'urgent' || t.priority === 'high');
  }, [poolTasks]);

  const normalPoolTasks = useMemo(() => {
    return poolTasks.filter(t => t.priority !== 'urgent' && t.priority !== 'high');
  }, [poolTasks]);

  // Scheduled tasks in the selected period
  const periodScheduledTasks = useMemo(() => {
    if (period === 'day') {
      return tasks.filter(t => t.due_date === targetDateStr);
    } else if (period === 'week') {
      // Current week range
      const curr = new Date(currentDate);
      const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
      const startWeek = new Date(curr.setDate(first)).toISOString().split('T')[0];
      const endWeek = new Date(curr.setDate(first + 6)).toISOString().split('T')[0];
      return tasks.filter(t => !!t.due_date && t.due_date >= startWeek && t.due_date <= endWeek);
    } else {
      // Month
      const monthPrefix = targetDateStr.slice(0, 7);
      return tasks.filter(t => (t.due_date && t.due_date.startsWith(monthPrefix)) || t.target_month === monthPrefix);
    }
  }, [tasks, period, targetDateStr, currentDate]);

  // Events in the selected period
  const periodEvents = useMemo(() => {
    if (period === 'day') {
      return allEvents.filter(e => e.date === targetDateStr);
    } else if (period === 'week') {
      const curr = new Date(currentDate);
      const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
      const startWeek = new Date(curr.setDate(first)).toISOString().split('T')[0];
      const endWeek = new Date(curr.setDate(first + 6)).toISOString().split('T')[0];
      return allEvents.filter(e => e.date >= startWeek && e.date <= endWeek);
    } else {
      const monthPrefix = targetDateStr.slice(0, 7);
      return allEvents.filter(e => e.date.startsWith(monthPrefix));
    }
  }, [allEvents, period, targetDateStr, currentDate]);

  // Load Gmail messages if connected
  useEffect(() => {
    let isMounted = true;
    async function loadMail() {
      if (googleToken) {
        setIsEmailsLoading(true);
        try {
          const fetched = await fetchGmailMessages({ maxResults: 25, labelIds: ['INBOX'] });
          if (isMounted && fetched?.messages) {
            setEmails(fetched.messages);
          }
        } catch (e) {
          console.warn('DailyReport Gmail load failed:', e);
        } finally {
          if (isMounted) setIsEmailsLoading(false);
        }
      }
    }
    loadMail();
    return () => { isMounted = false; };
  }, [googleToken]);

  // Fetch Gmail messages manually
  const fetchEmails = async () => {
    if (!googleToken) return;
    setIsEmailsLoading(true);
    try {
      const fetched = await fetchGmailMessages({ maxResults: 25, labelIds: ['INBOX'] });
      if (fetched?.messages) {
        setEmails(fetched.messages);
      }
    } catch (e) {
      console.warn('DailyReport Gmail load failed:', e);
    } finally {
      setIsEmailsLoading(false);
    }
  };

  // Sync email rules and registry with Firestore when user is authenticated
  useEffect(() => {
    if (!user || !user.uid || user.uid === 'demo_user') return;

    const unsubRules = subscribeToCollection<EmailMemoryRule>(
      `users/${user.uid}/email_rules`,
      (remoteRules) => {
        if (remoteRules && remoteRules.length > 0) {
          setEmailRules(remoteRules);
          saveLocalRules(remoteRules);
        }
      }
    );

    const unsubRegistry = subscribeToCollection<EmailActionRecord>(
      `users/${user.uid}/email_registry`,
      (remoteRegistry) => {
        if (remoteRegistry) {
          const sorted = [...remoteRegistry].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setEmailRegistry(sorted);
          saveLocalRegistry(sorted);
        }
      }
    );

    return () => {
      unsubRules();
      unsubRegistry();
    };
  }, [user?.uid]);

  // Classification & Ranking based on Memory Rules
  const classifiedEmails = useMemo(() => {
    return emails.map(email => {
      const classification = classifyEmail(email, emailRules);
      return {
        email,
        ...classification
      };
    });
  }, [emails, emailRules]);

  const displayedEmails = useMemo(() => {
    let list = [...classifiedEmails];
    // Sort: Important emails first, then newest internalDate first
    list.sort((a, b) => {
      if (a.isImportant && !b.isImportant) return -1;
      if (!a.isImportant && b.isImportant) return 1;
      return parseInt(b.email.internalDate || '0', 10) - parseInt(a.email.internalDate || '0', 10);
    });

    if (mailFilter === 'important') {
      list = list.filter(item => item.isImportant);
    } else if (mailFilter === 'low_importance') {
      list = list.filter(item => item.isLowImportance);
    }
    return list;
  }, [classifiedEmails, mailFilter]);

  const importantEmailsCount = useMemo(() => {
    return classifiedEmails.filter(e => e.isImportant).length;
  }, [classifiedEmails]);

  const lowImportanceEmailsCount = useMemo(() => {
    return classifiedEmails.filter(e => e.isLowImportance).length;
  }, [classifiedEmails]);

  // Filtered action registry
  const filteredRegistry = useMemo(() => {
    return emailRegistry.filter(record => {
      if (registryFilter !== 'all' && record.action !== registryFilter) return false;
      if (registrySearch.trim()) {
        const query = registrySearch.toLowerCase();
        return (
          record.subject.toLowerCase().includes(query) ||
          record.from.toLowerCase().includes(query) ||
          record.senderEmail.toLowerCase().includes(query) ||
          record.senderDomain.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [emailRegistry, registryFilter, registrySearch]);

  // Action: Mark as Done ("Zrobione") -> archives message in Gmail and records into registry
  const handleMarkEmailDone = async (email: GmailMessage) => {
    try {
      const { record, updatedRules } = await executeEmailAction({
        email,
        action: 'done',
        userUid: user?.uid,
        currentRules: emailRules
      });
      setEmails(prev => prev.filter(e => e.id !== email.id));
      setEmailRegistry(prev => [record, ...prev.filter(r => r.messageId !== email.id)]);
      setEmailRules(updatedRules);
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
        setEmailAiReplyDraft(null);
      }
      showToast(`Oznaczono jako "Zrobione" i zarchiwizowano wiadomość.`);
    } catch (err) {
      console.error('Error marking email as done:', err);
      showToast('Wystąpił błąd podczas archiwizowania wiadomości.');
    }
  };

  // Action: Mark as Low Importance ("Mało ważne") -> archives in Gmail, learns rule, and records into registry
  const handleMarkEmailLowImportance = async (email: GmailMessage) => {
    try {
      const { record, updatedRules } = await executeEmailAction({
        email,
        action: 'low_importance',
        userUid: user?.uid,
        currentRules: emailRules
      });
      setEmails(prev => prev.filter(e => e.id !== email.id));
      setEmailRegistry(prev => [record, ...prev.filter(r => r.messageId !== email.id)]);
      setEmailRules(updatedRules);
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
        setEmailAiReplyDraft(null);
      }
      showToast(`Oznaczono jako "Mało ważne" i zarchiwizowano. Pamięć zaktualizowana!`);
    } catch (err) {
      console.error('Error marking email as low importance:', err);
      showToast('Wystąpił błąd podczas archiwizowania wiadomości.');
    }
  };

  // Batch Archive all detected low importance emails
  const handleBatchArchiveLow = async () => {
    const toArchive = classifiedEmails.filter(e => e.isLowImportance).map(e => e.email);
    if (toArchive.length === 0) return;

    let count = 0;
    let currentR = emailRules;
    const newRecords: EmailActionRecord[] = [];

    for (const email of toArchive) {
      try {
        const { record, updatedRules } = await executeEmailAction({
          email,
          action: 'low_importance',
          userUid: user?.uid,
          currentRules: currentR
        });
        currentR = updatedRules;
        newRecords.push(record);
        count++;
      } catch (err) {
        console.warn('Batch archive item error:', err);
      }
    }

    setEmails(prev => prev.filter(e => !toArchive.some(a => a.id === e.id)));
    setEmailRegistry(prev => [...newRecords, ...prev]);
    setEmailRules(currentR);
    if (selectedEmail && toArchive.some(a => a.id === selectedEmail.id)) {
      setSelectedEmail(null);
      setEmailAiReplyDraft(null);
    }
    showToast(`Zarchiwizowano ${count} wiadomości oznaczonych jako mało ważne!`);
  };

  // Restore email from registry back to INBOX
  const handleRestoreFromRegistry = async (record: EmailActionRecord) => {
    try {
      await restoreEmailToInbox({ record, userUid: user?.uid });
      setEmailRegistry(prev =>
        prev.map(r => (r.id === record.id ? { ...r, archived: false } : r))
      );
      showToast(`Przywrócono wiadomość "${record.subject.slice(0, 25)}..." do Odebranych.`);
      if (googleToken) {
        fetchEmails();
      }
    } catch (err) {
      console.error('Error restoring message:', err);
      showToast('Błąd podczas przywracania wiadomości.');
    }
  };

  // Reclassify a record in registry (e.g. from low_importance to done or vice versa)
  const handleReclassifyRegistryRecord = (record: EmailActionRecord, newAction: 'done' | 'low_importance') => {
    const updated = emailRegistry.map(r => (r.id === record.id ? { ...r, action: newAction } : r));
    setEmailRegistry(updated);
    saveLocalRegistry(updated);
    if (user && user.uid && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/email_registry`, record.id, { action: newAction }).catch(e =>
        console.warn('Failed to update record action in Firestore:', e)
      );
    }
    showToast(`Zaktualizowano klasyfikację na: "${newAction === 'done' ? 'Zrobione' : 'Mało ważne'}"`);
  };

  // Custom manual rule management
  const handleAddCustomRule = () => {
    if (!newRuleValue.trim()) return;
    const newRule: EmailMemoryRule = {
      id: generateId(),
      type: newRuleType,
      value: newRuleValue.trim().toLowerCase(),
      category: newRuleCategory,
      hitCount: 0,
      addedAt: new Date().toISOString(),
      source: 'manual',
      enabled: true,
    };
    const updated = [newRule, ...emailRules];
    setEmailRules(updated);
    saveLocalRules(updated);

    if (user && user.uid && user.uid !== 'demo_user') {
      setDocumentWithMerge(`users/${user.uid}/email_rules`, newRule.id, newRule).catch(e =>
        console.warn('Failed to save rule in Firestore:', e)
      );
    }
    setNewRuleValue('');
    setIsAddRuleOpen(false);
    showToast(`Dodano nową regułę do pamięci!`);
  };

  const handleToggleRule = (ruleId: string) => {
    const updated = emailRules.map(r => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    setEmailRules(updated);
    saveLocalRules(updated);
    if (user && user.uid && user.uid !== 'demo_user') {
      const rule = updated.find(r => r.id === ruleId);
      if (rule) {
        updateDocument(`users/${user.uid}/email_rules`, ruleId, { enabled: rule.enabled }).catch(e =>
          console.warn('Failed to update rule in Firestore:', e)
        );
      }
    }
  };

  const handleDeleteRule = (ruleId: string) => {
    const updated = emailRules.filter(r => r.id !== ruleId);
    setEmailRules(updated);
    saveLocalRules(updated);
    if (user && user.uid && user.uid !== 'demo_user') {
      deleteDocument(`users/${user.uid}/email_rules`, ruleId).catch(e =>
        console.warn('Failed to delete rule in Firestore:', e)
      );
    }
    showToast('Usunięto regułę z pamięci.');
  };

  // Trigger analysis
  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await generatePeriodicReport({
        period,
        targetDate: targetDateStr,
        tasks,
        events: periodEvents,
        emails,
        language: language as 'pl' | 'en'
      });
      setAnalysis(res);
      setLastAnalyzedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.warn('Error running periodic report:', e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Run initial analysis when period or tasks change
  useEffect(() => {
    runAnalysis();
  }, [period, targetDateStr, tasks.length, events.length]);

  // Navigation handlers
  const handlePrev = () => {
    const next = new Date(currentDate);
    if (period === 'day') {
      next.setDate(next.getDate() - 1);
    } else if (period === 'week') {
      next.setDate(next.getDate() - 7);
    } else {
      next.setMonth(next.getMonth() - 1);
    }
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (period === 'day') {
      next.setDate(next.getDate() + 1);
    } else if (period === 'week') {
      next.setDate(next.getDate() + 7);
    } else {
      next.setMonth(next.getMonth() + 1);
    }
    setCurrentDate(next);
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Schedule task from pool to specific date & time
  const handleSchedulePoolTask = (task: Task, date: string, time?: string) => {
    updateTask(task.id, {
      due_date: date,
      due_time: time || undefined,
      in_pool: false,
      status: 'todo'
    });
    showToast(`Zadanie "${task.title}" przypisano na ${date}${time ? ` o ${time}` : ''}!`);
    setSchedulingTaskId(null);
  };

  // Convert email to pool task
  const handleConvertEmailToPoolTask = (email: GmailMessage) => {
    addTask({
      title: email.subject || 'Wiadomość e-mail do weryfikacji',
      description: `Od: ${email.from}\nTreść:\n${email.bodyText || email.snippet || ''}`,
      status: 'todo',
      priority: 'high',
      category: 'work',
      in_pool: true,
      due_date: '',
      color: '#4ade80'
    });
    showToast(`Utworzono zadanie w puli na podstawie e-maila "${email.subject.slice(0, 30)}..."!`);
  };

  // Generate AI reply draft
  const handleDraftEmailReply = async (email: GmailMessage) => {
    setSelectedEmail(email);
    setIsDraftingReply(true);
    setEmailAiReplyDraft(null);
    try {
      const draft = await draftReplyWithSiftAI({
        from: email.from,
        subject: email.subject,
        body: email.bodyText || email.snippet || '',
        language: language as 'pl' | 'en'
      });
      setEmailAiReplyDraft(draft);
    } catch (e) {
      console.warn('Draft reply error:', e);
    } finally {
      setIsDraftingReply(false);
    }
  };

  // Formatted date label
  const formattedPeriodLabel = useMemo(() => {
    if (period === 'day') {
      return currentDate.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } else if (period === 'week') {
      const curr = new Date(currentDate);
      const first = curr.getDate() - (curr.getDay() === 0 ? 6 : curr.getDay() - 1);
      const start = new Date(curr.setDate(first));
      const end = new Date(curr.setDate(first + 6));
      return `${start.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString(language === 'pl' ? 'pl-PL' : 'en-US', {
        month: 'long',
        year: 'numeric'
      });
    }
  }, [currentDate, period, language]);

  return (
    <div className="min-h-screen bg-[#07090b] text-slate-100 p-4 md:p-6 lg:p-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-[#16201a] border border-[#4ade80]/40 text-[#4ade80] px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md"
          >
            <CheckCircle2 className="w-5 h-5 text-[#4ade80]" />
            <span className="text-sm font-medium">{toastMsg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-7xl mx-auto space-y-6">
        {/* =========================================================================
            HEADER: TITLE & PERIOD SELECTOR
            ========================================================================= */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-[#222222] pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20">
                <Sparkles className="w-3.5 h-3.5" />
                SiftAI & Luna Intelligence
              </span>
              {lastAnalyzedTime && (
                <span className="text-xs text-slate-400">
                  Zaktualizowano: {lastAnalyzedTime}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-tight">
              Raport Agendy & Analiza Poczty AI
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Inteligentna selekcja poczty, pamięć reguł istotności, Kalendarz oraz Strażnik Puli Zadań
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Period Switcher: Day / Week / Month */}
            <div className="flex items-center bg-[#111317] p-1 rounded-xl border border-[#222222]">
              <button
                onClick={() => setPeriod('day')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === 'day'
                    ? 'bg-[#4ade80] text-black font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Dzień
              </button>
              <button
                onClick={() => setPeriod('week')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === 'week'
                    ? 'bg-[#4ade80] text-black font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Tydzień
              </button>
              <button
                onClick={() => setPeriod('month')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  period === 'month'
                    ? 'bg-[#4ade80] text-black font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Miesiąc
              </button>
            </div>

            {/* Date Navigator */}
            <div className="flex items-center bg-[#111317] px-2 py-1 rounded-xl border border-[#222222] gap-1">
              <button
                onClick={handlePrev}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Poprzedni okres"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleToday}
                className="px-2.5 py-1 text-xs font-semibold text-white hover:text-[#4ade80] transition-colors capitalize"
              >
                {formattedPeriodLabel}
              </button>
              <button
                onClick={handleNext}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
                title="Następny okres"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Regenerate AI Button */}
            <button
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#1a2e20] text-[#4ade80] hover:bg-[#223d2b] border border-[#4ade80]/30 transition-all shadow-sm"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
              {isAnalyzing ? 'Analizowanie...' : 'Odśwież analizę AI'}
            </button>
          </div>
        </div>

        {/* =========================================================================
            KEY METRICS STRIP: POOL, CALENDAR, GMAIL, PROGRESS
            ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Metric 1: Task Pool Alert */}
          <div
            onClick={() => setActiveTab('pool')}
            className={`cursor-pointer rounded-2xl p-4 border transition-all ${
              urgentPoolTasks.length > 0
                ? 'bg-[#18120e] border-amber-500/30 hover:border-amber-500/50'
                : 'bg-[#111317] border-[#222222] hover:border-[#333333]'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Pula Zadań</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{poolTasks.length}</span>
              <span className="text-xs text-slate-400">zadań w puli</span>
            </div>
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {urgentPoolTasks.length > 0 ? (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <Flame className="w-3.5 h-3.5" />
                  {urgentPoolTasks.length} pilnych czeka na datę!
                </span>
              ) : (
                <span className="text-slate-500">Wszystkie kluczowe przypisane</span>
              )}
            </div>
          </div>

          {/* Metric 2: Calendar Schedule */}
          <div
            onClick={() => setActiveTab('calendar')}
            className="cursor-pointer rounded-2xl p-4 bg-[#111317] border border-[#222222] hover:border-[#333333] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Harmonogram & Spotkania</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{periodEvents.length}</span>
              <span className="text-xs text-slate-400">spotkań w tym okresie</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 truncate">
              {periodEvents.length > 0 ? (
                <span>Najbliższe: {periodEvents[0].title}</span>
              ) : (
                <span className="text-[#4ade80]">Pełna dostępność na pracę głęboką</span>
              )}
            </div>
          </div>

          {/* Metric 3: Gmail Activity & Smart Filter */}
          <div
            onClick={() => setActiveTab('mail')}
            className="cursor-pointer rounded-2xl p-4 bg-[#111317] border border-[#222222] hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Poczta Gmail & AI</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                <Mail className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">
                {emails.length}
              </span>
              <span className="text-xs text-slate-400">w skrzynce</span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between gap-1 flex-wrap">
              {isGoogleConnected ? (
                <>
                  <span className="text-emerald-400 font-medium">⭐ {importantEmailsCount} istotnych</span>
                  <span className="text-amber-400 font-medium">💤 {lowImportanceEmailsCount} mało ważnych</span>
                  <span className="text-purple-400">📦 {emailRegistry.length} w rejestrze</span>
                </>
              ) : (
                <span className="text-slate-500">Kliknij, aby połączyć konto Google</span>
              )}
            </div>
          </div>

          {/* Metric 4: Scheduled Tasks & Progress */}
          <div
            onClick={() => setActiveTab('overview')}
            className="cursor-pointer rounded-2xl p-4 bg-[#111317] border border-[#222222] hover:border-[#333333] transition-all"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Zaplanowane na ten okres</span>
              <div className="p-2 rounded-xl bg-[#4ade80]/10 text-[#4ade80]">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-white">{periodScheduledTasks.length}</span>
              <span className="text-xs text-slate-400">
                (ukończono: {periodScheduledTasks.filter(t => t.status === 'done').length})
              </span>
            </div>
            <div className="mt-2">
              <div className="w-full bg-[#1e232a] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-[#4ade80] h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      periodScheduledTasks.length > 0
                        ? Math.round(
                            (periodScheduledTasks.filter(t => t.status === 'done').length /
                              periodScheduledTasks.length) *
                              100
                          )
                        : 0
                    }%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            NAVIGATION TABS WITHIN DAILY REPORT
            ========================================================================= */}
        <div className="flex items-center gap-2 border-b border-[#222222] overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Pełny Raport & Asystent AI
          </button>

          <button
            onClick={() => setActiveTab('pool')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'pool'
                ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Layers className="w-4 h-4" />
            Strażnik Puli Zadań ({poolTasks.length})
            {urgentPoolTasks.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                {urgentPoolTasks.length} pilnych
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('calendar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'calendar'
                ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CalendarCheck className="w-4 h-4" />
            Kalendarz & Harmonogram ({periodEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('mail')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === 'mail'
                ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 font-semibold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Mail className="w-4 h-4" />
            Poczta Gmail ({emails.length})
          </button>
        </div>

        {/* =========================================================================
            TAB 1: PEŁNY RAPORT & ASYSTENT AI (OVERVIEW)
            ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* AI Strategic Synthesis Banner */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#101914] via-[#0d1410] to-[#07090b] border border-[#4ade80]/30 p-6 shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                <div className="space-y-2.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#4ade80] flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#4ade80]/15 border border-[#4ade80]/30 shrink-0">
                      <Zap className="w-3.5 h-3.5" />
                      SYNTEZA STRATEGICZNA SIFTAI
                    </span>
                    {analysis?.focusTheme && (
                      <span className="text-slate-300 font-normal text-xs">
                        Hasło przewodnie: <strong className="text-white font-medium">{analysis.focusTheme}</strong>
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg md:text-xl font-bold text-white leading-relaxed break-words">
                    {analysis?.summary || 'Przygotowywanie analizy sytuacji...'}
                  </h2>
                </div>
                <div className="shrink-0 flex items-center gap-2 self-start">
                  <button
                    onClick={() => setIsAddTaskModalOpen(true)}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-[#4ade80] text-black hover:bg-[#3ec972] transition-colors shadow-md cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    Dodaj do Puli
                  </button>
                </div>
              </div>

              {/* Action Checklist Generated by AI */}
              {analysis?.actionChecklist && analysis.actionChecklist.length > 0 && (
                <div className="mt-6 pt-5 border-t border-[#4ade80]/15">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80]" />
                    Zalecany plan działania na ten okres:
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {analysis.actionChecklist.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-black/40 border border-white/5 rounded-xl p-3.5 text-xs text-slate-200 flex items-start gap-2.5 h-full min-w-0"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#4ade80]/20 text-[#4ade80] flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed break-words min-w-0 flex-1">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Two-Column Grid: Left (Pool Watchdog Alert) / Right (Calendar & Mail Highlights) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left: Task Pool Watchdog in Overview */}
              <div className="bg-[#111317] border border-[#222222] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                      <Flame className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">
                        Strażnik Puli: Co wymaga przypisania?
                      </h3>
                      <p className="text-xs text-slate-400">
                        Zadania z puli czekające na zaplanowanie na osi czasu
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('pool')}
                    className="text-xs text-[#4ade80] hover:underline flex items-center gap-1 font-medium"
                  >
                    Zobacz wszystkie ({poolTasks.length})
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {urgentPoolTasks.length === 0 && poolTasks.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-[#4ade80] mx-auto opacity-70" />
                    <p className="text-sm">Pula zadań jest pusta!</p>
                    <p className="text-xs text-slate-400">Wszystkie zadania zostały zaplanowane w kalendarzu.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Display top urgent or unassigned pool tasks */}
                    {(urgentPoolTasks.length > 0 ? urgentPoolTasks : poolTasks)
                      .slice(0, 4)
                      .map(task => (
                        <div
                          key={task.id}
                          className="bg-[#16181d] border border-white/5 hover:border-[#4ade80]/30 rounded-xl p-3.5 transition-all space-y-2.5 min-w-0"
                        >
                          <div className="flex items-start justify-between gap-3 min-w-0">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 ${
                                    task.priority === 'urgent'
                                      ? 'bg-red-500/20 text-red-400'
                                      : task.priority === 'high'
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-blue-500/20 text-blue-400'
                                  }`}
                                >
                                  {task.priority}
                                </span>
                                <h4 className="text-sm font-semibold text-white leading-tight break-words min-w-0 flex-1">
                                  {task.title}
                                </h4>
                              </div>
                              {task.description && (
                                <p className="text-xs text-slate-400 mt-1 line-clamp-2 break-words">
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <button
                              onClick={() => {
                                updateTask(task.id, { status: 'done' });
                                showToast(`Ukończono zadanie "${task.title}"!`);
                              }}
                              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-[#4ade80] transition-colors shrink-0 cursor-pointer"
                              title="Oznacz jako zrobione"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* 1-Click Schedule Buttons */}
                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-white/5 text-[11px]">
                            <span className="text-slate-400 font-medium shrink-0">Zaplanuj szybko:</span>
                            <button
                              onClick={() => handleSchedulePoolTask(task, targetDateStr, '10:00')}
                              className="px-2.5 py-1 rounded-lg bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Na {period === 'day' ? 'dziś' : targetDateStr} (10:00)
                            </button>
                            <button
                              onClick={() => {
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                handleSchedulePoolTask(task, tomorrow.toISOString().split('T')[0], '14:00');
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              Na jutro (14:00)
                            </button>
                            <button
                              onClick={() => {
                                setSchedulingTaskId(task.id);
                                setScheduleDate(targetDateStr);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                            >
                              <Clock className="w-3 h-3" />
                              Wybierz godzinę
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Right: Calendar & Mail Highlights */}
              <div className="space-y-6">
                {/* Calendar Schedule Highlights */}
                <div className="bg-[#111317] border border-[#222222] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                        <CalendarCheck className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Spotkania i Lekcje w tym Okresie
                        </h3>
                        <p className="text-xs text-slate-400">
                          {periodEvents.length} zaplanowanych terminów
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="text-xs text-[#4ade80] hover:underline flex items-center gap-1 font-medium cursor-pointer shrink-0"
                    >
                      Szczegóły
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {periodEvents.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Brak spotkań w tym okresie. Świetny czas na realizację zadań z puli!
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {periodEvents.slice(0, 3).map(ev => {
                        const loc = formatEventLocation(ev.location, language);
                        const typeLabel = getEventTypeName(ev.type, language);
                        return (
                          <div
                            key={ev.id}
                            className="flex items-center justify-between p-3 rounded-xl bg-[#16181d] border border-white/5 hover:border-white/10 transition-colors gap-3 min-w-0"
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-2.5 h-2.5 rounded-full bg-blue-400 shrink-0 shadow-sm" />
                              <div className="min-w-0 flex-1">
                                <h5 className="text-xs font-semibold text-white truncate">{ev.title}</h5>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5 flex-wrap min-w-0">
                                  <span className="font-mono text-slate-300 shrink-0">
                                    {ev.date} • {ev.start_time || '09:00'} - {ev.end_time || '10:00'}
                                  </span>
                                  {loc.label && (
                                    <>
                                      <span className="text-slate-600 shrink-0">•</span>
                                      {loc.url ? (
                                        <a
                                          href={loc.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 truncate max-w-[220px]"
                                          title={loc.url}
                                        >
                                          <Video className="w-3 h-3 shrink-0" />
                                          <span className="truncate">{loc.label}</span>
                                          <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-70" />
                                        </a>
                                      ) : (
                                        <span className="text-slate-400 truncate max-w-[200px] inline-flex items-center gap-1">
                                          <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                                          <span className="truncate">{loc.label}</span>
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0 font-medium">
                              {typeLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Free Focus Windows Notice */}
                  {analysis?.calendarAudit?.freeWindows && (
                    <div className="p-3 rounded-xl bg-[#0d1410] border border-[#4ade80]/20 text-xs text-slate-300 flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-[#4ade80]">Wolne okna na zadania: </span>
                        {analysis.calendarAudit.freeWindows.join(' oraz ')}
                      </div>
                    </div>
                  )}
                </div>

                {/* Mail Highlights */}
                <div className="bg-[#111317] border border-[#222222] rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#222222] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          Poczta Gmail: Selekcja AI
                        </h3>
                        <p className="text-xs text-slate-400">
                          {importantEmailsCount} istotnych • {lowImportanceEmailsCount} mało ważnych
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('mail')}
                      className="text-xs text-[#4ade80] hover:underline flex items-center gap-1 font-medium"
                    >
                      Otwórz pocztę & rejestr
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!isGoogleConnected ? (
                    <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/20 flex items-center justify-between gap-4">
                      <div>
                        <h5 className="text-xs font-semibold text-white">Połącz konto Google</h5>
                        <p className="text-[11px] text-slate-400">
                          Aby analizować maile od kursantów i synchronizować odpowiedzi.
                        </p>
                      </div>
                      <button
                        onClick={loginGoogle}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                      >
                        Połącz
                      </button>
                    </div>
                  ) : emails.length === 0 ? (
                    <div className="py-4 text-center text-xs text-slate-400">
                      Brak nowych wiadomości w skrzynce odbiorczej.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {displayedEmails.slice(0, 3).map(({ email: msg, isImportant, isLowImportance, reason }) => (
                        <div
                          key={msg.id}
                          className="p-3 rounded-xl bg-[#16181d] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="truncate flex-1">
                            <div className="flex items-center gap-1.5">
                              {isImportant && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                                  Istotne
                                </span>
                              )}
                              {isLowImportance && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0" title={reason}>
                                  Mało ważne
                                </span>
                              )}
                              <span className="font-semibold text-white truncate">
                                {msg.subject || '(Bez tematu)'}
                              </span>
                            </div>
                            <span className="text-slate-400 text-[11px] block truncate mt-0.5">
                              Od: {msg.from}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => handleMarkEmailDone(msg)}
                              className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[11px] transition-colors flex items-center gap-1 font-medium"
                              title="Oznacz jako Zrobione i zarchiwizuj"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Zrobione
                            </button>
                            <button
                              onClick={() => handleMarkEmailLowImportance(msg)}
                              className="px-2 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[11px] transition-colors flex items-center gap-1 font-medium"
                              title="Oznacz jako Mało ważne, zarchiwizuj i naucz pamięć reguł"
                            >
                              <MinusCircle className="w-3 h-3" />
                              Mało ważne
                            </button>
                            <button
                              onClick={() => handleConvertEmailToPoolTask(msg)}
                              className="px-2 py-1 rounded-lg bg-white/5 hover:bg-[#4ade80]/20 hover:text-[#4ade80] text-slate-300 text-[11px] transition-colors"
                              title="Dodaj ten e-mail do puli zadań"
                            >
                              + Pula
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: STRAŻNIK PULI ZADAŃ (TASK POOL WATCHDOG & SCHEDULER)
            ========================================================================= */}
        {activeTab === 'pool' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111317] border border-[#222222] p-5 rounded-2xl">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-[#4ade80]" />
                  Pula Zadań — Strażnik Realizacji
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Zadania czekające na przypisanie do konkretnego dnia. Nie pozwól, by cokolwiek zostało zapomniane!
                </p>
              </div>

              <button
                onClick={() => setIsAddTaskModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-[#4ade80] text-black hover:bg-[#3ec972] transition-colors self-start sm:self-auto shadow-md"
              >
                <Plus className="w-4 h-4" />
                Dodaj nowe zadanie do puli
              </button>
            </div>

            {/* Urgent & High Priority Pool Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Wymagają Pilnego Przypisania ({urgentPoolTasks.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Wysoki lub pilny priorytet bez przypisanej daty
                </span>
              </div>

              {urgentPoolTasks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#111317] border border-[#222222] text-center text-slate-400 text-xs">
                  Brak pilnych zadań bez daty. Wszystkie najważniejsze sprawy są zaplanowane!
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {urgentPoolTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-[#14161b] border border-amber-500/30 rounded-2xl p-4 space-y-3 hover:border-amber-500/60 transition-all shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400">
                              {task.priority}
                            </span>
                            <span className="text-xs text-slate-400">{task.category}</span>
                          </div>
                          <h4 className="text-sm font-bold text-white mt-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1">{task.description}</p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            updateTask(task.id, { status: 'done' });
                            showToast(`Zadanie "${task.title}" ukończone!`);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-[#4ade80] transition-colors"
                          title="Oznacz jako wykonane"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Action Bar */}
                      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs">
                        <span className="text-slate-400 text-[11px]">Szybkie przypisanie:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSchedulePoolTask(task, targetDateStr, '10:00')}
                            className="px-2.5 py-1 rounded-lg bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-[#4ade80] font-semibold transition-colors"
                          >
                            Na dziś (10:00)
                          </button>
                          <button
                            onClick={() => {
                              const tomorrow = new Date();
                              tomorrow.setDate(tomorrow.getDate() + 1);
                              handleSchedulePoolTask(task, tomorrow.toISOString().split('T')[0], '14:00');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 transition-colors"
                          >
                            Na jutro
                          </button>
                          <button
                            onClick={() => {
                              setSchedulingTaskId(task.id);
                              setScheduleDate(targetDateStr);
                            }}
                            className="p-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300"
                            title="Wybierz dokładną datę i godzinę"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Standard Pool Tasks */}
            <div className="space-y-3 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-[#4ade80]" />
                  Pozostałe Zadania w Puli ({normalPoolTasks.length})
                </h3>
                <span className="text-xs text-slate-400">
                  Gotowe do rozplanowania w kolejnych dniach
                </span>
              </div>

              {normalPoolTasks.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[#111317] border border-[#222222] text-center text-slate-400 text-xs">
                  Brak dodatkowych zadań w puli.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {normalPoolTasks.map(task => (
                    <div
                      key={task.id}
                      className="bg-[#111317] border border-[#222222] hover:border-[#333333] rounded-2xl p-4 space-y-3 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/5 text-slate-400">
                              {task.category || 'ogólne'}
                            </span>
                          </div>
                          <h4 className="text-sm font-semibold text-white mt-1">{task.title}</h4>
                          {task.description && (
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                              {task.description}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            updateTask(task.id, { status: 'done' });
                            showToast(`Zadanie "${task.title}" ukończone!`);
                          }}
                          className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-[#4ade80]"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-xs">
                        <button
                          onClick={() => handleSchedulePoolTask(task, targetDateStr, '12:00')}
                          className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-[#4ade80]/20 hover:text-[#4ade80] text-slate-300 transition-colors"
                        >
                          + Przypisz do bieżącego dnia
                        </button>
                        <button
                          onClick={() => {
                            setSchedulingTaskId(task.id);
                            setScheduleDate(targetDateStr);
                          }}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Wybierz termin"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: KALENDARZ & HARMONOGRAM (CALENDAR ANALYSIS)
            ========================================================================= */}
        {activeTab === 'calendar' && (
          <div className="space-y-6">
            <div className="bg-[#111317] border border-[#222222] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <CalendarCheck className="w-5 h-5 text-blue-400" />
                  Harmonogram & Obciążenie Czasowe ({formattedPeriodLabel})
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analiza spotkań, lekcji ze studentami oraz wolnych okien na pracę w skupieniu
                </p>
              </div>
            </div>

            {/* List of Events */}
            <div className="space-y-3">
              {periodEvents.length === 0 ? (
                <div className="p-8 rounded-2xl bg-[#111317] border border-[#222222] text-center space-y-2 text-slate-400">
                  <CalendarIcon className="w-8 h-8 text-blue-400 mx-auto opacity-70" />
                  <p className="text-sm font-semibold text-white">Brak zaplanowanych spotkań</p>
                  <p className="text-xs">Twój kalendarz jest wolny w tym okresie.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {periodEvents.map(ev => {
                    const loc = formatEventLocation(ev.location, language);
                    const typeLabel = getEventTypeName(ev.type, language);
                    return (
                      <div
                        key={ev.id}
                        className="bg-[#111317] border border-[#222222] rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 min-w-0"
                      >
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-0.5">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-400 shrink-0">
                                {typeLabel}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">{ev.date}</span>
                            </div>
                            <h4 className="text-base font-bold text-white mt-1 break-words">{ev.title}</h4>
                            {ev.description && (
                              <p className="text-xs text-slate-400 mt-1 line-clamp-2 break-words">{ev.description}</p>
                            )}
                            {loc.label && (
                              <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span className="text-slate-500">Lokalizacja:</span>
                                {loc.url ? (
                                  <a
                                    href={loc.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:text-blue-300 hover:underline inline-flex items-center gap-1 truncate max-w-sm"
                                  >
                                    <Video className="w-3.5 h-3.5 shrink-0" />
                                    <span className="truncate">{loc.label}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0 opacity-75" />
                                  </a>
                                ) : (
                                  <span className="text-slate-300 inline-flex items-center gap-1 truncate max-w-sm">
                                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                    <span className="truncate">{loc.label}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                          <div className="text-right">
                            <span className="text-sm font-bold font-mono text-white block">
                              {ev.start_time || '09:00'} - {ev.end_time || '10:00'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: POCZTA GMAIL (MAIL & COMMUNICATION ANALYSIS + MEMORY & REGISTRY)
            ========================================================================= */}
        {activeTab === 'mail' && (
          <div className="space-y-6">
            {/* Header & Account Connection */}
            <div className="bg-[#111317] border border-[#222222] p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Mail className="w-5 h-5 text-purple-400" />
                  Centrum Poczty Gmail & Inteligencja Skrzynki
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Inteligentna selekcja AI, pamięć reguł dla mało ważnych maili oraz pełny rejestr wykonanych akcji
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isGoogleConnected && (
                  <button
                    onClick={fetchEmails}
                    disabled={isEmailsLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors border border-white/5"
                    title="Odśwież skrzynkę Gmail"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isEmailsLoading ? 'animate-spin text-purple-400' : ''}`} />
                    Odśwież
                  </button>
                )}

                {!isGoogleConnected ? (
                  <button
                    onClick={loginGoogle}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Zaloguj z Google & Gmail
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-[#16181d] px-3 py-1.5 rounded-xl border border-white/5">
                    <span className="w-2 h-2 rounded-full bg-[#4ade80]" />
                    <span className="truncate max-w-[160px]">{user?.email || 'Gmail'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Sub-navigation Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-[#222222] pb-3">
              <button
                onClick={() => setMailSubView('inbox')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  mailSubView === 'inbox'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-[#111317] text-slate-400 hover:text-white border border-[#222222]'
                }`}
              >
                <Inbox className="w-4 h-4" />
                <span>Skrzynka & Selekcja AI</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${mailSubView === 'inbox' ? 'bg-purple-800 text-white' : 'bg-white/10 text-slate-300'}`}>
                  {emails.length}
                </span>
              </button>

              <button
                onClick={() => setMailSubView('registry')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  mailSubView === 'registry'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-[#111317] text-slate-400 hover:text-white border border-[#222222]'
                }`}
              >
                <Archive className="w-4 h-4" />
                <span>Rejestr Akcji Poczty</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${mailSubView === 'registry' ? 'bg-purple-800 text-white' : 'bg-white/10 text-slate-300'}`}>
                  {emailRegistry.length}
                </span>
              </button>

              <button
                onClick={() => setMailSubView('rules')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                  mailSubView === 'rules'
                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/20'
                    : 'bg-[#111317] text-slate-400 hover:text-white border border-[#222222]'
                }`}
              >
                <Brain className="w-4 h-4" />
                <span>Pamięć & Reguły Istotności</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[11px] ${mailSubView === 'rules' ? 'bg-purple-800 text-white' : 'bg-white/10 text-slate-300'}`}>
                  {emailRules.filter(r => r.enabled).length}
                </span>
              </button>
            </div>

            {/* Google Not Connected State */}
            {!isGoogleConnected ? (
              <div className="p-8 rounded-2xl bg-[#111317] border border-[#222222] text-center space-y-3">
                <Mail className="w-10 h-10 text-purple-400 mx-auto opacity-60" />
                <h3 className="text-base font-bold text-white">Połącz konto Google</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Zaloguj się kontem Google, aby asystent mógł analizować maile, uczyć się co jest dla Ciebie mało ważne, archiwizować załatwione sprawy i generować odpowiedzi AI.
                </p>
                <button
                  onClick={loginGoogle}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors"
                >
                  Połącz Gmail
                </button>
              </div>
            ) : isEmailsLoading && emails.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2 bg-[#111317] rounded-2xl border border-[#222222]">
                <RefreshCw className="w-4 h-4 animate-spin text-purple-400" />
                Pobieranie wiadomości ze skrzynki Gmail...
              </div>
            ) : (
              <>
                {/* =========================================================================
                    SUB-VIEW 1: INBOX & AI SELECTION
                    ========================================================================= */}
                {mailSubView === 'inbox' && (
                  <div className="space-y-4">
                    {/* Filter & Batch Actions Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111317] p-3.5 rounded-2xl border border-[#222222]">
                      <div className="flex items-center gap-1.5 overflow-x-auto">
                        <button
                          onClick={() => setMailFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            mailFilter === 'all'
                              ? 'bg-white/15 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Wszystkie
                          <span className="text-[10px] opacity-75 font-normal">({emails.length})</span>
                        </button>
                        <button
                          onClick={() => setMailFilter('important')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            mailFilter === 'important'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          ⭐ Istotne
                          <span className="text-[10px] opacity-75 font-normal">({importantEmailsCount})</span>
                        </button>
                        <button
                          onClick={() => setMailFilter('low_importance')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                            mailFilter === 'low_importance'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          💤 Mało ważne
                          <span className="text-[10px] opacity-75 font-normal">({lowImportanceEmailsCount})</span>
                        </button>
                      </div>

                      {lowImportanceEmailsCount > 0 && (
                        <button
                          onClick={handleBatchArchiveLow}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1.5 shrink-0"
                          title="Przenieś wszystkie wykryte wiadomości mało ważne do archiwum"
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Zarchiwizuj wszystkie mało ważne ({lowImportanceEmailsCount})
                        </button>
                      )}
                    </div>

                    {/* Low Importance Notification Banner */}
                    {lowImportanceEmailsCount > 0 && mailFilter !== 'low_importance' && (
                      <div className="p-3.5 rounded-2xl bg-[#191512] border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-start gap-2.5">
                          <Brain className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold text-amber-300">
                              Pamięć reguł rozpoznała {lowImportanceEmailsCount} wiadomości o niskiej istotności.
                            </span>
                            <p className="text-slate-400 text-[11px] mt-0.5">
                              Pochodzą z adresów no-reply, newsletterów lub domen, które wcześniej oznaczyłeś jako mało ważne.
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setMailFilter('low_importance')}
                          className="text-amber-400 hover:text-amber-300 underline font-medium text-xs whitespace-nowrap self-end sm:self-auto"
                        >
                          Pokaż tylko mało ważne →
                        </button>
                      </div>
                    )}

                    {emails.length === 0 ? (
                      <div className="p-12 rounded-2xl bg-[#111317] border border-[#222222] text-center space-y-2">
                        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                        <h4 className="text-sm font-bold text-white">Czysta skrzynka odbiorcza!</h4>
                        <p className="text-xs text-slate-400">
                          Brak oczekujących wiadomości w Odebranych. Wszystkie zostały zarchiwizowane lub przeczytane.
                        </p>
                      </div>
                    ) : displayedEmails.length === 0 ? (
                      <div className="p-12 rounded-2xl bg-[#111317] border border-[#222222] text-center text-slate-400 text-xs">
                        Brak wiadomości spełniających kryteria wybranego filtra ({mailFilter}).
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Email List (Left 2 cols) */}
                        <div className="lg:col-span-2 space-y-3">
                          {displayedEmails.map(({ email: msg, isImportant, isLowImportance, reason }) => (
                            <div
                              key={msg.id}
                              className={`p-4 rounded-2xl border transition-all ${
                                selectedEmail?.id === msg.id
                                  ? 'bg-[#181520] border-purple-500/40'
                                  : 'bg-[#111317] border-[#222222] hover:border-[#333333]'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div
                                  className="cursor-pointer flex-1 min-w-0"
                                  onClick={() => {
                                    setSelectedEmail(msg);
                                    setEmailAiReplyDraft(null);
                                  }}
                                >
                                  <div className="flex items-center gap-2 flex-wrap mb-1 min-w-0">
                                    {msg.isUnread && (
                                      <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" title="Nieprzeczytany" />
                                    )}
                                    {isImportant && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                                        ⭐ Istotne
                                      </span>
                                    )}
                                    {isLowImportance && (
                                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0" title={reason}>
                                        💤 Mało ważne
                                      </span>
                                    )}
                                    <h4 className="text-sm font-bold text-white truncate min-w-0 flex-1">
                                      {msg.subject || '(Bez tematu)'}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-1 min-w-0 flex-wrap">
                                    <span className="text-slate-300 font-medium truncate max-w-[220px]">Od: {msg.from}</span>
                                    {reason && isLowImportance && (
                                      <span className="text-[11px] text-amber-400/80 truncate max-w-xs">• {reason}</span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                                    {msg.bodyText || msg.snippet || ''}
                                  </p>
                                </div>

                                {/* Action Buttons: Zrobione & Mało ważne + Do puli + Szkic AI */}
                                <div className="flex flex-wrap sm:flex-col gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                  {/* Zrobione */}
                                  <button
                                    onClick={() => handleMarkEmailDone(msg)}
                                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs transition-colors flex items-center gap-1.5 font-medium"
                                    title="Załatwione: przenieś do archiwum i dodaj wpis do rejestru"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Zrobione</span>
                                  </button>

                                  {/* Mało ważne */}
                                  <button
                                    onClick={() => handleMarkEmailLowImportance(msg)}
                                    className="px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/25 text-xs transition-colors flex items-center gap-1.5 font-medium"
                                    title="Mało ważne: przenieś do archiwum i naucz pamięć reguł"
                                  >
                                    <MinusCircle className="w-3.5 h-3.5 text-amber-400" />
                                    <span>Mało ważne</span>
                                  </button>

                                  {/* Do puli */}
                                  <button
                                    onClick={() => handleConvertEmailToPoolTask(msg)}
                                    className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-[#4ade80]/20 hover:text-[#4ade80] text-slate-300 text-xs transition-colors flex items-center gap-1.5 font-medium"
                                    title="Dodaj jako zadanie do puli"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Do puli</span>
                                  </button>

                                  {/* Szkic AI */}
                                  <button
                                    onClick={() => handleDraftEmailReply(msg)}
                                    className="px-2.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs transition-colors flex items-center gap-1.5 font-medium"
                                    title="Wygeneruj szkic odpowiedzi z asystentem AI"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                                    <span>Szkic AI</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Email Detail / AI Reply Generator (Right 1 col) */}
                        <div className="bg-[#111317] border border-[#222222] rounded-2xl p-5 space-y-4 h-fit">
                          {selectedEmail ? (
                            <div className="space-y-4">
                              <div className="border-b border-[#222222] pb-3">
                                <span className="text-[11px] text-purple-400 font-semibold uppercase tracking-wider block">
                                  Podgląd wybranej wiadomości
                                </span>
                                <h4 className="text-base font-bold text-white mt-1">
                                  {selectedEmail.subject}
                                </h4>
                                <p className="text-xs text-slate-400 mt-0.5">Od: {selectedEmail.from}</p>

                                {/* Quick triage buttons on detail panel */}
                                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                                  <button
                                    onClick={() => handleMarkEmailDone(selectedEmail)}
                                    className="flex-1 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Zrobione
                                  </button>
                                  <button
                                    onClick={() => handleMarkEmailLowImportance(selectedEmail)}
                                    className="flex-1 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                                  >
                                    <MinusCircle className="w-3.5 h-3.5" />
                                    Mało ważne
                                  </button>
                                  <button
                                    onClick={() => handleConvertEmailToPoolTask(selectedEmail)}
                                    className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-[#4ade80]/20 hover:text-[#4ade80] text-slate-300 text-xs font-medium transition-colors"
                                    title="Dodaj do puli zadań"
                                  >
                                    + Pula
                                  </button>
                                </div>
                              </div>

                              <div className="bg-[#16181d] p-3 rounded-xl text-xs text-slate-300 max-h-56 overflow-y-auto leading-relaxed whitespace-pre-wrap">
                                {selectedEmail.bodyText || selectedEmail.snippet || 'Brak treści wiadomości.'}
                              </div>

                              {/* AI Reply Section */}
                              <div className="space-y-2 pt-2 border-t border-[#222222]">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-[#4ade80] flex items-center gap-1.5">
                                    <Sparkles className="w-3.5 h-3.5" />
                                    Szkic odpowiedzi AI:
                                  </span>
                                  <button
                                    onClick={() => handleDraftEmailReply(selectedEmail)}
                                    disabled={isDraftingReply}
                                    className="text-[11px] text-slate-400 hover:text-white"
                                  >
                                    {isDraftingReply ? 'Generowanie...' : 'Generuj ponownie'}
                                  </button>
                                </div>

                                {emailAiReplyDraft ? (
                                  <div className="space-y-3">
                                    <textarea
                                      value={emailAiReplyDraft}
                                      onChange={e => setEmailAiReplyDraft(e.target.value)}
                                      rows={5}
                                      className="w-full bg-[#16181d] border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                                    />
                                    <div className="flex items-center justify-end gap-2">
                                      <button
                                        onClick={async () => {
                                          if (!googleToken) return;
                                          try {
                                            await sendGmailMessage({
                                              to: selectedEmail.from,
                                              subject: `Re: ${selectedEmail.subject}`,
                                              body: emailAiReplyDraft,
                                              threadId: selectedEmail.threadId
                                            });
                                            showToast('Odpowiedź została wysłana!');
                                            setEmailAiReplyDraft(null);
                                          } catch (err) {
                                            console.warn('Send error:', err);
                                          }
                                        }}
                                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-[#4ade80] text-black hover:bg-[#3ec972] transition-colors flex items-center gap-1.5"
                                      >
                                        <Send className="w-3.5 h-3.5" />
                                        Wyślij odpowiedź
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleDraftEmailReply(selectedEmail)}
                                    disabled={isDraftingReply}
                                    className="w-full py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    {isDraftingReply ? 'Generowanie szkicu AI...' : 'Wygeneruj gotową odpowiedź'}
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                              <Mail className="w-8 h-8 text-slate-600 mx-auto" />
                              <p>Wybierz wiadomość z listy po lewej, aby zobaczyć szczegóły lub wygenerować odpowiedź AI.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================================
                    SUB-VIEW 2: REGISTRY (REJESTR AKCJI POCZTY - GDZIE TRAFIŁY MAILE)
                    ========================================================================= */}
                {mailSubView === 'registry' && (
                  <div className="space-y-4">
                    {/* Header & Stats Strip */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-4 rounded-2xl bg-[#111317] border border-[#222222]">
                        <span className="text-xs text-slate-400 block">Zarchiwizowane łącznie</span>
                        <span className="text-2xl font-bold text-white mt-1 block">{emailRegistry.length}</span>
                        <span className="text-[11px] text-slate-400 mt-1 block">Wszystkie akcje w systemie</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#111317] border border-emerald-500/20">
                        <span className="text-xs text-emerald-400 block flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Oznaczone jako "Zrobione"
                        </span>
                        <span className="text-2xl font-bold text-emerald-400 mt-1 block">
                          {emailRegistry.filter(r => r.action === 'done').length}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">Załatwione sprawy</span>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#111317] border border-amber-500/20">
                        <span className="text-xs text-amber-400 block flex items-center gap-1.5">
                          <MinusCircle className="w-3.5 h-3.5" />
                          Oznaczone jako "Mało ważne"
                        </span>
                        <span className="text-2xl font-bold text-amber-400 mt-1 block">
                          {emailRegistry.filter(r => r.action === 'low_importance').length}
                        </span>
                        <span className="text-[11px] text-slate-400 mt-1 block">Odsiane przez pamięć reguł</span>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#111317] p-3.5 rounded-2xl border border-[#222222]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setRegistryFilter('all')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            registryFilter === 'all'
                              ? 'bg-white/15 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Wszystkie ({emailRegistry.length})
                        </button>
                        <button
                          onClick={() => setRegistryFilter('done')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            registryFilter === 'done'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Zrobione ({emailRegistry.filter(r => r.action === 'done').length})
                        </button>
                        <button
                          onClick={() => setRegistryFilter('low_importance')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                            registryFilter === 'low_importance'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Mało ważne ({emailRegistry.filter(r => r.action === 'low_importance').length})
                        </button>
                      </div>

                      {/* Search in registry */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={registrySearch}
                          onChange={e => setRegistrySearch(e.target.value)}
                          placeholder="Szukaj po temacie lub nadawcy..."
                          className="pl-8 pr-3 py-1.5 bg-[#16181d] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 w-full sm:w-64"
                        />
                      </div>
                    </div>

                    {/* Registry List */}
                    {filteredRegistry.length === 0 ? (
                      <div className="p-12 rounded-2xl bg-[#111317] border border-[#222222] text-center space-y-2">
                        <Archive className="w-8 h-8 text-slate-600 mx-auto" />
                        <h4 className="text-sm font-bold text-white">Rejestr jest pusty</h4>
                        <p className="text-xs text-slate-400 max-w-sm mx-auto">
                          Gdy oznaczysz wiadomość jako "Zrobione" lub "Mało ważne", pojawi się tutaj jej pełna ewidencja wraz z możliwością przywrócenia.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredRegistry.map(record => (
                          <div
                            key={record.id}
                            className="p-4 rounded-2xl bg-[#111317] border border-[#222222] hover:border-[#333333] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                          >
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                {record.action === 'done' ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                    Zrobione
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                                    <MinusCircle className="w-3 h-3 text-amber-400" />
                                    Mało ważne
                                  </span>
                                )}

                                {record.archived ? (
                                  <span className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-400">
                                    W archiwum Gmail
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[11px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                    Przywrócono do Odebranych
                                  </span>
                                )}

                                <span className="text-xs text-slate-400">
                                  {new Date(record.timestamp).toLocaleString('pl-PL', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              <h4 className="text-sm font-bold text-white mt-1">
                                {record.subject || '(Bez tematu)'}
                              </h4>

                              <div className="flex items-center gap-3 text-xs text-slate-400">
                                <span>Od: <strong className="text-slate-300">{record.from}</strong></span>
                                {(record.notes || record.senderDomain) && (
                                  <span className="text-amber-400/90 text-[11px]">
                                    (Pamięć: {record.notes || `@${record.senderDomain}`})
                                  </span>
                                )}
                              </div>

                              {record.snippet && (
                                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                                  {record.snippet}
                                </p>
                              )}
                            </div>

                            {/* Actions in Registry */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                              {/* Reclassify toggle */}
                              <button
                                onClick={() =>
                                  handleReclassifyRegistryRecord(
                                    record,
                                    record.action === 'done' ? 'low_importance' : 'done'
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors"
                                title="Zmień kategorię wpisu w rejestrze"
                              >
                                {record.action === 'done' ? 'Zmień na: Mało ważne' : 'Zmień na: Zrobione'}
                              </button>

                              {/* Restore to INBOX button */}
                              {record.archived && (
                                <button
                                  onClick={() => handleRestoreFromRegistry(record)}
                                  className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                                  title="Przywróć tę wiadomość do skrzynki odbiorczej w Gmail"
                                >
                                  <Undo2 className="w-3.5 h-3.5" />
                                  Przywróć do Odebranych
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* =========================================================================
                    SUB-VIEW 3: RULES & MEMORY (PAMIĘĆ & REGUŁY ISTOTNOŚCI)
                    ========================================================================= */}
                {mailSubView === 'rules' && (
                  <div className="space-y-6">
                    {/* Explanatory Banner */}
                    <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/30 via-[#111317] to-[#111317] border border-purple-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 max-w-2xl">
                        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase tracking-wider">
                          <Brain className="w-4 h-4" />
                          Jak działa Pamięć Reguł AI
                        </div>
                        <h3 className="text-base font-bold text-white">
                          Automatyczne uczenie się i eliminacja szumu
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Za każdym razem, gdy klikasz przycisk <strong className="text-amber-300 font-semibold">"Mało ważne"</strong>, asystent zapamiętuje domenę lub adres e-mail nadawcy. Następne wiadomości z tych źródeł trafiają automatycznie do sekcji "Mało ważne", co pozwala na ich błyskawiczne hurtowe archiwizowanie.
                        </p>
                      </div>

                      <button
                        onClick={() => setIsAddRuleOpen(!isAddRuleOpen)}
                        className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition-colors flex items-center gap-2 shrink-0 self-start md:self-center shadow-lg shadow-purple-600/20"
                      >
                        <Plus className="w-4 h-4" />
                        Dodaj własną regułę
                      </button>
                    </div>

                    {/* Add Custom Rule Inline Form */}
                    {isAddRuleOpen && (
                      <div className="p-5 rounded-2xl bg-[#16181d] border border-purple-500/40 space-y-4">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <Plus className="w-4 h-4 text-purple-400" />
                          Nowa reguła sortowania wiadomości
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                              Typ dopasowania
                            </label>
                            <select
                              value={newRuleType}
                              onChange={e => setNewRuleType(e.target.value as any)}
                              className="w-full bg-[#111317] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="sender_email">Konkretny e-mail nadawcy</option>
                              <option value="sender_domain">Domena nadawcy (np. firma.com)</option>
                              <option value="keyword">Słowo kluczowe w temacie</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                              Wartość (np. newsletter@..., domena.pl, "oferta")
                            </label>
                            <input
                              type="text"
                              value={newRuleValue}
                              onChange={e => setNewRuleValue(e.target.value)}
                              placeholder="Wpisz adres, domenę lub frazę..."
                              className="w-full bg-[#111317] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                              Kwalifikacja
                            </label>
                            <select
                              value={newRuleCategory}
                              onChange={e => setNewRuleCategory(e.target.value as any)}
                              className="w-full bg-[#111317] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                            >
                              <option value="low_importance">Mało ważne (do odsiewu)</option>
                              <option value="important">⭐ Zawsze istotne</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => setIsAddRuleOpen(false)}
                            className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                          >
                            Anuluj
                          </button>
                          <button
                            onClick={handleAddCustomRule}
                            className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#4ade80] text-black hover:bg-[#3ec972] transition-colors"
                          >
                            Zapisz regułę
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Rules List */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                          Lista reguł w pamięci ({emailRules.length})
                        </h4>
                        <span className="text-xs text-slate-400">
                          {emailRules.filter(r => r.enabled).length} aktywnych reguł
                        </span>
                      </div>

                      {emailRules.length === 0 ? (
                        <div className="p-8 rounded-2xl bg-[#111317] border border-[#222222] text-center text-slate-400 text-xs">
                          Brak zdefiniowanych reguł. Oznacz pierwszą wiadomość jako "Mało ważne", aby asystent zapisał regułę.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {emailRules.map(rule => (
                            <div
                              key={rule.id}
                              className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                                rule.enabled
                                  ? 'bg-[#111317] border-[#222222]'
                                  : 'bg-[#0f1013] border-white/5 opacity-60'
                              }`}
                            >
                              <div className="space-y-1 truncate flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white/10 text-slate-300">
                                    {rule.type === 'sender_domain'
                                      ? 'Domena'
                                      : rule.type === 'sender_email'
                                      ? 'E-mail'
                                      : 'Słowo'}
                                  </span>

                                  {rule.category === 'low_importance' ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-300">
                                      Mało ważne
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300">
                                      ⭐ Istotne
                                    </span>
                                  )}

                                  {rule.source === 'auto_learned' ? (
                                    <span className="text-[10px] text-purple-400">
                                      • Nauczyłem się z akcji
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500">
                                      • Własna
                                    </span>
                                  )}
                                </div>

                                <h5 className="text-sm font-mono font-bold text-white truncate">
                                  {rule.value}
                                </h5>

                                <p className="text-[11px] text-slate-400">
                                  Trafień: <strong className="text-slate-300">{rule.hitCount}</strong>
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleToggleRule(rule.id)}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                    rule.enabled
                                      ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                  }`}
                                  title={rule.enabled ? 'Wyłącz tę regułę' : 'Włącz tę regułę'}
                                >
                                  {rule.enabled ? 'Aktywna' : 'Wyłączona'}
                                </button>

                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                                  title="Usuń regułę"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: ADD NEW TASK TO POOL
          ========================================================================= */}
      <AnimatePresence>
        {isAddTaskModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111317] border border-[#222222] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#4ade80]" />
                Dodaj Nowe Zadanie do Puli
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">
                    Tytuł zadania:
                  </label>
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    placeholder="np. Przygotować materiały dla studentów..."
                    className="w-full bg-[#16181d] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#4ade80]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Priorytet:
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={e => setNewTaskPriority(e.target.value as any)}
                      className="w-full bg-[#16181d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                    >
                      <option value="urgent">Pilny (Urgent)</option>
                      <option value="high">Wysoki (High)</option>
                      <option value="medium">Średni (Medium)</option>
                      <option value="low">Niski (Low)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-400 block mb-1">
                      Kategoria:
                    </label>
                    <select
                      value={newTaskCategory}
                      onChange={e => setNewTaskCategory(e.target.value as TaskCategory)}
                      className="w-full bg-[#16181d] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#4ade80]"
                    >
                      <option value="work">Praca</option>
                      <option value="learning">Edukacja / Nauka</option>
                      <option value="project">Projekt</option>
                      <option value="health">Zdrowie</option>
                      <option value="personal">Osobiste</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#222222]">
                <button
                  onClick={() => setIsAddTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    if (!newTaskTitle.trim()) return;
                    addTask({
                      title: newTaskTitle.trim(),
                      status: 'todo',
                      priority: newTaskPriority,
                      category: newTaskCategory,
                      in_pool: true,
                      due_date: '',
                      color: '#4ade80'
                    });
                    setNewTaskTitle('');
                    setIsAddTaskModalOpen(false);
                    showToast('Dodano zadanie do puli!');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#4ade80] text-black hover:bg-[#3ec972] transition-colors"
                >
                  Dodaj do Puli
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL: PICK DATE & TIME TO SCHEDULE POOL TASK
          ========================================================================= */}
      <AnimatePresence>
        {schedulingTaskId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111317] border border-[#222222] rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#4ade80]" />
                Przypisz Zadanie do Dnia i Godziny
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Wybierz datę:</label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={e => setScheduleDate(e.target.value)}
                    className="w-full bg-[#16181d] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Godzina rozpoczęcia:</label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={e => setScheduleTime(e.target.value)}
                    className="w-full bg-[#16181d] border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#4ade80]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#222222]">
                <button
                  onClick={() => setSchedulingTaskId(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Anuluj
                </button>
                <button
                  onClick={() => {
                    const task = tasks.find(t => t.id === schedulingTaskId);
                    if (task && scheduleDate) {
                      handleSchedulePoolTask(task, scheduleDate, scheduleTime);
                    }
                  }}
                  className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-[#4ade80] text-black hover:bg-[#3ec972]"
                >
                  Zapisz na osi czasu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
