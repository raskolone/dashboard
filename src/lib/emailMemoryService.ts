import { GmailMessage, archiveGmailMessage, unarchiveGmailMessage } from './gmail';
import { subscribeToCollection, createDocument, updateDocument, deleteDocument, generateId, setDocumentWithMerge } from './db';

export interface EmailActionRecord {
  id: string;
  messageId: string;
  threadId?: string;
  subject: string;
  from: string;
  senderEmail: string;
  senderDomain: string;
  snippet?: string;
  action: 'done' | 'low_importance';
  timestamp: string;
  archived: boolean;
  notes?: string;
}

export interface EmailMemoryRule {
  id: string;
  type: 'sender_email' | 'sender_domain' | 'keyword';
  value: string;
  category: 'low_importance' | 'important';
  hitCount: number;
  addedAt: string;
  source: 'auto_learned' | 'manual';
  enabled: boolean;
}

export interface EmailClassification {
  isImportant: boolean;
  isLowImportance: boolean;
  matchedRule?: EmailMemoryRule;
  reason: string;
}

// Built-in initial pattern detection for newsletters and robotic bulk senders
export const DEFAULT_INITIAL_RULES: EmailMemoryRule[] = [
  {
    id: 'default-noreply',
    type: 'keyword',
    value: 'no-reply',
    category: 'low_importance',
    hitCount: 0,
    addedAt: new Date().toISOString(),
    source: 'auto_learned',
    enabled: true,
  },
  {
    id: 'default-newsletter',
    type: 'keyword',
    value: 'newsletter',
    category: 'low_importance',
    hitCount: 0,
    addedAt: new Date().toISOString(),
    source: 'auto_learned',
    enabled: true,
  },
  {
    id: 'default-unsubscribe',
    type: 'keyword',
    value: 'unsubscribe',
    category: 'low_importance',
    hitCount: 0,
    addedAt: new Date().toISOString(),
    source: 'auto_learned',
    enabled: true,
  },
  {
    id: 'default-wypisz',
    type: 'keyword',
    value: 'wypisz się',
    category: 'low_importance',
    hitCount: 0,
    addedAt: new Date().toISOString(),
    source: 'auto_learned',
    enabled: true,
  },
  {
    id: 'default-promocje',
    type: 'keyword',
    value: 'promocj',
    category: 'low_importance',
    hitCount: 0,
    addedAt: new Date().toISOString(),
    source: 'auto_learned',
    enabled: true,
  },
];

const LOCAL_STORAGE_RULES_KEY = 'base44_email_memory_rules';
const LOCAL_STORAGE_REGISTRY_KEY = 'base44_email_action_registry';

/**
 * Helper to safely extract email address and domain from standard From: headers
 * e.g. "Google Alerts <googlealerts-noreply@google.com>" -> email: "googlealerts-noreply@google.com", domain: "google.com", name: "Google Alerts"
 */
export function extractEmailAndDomain(fromString: string): { email: string; domain: string; name: string } {
  if (!fromString) return { email: '', domain: '', name: '' };

  let email = '';
  let name = '';

  const emailMatch = fromString.match(/<([^>]+)>/);
  if (emailMatch) {
    email = emailMatch[1].trim().toLowerCase();
    name = fromString.replace(/<[^>]+>/, '').replace(/["']/g, '').trim();
  } else {
    // direct email or plain string
    const parts = fromString.split(' ');
    const possibleEmail = parts.find(p => p.includes('@'));
    if (possibleEmail) {
      email = possibleEmail.replace(/[<>(),]/g, '').trim().toLowerCase();
      name = parts.filter(p => !p.includes('@')).join(' ').trim();
    } else {
      email = fromString.trim().toLowerCase();
      name = fromString.trim();
    }
  }

  const domainMatch = email.match(/@([^@]+)$/);
  const domain = domainMatch ? domainMatch[1].toLowerCase() : '';

  return { email, domain, name: name || email };
}

/**
 * Classifies an email based on the learned memory rules
 */
export function classifyEmail(email: GmailMessage, rules: EmailMemoryRule[]): EmailClassification {
  const { email: senderEmail, domain: senderDomain } = extractEmailAndDomain(email.from);
  const subjectLower = (email.subject || '').toLowerCase();
  const snippetLower = (email.snippet || email.bodyText || '').toLowerCase();

  const activeRules = rules.filter(r => r.enabled);

  // 1. Direct sender match (highest priority)
  const senderRule = activeRules.find(
    r => r.type === 'sender_email' && r.value.toLowerCase() === senderEmail
  );
  if (senderRule) {
    const isLow = senderRule.category === 'low_importance';
    return {
      isImportant: !isLow,
      isLowImportance: isLow,
      matchedRule: senderRule,
      reason: isLow
        ? `Nadawca "${senderEmail}" znajduje się w pamięci maili mało ważnych`
        : `Nadawca "${senderEmail}" oznaczony jako ważny`,
    };
  }

  // 2. Domain match (e.g. newsletter.example.com or spam-domain.com)
  const domainRule = activeRules.find(
    r => r.type === 'sender_domain' && r.value.toLowerCase() === senderDomain
  );
  if (domainRule) {
    const isLow = domainRule.category === 'low_importance';
    return {
      isImportant: !isLow,
      isLowImportance: isLow,
      matchedRule: domainRule,
      reason: isLow
        ? `Domena "${senderDomain}" oznaczona jako mało ważna w regułach`
        : `Domena "${senderDomain}" oznaczona jako istotna`,
    };
  }

  // 3. Keyword matches in subject or body snippet
  for (const rule of activeRules) {
    if (rule.type === 'keyword') {
      const keywordLower = rule.value.toLowerCase();
      if (subjectLower.includes(keywordLower) || snippetLower.includes(keywordLower)) {
        const isLow = rule.category === 'low_importance';
        return {
          isImportant: !isLow,
          isLowImportance: isLow,
          matchedRule: rule,
          reason: isLow
            ? `Wykryto wzorzec: "${rule.value}" w treści lub temacie`
            : `Wykryto słowo kluczowe oznaczające priorytet: "${rule.value}"`,
        };
      }
    }
  }

  // 4. Default: It's direct communication, keep it important
  return {
    isImportant: true,
    isLowImportance: false,
    reason: 'Wiadomość bezpośrednia — oczekuje na weryfikację',
  };
}

/**
 * Load stored rules with localStorage fallback
 */
export function loadLocalRules(): EmailMemoryRule[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_RULES_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load local email rules:', e);
  }
  return DEFAULT_INITIAL_RULES;
}

/**
 * Save rules to localStorage
 */
export function saveLocalRules(rules: EmailMemoryRule[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_RULES_KEY, JSON.stringify(rules));
  } catch (e) {
    console.warn('Failed to save local email rules:', e);
  }
}

/**
 * Load stored action registry with localStorage fallback
 */
export function loadLocalRegistry(): EmailActionRecord[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_REGISTRY_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load local email registry:', e);
  }
  return [];
}

/**
 * Save action registry to localStorage
 */
export function saveLocalRegistry(registry: EmailActionRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_REGISTRY_KEY, JSON.stringify(registry));
  } catch (e) {
    console.warn('Failed to save local email registry:', e);
  }
}

/**
 * Executes action "Zrobione" or "Mało ważne":
 * 1. Calls Gmail API to remove 'INBOX' label (archive message).
 * 2. If 'low_importance', automatically updates or creates memory rule for sender and domain.
 * 3. Records entry in persistent action registry.
 */
export async function executeEmailAction(params: {
  email: GmailMessage;
  action: 'done' | 'low_importance';
  userUid?: string;
  currentRules?: EmailMemoryRule[];
}): Promise<{
  record: EmailActionRecord;
  updatedRules: EmailMemoryRule[];
}> {
  const { email, action, userUid, currentRules = [] } = params;
  const { email: senderEmail, domain: senderDomain } = extractEmailAndDomain(email.from);

  // 1. Archive in Gmail
  try {
    await archiveGmailMessage(email.id);
  } catch (err) {
    console.warn(`Gmail archive call for ${email.id} (may be preview or demo):`, err);
  }

  // 2. Build action record
  const recordId = generateId();
  const newRecord: EmailActionRecord = {
    id: recordId,
    messageId: email.id,
    threadId: email.threadId,
    subject: email.subject || '(Bez tematu)',
    from: email.from,
    senderEmail,
    senderDomain,
    snippet: email.snippet || email.bodyText?.slice(0, 160) || '',
    action,
    timestamp: new Date().toISOString(),
    archived: true,
  };

  // 3. Save to registry (localStorage + Firestore if uid)
  const localRegistry = loadLocalRegistry();
  const updatedRegistry = [newRecord, ...localRegistry.filter(r => r.messageId !== email.id)];
  saveLocalRegistry(updatedRegistry);

  if (userUid && userUid !== 'demo_user') {
    setDocumentWithMerge(`users/${userUid}/email_registry`, recordId, newRecord).catch(err =>
      console.warn('Failed to sync email record to Firestore:', err)
    );
  }

  // 4. Update Memory rules if action is 'low_importance'
  let rulesToSave = [...currentRules];
  if (rulesToSave.length === 0) {
    rulesToSave = loadLocalRules();
  }

  if (action === 'low_importance' && senderEmail) {
    const existingRuleIdx = rulesToSave.findIndex(
      r => r.type === 'sender_email' && r.value.toLowerCase() === senderEmail.toLowerCase()
    );

    if (existingRuleIdx >= 0) {
      rulesToSave[existingRuleIdx] = {
        ...rulesToSave[existingRuleIdx],
        category: 'low_importance',
        hitCount: rulesToSave[existingRuleIdx].hitCount + 1,
        enabled: true,
      };
    } else {
      const newRule: EmailMemoryRule = {
        id: generateId(),
        type: 'sender_email',
        value: senderEmail,
        category: 'low_importance',
        hitCount: 1,
        addedAt: new Date().toISOString(),
        source: 'auto_learned',
        enabled: true,
      };
      rulesToSave.unshift(newRule);

      if (userUid && userUid !== 'demo_user') {
        setDocumentWithMerge(`users/${userUid}/email_rules`, newRule.id, newRule).catch(err =>
          console.warn('Failed to sync rule to Firestore:', err)
        );
      }
    }

    saveLocalRules(rulesToSave);
  }

  return {
    record: newRecord,
    updatedRules: rulesToSave,
  };
}

/**
 * Restores an archived message from registry back to INBOX
 */
export async function restoreEmailToInbox(params: {
  record: EmailActionRecord;
  userUid?: string;
}): Promise<void> {
  const { record, userUid } = params;

  try {
    await unarchiveGmailMessage(record.messageId);
  } catch (err) {
    console.warn(`Gmail unarchive call for ${record.messageId}:`, err);
  }

  // Update in local registry
  const localRegistry = loadLocalRegistry();
  const updated = localRegistry.map(r =>
    r.id === record.id ? { ...r, archived: false } : r
  );
  saveLocalRegistry(updated);

  if (userUid && userUid !== 'demo_user') {
    updateDocument(`users/${userUid}/email_registry`, record.id, {
      archived: false,
      restoredAt: new Date().toISOString(),
    }).catch(err => console.warn('Failed to update restored status in Firestore:', err));
  }
}
