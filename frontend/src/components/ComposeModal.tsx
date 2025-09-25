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
    if (!open) return;
    setToUid(initialTo ?? meUid);
    setSubject("");
    setBody("");
    setBusy(false);
  }, [open, initialTo, meUid]);

  if (!open) return null;

  const handleSend = async () => {
    setBusy(true);
    try {
      await onSend(toUid.trim(), subject.trim(), body);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={backdrop}>
      <div style={scanlines} />
      <div style={modal}>
        <div style={header}>
          <span>[ COMPOSE ]</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onOpenOutbox} style={btn}>View Sent</button>
            <button onClick={onClose} style={btn}>Close</button>
          </div>
        </div>

        <div style={row}>
          <label style={label} htmlFor="to">to (uid)</label>
          <input
            id="to"
            value={toUid}
            onChange={(e) => setToUid(e.target.value)}
            style={input}
            spellCheck={false}
            placeholder="uid…"
          />
        </div>

        <div style={row}>
          <label style={label} htmlFor="subj">subject</label>
          <input
            id="subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={input}
            spellCheck={false}
            placeholder="optional"
          />
        </div>

        <div style={rowArea}>
          <label style={label} htmlFor="body">body</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            style={textarea}
            spellCheck={false}
            placeholder="type your message…"
          />
        </div>

        <div style={footer}>
          <span style={hint}>
            {disabled ? "Fill 'to' and 'body' to enable send." : "> ready"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btn} disabled={busy}>
              Cancel
            </button>
            <button onClick={handleSend} style={{ ...btn, ...(disabled ? btnDisabled : {}) }} disabled={disabled}>
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- styles (retro / terminal) ---------- */

const mono = "ui-monospace, Menlo, Monaco, 'Courier New', monospace";

const backdrop: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background:
    "radial-gradient(1200px 800px at 50% 0%, rgba(0,255,110,0.06), transparent 60%) rgba(0,0,0,0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 40,
};

const scanlines: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "repeating-linear-gradient(to bottom, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 2px, transparent 4px)",
};

const modal: React.CSSProperties = {
  width: 640,
  maxWidth: "92vw",
  maxHeight: "86vh",
  overflow: "hidden",
  background: "#000",
  color: "#00ff6a",
  border: "2px solid #00ff6a",
  borderRadius: 8,
  boxShadow: "0 0 18px rgba(0,255,110,0.35), inset 0 0 12px rgba(0,255,110,0.08)",
  fontFamily: mono,
  padding: 14,
  position: "relative",
  display: "grid",
  gridTemplateRows: "auto auto auto 1fr auto",
  gap: 10,
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 2,
  fontWeight: 700,
  letterSpacing: 1,
  textShadow: "0 0 6px rgba(0,255,130,0.6)",
};

const label: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: 12,
  opacity: 0.9,
  alignSelf: "center",
};

const row: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: 10,
  alignItems: "center",
};

const rowArea: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "120px 1fr",
  gap: 10,
  alignItems: "start",
};

const baseField: React.CSSProperties = {
  background: "rgba(0,0,0,0.8)",
  color: "#baffd6",
  border: "1px solid rgba(0,255,110,0.35)",
  borderRadius: 6,
  outline: "none",
  fontFamily: mono,
  fontSize: 14,
  padding: "8px 10px",
  boxShadow: "inset 0 0 10px rgba(0,255,110,0.08)",
};

const input: React.CSSProperties = {
  ...baseField,
  height: 36,
};

const textarea: React.CSSProperties = {
  ...baseField,
  height: 220,
  resize: "vertical",
  lineHeight: 1.4,
};

const footer: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 6,
};

const hint: React.CSSProperties = {
  fontSize: 12,
  opacity: 0.8,
};

const btn: React.CSSProperties = {
  background: "transparent",
  color: "#00ff6a",
  border: "2px solid #00ff6a",
  borderRadius: 4,
  fontFamily: mono,
  padding: "6px 12px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
  boxShadow: "0 0 10px rgba(0,255,110,0.25)",
} as const;

const btnDisabled: React.CSSProperties = {
  opacity: 0.5,
  cursor: "not-allowed",
};
