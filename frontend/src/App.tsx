import { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { MailScene } from "./game/Game";
import { ensureAnonAuth, db } from "./lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import ComposeModal from "./components/ComposeModal";
import InboxModal from "./components/InboxModal";
import OutboxModal from "./components/OutboxModal";
import { sendMailViaBackend } from "./lib/api";

const WIDTH = 960;
const HEIGHT = 540;

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [toUid, setToUid] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [inboxOpen, setInboxOpen] = useState(false);
  const [outboxOpen, setOutboxOpen] = useState(false);

  useEffect(() => {
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
        scene: [MailScene],
        physics: { default: "arcade" },
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      });
      gameRef.current = game;


      game.events.on("compose:interact", () => setComposeOpen(true));
      game.events.on("inbox:interact", () => setInboxOpen(true));
    })();

    return () => gameRef.current?.destroy(true);
  }, []);

  async function handleSend(to: string, subject: string, body: string) {
    await sendMailViaBackend({
      toUid: to,
      subject,
      body,
      provider: "MANUAL", 
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, padding: 16, maxWidth: 1100 }}>
      <h1>Mail Game</h1>
      <div
        id="game"
        style={{
          border: "1px solid #ccc",
          width: WIDTH,
          height: HEIGHT,
          maxWidth: "100%",
        }}
      />
      <p>
        Move with arrows. Press <b>E</b> at the red box to compose, or the blue
        box to read your mail.
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

      <InboxModal
        open={inboxOpen}
        meUid={uid ?? ""}
        onClose={() => setInboxOpen(false)}
      />

      <OutboxModal
        open={outboxOpen}
        meUid={uid ?? ""}
        onClose={() => setOutboxOpen(false)}
      />
    </div>
  );
}
