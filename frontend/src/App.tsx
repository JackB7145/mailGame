import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { IntroScene } from "./game/scenes/IntroScene";
import { MailScene } from "./game/scenes/MailScene";
import { ensureAnonAuth, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ComposeModal from "./components/ComposeModal";
import InboxModal from "./components/InboxModal";
import OutboxModal from "./components/OutboxModal";
import SignIn from "./components/SignIn";
import { sendMailViaBackend } from "./lib/api";
import "./global.css";

const WIDTH = screen.width * 0.8;
const HEIGHT = screen.height * 0.8;

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [toUid, setToUid] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

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
        scene: [IntroScene, MailScene], // 👈 start with intro, then jumps to mail
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

  if (!signedIn) return <SignIn onSuccess={() => setSignedIn(true)} />;

  return (
    <div style={{ display: "grid", alignItems: "center", justifyContent: "center", maxWidth: "100%" }}>
      <h1>Mail Game</h1>
      <div id="game" style={{ border: "1px solid #333", width: WIDTH, height: HEIGHT, maxWidth: "100%" }} />
      <p>
        Arrows/WASD to move. Press <b>E</b> at the bench to compose, the mailbox to read, or the wardrobe to change your look.
      </p>

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
