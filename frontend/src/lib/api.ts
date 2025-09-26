import { auth } from "./firebase";

const API_BASE = "https://mailgamebackend-jackb7145-jack-branstons-projects.vercel.app/";

async function getToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  return token;
}

export async function sendMailViaBackend(input: {
  toUid: string;
  subject?: string;
  body: string;
  provider: "MANUAL" | "LOB" | "POSTGRID";
}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/v1/mail/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchInbox() {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/v1/mail/inbox`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchOutbox() {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/v1/mail/outbox`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteMail(mailId: string) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}/v1/mail/${mailId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
