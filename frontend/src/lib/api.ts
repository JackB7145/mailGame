import { auth } from "./firebase";

export const API_BASE = "https://backend-tan-iota-68.vercel.app";

async function getToken(): Promise<string> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Not signed in");
  return token;
}

  export async function sendMailViaBackend(input: {
    toUsername: string;
    subject?: string;
    body: string;
    provider?: "NONE";
    images?: { value: string; text: string }[]
  }) {
    const token = await getToken();
    const raw = localStorage.getItem("mailme:activeUser");
    const fromUsername = raw ? JSON.parse(raw).username : "unknown";

    const res = await fetch(`${API_BASE}/v1/mail/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fromUsername: fromUsername,                // 🆕 include the real username
        toUsername: input.toUsername,
        subject: input.subject ?? null,
        body: input.body,
        provider: "NONE",
        images: input.images
      }),
    });

    if (!res.ok) throw new Error(`Mail send failed: ${res.status}`);
    return res.json();
  }


export async function fetchInbox() {
  const token = await getToken();

  // Grab active user from localStorage
  const activeUser = localStorage.getItem("mailme:activeUser");
  if (!activeUser) throw new Error("Active user not found in localStorage");

  const { username } = JSON.parse(activeUser);
  if (!username) throw new Error("Username missing in activeUser object");

  // Send username in request body
  const res = await fetch(`${API_BASE}/v1/mail/inbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchOutbox() {
  const token = await getToken();

  // Grab active user from localStorage
  const activeUser = localStorage.getItem("mailme:activeUser");
  if (!activeUser) throw new Error("Active user not found in localStorage");

  const { username } = JSON.parse(activeUser);
  if (!username) throw new Error("Username missing in activeUser object");

  // Send username in request body
  const res = await fetch(`${API_BASE}/v1/mail/outbox`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ username }),
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

/** Checks if a user with exactly this username exists. */
export async function usernameExists(username: string): Promise<boolean> {
  const url = new URL(`${API_BASE}/v1/users/exists`);
  url.searchParams.set("username", username);
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(await res.text());
  const data = await res.json();
  return Boolean(data?.exists);
}

/* -------------------------------
   Customization by USERNAME (server writes)
-------------------------------- */

export async function getCustomizationFor(username: string): Promise<{
  ok: boolean;
  username: string;
  customization: {
    playerColor: string | null;
    playerHat: string | null;
    position: number[] | null;
  } | null;
}> {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE}/v1/users/${encodeURIComponent(username)}/customization`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function saveCustomizationFor(
  username: string,
  input: { playerColor?: string; playerHat?: string; position?: number[] }
) {
  const token = await getToken();
  const res = await fetch(
    `${API_BASE}/v1/users/${encodeURIComponent(username)}/customization`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    }
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json(); // { ok: true }
}

