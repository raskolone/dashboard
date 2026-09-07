import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../store/AppContext';
import {
  fetchGmailMessages,
  fetchSingleGmailMessage,
  sendGmailMessage,
  createGmailDraft,
  modifyGmailMessage,
  trashGmailMessage,
  deleteGmailMessagePermanently,
  GmailMessage,
  fetchGmailProfile,
  GmailProfile
} from '../lib/gmail';
import {
  summarizeEmailWithSiftAI,
  draftReplyWithSiftAI,
  extractTasksFromEmailWithSiftAI
} from '../lib/aiService';
import {
  Mail,
  Inbox,
  Star,
  Send,
  FileEdit,
  Trash2,
  Archive,
  RefreshCw,
  Search,
  Plus,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Clock,
  User as UserIcon,
  Reply,
  Forward,
  MoreVertical,
  ExternalLink,
  ShieldCheck,
  CheckSquare,
  X,
  Bot
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type FolderType = 'INBOX' | 'STARRED' | 'SENT' | 'DRAFT' | 'TRASH' | 'ALL';

export function GmailPage() {
  const {
    user,
    googleToken,
    isGoogleConnected,
    loginGoogle,
    addTask,
    t,
    language
  } = useAppStore();

  // Active folder/label
  const [activeFolder, setActiveFolder] = useState<FolderType>('INBOX');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<GmailMessage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [gmailProfile, setGmailProfile] = useState<GmailProfile | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compose State
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeBody, setComposeBody] = useState('');
  const [composeThreadId, setComposeThreadId] = useState<string | undefined>(undefined);
  const [isSending, setIsSending] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // User Confirmation Modals (Mandatory for Workspace APIs)
  const [isConfirmSendOpen, setIsConfirmSendOpen] = useState(false);
  const [isConfirmTrashOpen, setIsConfirmTrashOpen] = useState(false);
  const [pendingTrashId, setPendingTrashId] = useState<string | null>(null);

  // SiftAI Email Assistant states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiGeneratedReply, setAiGeneratedReply] = useState<string | null>(null);
  const [aiExtractedTasks, setAiExtractedTasks] = useState<{ title: string; priority: 'low'|'medium'|'high'|'urgent' }[] | null>(null);

  // Inline Quick Reply
  const [inlineReplyText, setInlineReplyText] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Load Gmail messages
  const loadMessages = async (folder: FolderType = activeFolder, query: string = searchQuery) => {
    if (!googleToken) return;
    setIsLoading(true);
    try {
      let labelIds: string[] | undefined = undefined;
      if (folder === 'INBOX') labelIds = ['INBOX'];
      else if (folder === 'STARRED') labelIds = ['STARRED'];
      else if (folder === 'SENT') labelIds = ['SENT'];
      else if (folder === 'DRAFT') labelIds = ['DRAFT'];
      else if (folder === 'TRASH') labelIds = ['TRASH'];

      const res = await fetchGmailMessages({
        labelIds,
        q: query.trim() ? query.trim() : undefined,
        maxResults: 25
      });

      setMessages(res.messages);

      // Also refresh profile if not loaded
      if (!gmailProfile) {
        fetchGmailProfile().then(setGmailProfile).catch(() => {});
      }
    } catch (err: any) {
      console.warn('Gmail fetch error:', err);
      if (err.message === 'UNAUTHORIZED_OR_EXPIRED') {
        showToast(language === 'pl' ? 'Sesja wygasła. Kliknij, aby zalogować się ponownie.' : 'Session expired. Please reconnect.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger load on folder or token change
  useEffect(() => {
    if (googleToken) {
      loadMessages(activeFolder, searchQuery);
    }
  }, [activeFolder, googleToken]);

  // Load single message detail when selected
  useEffect(() => {
    if (!selectedMessageId || !googleToken) {
      setSelectedMessage(null);
      return;
    }
    const local = messages.find(m => m.id === selectedMessageId);
    if (local) {
      setSelectedMessage(local);
      // Mark as read automatically in state and Gmail
      if (local.isUnread) {
        modifyGmailMessage(local.id, [], ['UNREAD']).catch(() => {});
        setMessages(prev => prev.map(m => m.id === local.id ? { ...m, isUnread: false, labelIds: m.labelIds.filter(l => l !== 'UNREAD') } : m));
      }
    } else {
      setIsDetailLoading(true);
      fetchSingleGmailMessage(selectedMessageId)
        .then(msg => {
          setSelectedMessage(msg);
          if (msg.isUnread) {
            modifyGmailMessage(msg.id, [], ['UNREAD']).catch(() => {});
          }
        })
        .catch(err => {
          console.warn('Error fetching single email:', err);
        })
        .finally(() => setIsDetailLoading(false));
    }

    // Reset AI assistants on email change
    setAiSummary(null);
    setAiGeneratedReply(null);
    setAiExtractedTasks(null);
    setInlineReplyText('');
  }, [selectedMessageId]);

  // Handle Search submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadMessages(activeFolder, searchQuery);
  };

  // Toggle Star
  const handleToggleStar = async (msg: GmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = !msg.isStarred;
    // Optimistic update
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isStarred: newStarred } : m));
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage(prev => prev ? { ...prev, isStarred: newStarred } : null);
    }

    try {
      if (newStarred) {
        await modifyGmailMessage(msg.id, ['STARRED'], []);
      } else {
        await modifyGmailMessage(msg.id, [], ['STARRED']);
      }
    } catch (err) {
      console.warn('Failed to star message:', err);
    }
  };

  // Toggle Read / Unread
  const handleToggleUnread = async (msg: GmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newUnread = !msg.isUnread;
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isUnread: newUnread } : m));
    if (selectedMessage?.id === msg.id) {
      setSelectedMessage(prev => prev ? { ...prev, isUnread: newUnread } : null);
    }

    try {
      if (newUnread) {
        await modifyGmailMessage(msg.id, ['UNREAD'], []);
      } else {
        await modifyGmailMessage(msg.id, [], ['UNREAD']);
      }
    } catch (err) {
      console.warn('Failed to toggle read state:', err);
    }
  };

  // Prompt Trash confirmation
  const handlePromptTrash = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPendingTrashId(id);
    setIsConfirmTrashOpen(true);
  };

  // Execute Trash after user confirms
  const handleConfirmTrash = async () => {
    if (!pendingTrashId) return;
    const idToTrash = pendingTrashId;
    setIsConfirmTrashOpen(false);
    setPendingTrashId(null);

    // Optimistic remove from current list
    setMessages(prev => prev.filter(m => m.id !== idToTrash));
    if (selectedMessageId === idToTrash) {
      setSelectedMessageId(null);
      setSelectedMessage(null);
    }

    try {
      await trashGmailMessage(idToTrash);
      showToast(language === 'pl' ? 'Wiadomość przeniesiona do kosza.' : 'Email moved to trash.');
    } catch (err) {
      console.warn('Failed to trash email:', err);
      showToast(language === 'pl' ? 'Błąd podczas usuwania wiadomości.' : 'Failed to move email to trash.');
      loadMessages();
    }
  };

  // Convert Email directly to Task in Task Pool
  const handleCreateTaskFromEmail = (msg: GmailMessage) => {
    const cleanSubject = msg.subject.replace(/^(Re|Fwd|Odp):\s*/i, '').trim();
    const desc = `${language === 'pl' ? 'E-mail od' : 'Email from'}: ${msg.from}\n${language === 'pl' ? 'Data' : 'Date'}: ${msg.date}\n\n${msg.snippet || msg.bodyText.slice(0, 300)}`;

    addTask({
      title: cleanSubject || (language === 'pl' ? 'Zadanie z e-maila' : 'Task from email'),
      description: desc,
      priority: 'medium',
      status: 'todo',
      due_date: '', // in pool
      in_pool: true
    });

    showToast(t('gmail.taskCreatedSuccess'));
  };

  // Send Email prompt
  const handlePromptSend = () => {
    if (!composeTo.trim()) {
      showToast(language === 'pl' ? 'Podaj adres odbiorcy.' : 'Please enter recipient email.');
      return;
    }
    setIsConfirmSendOpen(true);
  };

  // Execute Send after confirmation
  const handleExecuteSend = async () => {
    setIsConfirmSendOpen(false);
    setIsSending(true);
    try {
      await sendGmailMessage({
        to: composeTo.trim(),
        subject: composeSubject.trim() || '(Brak tematu)',
        body: composeBody.trim(),
        threadId: composeThreadId
      });

      showToast(language === 'pl' ? 'Wiadomość została wysłana!' : 'Email sent successfully!');
      setIsComposeOpen(false);
      setComposeTo('');
      setComposeSubject('');
      setComposeBody('');
      setComposeThreadId(undefined);

      // Refresh if in sent or inbox
      loadMessages();
    } catch (err) {
      console.error('Failed to send email:', err);
      showToast(language === 'pl' ? 'Błąd podczas wysyłania wiadomości.' : 'Failed to send email.');
    } finally {
      setIsSending(false);
    }
  };

  // Save draft
  const handleSaveDraft = async () => {
    if (!composeTo.trim() && !composeSubject.trim() && !composeBody.trim()) return;
    setIsSavingDraft(true);
    try {
      await createGmailDraft({
        to: composeTo.trim(),
        subject: composeSubject.trim() || '(Wersja robocza)',
        body: composeBody.trim()
      });
      showToast(language === 'pl' ? 'Wersja robocza zapisana!' : 'Draft saved!');
      setIsComposeOpen(false);
    } catch (err) {
      console.warn('Failed to save draft:', err);
      showToast(language === 'pl' ? 'Błąd podczas zapisywania wersji roboczej.' : 'Failed to save draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Open reply compose
  const handleOpenReply = (msg: GmailMessage) => {
    // Extract sender email from "Name <email@dom.com>"
    let replyTo = msg.from;
    const emailMatch = msg.from.match(/<([^>]+)>/);
    if (emailMatch && emailMatch[1]) {
      replyTo = emailMatch[1];
    }

    const reSubject = msg.subject.toLowerCase().startsWith('re:') || msg.subject.toLowerCase().startsWith('odp:')
      ? msg.subject
      : `Re: ${msg.subject}`;

    setComposeTo(replyTo);
    setComposeSubject(reSubject);
    setComposeBody(`\n\n--- W odpowiedzi na wiadomość z dnia ${msg.date} od ${msg.from} ---\n${msg.bodyText.slice(0, 500)}`);
    setComposeThreadId(msg.threadId);
    setIsComposeOpen(true);
  };

  // SiftAI: Summarize email
  const handleAiSummarize = async () => {
    if (!selectedMessage) return;
    setIsAiLoading(true);
    try {
      const summary = await summarizeEmailWithSiftAI({
        from: selectedMessage.from,
        subject: selectedMessage.subject,
        body: selectedMessage.bodyText,
        language
      });
      setAiSummary(summary);
    } finally {
      setIsAiLoading(false);
    }
  };

  // SiftAI: Draft reply
  const handleAiDraftReply = async () => {
    if (!selectedMessage) return;
    setIsAiLoading(true);
    try {
      const reply = await draftReplyWithSiftAI({
        from: selectedMessage.from,
        subject: selectedMessage.subject,
        body: selectedMessage.bodyText,
        language
      });
      setAiGeneratedReply(reply);
    } finally {
      setIsAiLoading(false);
    }
  };

  // SiftAI: Extract tasks
  const handleAiExtractTasks = async () => {
    if (!selectedMessage) return;
    setIsAiLoading(true);
    try {
      const tasksExtracted = await extractTasksFromEmailWithSiftAI({
        from: selectedMessage.from,
        subject: selectedMessage.subject,
        body: selectedMessage.bodyText,
        language
      });
      setAiExtractedTasks(tasksExtracted);
    } finally {
      setIsAiLoading(false);
    }
  };

  // SiftAI helper in Compose modal
  const handleAiDraftInCompose = async () => {
    if (!composeSubject.trim() && !composeBody.trim()) {
      showToast(language === 'pl' ? 'Wpisz chociaż temat lub zarys wiadomości.' : 'Please enter at least a subject or brief thought.');
      return;
    }
    setIsAiLoading(true);
    try {
      const drafted = await draftReplyWithSiftAI({
        from: user?.displayName || 'User',
        subject: composeSubject,
        body: composeBody || composeSubject,
        language
      });
      setComposeBody(drafted);
    } finally {
      setIsAiLoading(false);
    }
  };

  const folderNav = [
    { id: 'INBOX' as FolderType, name: t('gmail.inbox'), icon: Inbox },
    { id: 'STARRED' as FolderType, name: t('gmail.starred'), icon: Star },
    { id: 'SENT' as FolderType, name: t('gmail.sent'), icon: Send },
    { id: 'DRAFT' as FolderType, name: t('gmail.drafts'), icon: FileEdit },
    { id: 'TRASH' as FolderType, name: t('gmail.trash'), icon: Trash2 },
    { id: 'ALL' as FolderType, name: t('gmail.allMail'), icon: Archive },
  ];

  const unreadCount = useMemo(() => {
    return messages.filter(m => m.isUnread).length;
  }, [messages]);

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col rounded-3xl overflow-hidden glass-card border border-white/10 bg-[#0d0f12] text-white relative">
      {/* Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#4ade80] text-black font-semibold text-xs shadow-xl flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Bar */}
      <div className="h-16 px-6 border-b border-white/10 bg-black/40 flex items-center justify-between shrink-0 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#ea4335]/15 border border-[#ea4335]/30 flex items-center justify-center text-[#ea4335]">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-display font-bold text-white tracking-wide">
                {t('gmail.title')}
              </h1>
              {googleToken && (
                <span className="px-2 py-0.5 rounded-full bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Google OAuth
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              {t('gmail.subtitle')}
            </p>
          </div>
        </div>

        {/* Search Bar & Actions */}
        <div className="flex items-center gap-3 flex-1 max-w-md justify-end">
          {googleToken ? (
            <>
              <form onSubmit={handleSearchSubmit} className="relative flex-1 hidden md:block">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('gmail.searchPlaceholder')}
                  className="w-full pl-9 pr-8 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#4ade80] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); loadMessages(activeFolder, ''); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              <button
                onClick={() => loadMessages(activeFolder, searchQuery)}
                disabled={isLoading}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                title={t('gmail.refresh')}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#4ade80]' : ''}`} />
              </button>

              <button
                onClick={() => {
                  setComposeTo('');
                  setComposeSubject('');
                  setComposeBody('');
                  setComposeThreadId(undefined);
                  setIsComposeOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-black font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span className="hidden sm:inline">{t('gmail.composeBtn')}</span>
              </button>
            </>
          ) : (
            <button
              onClick={loginGoogle}
              className="px-4 py-2 rounded-xl bg-[#ea4335] hover:bg-[#ea4335]/90 text-white font-semibold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all"
            >
              <Mail className="w-4 h-4" />
              <span>{t('gmail.connectButton')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container */}
      {!googleToken ? (
        /* Not Connected State */
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-black/20">
          <div className="w-20 h-20 rounded-3xl bg-[#ea4335]/10 border border-[#ea4335]/25 flex items-center justify-center text-[#ea4335] mb-6 shadow-[0_0_30px_rgba(234,67,53,0.15)]">
            <Mail className="w-10 h-10" />
          </div>
          <h2 className="text-2xl font-display font-bold text-white mb-2">
            {t('gmail.connectGoogle')}
          </h2>
          <p className="text-sm text-slate-400 max-w-md mb-8 leading-relaxed">
            {t('gmail.connectGoogleDesc')}
          </p>

          <button
            onClick={loginGoogle}
            className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-[#1a1a1a] font-bold text-sm shadow-xl flex items-center gap-3 transition-transform active:scale-95 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
            </svg>
            <span>{t('login.ctaButton')}</span>
          </button>
        </div>
      ) : (
        /* Connected Mailbox Screen with Sidebar + Mail List + Reader View */
        <div className="flex-1 flex overflow-hidden">
          {/* Folders Navigation Bar */}
          <div className="w-56 border-r border-white/10 bg-black/30 p-3 flex flex-col shrink-0">
            <div className="space-y-1 mb-6">
              {folderNav.map((f) => {
                const Icon = f.icon;
                const isActive = activeFolder === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFolder(f.id);
                      setSelectedMessageId(null);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#4ade80]' : 'text-slate-400'}`} />
                      <span>{f.name}</span>
                    </div>
                    {f.id === 'INBOX' && unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-[#4ade80] text-black text-[10px] font-bold">
                        {unreadCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Account pill */}
            <div className="mt-auto p-3 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-[#ea4335] text-white flex items-center justify-center text-xs font-bold shrink-0">
                {user?.email?.charAt(0).toUpperCase() || 'G'}
              </div>
              <div className="overflow-hidden flex-1">
                <div className="text-[11px] font-semibold text-white truncate">
                  {user?.displayName || 'Google User'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'gmail'}
                </div>
              </div>
            </div>
          </div>

          {/* Email List Column */}
          <div className={`${selectedMessageId ? 'hidden lg:flex' : 'flex'} w-full lg:w-96 border-r border-white/10 flex-col bg-[#111317]/60 overflow-hidden shrink-0`}>
            {/* List Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-black/20">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                {folderNav.find(f => f.id === activeFolder)?.name} ({messages.length})
              </span>
              {isLoading && <span className="text-[11px] text-[#4ade80] animate-pulse">{t('gmail.refreshing')}</span>}
            </div>

            {/* List Items */}
            <div className="flex-1 overflow-y-auto divide-y divide-white/5">
              {isLoading && messages.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4ade80]" />
                  {t('gmail.refreshing')}
                </div>
              ) : messages.length === 0 ? (
                <div className="p-12 text-center">
                  <Inbox className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <div className="text-xs font-bold text-slate-400">{t('gmail.noMessages')}</div>
                  <div className="text-[11px] text-slate-600 mt-1">{t('gmail.noMessagesDesc')}</div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelected = selectedMessageId === msg.id;
                  return (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessageId(msg.id)}
                      className={`p-3.5 transition-colors cursor-pointer relative group flex gap-3 ${
                        isSelected
                          ? 'bg-[#4ade80]/10 border-l-2 border-[#4ade80]'
                          : msg.isUnread
                          ? 'bg-white/[0.03] hover:bg-white/[0.06]'
                          : 'hover:bg-white/[0.02] opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* Left: Star button */}
                      <button
                        onClick={(e) => handleToggleStar(msg, e)}
                        className="mt-0.5 text-slate-500 hover:text-amber-400 transition-colors shrink-0"
                      >
                        <Star className={`w-4 h-4 ${msg.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                      </button>

                      {/* Middle: Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className={`text-xs truncate ${msg.isUnread ? 'font-bold text-white' : 'font-medium text-slate-300'}`}>
                            {msg.from.replace(/<[^>]+>/, '').trim() || msg.from}
                          </span>
                          <span className="text-[10px] text-slate-500 shrink-0">
                            {msg.date.split(',')[0]}
                          </span>
                        </div>

                        <div className={`text-xs truncate mb-1 ${msg.isUnread ? 'font-semibold text-white' : 'text-slate-400'}`}>
                          {msg.subject}
                        </div>

                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {msg.snippet}
                        </p>
                      </div>

                      {/* Right unread indicator */}
                      {msg.isUnread && (
                        <div className="w-2 h-2 rounded-full bg-[#4ade80] shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Email Reader View (Right Pane) */}
          <div className={`${!selectedMessageId ? 'hidden lg:flex' : 'flex'} flex-1 flex-col bg-[#0d0f12] overflow-hidden`}>
            {selectedMessageId && selectedMessage ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Reader Header Actions */}
                <div className="p-4 border-b border-white/10 bg-black/40 flex items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedMessageId(null)}
                      className="lg:hidden p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleCreateTaskFromEmail(selectedMessage)}
                      className="px-3 py-1.5 rounded-xl bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title={t('gmail.createTaskFromEmail')}
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      <span>{language === 'pl' ? '+ Zadanie w Puli' : '+ Task to Pool'}</span>
                    </button>

                    <button
                      onClick={() => handleOpenReply(selectedMessage)}
                      className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>{t('gmail.reply')}</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleStar(selectedMessage)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                      title={selectedMessage.isStarred ? t('gmail.unstar') : t('gmail.star')}
                    >
                      <Star className={`w-4 h-4 ${selectedMessage.isStarred ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>

                    <button
                      onClick={() => handleToggleUnread(selectedMessage)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title={selectedMessage.isUnread ? t('gmail.markRead') : t('gmail.markUnread')}
                    >
                      <Mail className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handlePromptTrash(selectedMessage.id)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title={t('gmail.moveToTrash')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Email Body Scroll Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* Subject and Meta */}
                  <div>
                    <h2 className="text-xl font-bold text-white mb-3">
                      {selectedMessage.subject}
                    </h2>

                    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white/5 border border-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {selectedMessage.from.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-xs text-white">
                            {selectedMessage.from}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {t('gmail.to')} {selectedMessage.to || user?.email}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                          <Clock className="w-3 h-3" />
                          {selectedMessage.date}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SiftAI Mail Assistant Box */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/20 to-black/40 border border-purple-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-purple-300 text-xs font-bold">
                        <Bot className="w-4 h-4 text-[#4ade80]" />
                        <span>{t('gmail.aiAssistantHeader')}</span>
                      </div>
                      {isAiLoading && (
                        <span className="text-[11px] text-[#4ade80] animate-pulse">
                          {t('gmail.aiWorking')}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleAiSummarize}
                        disabled={isAiLoading}
                        className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-200 border border-purple-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>{t('gmail.aiSummarize')}</span>
                      </button>

                      <button
                        onClick={handleAiDraftReply}
                        disabled={isAiLoading}
                        className="px-3 py-1.5 rounded-xl bg-[#4ade80]/15 hover:bg-[#4ade80]/25 text-[#4ade80] border border-[#4ade80]/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <FileEdit className="w-3.5 h-3.5" />
                        <span>{t('gmail.aiDraftReply')}</span>
                      </button>

                      <button
                        onClick={handleAiExtractTasks}
                        disabled={isAiLoading}
                        className="px-3 py-1.5 rounded-xl bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>{t('gmail.aiExtractActionItems')}</span>
                      </button>
                    </div>

                    {/* AI Results Presentation */}
                    {aiSummary && (
                      <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-purple-500/30 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {aiSummary}
                      </div>
                    )}

                    {aiGeneratedReply && (
                      <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-[#4ade80]/30">
                        <div className="text-[11px] font-bold text-[#4ade80] mb-1.5">
                          {language === 'pl' ? 'Sugerowana odpowiedź SiftAI:' : 'Suggested SiftAI Reply:'}
                        </div>
                        <div className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed mb-3">
                          {aiGeneratedReply}
                        </div>
                        <button
                          onClick={() => {
                            setComposeTo(selectedMessage.from.match(/<([^>]+)>/)?.[1] || selectedMessage.from);
                            setComposeSubject(`Re: ${selectedMessage.subject}`);
                            setComposeBody(aiGeneratedReply);
                            setComposeThreadId(selectedMessage.threadId);
                            setIsComposeOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[#4ade80] text-black font-bold text-xs flex items-center gap-1.5 hover:bg-[#3ec470] cursor-pointer"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>{t('gmail.useReply')}</span>
                        </button>
                      </div>
                    )}

                    {aiExtractedTasks && (
                      <div className="mt-3 p-3.5 rounded-xl bg-black/40 border border-blue-500/30">
                        <div className="text-[11px] font-bold text-blue-300 mb-2">
                          {language === 'pl' ? 'Wyodrębnione zadania:' : 'Extracted tasks:'}
                        </div>
                        <div className="space-y-1.5">
                          {aiExtractedTasks.map((tItem, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/5">
                              <span className="text-xs text-white">{tItem.title}</span>
                              <button
                                onClick={() => {
                                  addTask({
                                    title: tItem.title,
                                    priority: tItem.priority,
                                    status: 'todo',
                                    due_date: '',
                                    in_pool: true
                                  });
                                  showToast(t('gmail.taskCreatedSuccess'));
                                }}
                                className="px-2 py-1 rounded bg-[#4ade80]/20 hover:bg-[#4ade80]/30 text-[#4ade80] text-[11px] font-bold cursor-pointer"
                              >
                                + Do Puli
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Message Content Body */}
                  <div className="p-6 rounded-2xl bg-[#13161b] border border-white/5 text-sm text-slate-200 leading-relaxed min-h-[250px] whitespace-pre-wrap font-sans">
                    {selectedMessage.bodyText || selectedMessage.snippet}
                  </div>
                </div>
              </div>
            ) : (
              /* Empty state when no email selected */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <Mail className="w-12 h-12 text-slate-700 mb-3" />
                <p className="text-xs font-semibold text-slate-400 max-w-sm">
                  {t('gmail.selectMessage')}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Compose Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-3xl bg-[#14171d] border border-white/15 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-white/10 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-[#4ade80]" />
                  <h3 className="font-display font-bold text-white text-base">
                    {t('gmail.composeBtn')}
                  </h3>
                </div>
                <button
                  onClick={() => setIsComposeOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Compose Form */}
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {t('gmail.recipients')}
                  </label>
                  <input
                    type="email"
                    value={composeTo}
                    onChange={(e) => setComposeTo(e.target.value)}
                    placeholder="np. jan.kowalski@example.com"
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#4ade80]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    {t('gmail.subject')}
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Temat wiadomości..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#4ade80]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-400">
                      {t('gmail.body')}
                    </label>
                    <button
                      type="button"
                      onClick={handleAiDraftInCompose}
                      disabled={isAiLoading}
                      className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-semibold cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{language === 'pl' ? 'Pomoc SiftAI w pisaniu' : 'SiftAI Writing Help'}</span>
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={composeBody}
                    onChange={(e) => setComposeBody(e.target.value)}
                    placeholder="Wpisz treść wiadomości..."
                    className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#4ade80] resize-none"
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSavingDraft}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                >
                  {isSavingDraft ? t('gmail.savingDraft') : t('gmail.saveDraft')}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsComposeOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    {t('common.cancel')}
                  </button>

                  <button
                    type="button"
                    onClick={handlePromptSend}
                    className="px-5 py-2 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-black font-bold text-xs shadow-lg flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{t('gmail.send')}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Confirmation Dialog for SENDING (Required by Workspace Integration Skill) */}
      <AnimatePresence>
        {isConfirmSendOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[#171a21] border border-white/15 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-[#4ade80]">
                <Send className="w-6 h-6" />
                <h3 className="font-display font-bold text-white text-lg">
                  {t('gmail.confirmSendTitle')}
                </h3>
              </div>

              <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
                <p>{t('gmail.confirmSendDesc')} <strong className="text-white">{user?.email}</strong></p>
                <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1">
                  <div><strong>{t('gmail.to')}:</strong> {composeTo}</div>
                  <div><strong>{t('gmail.subject')}:</strong> {composeSubject}</div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsConfirmSendOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSend}
                  disabled={isSending}
                  className="px-5 py-2.5 rounded-xl bg-[#4ade80] hover:bg-[#3ec470] text-black font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  {isSending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('gmail.sending')}</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>{t('gmail.send')}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User Confirmation Dialog for TRASH / DELETE (Required by Workspace Integration Skill) */}
      <AnimatePresence>
        {isConfirmTrashOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-3xl bg-[#171a21] border border-red-500/20 p-6 shadow-2xl space-y-5"
            >
              <div className="flex items-center gap-3 text-red-400">
                <Trash2 className="w-6 h-6" />
                <h3 className="font-display font-bold text-white text-lg">
                  {t('gmail.confirmDeleteTitle')}
                </h3>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {t('gmail.confirmDeleteDesc')}
              </p>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfirmTrashOpen(false);
                    setPendingTrashId(null);
                  }}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmTrash}
                  className="px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{t('gmail.moveToTrash')}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
