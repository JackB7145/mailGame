import { useState, useEffect } from "react";
import { useAccent } from "../hooks/useAccents";
import { usernameExists } from "../lib/api"; // <-- assumes: (name: string) => Promise<boolean>

type Props = {
  open: boolean;
  initialToName?: string;
  onSend: (toName: string, subject: string, body: string) => Promise<void>;
  onClose: () => void;
  onOpenOutbox: () => void;
};

export default function ComposeModal({
  open,
  initialToName,
  onSend,
  onClose,
  onOpenOutbox,
}: Props) {
  const [toName, setToName] = useState(initialToName ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  // recipient validation
  const [validRecipient, setValidRecipient] = useState<null | boolean>(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);

  const { hex, rgba } = useAccent();

  const disabled =
    !toName ||
    !body ||
    busy ||
    validRecipient === false ||
    checkingRecipient; // prevent send while checking or invalid

  useEffect(() => {
    if (!open) return;
    setToName(initialToName ?? "");
    setSubject("");
    setBody("");
    setBusy(false);
    setValidRecipient(null);
    setCheckingRecipient(false);
  }, [open, initialToName]);

  if (!open) return null;

  const handleSend = async () => {
    setBusy(true);
    try {
      const cleanName = toName.replace(/\s+/g, " ").trim();
      await onSend(cleanName, subject.trim(), body);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const handleBlurToName = async () => {
    const candidate = toName.trim();
    if (!candidate) {
      setValidRecipient(null);
      return;
    }
    setCheckingRecipient(true);
    try {
      const exists = await usernameExists(candidate);
      setValidRecipient(!!exists);
    } catch {
      // network/api error → treat as invalid for safety
      setValidRecipient(false);
    } finally {
      setCheckingRecipient(false);
    }
  };

  // dynamic styles (accent)
  const modalDyn = {
    ...modal,
    color: hex,
    border: `2px solid ${hex}`,
    boxShadow: `0 0 18px ${rgba(0.35)}, inset 0 0 12px ${rgba(0.08)}`,
  } as const;
  const headerDyn = { ...header, textShadow: `0 0 6px ${rgba(0.6)}` };
  const inputDyn = {
    ...input,
    border: `1px solid ${rgba(0.35)}`,
    boxShadow: `inset 0 0 10px ${rgba(0.08)}`,
    transition: "box-shadow 120ms ease, border-color 120ms ease",
  } as const;

  // name field: override border based on validity
  const nameFieldDyn: React.CSSProperties =
    validRecipient === true
      ? {
          ...inputDyn,
          border: "2px solid rgba(0,255,110,0.95)",
          boxShadow: "0 0 10px rgba(0,255,110,0.35), inset 0 0 10px rgba(0,255,110,0.10)",
        }
      : validRecipient === false
      ? {
          ...inputDyn,
          border: "2px solid rgba(255,0,0,0.95)",
          boxShadow: "0 0 10px rgba(255,0,0,0.35), inset 0 0 10px rgba(255,0,0,0.10)",
        }
      : inputDyn;

  const textareaDyn = {
    ...textarea,
    border: `1px solid ${rgba(0.35)}`,
    boxShadow: `inset 0 0 10px ${rgba(0.08)}`,
  } as const;
  const btnDyn = {
    ...btn,
    color: hex,
    border: `2px solid ${hex}`,
    boxShadow: `0 0 10px ${rgba(0.25)}`,
  } as const;

  const stop = (e: React.KeyboardEvent) => e.stopPropagation();

  return (
    <div style={backdrop}>
      <div style={scanlines} />
      <div style={modalDyn}>
        <div style={headerDyn}>
          <span>[ COMPOSE ]</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onOpenOutbox} style={btnDyn}>View Sent</button>
            <button onClick={onClose} style={btnDyn}>Close</button>
          </div>
        </div>

        <div style={row}>
          <label style={label} htmlFor="to">to (name)</label>
          <input
            id="to"
            value={toName}
            onChange={(e) => {
              setToName(e.target.value);
              setValidRecipient(null); // reset while editing
            }}
            onBlur={handleBlurToName}
            onKeyDown={stop}
            style={nameFieldDyn}
            spellCheck={false}
            placeholder="e.g., Alice Chen"
          />
        </div>

        {checkingRecipient && (
          <div style={{ margin: "-6px 0 4px 120px", fontSize: 12, opacity: 0.8 }}>
            Checking recipient…
          </div>
        )}
        {validRecipient === false && (
          <div style={{ margin: "-6px 0 4px 120px", fontSize: 12, color: "rgba(255,80,80,0.95)" }}>
            No user found with that name.
          </div>
        )}
        {validRecipient === true && (
          <div style={{ margin: "-6px 0 4px 120px", fontSize: 12, color: "rgba(0,255,140,0.95)" }}>
            Recipient found.
          </div>
        )}

        <div style={row}>
          <label style={label} htmlFor="subj">subject</label>
          <input
            id="subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            onKeyDown={stop}
            style={inputDyn}
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
            onKeyDown={stop}
            rows={10}
            style={textareaDyn}
            spellCheck={false}
            placeholder="type your message…"
          />
        </div>

        <div style={footer}>
          <span style={hint}>
            {disabled
              ? validRecipient === false
                ? "Recipient doesn't exist."
                : checkingRecipient
                ? "Verifying recipient…"
                : "Fill 'to' and 'body' to enable send."
              : "> ready"}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={btnDyn} disabled={busy}>
              Cancel
            </button>
            <button
              onClick={handleSend}
              style={{ ...btnDyn, ...(disabled ? btnDisabled : {}) }}
              disabled={disabled}
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- static parts (unchanged) ---------- */
const mono = "ui-monospace, Menlo, Monaco, 'Courier New', monospace";
const backdrop: React.CSSProperties = { position:"fixed", inset:0, background:"radial-gradient(1200px 800px at 50% 0%, rgba(0,255,110,0.06), transparent 60%) rgba(0,0,0,0.9)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:40 };
const scanlines: React.CSSProperties = { position:"absolute", inset:0, pointerEvents:"none", background:"repeating-linear-gradient(to bottom, rgba(0,0,0,0.1) 0px, rgba(0,0,0,0.1) 1px, transparent 2px, transparent 4px)" };
const modal: React.CSSProperties = { width:640, maxWidth:"92vw", maxHeight:"86vh", overflow:"hidden", background:"#000", color:"#00ff6a", border:"2px solid #00ff6a", borderRadius:8, boxShadow:"0 0 18px rgba(0,255,110,0.35), inset 0 0 12px rgba(0,255,110,0.08)", fontFamily:mono, padding:14, position:"relative", display:"grid", gridTemplateRows:"auto auto auto 1fr auto", gap:10 };
const header: React.CSSProperties = { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:2, fontWeight:700, letterSpacing:1, textShadow:"0 0 6px rgba(0,255,130,0.6)" };
const label: React.CSSProperties = { textTransform:"uppercase", letterSpacing:1, fontSize:12, opacity:0.9, alignSelf:"center" };
const row: React.CSSProperties = { display:"grid", gridTemplateColumns:"120px 1fr", gap:10, alignItems:"center" };
const rowArea: React.CSSProperties = { display:"grid", gridTemplateColumns:"120px 1fr", gap:10, alignItems:"start" };
const baseField: React.CSSProperties = { background:"rgba(0,0,0,0.8)", color:"#baffd6", border:"1px solid rgba(0,255,110,0.35)", borderRadius:6, outline:"none", fontFamily:mono, fontSize:14, padding:"8px 10px", boxShadow:"inset 0 0 10px rgba(0,255,110,0.08)" };
const input: React.CSSProperties = { ...baseField, height:36 };
const textarea: React.CSSProperties = { ...baseField, height:220, resize:"vertical", lineHeight:1.4 };
const footer: React.CSSProperties = { display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:6 };
const hint: React.CSSProperties = { fontSize:12, opacity:0.8 };
const btn: React.CSSProperties = { background:"transparent", color:"#00ff6a", border:"2px solid #00ff6a", borderRadius:4, fontFamily:mono, padding:"6px 12px", cursor:"pointer", textTransform:"uppercase", letterSpacing:1, boxShadow:"0 0 10px rgba(0,255,110,0.25)" } as const;
const btnDisabled: React.CSSProperties = { opacity:0.5, cursor:"not-allowed" };
