import { Task, Habit, CalendarEvent, KnowledgeEntry } from '../types';

export const mockTasks: Task[] = [
  // Zadania w puli (gotowe do przeciągnięcia na oś czasu)
  { 
    id: 'pool-1', 
    title: 'Przygotować ofertę szkoleniową dla nowych kursantów', 
    description: 'Szczegółowy plan modułów, cennik pakietowy oraz harmonogram konsultacji.',
    status: 'todo', 
    priority: 'high', 
    category: 'work', 
    in_pool: true,
    due_date: '',
    color: '#4ade80' 
  },
  { 
    id: 'pool-2', 
    title: 'Zaktualizować cennik zajęć i pakietów lekcji', 
    description: 'Dostosować stawki godzinowe oraz wprowadzić zniżkę na pakiety 10 lekcji.',
    status: 'todo', 
    priority: 'medium', 
    category: 'work', 
    in_pool: true,
    due_date: '',
    color: '#4ade80' 
  },
  { 
    id: 'pool-3', 
    title: 'Wysłać materiały uzupełniające po warsztatach', 
    description: 'PDF z ćwiczeniami, linki do nagrań i repetytorium dla uczestników.',
    status: 'todo', 
    priority: 'high', 
    category: 'work', 
    in_pool: true,
    due_date: '',
    color: '#4ade80' 
  },
  { 
    id: 'pool-4', 
    title: 'Uporządkować bazę kontaktów i leadów z formularza', 
    description: 'Sprawdzić zapytania z ostatniego tygodnia i oznaczyć status pierwszego kontaktu.',
    status: 'todo', 
    priority: 'medium', 
    category: 'work', 
    in_pool: true,
    due_date: '',
    color: '#38bdf8' 
  },
  { 
    id: 'pool-5', 
    title: 'Przegląd pomysłów na warsztaty weekendowe', 
    description: 'Koncepcja intensywnego kursu weekendowego z analizy danych i automatyzacji.',
    status: 'todo', 
    priority: 'low', 
    category: 'project', 
    in_pool: true,
    due_date: '',
    target_month: 'idea',
    color: '#f59e0b' 
  },
  { 
    id: 'pool-6', 
    title: 'Optymalizacja szablonów wiadomości e-mail do kursantów', 
    description: 'Przygotować gotowe szablony potwierdzenia lekcji i przypomnienia o zadaniach domowych.',
    status: 'todo', 
    priority: 'medium', 
    category: 'work', 
    in_pool: true,
    due_date: '',
    color: '#a855f7' 
  },

  // Zadania zaplanowane w kalendarzu na bieżący dzień
  { id: '1', title: 'Podsumowanie wymagań dla kursantów', status: 'in_progress', priority: 'high', category: 'project', due_date: new Date().toISOString().split('T')[0], due_time: '10:00', color: '#4ade80' },
  { id: '2', title: 'Odpowiedź na maile i ustalenie terminów', status: 'todo', priority: 'medium', category: 'work', due_date: new Date().toISOString().split('T')[0], due_time: '12:00', color: '#4ade80' },
  { id: '3', title: 'Szybki trening i spacer regeneracyjny', status: 'done', priority: 'medium', category: 'health', due_date: new Date().toISOString().split('T')[0], due_time: '16:00', color: '#4ade80' },
];

export const mockHabits: Habit[] = [
  { id: '1', name: 'Meditation', icon: '🧘', frequency: 'daily', target_count: 1, color: '#4ade80', completedDates: [new Date().toISOString().split('T')[0]], createdAt: new Date().toISOString(), tags: ['Health', 'Personal'] },
  { id: '2', name: 'Read 20 pages', icon: '📖', frequency: 'daily', target_count: 1, color: '#60a5fa', completedDates: [], createdAt: new Date().toISOString(), tags: ['Learning'] },
];

export const mockEvents: CalendarEvent[] = [
  { id: '1', title: 'Weekly Sync', date: new Date().toISOString().split('T')[0], start_time: '14:00', end_time: '15:00', type: 'meeting', location: 'Google Meet' },
  { id: 'ev-adam', title: 'Spotkanie z Adamem Zawadzkim', date: '2026-09-08', start_time: '07:30', end_time: '08:30', type: 'meeting', location: 'Google Meet', recurring: true, description: 'Cotygodniowe omówienie projektów strategicznych' },
  { id: 'ev-sprint', title: 'Przegląd sprintu z zespołem', date: '2026-09-08', start_time: '08:35', end_time: '09:35', type: 'meeting', location: 'Pokój konferencyjny B', recurring: true, description: 'Podsumowanie zadań i wdrożeń' }
];

export const mockKnowledge: KnowledgeEntry[] = [
  { id: '1', title: 'React Performance Tips', content: '<h1>React Performance Tips</h1><p>Use <b>useMemo</b> for expensive calculations.</p>', category: 'Notes', tags: ['react', 'performance'], is_pinned: true, updatedAt: new Date().toISOString() },
  { id: '2', title: 'Design System Colors', content: '<h2>Color Palette</h2><p>Neon Green: #4ade80</p><p>Dark BG: #0a0a0a</p>', category: 'Snippets', tags: ['design', 'css'], is_pinned: false, updatedAt: new Date().toISOString() }
];
