// App.tsx
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { IntroScene } from "./game/scenes/IntroScene";
import { MailScene } from "./game/scenes/MailScene";
import { ensureUsernameAuth } from "./lib/firebase"; // <-- NEW: sign in AS username (no anon)
import ComposeModal from "./components/ComposeModal";
import InboxModal from "./components/InboxModal";
import OutboxModal from "./components/OutboxModal";
import SignIn from "./components/signIn";
import { sendMailViaBackend } from "./lib/api";
import "./global.css";

// Session boot helpers (accent + customization)
import { primeAccentFromCache, loadCustomization } from "./game/state/session";

// run early before React renders anything
primeAccentFromCache();

const WIDTH = screen.width * 0.95;
const HEIGHT = screen.height * 0.95;

const AUTH_KEY = "mailme:auth";

function isAuthValid(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { username?: string; t: number; ttl?: number };
    if (!parsed?.t || !parsed?.username) return false;
    const ttl = typeof parsed.ttl === "number" ? parsed.ttl : 60 * 60 * 1000; // fallback 60m
    return Date.now() - parsed.t < ttl;
  } catch {
    return false;
  }
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);

  // Keep uid for auth context; backend auth is by token, not by this value directly.
  const [uid, setUid] = useState<string | null>(null);

  // name-based compose target (NOT a uid)
  const [initialToName, setInitialToName] = useState<string>("");

  const [composeOpen, setComposeOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [outboxOpen, setOutboxOpen] = useState(false);

  // initialize signedIn based on localStorage token we control
  const [signedIn, setSignedIn] = useState<boolean>(() => isAuthValid());

  // hydrate customization (safe if not signed in)
  useEffect(() => {
    loadCustomization().catch(() => {});
  }, []);

  // watchdog to expire session if TTL passes
  useEffect(() => {
    if (!signedIn) return;
    const id = setInterval(() => {
      if (!isAuthValid()) {
        window.location.reload();
      }
    }, 30 * 1000);
    return () => clearInterval(id);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;

    (async () => {
      // NEW: sign in using custom token for the username from localStorage (no anonymous)
      const u = await ensureUsernameAuth();
      setUid(u);

      // (Re)create Phaser game
      gameRef.current?.destroy(true);
      const game = new Phaser.Game({
        type: Phaser.AUTO,
        parent: "game",
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: "#101014",
        scene: [IntroScene, MailScene],
        physics: { default: "arcade" },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
      gameRef.current = game;

      // wire events from scenes → open modals
      game.events.on("compose:interact", (payload?: { suggestedName?: string }) => {
        setInitialToName(payload?.suggestedName ?? "");
        setComposeOpen(true);
      });
      game.events.on("inbox:interact", () => setInboxOpen(true));
      game.events.on("outbox:interact", () => setOutboxOpen(true));
    })();

    return () => gameRef.current?.destroy(true);
  }, [signedIn]);

  // Actual API call, triggered by the modal via its onSend prop.
  async function handleSend(toName: string, subject: string, body: string) {
    await sendMailViaBackend({
      toHandle: toName,  // backend expects username/handle
      subject,
      body,
      provider: "NONE",
    });
  }

  if (!signedIn) {
    return <SignIn onSuccess={() => setSignedIn(true)} />;
  }

  return (
    <div
      style={{
        display: "grid",
        alignItems: "center",
        justifyContent: "center",
        maxWidth: "100%",
      }}
    >
      <div
        id="game"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px solid #333",
          width: WIDTH,
          height: HEIGHT,
          maxWidth: "100%",
        }}
      />
      <ComposeModal
        open={composeOpen}
        initialToName={initialToName}   // pass name, not uid
        onSend={handleSend}             // modal calls this; this hits the API
        onClose={() => setComposeOpen(false)}
        onOpenOutbox={() => {
          setComposeOpen(false);
          setOutboxOpen(true);
        }}
      />

      {/* These can ignore uid if server fetches by username already. */}
      <InboxModal open={inboxOpen} meUid={uid ?? ""} onClose={() => setInboxOpen(false)} />
      <OutboxModal open={outboxOpen} meUid={uid ?? ""} onClose={() => setOutboxOpen(false)} />
    </div>
  );
}
