import { CalendarEvent, Task } from '../types';
import { GmailMessage, createGmailDraft } from './gmail';
import { draftReplyWithSiftAI } from './aiService';
import { isWithinInterval, addDays, parseISO, startOfDay, endOfDay, isToday, isPast } from 'date-fns';

export type ContactClassification = 'confirmed' | 'needs_reply' | 'no_contact' | 'new_lead' | 'no_action';

export interface StudentAgendaItem {
  id: string;
  name: string;
  email?: string;
  source?: 'Cribro English' | 'JCL' | 'Inspiro' | 'Indywidualni' | 'Inne';
  status: ContactClassification;
  contextText: string;
  eventDate?: string;
  eventTime?: string;
  eventTitle?: string;
  lastEmailSnippet?: string;
  lastEmailDate?: string;
  lastEmailSubject?: string;
  emailId?: string;
}

export interface AgendaReport {
  dateRangeStr: string;
  eventsCount: number;
  tasksCount: number;
  emailsNeedReplyCount: number;
  urgentTasksCount: number;
  
  // Section 1: What to do today / urgent
  tasksTodo: {
    id: string;
    title: string;
    priority: string;
    status: string;
    isOverdue?: boolean;
    isToday?: boolean;
  }[];

  // Section 2: Emails that need reply
  emailsToReply: {
    id: string;
    from: string;
    name: string;
    subject: string;
    snippet: string;
    date: string;
    isLead?: boolean;
    threadId: string;
  }[];

  // Section 3: Classified students & contacts
  studentItems: StudentAgendaItem[];

  // Section 4: Action required items (only 📩, ⚠️, 🆕)
  actionRequiredList: StudentAgendaItem[];

  // Natural language summary line
  quickSummary: string;
}

// Helper to filter out purely personal routines unless work-related
export function isWorkCalendarEvent(event: CalendarEvent): boolean {
  const title = (event.title || '').toLowerCase();
  const desc = (event.description || '').toLowerCase();
  const text = `${title} ${desc}`;

  // Signals for lessons / work / students
  const workKeywords = [
    'lekcja', 'lesson', 'kursant', 'student', 'angielski', 'english',
    'jcl', 'inspiro', 'cribro', 'konsultacja', 'spotkanie', 'meeting',
    'rozmowa', 'call', 'zajęcia', 'klient', 'consultation'
  ];

  const personalKeywords = [
    'święta', 'urodziny', 'trening', 'lekarz', 'obiad', 'spacer', 'zakupy', 'family', 'reminders'
  ];

  const hasWorkKeyword = workKeywords.some(kw => text.includes(kw));
  const hasPersonalKeyword = personalKeywords.some(kw => text.includes(kw));

  if (hasWorkKeyword) return true;
  if (hasPersonalKeyword) return false;

  // Default: if it's named after a person or has attendees, treat as potential work
  return true;
}

// Extract human name or company from event title
export function extractContactName(title: string): string {
  let clean = title.replace(/^(Lekcja|Lesson|Zajęcia|Spotkanie|Meeting|Konsultacja|Call|JCL|Inspiro|Cribro):\s*/i, '').trim();
  clean = clean.replace(/(\s*-\s*(JCL|Inspiro|Cribro|Online|Google Meet|Zoom).*)$/i, '').trim();
  return clean || title;
}

// Analyze and cross-reference tasks, events and emails according to the Agenda skill
export function buildAgendaReport(params: {
  events: CalendarEvent[];
  tasks: Task[];
  emails: GmailMessage[];
  language?: 'pl' | 'en';
}): AgendaReport {
  const now = new Date();
  const todayStart = startOfDay(now);
  const next7DaysEnd = endOfDay(addDays(now, 7));
  const lang = params.language || 'pl';

  // 1. Next 7 days calendar events
  const next7DaysEvents = (params.events || []).filter(e => {
    if (!e.date) return false;
    try {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: todayStart, end: next7DaysEnd }) && isWorkCalendarEvent(e);
    } catch {
      return false;
    }
  });

  // 2. Tasks to do today / overdue / urgent
  const todayStr = now.toISOString().split('T')[0];
  const activeTasks = (params.tasks || []).filter(t => t.status !== 'done');
  
  const tasksTodo = activeTasks
    .filter(t => t.due_date === todayStr || (!t.in_pool && t.due_date && t.due_date < todayStr) || t.priority === 'urgent' || t.priority === 'high')
    .slice(0, 6)
    .map(t => ({
      id: t.id,
      title: t.title,
      priority: t.priority,
      status: t.status,
      isOverdue: !!(t.due_date && t.due_date < todayStr),
      isToday: t.due_date === todayStr
    }));

  const urgentTasksCount = tasksTodo.filter(t => t.isOverdue || t.priority === 'urgent').length;

  // 3. Process emails for replies
  const emailsToReply: AgendaReport['emailsToReply'] = [];
  const senderEmailMap = new Map<string, GmailMessage>();

  (params.emails || []).forEach(msg => {
    const fromLower = msg.from.toLowerCase();
    const isUnread = msg.isUnread;
    const isSent = msg.labelIds?.includes('SENT');

    // Store latest incoming
    if (!isSent) {
      senderEmailMap.set(fromLower, msg);
    }

    // Check if email looks like inquiry / student email needing reply
    if (!isSent && (isUnread || msg.subject.toLowerCase().includes('lekcj') || msg.subject.toLowerCase().includes('zajęc') || msg.subject.toLowerCase().includes('termin') || msg.subject.toLowerCase().includes('pytanie') || msg.subject.toLowerCase().includes('angielski'))) {
      const senderName = msg.from.replace(/<[^>]+>/, '').trim() || msg.from;
      const isLead = msg.subject.toLowerCase().includes('współprac') || msg.subject.toLowerCase().includes('oferta') || msg.subject.toLowerCase().includes('zapis') || msg.subject.toLowerCase().includes('nowy');
      
      emailsToReply.push({
        id: msg.id,
        from: msg.from,
        name: senderName,
        subject: msg.subject,
        snippet: msg.snippet || msg.bodyText.slice(0, 140),
        date: msg.date,
        isLead,
        threadId: msg.threadId
      });
    }
  });

  // 4. Cross-reference events with emails to classify students
  const studentItems: StudentAgendaItem[] = [];

  next7DaysEvents.forEach(ev => {
    const contactName = extractContactName(ev.title);
    const titleLower = ev.title.toLowerCase();

    let source: StudentAgendaItem['source'] = 'Indywidualni';
    if (titleLower.includes('jcl')) source = 'JCL';
    else if (titleLower.includes('inspiro')) source = 'Inspiro';
    else if (titleLower.includes('cribro')) source = 'Cribro English';

    // Look for matching email by contact name or event attendees
    let matchingMsg: GmailMessage | undefined = undefined;
    for (const [senderKey, msg] of senderEmailMap.entries()) {
      if (senderKey.includes(contactName.toLowerCase()) || msg.subject.toLowerCase().includes(contactName.toLowerCase()) || msg.snippet.toLowerCase().includes(contactName.toLowerCase())) {
        matchingMsg = msg;
        break;
      }
    }

    let status: ContactClassification = 'confirmed';
    let contextText = lang === 'pl' ? 'Zajęcia w kalendarzu, status potwierdzony.' : 'Lesson on schedule, confirmed.';

    if (matchingMsg && matchingMsg.isUnread) {
      status = 'needs_reply';
      contextText = lang === 'pl'
        ? `Czeka na Twoją odpowiedź do maila: "${matchingMsg.subject}"`
        : `Awaiting your reply to: "${matchingMsg.subject}"`;
    } else if (!matchingMsg && (ev.title.toLowerCase().includes('pierwsz') || ev.title.toLowerCase().includes('nowy') || ev.title.toLowerCase().includes('konsultac'))) {
      status = 'no_contact';
      contextText = lang === 'pl'
        ? 'Brak wysłanych materiałów lub potwierdzenia linku do spotkania.'
        : 'Missing introductory materials or meeting link confirmation.';
    }

    studentItems.push({
      id: ev.id,
      name: contactName,
      source,
      status,
      contextText,
      eventDate: ev.date,
      eventTime: ev.start_time,
      eventTitle: ev.title,
      lastEmailSubject: matchingMsg?.subject,
      lastEmailSnippet: matchingMsg?.snippet,
      lastEmailDate: matchingMsg?.date,
      emailId: matchingMsg?.id
    });
  });

  // Also check for new leads from emails that have NO calendar event
  emailsToReply.forEach(em => {
    const alreadyMatched = studentItems.some(s => s.name.toLowerCase().includes(em.name.toLowerCase()) || em.from.toLowerCase().includes(s.name.toLowerCase()));
    if (!alreadyMatched && em.isLead) {
      studentItems.push({
        id: `lead-${em.id}`,
        name: em.name,
        source: 'Cribro English',
        status: 'new_lead',
        contextText: lang === 'pl'
          ? `Nowe zapytanie o lekcje: "${em.subject}". Nie ma jeszcze w kalendarzu.`
          : `New inquiry about lessons: "${em.subject}". Not yet on calendar.`,
        lastEmailSubject: em.subject,
        lastEmailSnippet: em.snippet,
        lastEmailDate: em.date,
        emailId: em.id
      });
    }
  });

  // Action required items (only 📩, ⚠️, 🆕)
  const actionRequiredList = studentItems.filter(s => s.status === 'needs_reply' || s.status === 'no_contact' || s.status === 'new_lead');

  // Quick summary line
  const dateRangeStr = `${now.toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { day: 'numeric', month: 'short' })} – ${addDays(now, 7).toLocaleDateString(lang === 'pl' ? 'pl-PL' : 'en-US', { day: 'numeric', month: 'short' })}`;
  
  let quickSummary = '';
  if (lang === 'pl') {
    quickSummary = `${next7DaysEvents.length} zaplanowanych zajęć w tym tygodniu. ${emailsToReply.length > 0 ? `${emailsToReply.length} wiadomości oczekuje na odpowiedź.` : 'Brak zaległych maili.'} ${tasksTodo.length > 0 ? `${tasksTodo.length} zadań do zrobienia na dziś.` : ''}`;
  } else {
    quickSummary = `${next7DaysEvents.length} scheduled sessions this week. ${emailsToReply.length > 0 ? `${emailsToReply.length} emails awaiting response.` : 'All emails answered.'} ${tasksTodo.length > 0 ? `${tasksTodo.length} tasks for today.` : ''}`;
  }

  return {
    dateRangeStr,
    eventsCount: next7DaysEvents.length,
    tasksCount: tasksTodo.length,
    emailsNeedReplyCount: emailsToReply.length,
    urgentTasksCount,
    tasksTodo,
    emailsToReply,
    studentItems,
    actionRequiredList,
    quickSummary
  };
}
