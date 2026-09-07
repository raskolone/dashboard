import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config({ path: '.env.local' });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize GoogleGenAI lazily
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'SiftAI Service' });
});

// SiftAI Intelligence endpoint with gemini-3.8-flash and intelligent fallback
app.post('/api/ai', async (req, res) => {
  try {
    const { query, context, history } = req.body;
    const lang = context?.lang || 'pl';

    const ai = getGenAI();

    const systemInstruction = lang === 'pl'
      ? `Jesteś SiftAI - inteligentnym, zwięzłym asystentem produktywności w systemie Base44. 
Nigdy nie ujawniaj nazwy technicznego modelu bazowego. Nazywasz się SiftAI.
Masz PEŁNY DOSTĘP do wszystkich elementów tej aplikacji: kalendarza, każdego elementu harmonogramu, zadań, puli ogólnej oraz Habit Trackera i możesz dokonywać w nich bezpośrednich zmian.
Gdy użytkownik prosi o dodanie, edycję, usunięcie, zaplanowanie lub oznaczenie zadania, spotkania w kalendarzu lub nawyku, dołącz na końcu odpowiedzi blok akcji w formacie JSON:
\`\`\`action
{
  "type": "create_event" | "delete_event" | "create_task" | "complete_task" | "delete_task" | "schedule_task" | "create_habit" | "toggle_habit",
  "payload": { ... }
}
\`\`\`
Dla create_event: { "title": string, "date": "YYYY-MM-DD", "start_time": "HH:mm", "end_time": "HH:mm", "description"?: string }
Dla create_task: { "title": string, "priority": "low"|"medium"|"high"|"urgent", "due_date": "YYYY-MM-DD"|"", "due_time"?: "HH:mm", "in_pool": boolean }
Dla complete_task: { "title": string }
Dla create_habit: { "name": string, "icon": string, "target_count": number, "unit": string, "frequency": "daily"|"weekly" }
Dla toggle_habit: { "name": string, "date": "YYYY-MM-DD" }
Odpowiadaj bezpośrednio, naturalnie i zwięźle.`
      : `You are SiftAI - an intelligent, concise productivity assistant in the Base44 system.
Never disclose any internal technical model names. Your name is SiftAI.
You have FULL ACCESS to all elements of this app: calendar, tasks, pool, and Habit Tracker.
When asked to add, modify, delete, or check off tasks, events, or habits, append an action block in JSON:
\`\`\`action
{ "type": "create_event" | "create_task" | "complete_task" | "create_habit" | "toggle_habit", "payload": { ... } }
\`\`\`
Be concise and practical.`;

    const contextSummary = `Bieżący kontekst użytkownika:
- Zadania w puli ogólnej: ${context?.poolCount ?? 0}
- Zaplanowane w kalendarzu: ${context?.scheduledCount ?? 0}
- Aktywne nawyki: ${context?.habitsCount ?? 0}
- Język: ${lang}
${context?.details ? `Dodatkowe informacje o zadaniach: ${context.details}` : ''}`;

    const userPrompt = `${contextSummary}\n\nPytanie użytkownika do SiftAI:\n${query}`;

    if (ai) {
      try {
        // Primary call: gemini-3.8-flash as requested
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: userPrompt,
          config: {
            systemInstruction
          }
        });

        const text = response.text?.trim();
        if (text) {
          return res.json({ reply: text, model: 'SiftAI' });
        }
      } catch (genError: any) {
        const errorMsg = genError?.message || String(genError);
        const isAuthError =
          genError?.status === 'UNAUTHENTICATED' ||
          errorMsg.includes('401') ||
          errorMsg.includes('ACCOUNT_STATE_INVALID') ||
          errorMsg.includes('service account');

        if (!isAuthError) {
          try {
            const fallbackResponse = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: `${systemInstruction}\n\n${userPrompt}`
            });
            const text = fallbackResponse.text?.trim();
            if (text) {
              return res.json({ reply: text, model: 'SiftAI' });
            }
          } catch (fallbackError) {
            // Silently proceed to client-side fallback
          }
        }
      }
    }

    // Heuristic fallback if API key is not configured or offline
    return res.status(200).json({
      fallback: true,
      model: 'SiftAI',
      message: 'Using client-side SiftAI reasoning engine.'
    });
  } catch (error: any) {
    console.error('SiftAI endpoint error:', error);
    res.status(500).json({ error: error.message || 'Internal error' });
  }
});

// Vite middleware setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
