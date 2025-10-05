import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { IntroScene } from "./game/scenes/IntroScene";
import { MailScene } from "./game/scenes/MailScene";
import { ensureAnonAuth, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ComposeModal from "./components/ComposeModal";
import InboxModal from "./components/InboxModal";
import OutboxModal from "./components/OutboxModal";
import SignIn from "./components/signIn";
import { sendMailViaBackend } from "./lib/api";
import "./global.css";

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

  // Optional: watchdog that expires session in-tab if user sits longer than TTL
  useEffect(() => {
    if (!signedIn) return;
    const id = setInterval(() => {
      if (!isAuthValid()) {
        // simple in-tab expire → reload to bounce back to SignIn
        // (or do setSignedIn(false) if you want a soft-kick)
        window.location.reload();
      }
    }, 30 * 1000); // check every 30s
    return () => clearInterval(id);
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn) return;

    (async () => {
      const u = await ensureAnonAuth();
      setUid(u);
      setToUid(u);

      const uref = doc(db, "users", u);
      const snap = await getDoc(uref);
      if (!snap.exists()) {
        await setDoc(uref, {
          displayName: `Player-${u.slice(0, 6)}`,
          address: {
            name: "Test User",
            line1: "123 Test St",
            city: "Toronto",
            region: "ON",
            postal: "M5V 1A1",
            country: "CA",
          },
        });
      }

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
