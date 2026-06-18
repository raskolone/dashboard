import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { Task, Habit, CalendarEvent, KnowledgeEntry, TaskStatus, TaskPriority, TaskCategory, EventType, KnowledgeCategory } from '../types';
import { mockTasks, mockHabits, mockEvents, mockKnowledge } from '../lib/mockData';
import { initAuth, googleSignIn, logout as firebaseLogout } from '../lib/auth';
import { fetchCalendarEvents, createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../lib/calendar';

export type AppTheme = 'dark' | 'light';

interface AppState {
  tasks: Task[];
  habits: Habit[];
  events: CalendarEvent[];
  googleEvents: CalendarEvent[];
  knowledge: KnowledgeEntry[];
  
  // App Theme
  theme: AppTheme;
  toggleTheme: () => void;
  
  // Google Auth & Sync Info
  user: User | null;
  googleToken: string | null;
  isAuthLoading: boolean;
  isSyncingCalendar: boolean;
  loginGoogle: () => Promise<void>;
  logoutGoogle: () => Promise<void>;
  syncCalendar: () => Promise<void>;
  
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  addHabit: (habit: Omit<Habit, 'id' | 'completedDates' | 'createdAt'>) => void;
  toggleHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  
  addEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  addKnowledge: (entry: Omit<KnowledgeEntry, 'id' | 'updatedAt'>) => void;
  updateKnowledge: (id: string, updates: Partial<KnowledgeEntry>) => void;
  deleteKnowledge: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Persistence Loading
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const saved = localStorage.getItem('app_tasks');
      return saved ? JSON.parse(saved) : mockTasks;
    } catch {
      return mockTasks;
    }
  });

  const [habits, setHabits] = useState<Habit[]>(() => {
    try {
      const saved = localStorage.getItem('app_habits');
      return saved ? JSON.parse(saved) : mockHabits;
    } catch {
      return mockHabits;
    }
  });

  const [events, setEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem('app_events');
      return saved ? JSON.parse(saved) : mockEvents;
    } catch {
      return mockEvents;
    }
  });

  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('app_knowledge');
      return saved ? JSON.parse(saved) : mockKnowledge;
    } catch {
      return mockKnowledge;
    }
  });

  const [theme, setTheme] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem('app_theme');
      return (saved as AppTheme) || 'dark';
    } catch {
      return 'dark';
    }
  });

  // Theme effector
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Google Integration States
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>(() => {
    try {
      const saved = localStorage.getItem('app_google_events');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState(false);

  // Persistence Saving
  useEffect(() => {
    localStorage.setItem('app_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('app_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('app_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('app_knowledge', JSON.stringify(knowledge));
  }, [knowledge]);

  useEffect(() => {
    localStorage.setItem('app_google_events', JSON.stringify(googleEvents));
  }, [googleEvents]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        setGoogleToken(token);
        setIsAuthLoading(false);
      },
      () => {
        setUser(null);
        setGoogleToken(null);
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const loginGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setGoogleToken(res.accessToken);
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    }
  };

  const logoutGoogle = async () => {
    try {
      await firebaseLogout();
      setUser(null);
      setGoogleToken(null);
      setGoogleEvents([]);
    } catch (err) {
      console.error('Sign out failed:', err);
    }
  };

  const syncCalendar = async () => {
    if (!googleToken) return;
    setIsSyncingCalendar(true);
    try {
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
      const timeMax = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days ahead
      const apiEvents = await fetchCalendarEvents(timeMin, timeMax);
      
      const mapped: CalendarEvent[] = apiEvents.map(e => {
        const startDateTimeStr = e.start.dateTime || e.start.date || '';
        const endDateTimeStr = e.end.dateTime || e.end.date || '';
        
        const dateOnly = startDateTimeStr.split('T')[0] || '';
        const startTimeStr = startDateTimeStr.includes('T') ? startDateTimeStr.split('T')[1].substring(0, 5) : '00:00';
        const endTimeStr = endDateTimeStr.includes('T') ? endDateTimeStr.split('T')[1].substring(0, 5) : '23:59';
        
        return {
          id: e.id,
          title: e.summary || 'Bez tytułu',
          date: dateOnly,
          start_time: startTimeStr,
          end_time: endTimeStr,
          type: 'meeting',
          description: e.description || '',
          location: e.htmlLink || 'YouTube/Meet'
        };
      });
      setGoogleEvents(mapped);
    } catch (error) {
      console.error('Error syncing Google Calendar:', error);
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      syncCalendar();
    } else {
      setGoogleEvents([]);
    }
  }, [googleToken]);

  // Tasks actions
  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks(prev => [{ ...task, id: `t_${Date.now()}` }, ...prev]);
  };
  const updateTask = (id: string, updates: Partial<Task>) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };
  const deleteTask = (id: string) => setTasks(prev => prev.filter(t => t.id !== id));

  // Habits actions
  const addHabit = (habit: Omit<Habit, 'id' | 'completedDates' | 'createdAt'>) => {
    setHabits(prev => [{ ...habit, id: `h_${Date.now()}`, completedDates: [], createdAt: new Date().toISOString() }, ...prev]);
  };
  const toggleHabit = (id: string, date: string) => {
    setHabits(prev => prev.map(h => {
      if (h.id !== id) return h;
      const isCompleted = h.completedDates.includes(date);
      return {
        ...h,
        completedDates: isCompleted ? h.completedDates.filter(d => d !== date) : [...h.completedDates, date]
      };
    }));
  };
  const deleteHabit = (id: string) => setHabits(prev => prev.filter(h => h.id !== id));

  // Events actions (supporting Google + Local)
  const addEvent = async (event: Omit<CalendarEvent, 'id'>) => {
    if (googleToken) {
      try {
        await createGoogleCalendarEvent({
          title: event.title,
          description: event.description,
          date: event.date,
          start_time: event.start_time,
          end_time: event.end_time
        });
        await syncCalendar();
      } catch (err) {
        console.error('Google Calendar event write failed, saving locally:', err);
        setEvents(prev => [{ ...event, id: `e_${Date.now()}` }, ...prev]);
      }
    } else {
      setEvents(prev => [{ ...event, id: `e_${Date.now()}` }, ...prev]);
    }
  };

  const deleteEvent = async (id: string) => {
    if (googleToken && googleEvents.some(e => e.id === id)) {
      try {
        await deleteGoogleCalendarEvent(id);
        await syncCalendar();
      } catch (err) {
        console.error('Google Calendar delete error:', err);
      }
    } else {
      setEvents(prev => prev.filter(e => e.id !== id));
    }
  };

  // Knowledge actions
  const addKnowledge = (entry: Omit<KnowledgeEntry, 'id' | 'updatedAt'>) => {
    setKnowledge(prev => [{ ...entry, id: `k_${Date.now()}`, updatedAt: new Date().toISOString() }, ...prev]);
  };
  const updateKnowledge = (id: string, updates: Partial<KnowledgeEntry>) => {
    setKnowledge(prev => prev.map(k => k.id === id ? { ...k, ...updates, updatedAt: new Date().toISOString() } : k));
  };
  const deleteKnowledge = (id: string) => setKnowledge(prev => prev.filter(k => k.id !== id));

  return (
    <AppContext.Provider value={{
      tasks, habits, events, googleEvents, knowledge,
      theme, toggleTheme,
      user, googleToken, isAuthLoading, isSyncingCalendar,
      loginGoogle, logoutGoogle, syncCalendar,
      addTask, updateTask, deleteTask,
      addHabit, toggleHabit, deleteHabit,
      addEvent, deleteEvent,
      addKnowledge, updateKnowledge, deleteKnowledge
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppStore() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppStore must be used within AppProvider');
  return ctx;
}
