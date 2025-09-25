import { useEffect, useState } from "react";
import { fetchOutbox } from "../lib/api";

type Props = { open: boolean; meUid: string; onClose: () => void };

export default function OutboxModal({ open, meUid, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await fetchOutbox();
        setRows(data);
      } catch (e) {
        console.error("Failed to fetch outbox", e);
      }
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div style={backdrop}>
      <div style={scanlines} />
      <div style={modal}>
        <div style={header}>
          <span>[ OUTBOX ]</span>
          <button onClick={onClose} style={btn}>Close</button>
        </div>

        {!rows.length ? (
          <i style={muted}>&gt; no sent mail yet</i>
        ) : (
          <div style={list}>
            {rows.map(m => (
              <div key={m.id} style={card}>
                <div style={meta}>
                  {m.createdAt?._seconds
                    ? new Date(m.createdAt._seconds * 1000).toLocaleString()
                    : "just now"}
                </div>
                {m.subject && <div style={subject}>&gt; {m.subject}</div>}
                <div style={kv}><b>to:</b>&nbsp;<span>{m.toUid}</span></div>
                <div style={body} dangerouslySetInnerHTML={{ __html: m.bodyHtml }} />
                <div style={status}><b>status:</b>&nbsp;{m.status}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** ---------- styles (reused) ---------- */

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
  width: 620,
  maxWidth: "90vw",
  maxHeight: "82vh",
  overflow: "hidden",
  background: "#000",
  color: "#00ff6a",
  border: "2px solid #00ff6a",
  borderRadius: 8,
  boxShadow: "0 0 18px rgba(0,255,110,0.35), inset 0 0 12px rgba(0,255,110,0.08)",
  fontFamily: mono,
  padding: 14,
  position: "relative",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
  fontWeight: 700,
  letterSpacing: 1,
  textShadow: "0 0 6px rgba(0,255,130,0.6)",
};

const btn: React.CSSProperties = {
  background: "transparent",
  color: "#00ff6a",
  border: "2px solid #00ff6a",
  borderRadius: 4,
  fontFamily: mono,
  padding: "4px 10px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
  boxShadow: "0 0 10px rgba(0,255,110,0.25)",
} as const;

const list: React.CSSProperties = {
  display: "grid",
  gap: 10,
  maxHeight: "68vh",
  overflow: "auto",
  paddingRight: 6,
};

const card: React.CSSProperties = {
  border: "1px solid rgba(0,255,110,0.35)",
  borderRadius: 6,
  padding: 10,
  background:
    "linear-gradient(180deg, rgba(0,255,80,0.05), rgba(0,0,0,0) 40%)",
};

const meta: React.CSSProperties = { fontSize: 12, opacity: 0.7, marginBottom: 4 };
const subject: React.CSSProperties = { fontWeight: 700, marginBottom: 4 };
const kv: React.CSSProperties = { display: "flex", gap: 4, marginBottom: 6 };
const body: React.CSSProperties = { color: "#baffd6", marginBottom: 6 };
const status: React.CSSProperties = { fontSize: 12, opacity: 0.9 };
const muted: React.CSSProperties = { opacity: 0.7 };
