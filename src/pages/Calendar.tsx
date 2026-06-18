import React, { useState } from 'react';
import { useAppStore } from '../store/AppContext';
import { CalendarRange, Lock, Plus, Trash2, Loader2, RefreshCw, LogOut, MapPin, Clock, X, Check } from 'lucide-react';
import { EventType } from '../types';
import { GenieModal } from '../components/GenieModal';

export function Calendar() {
  const { 
    events, 
    googleEvents, 
    user, 
    googleToken, 
    isAuthLoading, 
    isSyncingCalendar, 
    loginGoogle, 
    logoutGoogle, 
    syncCalendar,
    addEvent,
    deleteEvent 
  } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('11:00');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<EventType>('meeting');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Combine Google events and local events
  const isGoogleConnected = !!googleToken;
  const activeEvents = isGoogleConnected ? googleEvents : events;

  // Group events by date for a list view
  const eventsByDate = activeEvents.reduce((acc, ev) => {
    if (!acc[ev.date]) acc[ev.date] = [];
    acc[ev.date].push(ev);
    return acc;
  }, {} as Record<string, typeof activeEvents>);

  // Sort dates
  const sortedDates = Object.keys(eventsByDate).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const handleAddEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await addEvent({
        title,
        date,
        start_time: startTime,
        end_time: endTime,
        type,
        description,
        location: 'Wydarzenie Google'
      });
      setIsModalOpen(false);
      setTitle('');
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string, eventTitle: string) => {
    if (window.confirm(`Czy na pewno chcesz usunąć wydarzenie: "${eventTitle}"?`)) {
      await deleteEvent(id);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Kalendarz</h1>
          <p className="text-slate-400 mt-1">
            {isGoogleConnected 
              ? 'Twój połączony Google Kalendarz zsynchronizowany w czasie rzeczywistym.' 
              : 'Lista Twoich spotkań i wydarzeń. Połącz się z Google, aby zsynchronizować ze swoim kontem.'}
          </p>
        </div>
        
        {isGoogleConnected && !isAuthLoading && (
          <div className="flex items-center gap-2">
            <button 
              onClick={() => syncCalendar()}
              disabled={isSyncingCalendar}
              className="p-2.5 rounded-xl border border-[#222222] bg-[#111111] text-slate-300 hover:text-white transition-colors disabled:opacity-40"
              title="Synchronizuj teraz"
            >
              <RefreshCw className={`w-5 h-5 ${isSyncingCalendar ? 'animate-spin text-[#75d36e]' : ''}`} />
            </button>
            <button 
              onClick={openAddForm}
              className="flex items-center gap-2 bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] px-4 py-2.5 rounded-xl font-bold transition-transform"
            >
              <Plus className="w-5 h-5" />
              Dodaj spotkanie
            </button>
          </div>
        )}
      </header>

      {isAuthLoading ? (
        <div className="glass-card rounded-3xl p-16 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#75d36e] mx-auto" />
            <p className="text-slate-400">Inicjalizacja i sprawdzanie sesji Google...</p>
          </div>
        </div>
      ) : !isGoogleConnected ? (
        /* Sign-In Banner / Call to Action */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-card rounded-3xl p-8 flex flex-col justify-between space-y-6">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#75d36e]/10 border border-[#75d36e]/30 flex items-center justify-center mb-6">
                <CalendarRange className="w-6 h-6 text-[#75d36e]" />
              </div>
              <h2 className="text-2xl font-display font-bold text-white mb-3">Zsynchronizuj z Google Calendar</h2>
              <p className="text-slate-400 text-base leading-relaxed max-w-xl">
                Połącz swoją aplikację z Google Kalendarzem, aby pobierać spotkania i planować nowe bezpośrednio stąd. Połączenie chronione jest przez autoryzowany system Firebase Google Sign-In.
              </p>
            </div>
            
            <div>
              {/* Official styled material GSI button */}
              <button 
                onClick={loginGoogle}
                className="inline-flex items-center justify-center bg-white hover:bg-neutral-100 text-neutral-800 font-bold px-5 py-3 rounded-xl transition-all shadow-[0_4px_16px_rgba(255,255,255,0.05)] hover:scale-[1.01] active:scale-[0.99] gap-3 shrink-0"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Połącz z Google Kalendarzem</span>
              </button>
            </div>
          </div>

          <div className="glass-card rounded-3xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-white text-lg font-bold mb-4 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-500" />
                Lokalne terminy
              </h3>
              <p className="text-slate-400 text-sm mb-6">
                Chcesz po prostu tworzyć lokalne terminy bez autoryzacji w chmurze? Możesz swobodnie dodać termin tutaj.
              </p>
            </div>
            
            <button 
              onClick={openAddForm}
              className="w-full bg-[#161616] border border-[#222222] hover:bg-white/5 text-white py-3 rounded-xl font-semibold transition-colors"
            >
              Dodaj termin lokalny
            </button>
          </div>
        </div>
      ) : (
        /* Logged-In User Details info bar */
        <div className="flex flex-wrap items-center justify-between p-4 rounded-2xl glass-card text-sm text-slate-400 gap-4">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || 'Google'} className="w-8 h-8 rounded-full border border-[#75d36e]/30" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#75d36e]/10 border border-[#75d36e]/30 flex items-center justify-center text-[#75d36e] font-bold">
                {user?.displayName?.substring(0, 1) || 'G'}
              </div>
            )}
            <div>
              <span className="text-white font-medium">{user?.displayName || user?.email}</span>
              <span className="mx-2 text-slate-700">•</span>
              <span className="inline-flex items-center gap-1 text-[11px] font-mono px-1.5 py-0.5 rounded bg-[#75d36e]/10 text-[#75d36e]">
                <Check className="w-3" /> Google Active
              </span>
            </div>
          </div>
          <button 
            onClick={logoutGoogle}
            className="flex items-center gap-2 hover:text-[#ff4a4a] transition-colors font-semibold"
          >
            <LogOut className="w-4 h-4" />
            Rozłącz kalendarz
          </button>
        </div>
      )}

      {/* Agenda/List layout */}
      <h2 className="text-xl font-display font-bold text-white mt-8 mb-4">Wydarzenia i Agenda</h2>
      {sortedDates.length === 0 ? (
        <div className="glass-card rounded-3xl p-16 text-center text-slate-500">
          <CalendarRange className="w-12 h-12 mx-auto stroke-[1.5] opacity-40 mb-3" />
          <p>Brak zaplanowanych wydarzeń w wybranym przedziale czasowym.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(dateStr => (
            <div key={dateStr} className="space-y-2">
              <h3 className="text-sm font-mono font-semibold text-[#75d36e] uppercase tracking-wider px-1">
                {new Date(dateStr).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {eventsByDate[dateStr].map(ev => (
                  <div key={ev.id} className="glass-card p-4 rounded-xl flex items-center justify-between gap-4 group hover:border-white/10 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 shrink-0 bg-[#161616] border border-[#222222] rounded-lg flex flex-col items-center justify-center text-xs font-mono text-slate-400">
                        <Clock className="w-4 h-4 text-[#75d36e]" />
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2">
                          {ev.title}
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                            {ev.type}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span className="flex items-center gap-1"><Clock className="w-3" /> {ev.start_time} - {ev.end_time}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3" /> {ev.location || 'Brak lokacji'}</span>
                        </div>
                        {ev.description && (
                          <p className="text-xs text-slate-400 mt-2 line-clamp-1 max-w-xl">{ev.description}</p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEvent(ev.id, ev.title)}
                      className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all md:opacity-0 group-hover:opacity-100"
                      title="Usuń wydarzenie"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Add Appointment / Google Event */}
      <GenieModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isGoogleConnected ? 'Dodaj do Google Calendar' : 'Dodaj termin lokalny'}
      >
        <form onSubmit={handleAddEventSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Tytuł spotkania</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              required
              placeholder="np. Sync z zespołem"
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
              disabled={isSubmitting}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Typ spotkania</label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value as EventType)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors capitalize animate-none"
                disabled={isSubmitting}
              >
                <option value="meeting">Spotkanie (Meeting)</option>
                <option value="lesson">Lekcja (Lesson)</option>
                <option value="personal">Prywatne (Personal)</option>
                <option value="deadline">Termin końcowy (Deadline)</option>
                <option value="reminder">Przemas (Reminder)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Data</label>
              <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Godzina rozpoczęcia</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={e => setStartTime(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                disabled={isSubmitting}
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Godzina zakończenia</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={e => setEndTime(e.target.value)}
                className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">Opis i szczegóły (opcjonalnie)</label>
            <textarea 
              value={description} 
              onChange={e => setDescription(e.target.value)} 
              placeholder="np. Omówienie postępów kwartalnych i kroki milowe."
              rows={3}
              className="w-full bg-[#161616] border border-[#262626] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#75d36e] transition-colors resize-none"
              disabled={isSubmitting}
            />
          </div>

          <div className="pt-4 border-t border-[#222222] flex justify-end gap-3">
            <button 
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-[#262626] text-slate-300 hover:text-white hover:bg-white/5 font-semibold transition-colors text-sm"
              disabled={isSubmitting}
            >
              Anuluj
            </button>
            <button 
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-[#75d36e] hover:bg-[#5bb255] text-[#1a1a1a] font-bold transition-colors text-sm flex items-center gap-2"
              disabled={isSubmitting}
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isGoogleConnected ? 'Dodaj do Google' : 'Dodaj lokalnie'}
            </button>
          </div>
        </form>
      </GenieModal>
    </div>
  );

  function openAddForm() {
    setTitle('');
    setDescription('');
    setDate(new Date().toISOString().split('T')[0]);
    setStartTime('10:00');
    setEndTime('11:00');
    setType('meeting');
    setIsModalOpen(true);
  }
}

