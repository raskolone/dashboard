import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Habit Tracking Utilities
export function getLocalDateStr(d?: Date) {
  const date = d || new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function calculateHabitStats(completedDates: string[]) {
  if (!completedDates || completedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0, completionRate7Days: 0 };
  }

  // Sort dates descending
  const sorted = [...completedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  // Calculate Streaks
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  
  const today = new Date();

  let dateToMatch = new Date(today);
  
  // Current Streak logic: count backwards from today or yesterday
  const hasToday = sorted.includes(getLocalDateStr(dateToMatch));
  
  // Allow streak to continue if today is not completed yet, but yesterday was
  if (!hasToday) {
    dateToMatch.setDate(dateToMatch.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) { // Practical limit
    const dateStr = getLocalDateStr(dateToMatch);
    if (sorted.includes(dateStr)) {
      currentStreak++;
      dateToMatch.setDate(dateToMatch.getDate() - 1);
    } else {
      break;
    }
  }

  // Longest Streak logic
  if (sorted.length > 0) {
    let curr = Math.floor(new Date(sorted[0]).getTime() / 86400000);
    tempStreak = 1;
    longestStreak = 1;
    
    for (let i = 1; i < sorted.length; i++) {
      const next = Math.floor(new Date(sorted[i]).getTime() / 86400000);
      if (curr - next === 1) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else if (curr - next > 1) {
        tempStreak = 1;
      }
      curr = next;
    }
  }

  // 7 Days and 30 Days Completion Rate
  let daysCompletedIn7 = 0;
  let daysCompletedIn30 = 0;
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    if (d > sevenDaysAgo && d <= today) {
      daysCompletedIn7++;
    }
    if (d > thirtyDaysAgo && d <= today) {
      daysCompletedIn30++;
    }
  }
  
  const completionRate7Days = Math.round((daysCompletedIn7 / 7) * 100);
  const completionRate30Days = Math.round((daysCompletedIn30 / 30) * 100);

  return { currentStreak, longestStreak, completionRate7Days, completionRate30Days };
}

export function getEventDurationInfo(start_time?: string, end_time?: string, lang: 'pl' | 'en' = 'pl') {
  if (!start_time || !end_time || (start_time === '00:00' && end_time === '23:59')) {
    return {
      durationMinutes: 1440,
      formattedDuration: lang === 'pl' ? 'Cały dzień' : 'All day',
      isAllDay: true,
      timeSpan: lang === 'pl' ? 'Cały dzień' : 'All day',
      startHour: 0,
      startMinute: 0,
      endHour: 23,
      endMinute: 59,
    };
  }

  const [sh, sm] = start_time.split(':').map(Number);
  const [eh, em] = end_time.split(':').map(Number);
  let durationMinutes = (eh * 60 + (em || 0)) - (sh * 60 + (sm || 0));
  if (durationMinutes <= 0) durationMinutes = 60; // graceful fallback

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;

  let formattedDuration = '';
  if (hours > 0 && mins > 0) {
    formattedDuration = lang === 'pl' ? `${hours} godz. ${mins} min` : `${hours}h ${mins}m`;
  } else if (hours > 0) {
    formattedDuration = lang === 'pl' 
      ? `${hours} ${hours === 1 ? 'godz.' : 'godz.'}` 
      : `${hours}h`;
  } else {
    formattedDuration = lang === 'pl' ? `${mins} min` : `${mins}m`;
  }

  return {
    durationMinutes,
    formattedDuration,
    isAllDay: false,
    timeSpan: `${start_time} – ${end_time}`,
    startHour: sh,
    startMinute: sm || 0,
    endHour: eh,
    endMinute: em || 0,
  };
}

export function formatEventLocation(location?: string, lang: 'pl' | 'en' = 'pl'): { isUrl: boolean; label: string; url?: string } {
  if (!location) return { isUrl: false, label: '' };
  const trimmed = location.trim();
  if (!trimmed) return { isUrl: false, label: '' };

  if (/^https?:\/\//i.test(trimmed)) {
    if (trimmed.includes('calendar.google.com') || trimmed.includes('google.com/calendar')) {
      return { isUrl: true, label: lang === 'pl' ? 'Kalendarz Google' : 'Google Calendar', url: trimmed };
    }
    if (trimmed.includes('meet.google.com')) {
      return { isUrl: true, label: 'Google Meet', url: trimmed };
    }
    if (trimmed.includes('zoom.us')) {
      return { isUrl: true, label: 'Zoom', url: trimmed };
    }
    if (trimmed.includes('teams.microsoft.com') || trimmed.includes('teams.live.com')) {
      return { isUrl: true, label: 'MS Teams', url: trimmed };
    }
    return { isUrl: true, label: lang === 'pl' ? 'Spotkanie online' : 'Online meeting', url: trimmed };
  }

  // Common Google indicators
  if (trimmed === 'Wydarzenie Google' || trimmed === 'Google Event') {
    return { isUrl: false, label: lang === 'pl' ? 'Wydarzenie Google' : 'Google Event' };
  }

  return { isUrl: false, label: trimmed };
}

export function getEventTypeName(type?: string, lang: 'pl' | 'en' = 'pl'): string {
  const t = (type || 'meeting').toLowerCase();
  if (lang === 'pl') {
    switch (t) {
      case 'meeting':
        return 'Spotkanie';
      case 'lesson':
        return 'Lekcja';
      case 'deadline':
        return 'Termin';
      case 'reminder':
        return 'Przypomnienie';
      case 'personal':
        return 'Prywatne';
      default:
        return t.charAt(0).toUpperCase() + t.slice(1);
    }
  }

  switch (t) {
    case 'meeting':
      return 'Meeting';
    case 'lesson':
      return 'Lesson';
    case 'deadline':
      return 'Deadline';
    case 'reminder':
      return 'Reminder';
    case 'personal':
      return 'Personal';
    default:
      return t.charAt(0).toUpperCase() + t.slice(1);
  }
}
