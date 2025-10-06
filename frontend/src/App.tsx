import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { IntroScene } from "./game/scenes/IntroScene";
import { MailScene } from "./game/scenes/MailScene";
import { ensureAnonAuth } from "./lib/firebase"; // keep for auth only
import ComposeModal from "./components/ComposeModal";
import InboxModal from "./components/InboxModal";
import OutboxModal from "./components/OutboxModal";
import SignIn from "./components/signIn";
import { sendMailViaBackend } from "./lib/api";
import "./global.css";

// ⬇️ bring in session boot helpers
import { primeAccentFromCache, loadCustomization } from './game/state/session';

// ⬇️ run this immediately at module load (sync), before React renders anything
primeAccentFromCache();

const WIDTH = screen.width * 0.95;
const HEIGHT = screen.height * 0.95;

const AUTH_KEY = "mailme:auth";

function isAuthValid(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { v: string; t: number; ttl?: number };
    if (!parsed?.t) return false;
    const ttl = typeof parsed.ttl === "number" ? parsed.ttl : 60 * 60 * 1000; // fallback 60m
    return Date.now() - parsed.t < ttl;
  } catch {
    return false;
  }
}

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [toUid, setToUid] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [outboxOpen, setOutboxOpen] = useState(false);

  // initialize signedIn based on localStorage token
  const [signedIn, setSignedIn] = useState<boolean>(() => isAuthValid());

  // ⬇️ on first mount, hydrate customization (color/hat/position) from backend.
  // safe if not signed in: loadCustomization() no-ops without an active user.
  useEffect(() => {
    loadCustomization().catch(() => {});
  }, []);

  // Optional: watchdog that expires session in-tab if user sits longer than TTL
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
      // Only auth (anonymous). No Firestore user doc creation.
      const u = await ensureAnonAuth();
      setUid(u);
      setToUid(u);

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

      game.events.on("compose:interact", () => setComposeOpen(true));
      game.events.on("inbox:interact", () => setInboxOpen(true));
    })();

    return () => gameRef.current?.destroy(true);
  }, [signedIn]);

  async function handleSend(to: string, subject: string, body: string) {
    await sendMailViaBackend({
      toUid: to,
      subject,
      body,
      provider: "MANUAL",
    });
  }

  if (!signedIn) {
    return <SignIn onSuccess={() => setSignedIn(true)} />;
  }

  return (
    <div style={{ display: "grid", alignItems: "center", justifyContent: "center", maxWidth: "100%" }}>
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
        meUid={uid ?? ""}
        initialTo={toUid}
        onSend={handleSend}
        onClose={() => setComposeOpen(false)}
        onOpenOutbox={() => {
          setComposeOpen(false);
          setOutboxOpen(true);
        }}
      />

      <InboxModal open={inboxOpen} meUid={uid ?? ""} onClose={() => setInboxOpen(false)} />

      <OutboxModal open={outboxOpen} meUid={uid ?? ""} onClose={() => setOutboxOpen(false)} />
    </div>
  );
}
