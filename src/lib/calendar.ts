import { getAccessToken } from './auth';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  htmlLink: string;
}

export async function fetchCalendarEvents(timeMin: string, timeMax: string): Promise<CalendarEvent[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.append('timeMin', timeMin);
  url.searchParams.append('timeMax', timeMax);
  url.searchParams.append('singleEvents', 'true');
  url.searchParams.append('orderBy', 'startTime');
  
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED');
    }
    throw new Error('Failed to fetch calendar events');
  }

  const data = await res.json();
  return data.items || [];
}

export async function createGoogleCalendarEvent(event: {
  title: string;
  description?: string;
  date: string;
  start_time: string;
  end_time: string;
}): Promise<any> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const startIso = new Date(`${event.date}T${event.start_time}:00`).toISOString();
  const endIso = new Date(`${event.date}T${event.end_time}:00`).toISOString();

  const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: event.title,
      description: event.description,
      start: { dateTime: startIso },
      end: { dateTime: endIso },
    }),
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED');
    }
    const errText = await res.text();
    console.error('Google API error:', errText);
    throw new Error('Failed to create calendar event in Google Calendar');
  }

  return await res.json();
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED_OR_EXPIRED');
    }
    throw new Error('Failed to delete calendar event in Google Calendar');
  }
}

