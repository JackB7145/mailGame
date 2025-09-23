import { useState, useEffect } from "react";

type Props = {
  open: boolean;
  meUid: string;
  initialTo?: string;
  onSend: (toUid: string, subject: string, body: string) => Promise<void>;
  onClose: () => void;
  onOpenOutbox: () => void; 
};

export default function ComposeModal({
  open,
  meUid,
  initialTo,
  onSend,
  onClose,
  onOpenOutbox,
}: Props) {
  const [toUid, setToUid] = useState(initialTo ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const disabled = !toUid || !body || busy;

  useEffect(() => {
    if (open) {
      setToUid(initialTo ?? meUid);
      setSubject("");
      setBody("");
      setBusy(false);
    }
  }, [open, initialTo, meUid]);

  if (!open) return null;

  return (
    <div style={backdrop}>
      <div style={modal}>
        <h3>Compose Letter</h3>

        <label style={row}>
          To (uid):
          <input
            value={toUid}
            onChange={(e) => setToUid(e.target.value)}
            style={input}
          />
        </label>

        <label style={row}>
          Subject:
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={input}
          />
        </label>

        <label style={{ ...row, alignItems: "start" }}>
          Body:
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            style={{ ...input, height: 180 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>

          <button onClick={onOpenOutbox}>📦 View Sent Mail</button>

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button
              onClick={async () => {
                setBusy(true);
                await onSend(toUid, subject, body);
                setBusy(false);
                onClose();
              }}
              disabled={disabled}
            >
              {busy ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const modal: React.CSSProperties = {
  width: 520,
  background: "#fff",
  border: "1px solid #ddd",
  borderRadius: 6,
  padding: 16,
  boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: 8,
  margin: "8px 0",
};

const input: React.CSSProperties = {
  padding: 8,
  border: "1px solid #ccc",
  borderRadius: 4,
};
