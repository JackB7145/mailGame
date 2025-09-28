import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = { // For anyone viewing this on github, this is not sensitive data, just config information. You can't actually do anything with it. 
  apiKey: "AIzaSyBNtEYe395w4PM6EDsfrmEE3xOO-UBRUW4",
  authDomain: "mailgame-ca690.firebaseapp.com",
  projectId: "mailgame-ca690",
  storageBucket: "mailgame-ca690.firebasestorage.app",
  messagingSenderId: "1086119746021",
  appId: "1:1086119746021:web:6a8d9da155b71cec6e770c",
  measurementId: "G-69MSZHXKB7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);  

export async function ensureAnonAuth(): Promise<string> {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
  return auth.currentUser!.uid;
}
