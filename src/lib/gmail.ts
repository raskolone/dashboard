import { getAccessToken } from './auth';

export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: string;
  from: string;
  to: string;
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml?: string;
  isUnread: boolean;
  isStarred: boolean;
  isDraft?: boolean;
}

export interface GmailProfile {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
}

export interface GmailLabel {
  id: string;
  name: string;
  type: string;
  messagesUnread?: number;
  messagesTotal?: number;
}

// Utility to decode Base64 / Base64URL with full UTF-8 support
function decodeBase64Url(input: string): string {
  if (!input) return '';
  try {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (err) {
    try {
      return atob(input.replace(/-/g, '+').replace(/_/g, '/'));
    } catch {
      return input;
    }
  }
}

// Utility to encode utf-8 string to base64url
function encodeBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Recursively parse MIME message parts for plain text and HTML
function parseMessageParts(payload: any): { text: string; html: string } {
  let text = '';
  let html = '';

  if (!payload) return { text, html };

  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    text = decodeBase64Url(payload.body.data);
  } else if (payload.mimeType === 'text/html' && payload.body?.data) {
    html = decodeBase64Url(payload.body.data);
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      const parsed = parseMessageParts(part);
      if (parsed.text && !text) text = parsed.text;
      if (parsed.html && !html) html = parsed.html;
    }
  }

  if (!text && payload.body?.data && (!payload.parts || payload.parts.length === 0)) {
    text = decodeBase64Url(payload.body.data);
  }

  return { text, html };
}

export function parseHeader(headers: { name: string; value: string }[], name: string): string {
  if (!headers) return '';
  const found = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
  return found ? found.value : '';
}

export function formatGmailMessage(item: any): GmailMessage {
  const headers = item.payload?.headers || [];
  const from = parseHeader(headers, 'From');
  const to = parseHeader(headers, 'To');
  const subject = parseHeader(headers, 'Subject') || '(Brak tematu)';
  const dateHeader = parseHeader(headers, 'Date');
  
  const labels: string[] = item.labelIds || [];
  const isUnread = labels.includes('UNREAD');
  const isStarred = labels.includes('STARRED');
  const isDraft = labels.includes('DRAFT');

  const { text, html } = parseMessageParts(item.payload);

  return {
    id: item.id,
    threadId: item.threadId || item.id,
    labelIds: labels,
    snippet: item.snippet || '',
    internalDate: item.internalDate || Date.now().toString(),
    from,
    to,
    subject,
    date: dateHeader || (item.internalDate ? new Date(parseInt(item.internalDate, 10)).toLocaleString() : ''),
    bodyText: text || item.snippet || '',
    bodyHtml: html,
    isUnread,
    isStarred,
    isDraft,
  };
}

export async function fetchGmailProfile(): Promise<GmailProfile | null> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error('Failed to fetch Gmail profile');
  }

  return await res.json();
}

export async function fetchGmailLabels(): Promise<GmailLabel[]> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    return [];
  }

  const data = await res.json();
  return data.labels || [];
}

export async function fetchGmailMessages(params?: {
  labelIds?: string[];
  q?: string;
  maxResults?: number;
  pageToken?: string;
}): Promise<{ messages: GmailMessage[]; nextPageToken?: string; resultSizeEstimate?: number }> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  url.searchParams.append('maxResults', String(params?.maxResults || 20));

  if (params?.labelIds && params.labelIds.length > 0) {
    params.labelIds.forEach(l => url.searchParams.append('labelIds', l));
  }
  if (params?.q) {
    url.searchParams.append('q', params.q);
  }
  if (params?.pageToken) {
    url.searchParams.append('pageToken', params.pageToken);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error(`Gmail API error: ${res.statusText}`);
  }

  const listData = await res.json();
  const rawList: { id: string; threadId: string }[] = listData.messages || [];

  if (rawList.length === 0) {
    return { messages: [], nextPageToken: listData.nextPageToken, resultSizeEstimate: listData.resultSizeEstimate };
  }

  // Fetch individual messages in batch concurrency
  const fetched = await Promise.all(
    rawList.map(async (m) => {
      try {
        const msgRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!msgRes.ok) return null;
        const msgData = await msgRes.json();
        return formatGmailMessage(msgData);
      } catch (e) {
        console.warn('Failed to load message detail:', m.id, e);
        return null;
      }
    })
  );

  const validMessages = fetched.filter((m): m is GmailMessage => m !== null);

  return {
    messages: validMessages,
    nextPageToken: listData.nextPageToken,
    resultSizeEstimate: listData.resultSizeEstimate,
  };
}

export async function fetchSingleGmailMessage(messageId: string): Promise<GmailMessage> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error('Failed to fetch message');
  }

  const data = await res.json();
  return formatGmailMessage(data);
}

// User-confirmed operation: Send email message
export async function sendGmailMessage(params: {
  to: string;
  subject: string;
  body: string;
  threadId?: string;
}): Promise<{ id: string; threadId: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;
  const emailLines = [
    `To: ${params.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    params.body,
  ];

  const rawEmail = emailLines.join('\r\n');
  const encodedEmail = encodeBase64Url(rawEmail);

  const payload: any = {
    raw: encodedEmail,
  };
  if (params.threadId) {
    payload.threadId = params.threadId;
  }

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    const errText = await res.text();
    console.error('Gmail send error response:', errText);
    throw new Error('Failed to send email message');
  }

  return await res.json();
}

// User-confirmed operation: Create Draft
export async function createGmailDraft(params: {
  to: string;
  subject: string;
  body: string;
}): Promise<{ id: string }> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(params.subject)))}?=`;
  const emailLines = [
    `To: ${params.to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 7bit',
    '',
    params.body,
  ];

  const rawEmail = emailLines.join('\r\n');
  const encodedEmail = encodeBase64Url(rawEmail);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw: encodedEmail }
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error('Failed to create draft');
  }

  return await res.json();
}

// Modify message labels (e.g. read, unread, star, unstar, archive)
export async function modifyGmailMessage(
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      addLabelIds,
      removeLabelIds,
    }),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error('Failed to modify message labels');
  }
}

// User-confirmed operation: Move to trash
export async function trashGmailMessage(messageId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error('Failed to move message to trash');
  }
}

// User-confirmed operation: Permanently delete message
export async function deleteGmailMessagePermanently(messageId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('UNAUTHORIZED_OR_EXPIRED');
    throw new Error('Failed to delete email permanently');
  }
}
