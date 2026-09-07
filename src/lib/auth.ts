import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signInAnonymously,
  User 
} from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const customDbId = (firebaseConfig as any).firestoreDatabaseId;
export const db = customDbId ? getFirestore(app, customDbId) : getFirestore(app);

// Test offline connection constraint based on Firebase Integration skill
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/calendar.events');
provider.addScope('https://www.googleapis.com/auth/calendar.readonly');
provider.addScope('https://mail.google.com/');
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');
provider.addScope('https://www.googleapis.com/auth/gmail.send');
provider.addScope('https://www.googleapis.com/auth/gmail.modify');
provider.addScope('https://www.googleapis.com/auth/gmail.labels');
provider.addScope('https://www.googleapis.com/auth/gmail.compose');

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem('google_access_token');
  } catch {
    return null;
  }
})();

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Check redirect results (crucial fallback in sandscoped cross-origin iframe situations)
  getRedirectResult(auth)
    .then((result) => {
      if (result) {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (credential?.accessToken) {
          cachedAccessToken = credential.accessToken;
          try {
            localStorage.setItem('google_access_token', cachedAccessToken);
            localStorage.setItem('google_calendar_connected', 'true');
          } catch {}
          if (onAuthSuccess) {
            onAuthSuccess(result.user, cachedAccessToken);
          }
        }
      }
    })
    .catch((error) => {
      console.error("Redirect parsing error:", error);
    });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      const token = cachedAccessToken || localStorage.getItem('google_access_token') || '';
      if (onAuthSuccess) {
        onAuthSuccess(user, token);
      }
    } else {
      // Auto-ensure persistent session through anonymous sign-in if no user logged in
      try {
        const anon = await signInAnonymously(auth);
        if (anon?.user && onAuthSuccess) {
          onAuthSuccess(anon.user, cachedAccessToken || '');
          return;
        }
      } catch (anonErr) {
        console.info('Anonymous sign-in unavailable, proceeding with local session:', anonErr);
      }
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (!credential?.accessToken) {
        throw new Error('Failed to get access token from Firebase Auth');
      }

      cachedAccessToken = credential.accessToken;
      try {
        localStorage.setItem('google_access_token', cachedAccessToken);
      } catch {}
      return { user: result.user, accessToken: cachedAccessToken };
    } catch (popupError: any) {
      console.warn("Popup blocked or rejected. Attempting Firebase redirect signin...", popupError);
      // Attempt redirect instead of popup
      await signInWithRedirect(auth, provider);
      return null;
    }
  } catch (error: any) {
    console.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const clearAccessToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem('google_access_token');
  } catch {}
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  try {
    if (token) {
      localStorage.setItem('google_access_token', token);
    } else {
      localStorage.removeItem('google_access_token');
    }
  } catch {}
};

export const logout = async () => {
  await auth.signOut();
  clearAccessToken();
};
