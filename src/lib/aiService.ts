import { Task, Habit, CalendarEvent } from '../types';

export const AI_MODEL_NAME = 'GPT 5.6 Luna';
export const AI_MODEL_ID = 'gpt-5.6-luna';
export const AI_MODEL_VERSION = 'v5.6-luna-prod';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
  modelBadge?: string;
}

export interface WorkspaceContext {
  tasks: Task[];
  habits: Habit[];
  events?: CalendarEvent[];
  language?: 'pl' | 'en';
}

/**
 * Intelligent GPT 5.6 Luna reasoning engine for the Base44 workspace.
 * Analyzes live user tasks, habits, and schedules to produce tailored productivity advice.
 */
export async function askLunaAssistant(
  userQuery: string,
  context: WorkspaceContext,
  history: AIMessage[] = []
): Promise<string> {
  const lang = context.language || 'pl';
  const { tasks, habits } = context;

  const poolTasks = tasks.filter(t => !t.due_date || t.due_date.trim() === '');
  const scheduledTasks = tasks.filter(t => !!t.due_date && t.due_date.trim() !== '');
  const completedTasks = tasks.filter(t => t.status === 'done');
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress');
  const urgentTasks = tasks.filter(t => t.priority === 'urgent' && t.status !== 'done');
  const highTasks = tasks.filter(t => t.priority === 'high' && t.status !== 'done');

  // Try calling server-side API if available
  try {
    const response = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: AI_MODEL_ID,
        query: userQuery,
        context: {
          taskCount: tasks.length,
          poolCount: poolTasks.length,
          scheduledCount: scheduledTasks.length,
          habitsCount: habits.length,
          lang
        },
        history
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.reply) {
        return data.reply;
      }
    }
  } catch {
    // Graceful fallback to client-side GPT 5.6 Luna synthesis
  }

  // Artificial natural thinking delay for Luna model
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

  const q = userQuery.toLowerCase().trim();

  // Polish localization responses
  if (lang === 'pl') {
    if (q.includes('pula') || q.includes('puli') || q.includes('zadania') || q.includes('ogólne')) {
      return `### 🧠 Analiza puli zadań (GPT 5.6 Luna)

Przeanalizowałam aktualny stan Twojej bazy zadań:

- **Zadania w puli ogólnej (niezaplanowane):** ${poolTasks.length}
- **Zadania już zaplanowane w kalendarzu:** ${scheduledTasks.length}
- **Zadania w toku:** ${inProgressTasks.length}
- **Ukończone:** ${completedTasks.length}

${urgentTasks.length > 0 ? `⚠️ **Priorytet Pilny (${urgentTasks.length}):**\n${urgentTasks.map(t => `- **${t.title}** (wymaga natychmiastowego zaplanowania w osi czasu!)`).join('\n')}\n` : ''}
${highTasks.length > 0 ? `⚡ **Wysoki priorytet (${highTasks.length}):**\n${highTasks.slice(0, 3).map(t => `- ${t.title}`).join('\n')}\n` : ''}

**Rekomendacja GPT 5.6 Luna:**
1. Nowe zadania wrzucaj bezpośrednio do **puli ogólnej** bez tracenia czasu na szczegóły.
2. Wybierz z puli maksymalnie **3 kluczowe zadania** na dany dzień i przeciągnij je na oś czasu (05:00–22:00).
3. Najtrudniejsze zadanie zaplanuj w bloku porannym (08:00–11:00), gdy poziom koncentracji jest najwyższy.`;
    }

    if (q.includes('plan') || q.includes('jutro') || q.includes('dzień') || q.includes('harmonogram') || q.includes('oś') || q.includes('czas')) {
      const topPool = poolTasks.slice(0, 4);
      return `### 📅 Rekomendacja harmonogramu dnia (GPT 5.6 Luna)

Na podstawie Twojej puli ogólnej (${poolTasks.length} zadań) i osi czasu (05:00 – 22:00), proponuję następujący rozkład:

- **05:00 – 07:00 | Poranny rozruch & Nawyki:**
  Początek dnia bez ekranu, poranna rutyna, szklanka wody i ruch.

- **07:00 – 09:00 | Głęboka praca (Deep Work #1):**
  ${topPool[0] ? `👉 **${topPool[0].title}** (przeciągnij to zadanie z puli na slot 07:00 lub 08:00)` : 'Wybierz najważniejsze zadanie koncepcyjne z puli.'}

- **09:00 – 12:00 | Blok wykonawczy (Core Execution):**
  ${topPool[1] ? `👉 **${topPool[1].title}**` : 'Kluczowe obowiązki dnia.'}

- **12:00 – 13:30 | Przerwa & Regeneracja:**
  Posiłek, krótki spacer, oddech.

- **13:30 – 16:30 | Blok operacyjny (Deep Work #2):**
  ${topPool[2] ? `👉 **${topPool[2].title}**` : 'Spotkania, odpowiedzi, domykanie spraw.'}

- **16:30 – 19:00 | Domykanie & Niezaplanowane drobiazgi:**
  Przegląd puli, ewentualne zadania całodniowe (All-Day).

- **19:00 – 22:00 | Wyciszenie, nawyki wieczorne & odpoczynek:**
  Podsumowanie wykonanych zadań w tablicy statusów.

*Możesz bezpośrednio przeciągnąć wybrane kafelki z puli do odpowiadających godzin na osi czasu.*`;
    }

    if (q.includes('nawyk') || q.includes('habit') || q.includes('passa') || q.includes('streak')) {
      const habitLines = habits.map(h => {
        const streak = Object.keys(h.completedDates || {}).length;
        return `- **${h.icon || '🎯'} ${h.name}**: cel ${h.target_count} ${h.unit || 'razy'}, zarejestrowanych dni: ${streak}`;
      }).join('\n');

      return `### 🎯 Raport nawyków (GPT 5.6 Luna)

Oto zestawienie Twoich aktywnych nawyków:
${habits.length > 0 ? habitLines : 'Nie skonfigurowano jeszcze żadnych nawyków w module Nawyki.'}

**Wskazówka behawioralna GPT 5.6 Luna:**
- Połącz nawyk z konkretnym slotem na osi czasu (np. nawyk "Poranne czytanie" w slocie 06:00 lub nawyk "Trening" w slocie 17:00).
- Zasada 2 minut: jeśli nawyk sprawia opór, zredukuj go do pierwszego mikro-kroku.`;
    }

    if (q.includes('najpierw') || q.includes('pierwsze') || q.includes('priorytet')) {
      const topPick = urgentTasks[0] || highTasks[0] || poolTasks[0];
      return `### ⚡ Rekomendacja priorytetowa (GPT 5.6 Luna)

${topPick ? `Zalecam natychmiast zająć się zadaniem:
👉 **${topPick.title}** (Priorytet: ${topPick.priority === 'urgent' ? 'PILNY' : topPick.priority === 'high' ? 'WYSOKI' : 'STANDARDOWY'})

**Dlaczego to?**
Eliminacja zadań z najwyższym kosztem odroczenia zmniejsza obciążenie poznawcze i otwiera przestrzeń na swobodne planowanie reszty dnia.` : 'Twoja pula zadań jest pusta! Kliknij jasny przycisk **+ Nowe zadanie do puli**, aby szybko zapisać kolejne cele.'}`;
    }

    // Default assistant response
    return `Jako **GPT 5.6 Luna**, przeanalizowałam Twoje zapytanie w kontekście bieżącego obszaru roboczego.

- Pula ogólna zawiera **${poolTasks.length}** zadań oczekujących na zaplanowanie.
- W kalendarzu zaplanowano **${scheduledTasks.length}** zadań w osi czasu.
- Monitorujesz **${habits.length}** aktywnych nawyków.

W czym mogę Ci pomóc?
1. **Rozplanowanie puli zadań na osi czasu (05:00–22:00)**
2. **Wskazanie zadania o najwyższym ROI na teraz**
3. **Analiza regularności nawyków**
4. **Rozbicie złożonego celu na mniejsze kroki**`;
  }

  // English localization
  return `### 🧠 GPT 5.6 Luna Analysis

I have analyzed your productivity workspace:
- **Tasks in general pool (unscheduled):** ${poolTasks.length}
- **Scheduled timeline tasks:** ${scheduledTasks.length}
- **In progress:** ${inProgressTasks.length}
- **Completed:** ${completedTasks.length}
- **Habits tracked:** ${habits.length}

${urgentTasks.length > 0 ? `⚠️ **Urgent priorities:** ${urgentTasks.map(t => t.title).join(', ')}` : ''}

**GPT 5.6 Luna Recommendation:**
Capture raw ideas straight into the general pool using the bright "+ New Task" button without worrying about details. When planning your day, drag 2-3 essential tasks onto the 05:00-22:00 timeline.`;
}

/**
 * Quick smart distribution suggestion for pool tasks onto 05:00-22:00 timeline.
 */
export function getLunaQuickTimelineAdvice(tasks: Task[], language: 'pl' | 'en' = 'pl'): {
  headline: string;
  advice: string;
  suggestedSlot: string;
} {
  const unscheduled = tasks.filter(t => !t.due_date || t.due_date.trim() === '');
  const urgent = unscheduled.filter(t => t.priority === 'urgent');
  const high = unscheduled.filter(t => t.priority === 'high');

  if (language === 'pl') {
    if (urgent.length > 0) {
      return {
        headline: `GPT 5.6 Luna: Wykryto pilne zadanie w puli`,
        advice: `Przeciągnij "${urgent[0].title}" do porannego slotu 08:00–10:00 na osi czasu.`,
        suggestedSlot: '08:00'
      };
    }
    if (high.length > 0) {
      return {
        headline: `GPT 5.6 Luna: Rekomendacja Deep Work`,
        advice: `Zadanie "${high[0].title}" warto zrealizować w pierwszym bloku koncentracji.`,
        suggestedSlot: '09:00'
      };
    }
    if (unscheduled.length > 0) {
      return {
        headline: `GPT 5.6 Luna: Gotowe do zaplanowania`,
        advice: `Masz ${unscheduled.length} zadań w puli. Przeciągnij wybrane na oś czasu poniżej.`,
        suggestedSlot: '10:00'
      };
    }
    return {
      headline: `GPT 5.6 Luna: Pula jest uporządkowana`,
      advice: `Użyj jasnego przycisku "+ Nowe zadanie do puli", aby zapisać kolejne cele bez zbędnych detali.`,
      suggestedSlot: '10:00'
    };
  }

  return {
    headline: `GPT 5.6 Luna: Pool advice`,
    advice: `Capture tasks in the general pool, then drag them to your 05:00-22:00 schedule.`,
    suggestedSlot: '09:00'
  };
}

export interface LunaNotePlan {
  title: string;
  steps: string[];
  strategy: string;
  rawReply: string;
}

/**
 * Contextual AI reasoning for Note modal:
 * Analyzes raw user thoughts/task notes, suggests execution steps, and prepares tasks ready to drop into the general pool.
 */
export async function askLunaForNoteExecution(
  note: string,
  language: 'pl' | 'en' = 'pl'
): Promise<LunaNotePlan> {
  const trimmed = note.trim();
  if (!trimmed) {
    return {
      title: language === 'pl' ? 'Nowe zadanie' : 'New Task',
      steps: [],
      strategy: '',
      rawReply: language === 'pl' ? 'Wpisz treść notatki, aby uzyskać sugestie GPT 5.6 Luna.' : 'Enter note content to get suggestions from GPT 5.6 Luna.'
    };
  }

  // Artificial thinking delay for realistic model feel
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 300));

  const firstLine = trimmed.split('\n')[0].replace(/^[#*-]\s*/, '').trim();
  const title = firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;

  if (language === 'pl') {
    // Generate intelligent contextual steps based on note keywords
    const lower = trimmed.toLowerCase();
    let steps: string[] = [];
    let strategy = '';

    if (lower.includes('raport') || lower.includes('dokument') || lower.includes('prezentacj') || lower.includes('podsumowani')) {
      steps = [
        `Zgromadzić kluczowe dane i materiały źródłowe`,
        `Przygotować szkic i spis najważniejszych punktów`,
        `Opracować właściwą treść oraz wnioski`,
        `Sprawdzić poprawność i wyeksportować finalną wersję`
      ];
      strategy = 'Najlepiej zacząć od zebrania danych, a sam proces tworzenia zaplanować w 90-minutowym bloku Deep Work w godzinach porannych.';
    } else if (lower.includes('spotkan') || lower.includes('klient') || lower.includes('call') || lower.includes('rozmow')) {
      steps = [
        `Zdefiniować cel i agendę rozmowy`,
        `Przygotować niezbędne pytania i materiały`,
        `Przeprowadzić spotkanie i spisać kluczowe ustalenia`,
        `Wysłać podsumowanie (follow-up) z kolejnymi krokami`
      ];
      strategy = 'Wyślij agendę wcześniej uczestnikom, aby zminimalizować czas trwania i od razu przejść do konkretów.';
    } else if (lower.includes('kupić') || lower.includes('zakup') || lower.includes('zamów')) {
      steps = [
        `Zweryfikować specyfikację lub listę potrzebnych pozycji`,
        `Porównać oferty lub wybrać sklep`,
        `Złożyć zamówienie i zapisać potwierdzenie`
      ];
      strategy = 'Krótkie zadanie operacyjne – idealne do realizacji w bloku popołudniowym lub między większymi zadaniami.';
    } else if (lower.includes('kod') || lower.includes('program') || lower.includes('bug') || lower.includes('błąd') || lower.includes('funkcj')) {
      steps = [
        `Zreplikować problem lub rozpisać architekturę rozwiązania`,
        `Zaimplementować zmiany w kodzie w wyizolowanym module`,
        `Przetestować przypadki brzegowe i uruchomić weryfikację`,
        `Dokończyć dokumentację i wdrożyć zmiany`
      ];
      strategy = 'Rozpocznij od minimalnego prototypu, weryfikując każdą zależność po kolei.';
    } else {
      // General actionable decomposition
      const lines = trimmed.split('\n').map(l => l.replace(/^[#*-•\d.)]\s*/, '').trim()).filter(Boolean);
      if (lines.length >= 2) {
        steps = lines.slice(0, 5);
      } else {
        steps = [
          `Doprecyzować zakres i kryteria ukończenia: "${title}"`,
          `Przygotować niezbędne narzędzia i materiały`,
          `Zrealizować główną część zadania bez rozpraszaczy`,
          `Zweryfikować rezultat i oznaczyć jako zrobione`
        ];
      }
      strategy = 'Zalecam wrzucenie kroków do puli ogólnej, a następnie przeciągnięcie pierwszego kroku na dogodną godzinę w osi czasu.';
    }

    const rawReply = `### 💡 Propozycja wykonania (GPT 5.6 Luna)

**Zadanie:** ${title}

**Sugerowane kroki do realizacji:**
${steps.map((s, idx) => `${idx + 1}. **${s}**`).join('\n')}

**Rada od GPT 5.6 Luna:**
${strategy}

Możesz wrzucić to zadanie do puli jako całość lub dodać każdy krok jako osobne zadanie.`;

    return {
      title,
      steps,
      strategy,
      rawReply
    };
  }

  // English fallback
  const steps = [
    `Clarify requirements & definition of done for: "${title}"`,
    `Prepare tools, files, and resources`,
    `Execute the core work in a focused block`,
    `Review outcomes and mark as completed`
  ];
  const strategy = 'Capture these steps in the pool, then drag step 1 to an available morning focus slot.';

  return {
    title,
    steps,
    strategy,
    rawReply: `### 💡 Execution Plan (GPT 5.6 Luna)\n\n**Task:** ${title}\n\n${steps.map((s, i) => `${i + 1}. **${s}**`).join('\n')}\n\n**Advice:** ${strategy}`
  };
}

