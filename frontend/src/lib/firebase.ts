// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { API_BASE } from "./api";
/**
 * No anonymous auth. We sign in explicitly as the username stored in localStorage.
 * Backend must expose POST /v1/auth/dev-login to mint a Firebase Custom Token
 * for the Firestore user that owns that username.
 *
 * localStorage key expected: "mailme:auth"
 * value example: {"username":"Jack","t":1759913021556}
 */

const firebaseConfig = {
  apiKey: "AIzaSyBNtEYe395w4PM6EDsfrmEE3xOO-UBRUW4",
  authDomain: "mailgame-ca690.firebaseapp.com",
  projectId: "mailgame-ca690",
  storageBucket: "mailgame-ca690.firebasestorage.app",
  messagingSenderId: "1086119746021",
  appId: "1:1086119746021:web:6a8d9da155b71cec6e770c",
  measurementId: "G-69MSZHXKB7",
};

const AUTH_KEY = "mailme:activeUser";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

/** Pull desired username from localStorage. Throws if missing/invalid. */
function getDesiredUsername(): string {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) throw new Error(`No local auth record; expected ${AUTH_KEY} in localStorage`);
  let username = "";
  try {
    const parsed = JSON.parse(raw);
    username = String(parsed?.username ?? "").trim();
  } catch {
    /* fallthrough */
  }
  if (!username) throw new Error(`Username missing/invalid in ${AUTH_KEY}`);
  return username.replace(/^@+/, "");
}

/** Ask backend for a Firebase Custom Token representing that username. */
async function fetchCustomTokenFor(username: string): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/dev-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  if (!data?.token) throw new Error("Backend did not return a token");
  return data.token as string;
}

/**
 * Sign in AS the username from localStorage (e.g., "Jack") using a custom token.
 * Returns the signed-in UID (the Firestore doc id behind that username).
 */
export async function ensureUsernameAuth(): Promise<string> {
  const desired = getDesiredUsername();

  // If already signed in, keep it.
  if (auth.currentUser) return auth.currentUser.uid;

  const token = await fetchCustomTokenFor(desired);
  const cred = await signInWithCustomToken(auth, token);
  
  return cred.user.uid;
}
