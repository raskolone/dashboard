import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { 
  Circle, 
  PlayCircle, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Edit2, 
  GripVertical, 
  Calendar as CalendarIcon, 
  Clock,
  Sparkles,
  CheckSquare,
  Check,
  X
} from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export const TasksKanbanBoard: React.FC = () => {
  const { tasks, updateTask, deleteTask, addTask, language } = useAppStore();
  const isPl = language === 'pl';

  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<TaskStatus | null>(null);
  const [newCardStatus, setNewCardStatus] = useState<TaskStatus | null>(null);
  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const columns: { status: TaskStatus; title: string; icon: any; color: string; badge: string }[] = [
    {
      status: 'todo',
      title: isPl ? 'Do zrobienia' : 'To Do',
      icon: Circle,
      color: 'text-amber-400',
      badge: 'bg-amber-500/10 text-amber-300 border-amber-500/20'
    },
    {
      status: 'in_progress',
      title: isPl ? 'W trakcie' : 'In Progress',
      icon: PlayCircle,
      color: 'text-blue-400',
      badge: 'bg-blue-500/10 text-blue-300 border-blue-500/20'
    },
    {
      status: 'done',
      title: isPl ? 'Ukończone' : 'Completed',
      icon: CheckCircle2,
      color: 'text-emerald-400',
      badge: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
    }
  ];

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData('text/plain', taskId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(taskId);
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverStatus(null);
  };

  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverStatus !== status) {
      setDragOverStatus(status);
    }
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    if (!taskId) return;

    updateTask(taskId, { status, updatedAt: new Date().toISOString() });
    setDraggingTaskId(null);
  };

  const handleAddCardSubmit = (status: TaskStatus) => {
    if (!newCardTitle.trim()) {
      setNewCardStatus(null);
      return;
    }

    addTask({
      title: newCardTitle.trim(),
      status,
      priority: 'medium',
      due_date: '',
      in_pool: true
    });

    setNewCardTitle('');
    setNewCardStatus(null);
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'urgent': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  return (
    <div className="space-y-4">
      {/* Board Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white">
            {isPl ? 'Statusy zadań (Tablica Kanban)' : 'Task Status Board'}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-slate-300 font-mono">
            {tasks.length} {isPl ? 'zadań łącznie' : 'total tasks'}
          </span>
        </div>
        <p className="text-xs text-slate-400 hidden sm:block">
          {isPl ? 'Przeciągaj karty między kolumnami, aby natychmiast zmienić status zadania' : 'Drag and drop cards between columns'}
        </p>
      </div>

      {/* 3 Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map(({ status, title, icon: Icon, color, badge }) => {
          const colTasks = tasks.filter(t => (t.status || 'todo') === status);
          const isDragOver = dragOverStatus === status;

          return (
            <div
              key={status}
              onDragOver={(e) => handleDragOver(e, status)}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, status)}
              className={cn(
                "glass-card p-4 rounded-2xl border transition-all flex flex-col min-h-[520px] bg-[#141418]/90",
                isDragOver ? "ring-2 ring-[#4ade80]/50 border-dashed border-[#4ade80] bg-[#4ade80]/5" : "border-white/10"
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <Icon className={cn("w-4 h-4", color)} />
                  <h3 className="font-display font-bold text-white text-sm sm:text-base">
                    {title}
                  </h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={cn("text-xs font-mono font-semibold px-2 py-0.5 rounded-lg border", badge)}>
                    {colTasks.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCardStatus(status);
                      setNewCardTitle('');
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                    title={isPl ? 'Dodaj zadanie do tej kolumny' : 'Add task'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Inline Quick Add for Column */}
              {newCardStatus === status && (
                <div className="mb-3 p-2.5 rounded-xl bg-black/40 border border-[#4ade80]/40 animate-fadeIn">
                  <input
                    autoFocus
                    type="text"
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddCardSubmit(status);
                      if (e.key === 'Escape') setNewCardStatus(null);
                    }}
                    placeholder={isPl ? 'Wpisz tytuł i naciśnij Enter...' : 'Enter task title...'}
                    className="w-full bg-transparent border-none text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                  <div className="flex items-center justify-end gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setNewCardStatus(null)}
                      className="px-2 py-1 text-[11px] text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isPl ? 'Anuluj' : 'Cancel'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddCardSubmit(status)}
                      className="px-2.5 py-1 rounded bg-[#4ade80] text-[#121215] font-bold text-[11px] cursor-pointer"
                    >
                      {isPl ? 'Dodaj' : 'Add'}
                    </button>
                  </div>
                </div>
              )}

              {/* Tasks List */}
              <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[560px] pr-1 scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-white/5 rounded-xl text-slate-500 text-xs">
                    <p>{isPl ? 'Pusta kolumna' : 'Empty column'}</p>
                    <button
                      type="button"
                      onClick={() => setNewCardStatus(status)}
                      className="mt-2 text-[11px] text-[#4ade80] hover:underline cursor-pointer"
                    >
                      {isPl ? '+ Dodaj zadanie' : '+ Add task'}
                    </button>
                  </div>
                ) : (
                  colTasks.map(task => {
                    const isScheduled = !!task.due_date && task.due_date.trim() !== '';

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          "p-3 rounded-xl border border-white/10 bg-[#1c1c22] hover:bg-[#22222a] transition-all group cursor-grab active:cursor-grabbing shadow-sm flex flex-col gap-2 relative",
                          draggingTaskId === task.id ? "opacity-30 border-dashed border-[#4ade80]" : ""
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <div className="pt-0.5 text-slate-600 group-hover:text-slate-400 shrink-0">
                            <GripVertical className="w-3.5 h-3.5" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-xs font-medium leading-snug break-words",
                              task.status === 'done' ? "line-through text-slate-500" : "text-slate-200"
                            )}>
                              {task.title}
                            </p>
                          </div>

                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => deleteTask(task.id)}
                              className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                              title={isPl ? 'Usuń' : 'Delete'}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>

                        {/* Badges footer */}
                        <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5 pl-5">
                          <span className={cn("px-2 py-0.5 rounded-full font-medium border", getPriorityColor(task.priority))}>
                            {task.priority || 'medium'}
                          </span>

                          <div className="flex items-center gap-2">
                            {isScheduled ? (
                              <span className="inline-flex items-center gap-1 text-blue-400 font-mono">
                                <CalendarIcon className="w-2.5 h-2.5" />
                                {task.due_date}
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {isPl ? 'W puli' : 'In pool'}
                              </span>
                            )}

                            {/* Move status shortcut */}
                            {status !== 'done' ? (
                              <button
                                type="button"
                                onClick={() => updateTask(task.id, { status: status === 'todo' ? 'in_progress' : 'done' })}
                                className="text-[10px] text-slate-400 hover:text-[#4ade80] cursor-pointer"
                                title={isPl ? 'Przesuń dalej' : 'Advance'}
                              >
                                →
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateTask(task.id, { status: 'todo' })}
                                className="text-[10px] text-slate-400 hover:text-amber-400 cursor-pointer"
                                title={isPl ? 'Cofnij do "Do zrobienia"' : 'Back to todo'}
                              >
                                ↺
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
