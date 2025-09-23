import {
  addDoc, collection, serverTimestamp, updateDoc,
  query, where, orderBy, limit as qlimit, onSnapshot, DocumentData
} from "firebase/firestore";
import { auth, db } from "./firebase";

export type Provider = "lob" | "postgrid" | "manual";

export type QueueMailInput = {
  toUid: string;
  subject?: string;
  bodyHtml: string;
  provider: Provider;
};

export type MailDoc = {
  id: string;
  fromUid: string;
  toUid: string;
  subject?: string;
  bodyHtml: string;
  status: string;
  provider: Provider;
  providerRef?: string;
  error?: string;
  createdAt?: any;
};

export async function queueMail(input: QueueMailInput): Promise<string> {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Not signed in");

  const ref = await addDoc(collection(db, "mail"), {
    fromUid: uid,
    toUid: input.toUid,
    subject: input.subject ?? null,
    bodyHtml: input.bodyHtml,
    createdAt: serverTimestamp(),
    status: "DRAFT",
    provider: input.provider,
  });

  await updateDoc(ref, { status: "QUEUED" });
  return ref.id;
}

export function subscribeInbox(uid: string, onChange: (items: MailDoc[]) => void, limit = 10) {
  const q = query(
    collection(db, "mail"),
    where("toUid", "==", uid),
    orderBy("createdAt", "desc"),
    qlimit(limit)
  );
  return onSnapshot(q, (snap) => {
    const rows: MailDoc[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }) as MailDoc);
    onChange(rows);
  });
}

export function subscribeOutbox(uid: string, onChange: (items: MailDoc[]) => void, limit = 10) {
  const q = query(
    collection(db, "mail"),
    where("fromUid", "==", uid),
    orderBy("createdAt", "desc"),
    qlimit(limit)
  );
  return onSnapshot(q, (snap) => {
    const rows: MailDoc[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as DocumentData) }) as MailDoc);
    onChange(rows);
  });
}
