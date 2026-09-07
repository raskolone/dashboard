import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { Task, TaskList, Habit, CalendarEvent, KnowledgeEntry, TaskStatus, TaskPriority, TaskCategory, EventType, KnowledgeCategory } from '../types';
import { mockTasks, mockHabits, mockEvents, mockKnowledge } from '../lib/mockData';
import { initAuth, googleSignIn, logout as firebaseLogout, clearAccessToken, setAccessToken } from '../lib/auth';
import { fetchCalendarEvents, createGoogleCalendarEvent, deleteGoogleCalendarEvent } from '../lib/calendar';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument, generateId, setDocumentWithMerge, subscribeToDocument } from '../lib/db';
import { translations } from '../lib/translations';

export type AppTheme = 'dark' | 'light';

interface AppState {
  tasks: Task[];
  taskLists: TaskList[];
  habits: Habit[];
  events: CalendarEvent[];
  googleEvents: CalendarEvent[];
  knowledge: KnowledgeEntry[];
  
  // App Theme
  theme: AppTheme;
  toggleTheme: () => void;

  // App Language
  language: 'pl' | 'en';
  setLanguage: (lang: 'pl' | 'en') => void;
  t: (key: string) => any;
  
  // Habits settings
  stackHabits: boolean;
  setStackHabits: (stack: boolean) => void;

  // Google Auth & Sync Info
  user: User | null;
  googleToken: string | null;
  isGoogleConnected: boolean;
  googleUserEmail: string | null;
  isAuthLoading: boolean;
  isSyncingCalendar: boolean;
  loginGoogle: () => Promise<void>;
  logoutGoogle: () => Promise<void>;
  loginDemo: () => void;
  syncCalendar: () => Promise<void>;
  
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  addTaskList: (name: string) => void;
  updateTaskList: (id: string, updates: Partial<TaskList>) => void;
  deleteTaskList: (id: string) => void;
  
  addHabit: (habit: Omit<Habit, 'id' | 'completedDates' | 'createdAt' | 'updatedAt' | 'progress' | 'skippedDates' | 'status' | 'order'>) => void;
  updateHabit: (id: string, updates: Partial<Habit>) => void;
  toggleHabit: (id: string, date: string) => void;
  updateHabitProgress: (id: string, date: string, progress: number, completed: boolean) => void;
  skipHabit: (id: string, date: string) => void;
  deleteHabit: (id: string) => void;
  reorderHabits: (orderedIds: string[]) => void;
  
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateEvent: (id: string, updates: Partial<CalendarEvent>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  
  addKnowledge: (entry: Omit<KnowledgeEntry, 'id' | 'updatedAt' | 'createdAt'>) => void;
  updateKnowledge: (id: string, updates: Partial<KnowledgeEntry>) => void;
  deleteKnowledge: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  // Application Data States
  const [tasks, setTasks] = useState<Task[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([]);
  const [taskLists, setTaskLists] = useState<TaskList[]>([
    { id: 'default', name: 'Zadania', createdAt: new Date().toISOString() }
  ]);

  const [theme, setTheme] = useState<AppTheme>('dark');
  const [language, setLanguageState] = useState<'pl' | 'en'>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      return (saved as 'pl' | 'en') || 'pl';
    } catch {
      return 'pl';
    }
  });

  const [stackHabits, setStackHabitsState] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('app_stack_habits');
      return saved !== null ? JSON.parse(saved) : true;
    } catch {
      return true;
    }
  });

  const setLanguage = (lang: 'pl' | 'en') => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_language', lang);
    } catch {}
    if (user && user.uid && user.uid !== 'demo_user') {
      setDocumentWithMerge(`users/${user.uid}/settings`, 'general', {
        language: lang,
        updatedAt: new Date().toISOString()
      }).catch(err => console.warn('Failed to sync language to Firestore:', err));
    }
  };

  const setStackHabits = (stack: boolean) => {
    setStackHabitsState(stack);
    try {
      localStorage.setItem('app_stack_habits', JSON.stringify(stack));
    } catch {}
    if (user && user.uid && user.uid !== 'demo_user') {
      setDocumentWithMerge(`users/${user.uid}/settings`, 'general', {
        stackHabits: stack,
        updatedAt: new Date().toISOString()
      }).catch(err => console.warn('Failed to sync stackHabits to Firestore:', err));
    }
  };

  const t = (path: string): any => {
    const keys = path.split('.');
    let result: any = (translations as any)[language];
    for (const key of keys) {
      if (result && result[key] !== undefined) {
        result = result[key];
      } else {
        // Fallback to Polish
        let fallback: any = (translations as any)['pl'];
        for (const fKey of keys) {
          if (fallback && fallback[fKey] !== undefined) {
            fallback = fallback[fKey];
          } else {
            fallback = path;
            break;
          }
        }
        return fallback;
      }
    }
    return result;
  };

  // Theme effector (strictly forces dark mode)
  useEffect(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.classList.remove('light');
    localStorage.setItem('app_theme', 'dark');
  }, []);

  const toggleTheme = () => {
    // No-op since light mode is deleted
  };

  // Google Integration States & Persistent Connection
  const [user, setUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem('google_access_token');
    } catch {
      return null;
    }
  });
  const [googleUserEmail, setGoogleUserEmail] = useState<string | null>(() => {
    try {
      return localStorage.getItem('google_user_email');
    } catch {
      return null;
    }
  });
  const [isGoogleConnected, setIsGoogleConnected] = useState<boolean>(() => {
    try {
      return localStorage.getItem('google_calendar_connected') === 'true';
    } catch {
      return false;
    }
  });

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

  useEffect(() => {
    try {
      localStorage.setItem('app_google_events', JSON.stringify(googleEvents));
    } catch {}
  }, [googleEvents]);

  // Auth initialization
  useEffect(() => {
    const isDemoActive = localStorage.getItem('demo_mode_active_v1') === 'true';

    const unsubscribe = initAuth(
      (authUser, token) => {
        setUser(authUser);
        if (token) {
          setGoogleToken(token);
          setIsGoogleConnected(true);
          try {
            localStorage.setItem('google_calendar_connected', 'true');
          } catch {}
        }
        if (authUser.email) {
          setGoogleUserEmail(authUser.email);
          try {
            localStorage.setItem('google_user_email', authUser.email);
          } catch {}
        }
        setIsAuthLoading(false);
        try {
          localStorage.removeItem('demo_mode_active_v1');
        } catch {}
      },
      () => {
        if (isDemoActive) {
          setUser({
            uid: 'demo_user',
            displayName: 'Odwiedzający (Szybkie Demo)',
            email: 'demo@journal.io',
            photoURL: null,
            emailVerified: true
          } as any);
        }
        setIsAuthLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Firebase Real-time Sync & Persistent Settings
  useEffect(() => {
    if (user && user.uid !== 'demo_user') {
      const uId = user.uid;
      const unsubs = [
        // Settings subscription (persistent memory for user preferences)
        subscribeToDocument<{
          language?: 'pl' | 'en';
          stackHabits?: boolean;
          googleConnected?: boolean;
          googleUserEmail?: string;
        }>(`users/${uId}/settings`, 'general', (settingsData) => {
          if (settingsData) {
            if (settingsData.language && settingsData.language !== language) {
              setLanguageState(settingsData.language);
              try { localStorage.setItem('app_language', settingsData.language); } catch {}
            }
            if (settingsData.stackHabits !== undefined && settingsData.stackHabits !== stackHabits) {
              setStackHabitsState(settingsData.stackHabits);
              try { localStorage.setItem('app_stack_habits', JSON.stringify(settingsData.stackHabits)); } catch {}
            }
            if (settingsData.googleConnected) {
              setIsGoogleConnected(true);
              try { localStorage.setItem('google_calendar_connected', 'true'); } catch {}
            }
            if (settingsData.googleUserEmail) {
              setGoogleUserEmail(settingsData.googleUserEmail);
              try { localStorage.setItem('google_user_email', settingsData.googleUserEmail); } catch {}
            }
          }
        }),
        subscribeToCollection<TaskList>(`users/${uId}/taskLists`, (data) => {
          if (data.length === 0) {
            setTaskLists([{ id: 'default', name: 'Zadania', createdAt: new Date().toISOString() }]);
          } else {
            setTaskLists(data.sort((a,b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()));
          }
        }),
        subscribeToCollection<Task>(`users/${uId}/tasks`, (data) => {
          if (data.length === 0) {
            // Restore from local cache or seed default pool tasks so pool tasks never disappear
            let initialTasks: Task[] = [];
            try {
              const savedUser = localStorage.getItem(`app_user_tasks_${uId}`);
              const savedOffline = localStorage.getItem('app_offline_tasks');
              if (savedUser) {
                initialTasks = JSON.parse(savedUser);
              } else if (savedOffline) {
                initialTasks = JSON.parse(savedOffline);
              }
            } catch {}

            if (!initialTasks || initialTasks.length === 0) {
              initialTasks = mockTasks;
            }

            setTasks(initialTasks);
            try {
              localStorage.setItem('app_offline_tasks', JSON.stringify(initialTasks));
              localStorage.setItem(`app_user_tasks_${uId}`, JSON.stringify(initialTasks));
            } catch {}

            // Background seed to Firestore for the user
            initialTasks.forEach(t => {
              const docId = t.id || generateId();
              createDocument(`users/${uId}/tasks`, docId, { ...t, id: docId })
                .catch(err => console.warn('Could not seed task to Firestore:', err));
            });
          } else {
            const sorted = data.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
            setTasks(sorted);
            try {
              localStorage.setItem('app_offline_tasks', JSON.stringify(sorted));
              localStorage.setItem(`app_user_tasks_${uId}`, JSON.stringify(sorted));
            } catch {}
          }
        }),
        subscribeToCollection<Habit>(`users/${uId}/habits`, (data) => setHabits(data.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))),
        subscribeToCollection<CalendarEvent>(`users/${uId}/events`, (data) => setEvents(data.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))),
        subscribeToCollection<KnowledgeEntry>(`users/${uId}/knowledge`, (data) => setKnowledge(data.sort((a,b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()))),
      ];

      return () => {
        unsubs.forEach(u => u());
      }
    } else {
      // Offline fallback with persistent local cache
      const cachedTasks = localStorage.getItem('app_offline_tasks');
      const cachedHabits = localStorage.getItem('app_offline_habits');
      const cachedEvents = localStorage.getItem('app_offline_events');
      const cachedKnowledge = localStorage.getItem('app_offline_knowledge');

      setTasks(cachedTasks ? JSON.parse(cachedTasks) : mockTasks);
      setTaskLists([{ id: 'default', name: 'Zadania', createdAt: new Date().toISOString() }]);
      setHabits(cachedHabits ? JSON.parse(cachedHabits) : mockHabits);
      setEvents(cachedEvents ? JSON.parse(cachedEvents) : mockEvents);
      setKnowledge(cachedKnowledge ? JSON.parse(cachedKnowledge) : mockKnowledge);
    }
  }, [user]);

  // Persist offline cache whenever local state changes so no data is ever lost
  useEffect(() => {
    try {
      localStorage.setItem('app_offline_tasks', JSON.stringify(tasks));
      if (user && user.uid && user.uid !== 'demo_user') {
        localStorage.setItem(`app_user_tasks_${user.uid}`, JSON.stringify(tasks));
      }
      localStorage.setItem('app_offline_habits', JSON.stringify(habits));
      localStorage.setItem('app_offline_events', JSON.stringify(events));
      localStorage.setItem('app_offline_knowledge', JSON.stringify(knowledge));
    } catch {}
  }, [tasks, habits, events, knowledge, user]);

  const loginGoogle = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setGoogleToken(res.accessToken);
        setAccessToken(res.accessToken);
        setIsGoogleConnected(true);
        if (res.user.email) {
          setGoogleUserEmail(res.user.email);
          try {
            localStorage.setItem('google_user_email', res.user.email);
          } catch {}
        }
        try {
          localStorage.setItem('google_calendar_connected', 'true');
          localStorage.removeItem('demo_mode_active_v1');
        } catch {}

        // Persist Google Calendar connection to Firestore user settings
        setDocumentWithMerge(`users/${res.user.uid}/settings`, 'general', {
          googleConnected: true,
          googleUserEmail: res.user.email || '',
          lastSyncedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }).catch(e => console.warn('Could not save Google connection to settings:', e));

        syncCalendar();
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user') {
        console.info('Google Sign-In popup closed by user.');
        return;
      }
      console.warn('Google Sign-In notice:', err?.message || err);
    }
  };

  const loginDemo = () => {
    try {
      localStorage.setItem('demo_mode_active_v1', 'true');
    } catch {}
    setUser({
      uid: 'demo_user',
      displayName: 'Odwiedzający (Szybkie Demo)',
      email: 'demo@journal.io',
      photoURL: null,
      emailVerified: true
    } as any);
    clearAccessToken();
    setGoogleToken(null);
  };

  const logoutGoogle = async () => {
    try {
      if (user && user.uid !== 'demo_user') {
        await firebaseLogout();
      }
      setUser(null);
      clearAccessToken();
      setGoogleToken(null);
      setGoogleEvents([]);
      try {
        localStorage.removeItem('demo_mode_active_v1');
      } catch {}
    } catch (err) {
      console.warn('Sign out notice:', err);
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
        let dateOnly = '';
        let startTimeStr = '00:00';
        let endTimeStr = '23:59';

        if (e.start.dateTime) {
          const sDate = new Date(e.start.dateTime);
          const y = sDate.getFullYear();
          const m = String(sDate.getMonth() + 1).padStart(2, '0');
          const d = String(sDate.getDate()).padStart(2, '0');
          dateOnly = `${y}-${m}-${d}`;
          startTimeStr = `${String(sDate.getHours()).padStart(2, '0')}:${String(sDate.getMinutes()).padStart(2, '0')}`;
        } else if (e.start.date) {
          dateOnly = e.start.date;
          startTimeStr = '00:00';
        }

        if (e.end.dateTime) {
          const eDate = new Date(e.end.dateTime);
          endTimeStr = `${String(eDate.getHours()).padStart(2, '0')}:${String(eDate.getMinutes()).padStart(2, '0')}`;
        } else if (e.end.date) {
          endTimeStr = '23:59';
        }
        
        return {
          id: e.id,
          title: e.summary || 'Bez tytułu',
          date: dateOnly,
          start_time: startTimeStr,
          end_time: endTimeStr,
          type: 'meeting',
          description: e.description || '',
          location: e.htmlLink || 'Google Meet'
        };
      });
      setGoogleEvents(mapped);
    } catch (error: any) {
      if (error instanceof Error && (error.message === 'UNAUTHORIZED_OR_EXPIRED' || error.message.includes('401') || error.message.includes('UNAUTHORIZED'))) {
        console.warn('Google Calendar authorization expired. Retaining cache for seamless experience.');
        clearAccessToken();
        setGoogleToken(null);
      } else {
        console.warn('Google Calendar sync notice:', error?.message || error);
      }
    } finally {
      setIsSyncingCalendar(false);
    }
  };

  useEffect(() => {
    if (googleToken) {
      syncCalendar();
    }
  }, [googleToken]);

  // Tasks actions
  const addTask = async (task: Omit<Task, 'id'>) => {
    let googleEventId;
    if (googleToken) {
      try {
        const res = await createGoogleCalendarEvent({
          title: task.title,
          description: task.description,
          date: task.due_date,
        });
        googleEventId = res.id;
        syncCalendar();
      } catch (err: any) {
        if (err instanceof Error && (err.message === 'UNAUTHORIZED_OR_EXPIRED' || err.message.includes('401'))) {
          clearAccessToken();
          setGoogleToken(null);
          setGoogleEvents([]);
        } else {
          console.warn('Could not sync task to Google Calendar:', err?.message || err);
        }
      }
    }

    const newTask = { ...task, googleEventId };
    const id = generateId();
    const taskWithId: Task = {
      ...newTask,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTasks(prev => [taskWithId, ...prev]);

    if (user && user.uid !== 'demo_user') {
      createDocument(`users/${user.uid}/tasks`, id, taskWithId);
    }
  };
  const updateTask = async (id: string, updates: Partial<Task>) => {
    const task = tasks.find(t => t.id === id);
    if (task?.googleEventId && googleToken) {
      try {
        const { updateGoogleCalendarEvent } = await import('../lib/calendar');
        await updateGoogleCalendarEvent(task.googleEventId, {
          title: updates.title || task.title,
          description: updates.description || task.description,
          date: updates.due_date || task.due_date,
        });
        syncCalendar();
      } catch (err: any) {
        if (err instanceof Error && (err.message === 'UNAUTHORIZED_OR_EXPIRED' || err.message.includes('401'))) {
          clearAccessToken();
          setGoogleToken(null);
          setGoogleEvents([]);
        } else {
          console.warn('Could not update task in Google Calendar:', err?.message || err);
        }
      }
    }

    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t));

    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/tasks`, id, updates);
    }
  };
  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task?.googleEventId && googleToken) {
      try {
        await deleteGoogleCalendarEvent(task.googleEventId);
        syncCalendar();
      } catch (err: any) {
        if (err instanceof Error && (err.message === 'UNAUTHORIZED_OR_EXPIRED' || err.message.includes('401'))) {
          clearAccessToken();
          setGoogleToken(null);
          setGoogleEvents([]);
        } else {
          console.warn('Could not delete task from Google Calendar:', err?.message || err);
        }
      }
    }

    setTasks(prev => prev.filter(t => t.id !== id));

    if (user && user.uid !== 'demo_user') {
      deleteDocument(`users/${user.uid}/tasks`, id);
    }
  };

  // TaskList actions
  const addTaskList = (name: string) => {
    const newList = { name, createdAt: new Date().toISOString() };
    if (user && user.uid !== 'demo_user') {
      createDocument(`users/${user.uid}/taskLists`, generateId(), newList);
    } else {
      setTaskLists(prev => [...prev, { ...newList, id: generateId() }]);
    }
  };
  const updateTaskList = (id: string, updates: Partial<TaskList>) => {
    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/taskLists`, id, updates);
    } else {
      setTaskLists(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }
  };
  const deleteTaskList = (id: string) => {
    if (user && user.uid !== 'demo_user') {
      deleteDocument(`users/${user.uid}/taskLists`, id);
    } else {
      setTaskLists(prev => prev.filter(l => l.id !== id));
    }
  };

  // Habits actions
  const addHabit = (habit: Omit<Habit, 'id' | 'completedDates' | 'createdAt' | 'updatedAt' | 'progress' | 'skippedDates' | 'status' | 'order'>) => {
    const newHabit = { 
      ...habit, 
      completedDates: [] as string[], 
      progress: {}, 
      skippedDates: [] as string[],
      status: 'active' as const,
      order: habits.length 
    };
    if (user && user.uid !== 'demo_user') {
      createDocument(`users/${user.uid}/habits`, generateId(), newHabit);
    } else {
      setHabits(prev => [{ ...newHabit, id: generateId(), createdAt: new Date().toISOString() }, ...prev]);
    }
  };
  const toggleHabit = (id: string, date: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;
    
    // Toggle completed state
    let newDates = [...habit.completedDates];
    let newSkipped = [...(habit.skippedDates || [])];
    const isCompleted = newDates.includes(date);
    
    if (isCompleted) {
      newDates = newDates.filter(d => d !== date);
    } else {
      newDates.push(date);
      newSkipped = newSkipped.filter(d => d !== date); // Remove skip if completing
    }

    // Set max progress if completing, 0 if un-completing
    const newProgress = { ...(habit.progress || {}) };
    if (isCompleted) {
      newProgress[date] = 0;
    } else {
      newProgress[date] = habit.target_count;
    }
    
    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/habits`, id, { completedDates: newDates, skippedDates: newSkipped, progress: newProgress });
    } else {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, completedDates: newDates, skippedDates: newSkipped, progress: newProgress } : h));
    }
  };

  const updateHabitProgress = (id: string, date: string, value: number, completed: boolean) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    let newDates = [...habit.completedDates];
    let newSkipped = [...(habit.skippedDates || [])];
    
    if (completed && !newDates.includes(date)) {
      newDates.push(date);
      newSkipped = newSkipped.filter(d => d !== date);
    } else if (!completed && newDates.includes(date)) {
      newDates = newDates.filter(d => d !== date);
    }

    const newProgress = { ...(habit.progress || {}), [date]: value };
    
    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/habits`, id, { completedDates: newDates, skippedDates: newSkipped, progress: newProgress });
    } else {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, completedDates: newDates, skippedDates: newSkipped, progress: newProgress } : h));
    }
  };

  const skipHabit = (id: string, date: string) => {
    const habit = habits.find(h => h.id === id);
    if (!habit) return;

    let newDates = [...habit.completedDates].filter(d => d !== date);
    let newSkipped = [...(habit.skippedDates || [])];
    
    if (!newSkipped.includes(date)) {
      newSkipped.push(date);
    } else {
      newSkipped = newSkipped.filter(d => d !== date);
    }

    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/habits`, id, { completedDates: newDates, skippedDates: newSkipped });
    } else {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, completedDates: newDates, skippedDates: newSkipped } : h));
    }
  };

  const deleteHabit = (id: string) => {
    if (user && user.uid !== 'demo_user') {
      deleteDocument(`users/${user.uid}/habits`, id);
    } else {
      setHabits(prev => prev.filter(h => h.id !== id));
    }
  }

  const updateHabit = (id: string, updates: Partial<Habit>) => {
    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/habits`, id, updates);
    } else {
      setHabits(prev => prev.map(h => h.id === id ? { ...h, ...updates, updatedAt: new Date().toISOString() } : h));
    }
  }

  const reorderHabits = (orderedIds: string[]) => {
    // In local state, we just update all matches
    setHabits(prev => {
      const copy = [...prev];
      return copy.map(h => {
        const orderIndex = orderedIds.indexOf(h.id);
        if (orderIndex !== -1) {
          return { ...h, order: orderIndex };
        }
        return h;
      });
    });

    if (user && user.uid !== 'demo_user') {
      // Fire-and-forget individual updates to Firestore to avoid batch complexity here
      orderedIds.forEach((id, index) => {
        updateDocument(`users/${user.uid}/habits`, id, { order: index });
      });
    }
  }

  // Events actions (supporting Google + Local)
  const addEvent = async (event: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'>) => {
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
      } catch (err: any) {
        if (err instanceof Error && (err.message === 'UNAUTHORIZED_OR_EXPIRED' || err.message.includes('401'))) {
          clearAccessToken();
          setGoogleToken(null);
          setGoogleEvents([]);
        } else {
          console.warn('Google Calendar event write notice, saving locally:', err?.message || err);
        }
        if (user && user.uid !== 'demo_user') {
          createDocument(`users/${user.uid}/events`, generateId(), event);
        } else {
          setEvents(prev => [{ ...event, id: generateId() }, ...prev]);
        }
      }
    } else {
       if (user && user.uid !== 'demo_user') {
          createDocument(`users/${user.uid}/events`, generateId(), event);
       } else {
          setEvents(prev => [{ ...event, id: generateId() }, ...prev]);
       }
    }
  };

  const updateEvent = async (id: string, updates: Partial<CalendarEvent>) => {
    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/events`, id, updates);
    } else {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }
    if (googleToken && googleEvents.some(e => e.id === id)) {
      setGoogleEvents(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    }
  };

  const deleteEvent = async (id: string) => {
    if (googleToken && googleEvents.some(e => e.id === id)) {
      try {
        await deleteGoogleCalendarEvent(id);
        await syncCalendar();
      } catch (err: any) {
        if (err instanceof Error && (err.message === 'UNAUTHORIZED_OR_EXPIRED' || err.message.includes('401'))) {
          clearAccessToken();
          setGoogleToken(null);
          setGoogleEvents([]);
        } else {
          console.warn('Google Calendar delete notice:', err?.message || err);
        }
      }
    } else {
      if (user && user.uid !== 'demo_user') {
        deleteDocument(`users/${user.uid}/events`, id);
      } else {
        setEvents(prev => prev.filter(e => e.id !== id));
      }
    }
  };

  // Knowledge actions
  const addKnowledge = (entry: Omit<KnowledgeEntry, 'id' | 'updatedAt' | 'createdAt'>) => {
    if (user && user.uid !== 'demo_user') {
      createDocument(`users/${user.uid}/knowledge`, generateId(), entry);
    } else {
      setKnowledge(prev => [{ ...entry, id: generateId(), updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() }, ...prev]);
    }
  };
  const updateKnowledge = (id: string, updates: Partial<KnowledgeEntry>) => {
    if (user && user.uid !== 'demo_user') {
      updateDocument(`users/${user.uid}/knowledge`, id, updates);
    } else {
      setKnowledge(prev => prev.map(k => k.id === id ? { ...k, ...updates, updatedAt: new Date().toISOString() } : k));
    }
  };
  const deleteKnowledge = (id: string) => {
    if (user && user.uid !== 'demo_user') {
      deleteDocument(`users/${user.uid}/knowledge`, id);
    } else {
      setKnowledge(prev => prev.filter(k => k.id !== id));
    }
  }

  return (
    <AppContext.Provider value={{
      tasks, taskLists, habits, events, googleEvents, knowledge,
      theme, toggleTheme,
      language, setLanguage, t,
      stackHabits, setStackHabits,
      user, googleToken, isGoogleConnected, googleUserEmail, isAuthLoading, isSyncingCalendar,
      loginGoogle, logoutGoogle, loginDemo, syncCalendar,
      addTask, updateTask, deleteTask,
      addTaskList, updateTaskList, deleteTaskList,
      addHabit, updateHabit, toggleHabit, updateHabitProgress, skipHabit, deleteHabit, reorderHabits,
      addEvent, updateEvent, deleteEvent,
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
