import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { getFirestore, collection, doc, setDoc, getDocs, onSnapshot, query, where, deleteDoc, updateDoc, serverTimestamp, orderBy } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB7f0KY2lWzJWps4eOyEBhFFo4_U8UWYvM",
  authDomain: "gen-lang-client-0425391821.firebaseapp.com",
  projectId: "gen-lang-client-0425391821",
  storageBucket: "gen-lang-client-0425391821.firebasestorage.app",
  messagingSenderId: "170162955981",
  appId: "1:170162955981:web:3ec788e8749cd3fd30ab84"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app, "ai-studio-2c7f7324-d34d-49b9-b106-2c9fb49bbb23");

const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logOut = () => signOut(auth);

export { app, auth, db, onAuthStateChanged };
export type { User };
