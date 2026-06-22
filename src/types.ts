export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskCategory = 'work' | 'personal' | 'learning' | 'health' | 'project';

export interface ChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  priority?: TaskPriority;
  dueDate?: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  due_date: string; // ISO format YYYY-MM-DD
  color?: string; // Hex color for categorization/tagging
  checklist?: ChecklistItem[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Habit {
  id: string;
  name: string;
  icon: string;
  frequency: 'daily' | 'weekly';
  target_count: number;
  unit?: string;
  color: string;
  completedDates: string[]; // ISO formats YYYY-MM-DD
  skippedDates?: string[]; // ISO formats YYYY-MM-DD
  progress?: Record<string, number>; // Maps date to numerical progress
  createdAt?: string;
  updatedAt?: string;
  tags: string[];
}

export type EventType = 'meeting' | 'lesson' | 'personal' | 'deadline' | 'reminder';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // ISO DB date
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  type: EventType;
  description?: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type KnowledgeCategory = string;

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: KnowledgeCategory;
  tags: string[];
  is_pinned: boolean;
  createdAt?: string;
  updatedAt?: string; // ISO format
}
