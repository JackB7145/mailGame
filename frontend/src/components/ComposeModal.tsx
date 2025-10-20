import { useState, useEffect } from "react";
import { useAccent } from "../hooks/useAccents";
import { usernameExists } from "../lib/api";
import LoadingOverlay from "./LoadingOverlay";

type Props = {
  open: boolean;
  initialToName?: string;
  onSend: (
    toName: string,
    subject: string,
    body: string,
    images: { value: string; text: string }[]
  ) => Promise<number>; // expect status code (e.g. 204)
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
  const [images, setImages] = useState<{ value: string; text: string }[]>([]);
  const [validRecipient, setValidRecipient] = useState<null | boolean>(null);
  const [checkingRecipient, setCheckingRecipient] = useState(false);
  const [showLoading, setShowLoading] = useState(false);
  const [sendStatus, setSendStatus] = useState<null | "success" | "error">(null);

  const { hex, rgba } = useAccent();

  const disabled =
    !toName || !body || busy || validRecipient === false || checkingRecipient;

  useEffect(() => {
    if (!open) return;
    setToName(initialToName ?? "");
    setSubject("");
    setBody("");
    setBusy(false);
    setValidRecipient(null);
    setCheckingRecipient(false);
    setImages([]);
    setSendStatus(null);
  }, [open, initialToName]);

  if (!open) return null;

  const handleSend = async () => {
    setBusy(true);
    setShowLoading(true);
    setSendStatus(null);

    try {
      const cleanName = toName.replace(/\s+/g, " ").trim();
      const status = await onSend(cleanName, subject.trim(), body, images);

      if (status === 204) {
        // ✅ Success
        setSendStatus("success");
        setToName("");
        setSubject("");
        setBody("");
        setImages([]);
        setValidRecipient(null);
      } else {
        // ❌ Unexpected response
        setSendStatus("error");
        console.warn("Unexpected response status:", status);
      }
    } catch (err) {
      console.error("Failed to send mail", err);
      setSendStatus("error");
    } finally {
      setBusy(false);
      setShowLoading(false);
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
      setValidRecipient(false);
    } finally {
      setCheckingRecipient(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newImages: { value: string; text: string }[] = [];
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      const result = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newImages.push({ value: result, text: "" });
    }
    setImages((prev) => [...prev, ...newImages]);
  };

  const handleImageTextChange = (idx: number, text: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === idx ? { ...img, text } : img))
    );
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

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
  } as const;
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
    <>
      {showLoading && <LoadingOverlay />}
      <div style={backdrop}>
        <div style={scanlines} />
        <div style={modalDyn} onKeyDown={stop}>
          <div style={headerDyn}>
            <span>[ COMPOSE ]</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={onOpenOutbox} style={btnDyn}>
                View Sent
              </button>
              <button onClick={onClose} style={btnDyn}>
                Close
              </button>
            </div>
          </div>

          {/* Recipient */}
          <div style={row}>
            <label style={label} htmlFor="to">
              to (name)
            </label>
            <input
              id="to"
              value={toName}
              onChange={(e) => {
                setToName(e.target.value);
                setValidRecipient(null);
              }}
              onBlur={handleBlurToName}
              style={inputDyn}
              spellCheck={false}
              placeholder="e.g., Alice Chen"
            />
          </div>

          {checkingRecipient && <div style={note}>Checking recipient…</div>}
          {validRecipient === false && (
            <div style={noteErr}>No user found with that name.</div>
          )}
          {validRecipient === true && (
            <div style={noteOk}>Recipient found.</div>
          )}

          {/* Subject */}
          <div style={row}>
            <label style={label} htmlFor="subj">
              subject
            </label>
            <input
              id="subj"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              style={inputDyn}
              spellCheck={false}
              placeholder="optional"
            />
          </div>

          {/* Body */}
          <div style={rowArea}>
            <label style={label} htmlFor="body">
              body
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              style={textareaDyn}
              spellCheck={false}
              placeholder="type your message…"
            />
          </div>

          {/* Images */}
          <div style={{ marginTop: 20 }}>
            <label style={label}>attachments</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              style={{ marginLeft: 10 }}
            />
            <div style={{ marginTop: 12 }}>
              {images.map((img, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <img
                      src={img.value}
                      alt={`upload-${i}`}
                      style={{
                        width: 80,
                        height: 80,
                        objectFit: "cover",
                        border: `1px solid ${rgba(0.4)}`,
                        borderRadius: 6,
                      }}
                    />
                    <button
                      onClick={() => removeImage(i)}
                      style={{ ...btnDyn, fontSize: 12 }}
                    >
                      Remove
                    </button>
                  </div>
                  <input
                    type="text"
                    value={img.text}
                    onChange={(e) => handleImageTextChange(i, e.target.value)}
                    placeholder="Add description for this image..."
                    style={inputDyn}
                    spellCheck={false}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div style={footer}>
            <span style={hint}>
              {disabled
                ? validRecipient === false
                  ? "Recipient doesn't exist."
                  : checkingRecipient
                  ? "Verifying recipient…"
                  : "Fill 'to' and 'body' to enable send."
                : sendStatus === "success"
                ? "✅ Mail sent successfully!"
                : sendStatus === "error"
                ? "❌ Failed to send mail."
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
    </>
  );
}

/* --- Styles (same aesthetic) --- */
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
  overflow: "auto",
  background: "#000",
  color: "#00ff6a",
  borderRadius: 8,
  fontFamily: mono,
  padding: 14,
};
const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  fontWeight: 700,
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
  borderRadius: 6,
  outline: "none",
  fontFamily: mono,
  fontSize: 14,
  padding: "8px 10px",
};
const input: React.CSSProperties = { ...baseField, height: 36 };
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
const hint: React.CSSProperties = { fontSize: 12, opacity: 0.8 };
const btn: React.CSSProperties = {
  background: "transparent",
  borderRadius: 4,
  fontFamily: mono,
  padding: "6px 12px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
};
const btnDisabled: React.CSSProperties = { opacity: 0.5, cursor: "not-allowed" };
const label: React.CSSProperties = {
  textTransform: "uppercase",
  letterSpacing: 1,
  fontSize: 12,
  opacity: 0.9,
};
const note: React.CSSProperties = {
  margin: "-6px 0 4px 120px",
  fontSize: 12,
  opacity: 0.8,
};
const noteErr: React.CSSProperties = { ...note, color: "rgba(255,80,80,0.95)" };
const noteOk: React.CSSProperties = { ...note, color: "rgba(0,255,140,0.95)" };
