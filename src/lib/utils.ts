import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Habit Tracking Utilities
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
  today.setHours(0, 0, 0, 0);

  let checkDate = new Date(today);
  
  // Current Streak logic: count backwards from today or yesterday
  const hasToday = sorted.includes(checkDate.toISOString().split('T')[0]);
  
  // Allow streak to continue if today is not completed yet, but yesterday was
  let dateToMatch = new Date(today);
  if (!hasToday) {
    dateToMatch.setDate(dateToMatch.getDate() - 1);
  }

  for (let i = 0; i < 365; i++) { // Practical limit
    const dateStr = dateToMatch.toISOString().split('T')[0];
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

  // 7 Days Completion Rate
  let daysCompletedIn7 = 0;
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  
  for (const dateStr of sorted) {
    const d = new Date(dateStr);
    if (d > sevenDaysAgo && d <= today) {
      daysCompletedIn7++;
    }
  }
  
  const completionRate7Days = Math.round((daysCompletedIn7 / 7) * 100);

  return { currentStreak, longestStreak, completionRate7Days };
}
