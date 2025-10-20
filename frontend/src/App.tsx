// App.tsx
import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { IntroScene } from "./game/scenes/IntroScene";
import { MailScene } from "./game/scenes/MailScene";
import { ensureUsernameAuth } from "./lib/firebase"; // signs in using username (no anon)
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

/** Validate the mailme:activeUser token */
function isAuthValid(): boolean {
  try {
    const raw = localStorage.getItem("mailme:activeUser");
    if (!raw) return false;

    const parsed = JSON.parse(raw) as { username?: string; t: number; ttl?: number };
    if (!parsed?.username || !parsed?.t) return false;

    const ttl = typeof parsed.ttl === "number" ? parsed.ttl : 60 * 60 * 1000; // 1h default
    return Date.now() - parsed.t < ttl;
  } catch {
    return false;
  }
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);

  // Track username instead of UID
  const [username, setUsername] = useState<string | null>(null);

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

  // initialize Phaser game + username auth
  useEffect(() => {
    if (!signedIn) return;

    (async () => {
      const name = await ensureUsernameAuth(); // returns username
      setUsername(name);

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
  async function handleSend(toName: string, subject: string, body: string, images: { value: string; text: string }[]) {
    const res = await sendMailViaBackend({
      toUsername: toName, // backend expects username/handle
      subject,
      body,
      provider: "NONE",
      images
    });
    return res;
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
        initialToName={initialToName}
        onSend={handleSend}
        onClose={() => setComposeOpen(false)}
        onOpenOutbox={() => {
          setComposeOpen(false);
          setOutboxOpen(true);
        }}
      />

      <InboxModal open={inboxOpen} meName={username ?? ""} onClose={() => setInboxOpen(false)} />
      <OutboxModal open={outboxOpen} meName={username ?? ""} onClose={() => setOutboxOpen(false)} />
    </div>
  );
}
