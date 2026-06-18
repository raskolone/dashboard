import { auth, db } from './auth';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Generate random ID wrapper
export const generateId = () => Array.from(crypto.getRandomValues(new Uint8Array(20))).map(b => b.toString(16).padStart(2, '0')).join('');

// Subscription helper
export function subscribeToCollection<T>(path: string, callback: (data: T[]) => void) {
  const collRef = collection(db, path);
  return onSnapshot(collRef, 
    (snapshot) => {
      const results = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate().toISOString() : new Date().toISOString(),
          updatedAt: d.updatedAt?.toDate ? d.updatedAt.toDate().toISOString() : new Date().toISOString()
        } as T;
      });
      callback(results);
    }, 
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

// Write helper
export async function createDocument(path: string, docId: string, data: any) {
  try {
    const docRef = doc(db, path, docId);
    
    // Remove undefined fields
    const cleaned = Object.entries(data).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {} as any);

    await setDoc(docRef, {
      ...cleaned,
      userId: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `${path}/${docId}`);
  }
}

// Update helper
export async function updateDocument(path: string, docId: string, data: any) {
  try {
    const docRef = doc(db, path, docId);

    // Remove undefined fields
    const cleaned = Object.entries(data).reduce((acc, [k, v]) => {
      if (v !== undefined) acc[k] = v;
      return acc;
    }, {} as any);

    await updateDoc(docRef, { ...cleaned, updatedAt: serverTimestamp() });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${docId}`);
  }
}

// Delete helper
export async function deleteDocument(path: string, docId: string) {
  try {
    const docRef = doc(db, path, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${docId}`);
  }
}
