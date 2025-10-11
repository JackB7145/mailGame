import { useEffect, useState } from "react";
import { fetchInbox, deleteMail } from "../lib/api";
import { useAccent } from "../hooks/useAccents";

type Props = { open: boolean; meName: string; onClose: () => void };

type MailRow = {
  id: string;
  fromUsername?: string;
  toUsername?: string;
  subject?: string;
  body?: string;
  status?: string;
  createdAt?: string | { _seconds?: number; seconds?: number };
  images?: { value?: string; text?: string }[];
};

function formatCreatedAt(createdAt: any): string {
  if (!createdAt) return "just now";
  try {
    if (typeof createdAt === "string") {
      const d = new Date(createdAt);
      if (!isNaN(d.getTime())) return d.toLocaleString();
    } else if (createdAt._seconds || createdAt.seconds) {
      return new Date((createdAt._seconds ?? createdAt.seconds) * 1000).toLocaleString();
    }
  } catch {}
  return "just now";
}

export default function InboxModal({ open, meName, onClose }: Props) {
  const [rows, setRows] = useState<MailRow[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedImage, setExpandedImage] = useState<{ url: string; text: string } | null>(null);
  const { hex, rgba } = useAccent();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await fetchInbox();
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        setRows(items);
      } catch (e) {
        console.error("Failed to fetch inbox", e);
      }
    })();
  }, [open]);

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setBusyId(id);
    try {
      await deleteMail(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      console.error("Failed to delete mail", e);
    } finally {
      setBusyId(null);
    }
  }

  if (!open) return null;

  const modalDyn = {
    ...modal,
    color: hex,
    border: `2px solid ${hex}`,
    boxShadow: `0 0 18px ${rgba(0.35)}, inset 0 0 12px ${rgba(0.08)}`,
  } as const;
  const headerDyn = { ...header, textShadow: `0 0 6px ${rgba(0.6)}` };
  const btnDyn = {
    ...btn,
    color: hex,
    border: `2px solid ${hex}`,
    boxShadow: `0 0 10px ${rgba(0.25)}`,
  } as const;

  return (
    <>
      <div style={backdrop}>
        <div style={scanlines} />
        <div style={modalDyn}>
          <div style={headerDyn}>
            <span>[ INBOX ]</span>
            <button onClick={onClose} style={btnDyn}>
              Close
            </button>
          </div>

          {!rows.length ? (
            <i style={muted}>&gt; no mail yet</i>
          ) : (
            <div style={list}>
              {rows.map((m) => {
                const expanded = expandedId === m.id;
                const images =
                  m.images?.map((img) => ({
                    url: img.value,
                    text: img.text || "",
                  })) ?? [];

                return (
                  <div
                    key={m.id}
                    style={{
                      ...card,
                      border: expanded
                        ? `2px solid ${hex}`
                        : `1px solid ${rgba(0.35)}`,
                      transform: expanded ? "scale(1.02)" : "scale(1)",
                      transition: "all 0.25s ease",
                      cursor: "pointer",
                      position: "relative",
                    }}
                    onClick={() => setExpandedId(expanded ? null : m.id)}
                  >
                    <div style={expandHint}>
                      {expanded ? "▼ Collapse" : "▶ Click to Expand"}
                    </div>

                    <div style={meta}>{formatCreatedAt(m.createdAt)}</div>
                    {m.subject && <div style={subject}>&gt; {m.subject}</div>}

                    <div style={kv}>
                      <b>from:</b>&nbsp;
                      <span>{m.fromUsername === meName ? "me" : m.fromUsername}</span>
                    </div>
                    <div style={kv}>
                      <b>to:</b>&nbsp;
                      <span>{m.toUsername === meName ? "me" : m.toUsername}</span>
                    </div>

                    {!expanded ? (
                      <div style={bodyPreview}>
                        {(m.body ?? "").slice(0, 80)}
                        {m.body && m.body.length > 80 ? "..." : ""}
                      </div>
                    ) : (
                      <>
                        <div style={bodyFull}>{m.body || ""}</div>

                        {images.length > 0 && (
                          <div style={imageGrid}>
                            {images.map((img, i) => (
                              <div key={i} style={imageCard}>
                                <img
                                  src={img.url}
                                  alt="attachment"
                                  style={imageFrontImg}
                                />
                                <button
                                  style={expandBtn}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedImage({
                                      url: img.url || "",
                                      text: img.text || "",
                                    });
                                  }}
                                >
                                  Expand Image
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <div style={footerRow}>
                      <span style={status}>
                        <b>status:</b>&nbsp;{m.status || "STORED"}
                      </span>
                      <button
                        disabled={busyId === m.id}
                        onClick={(e) => handleDelete(m.id, e)}
                        style={{ ...btnDyn, opacity: busyId === m.id ? 0.6 : 1 }}
                      >
                        {busyId === m.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Expanded image modal */}
      {expandedImage && (
        <div style={zoomOverlay}>
          <div style={zoomInner}>
            <img
              src={expandedImage.url}
              alt="expanded"
              style={zoomedImgStyle}
            />
            <div style={imageTextBox}>
              <p>{expandedImage.text || "(no OCR text available)"}</p>
            </div>
            <button
              onClick={() => setExpandedImage(null)}
              style={closeZoomBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ---- Styles ---- */
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
  width: 700,
  maxWidth: "92vw",
  maxHeight: "85vh",
  overflowY: "auto",
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
  marginBottom: 10,
  fontWeight: 700,
};
const btn: React.CSSProperties = {
  background: "transparent",
  borderRadius: 4,
  fontFamily: mono,
  padding: "4px 10px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
};
const list: React.CSSProperties = { display: "grid", gap: 10 };
const card: React.CSSProperties = {
  borderRadius: 6,
  padding: 10,
  background: "linear-gradient(180deg, rgba(0,255,80,0.05), rgba(0,0,0,0) 40%)",
};
const expandHint: React.CSSProperties = {
  position: "absolute",
  top: 8,
  right: 10,
  fontSize: 12,
  opacity: 0.6,
  color: "#00ff6a",
};
const meta: React.CSSProperties = { fontSize: 12, opacity: 0.7, marginBottom: 4 };
const subject: React.CSSProperties = { fontWeight: 700, marginBottom: 4 };
const kv: React.CSSProperties = { display: "flex", gap: 4, marginBottom: 6 };
const bodyPreview: React.CSSProperties = {
  color: "#baffd6",
  marginBottom: 6,
  opacity: 0.85,
};
const bodyFull: React.CSSProperties = {
  color: "#baffd6",
  marginBottom: 10,
  whiteSpace: "pre-wrap",
  lineHeight: 1.4,
};
const footerRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 6,
};
const status: React.CSSProperties = { fontSize: 12, opacity: 0.9 };
const muted: React.CSSProperties = { opacity: 0.7 };

/* ---- Image Grid ---- */
const imageGrid: React.CSSProperties = {
  display: "grid",
  justifyContent: "center",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 160px))",
  gap: 12,
  marginTop: 10,
};
const imageCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  borderRadius: 6,
  padding: 6,
  textAlign: "center",
  border: "1px solid rgba(0,255,110,0.35)",
};
const imageFrontImg: React.CSSProperties = {
  width: "100%",
  height: "120px",
  objectFit: "contain",
  borderRadius: 4,
};
const expandBtn: React.CSSProperties = {
  marginTop: 6,
  background: "rgba(0,0,0,0.6)",
  color: "#00ff6a",
  border: "1px solid #00ff6a",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: mono,
  boxShadow: "0 0 6px rgba(0,255,110,0.3)",
};

/* ---- Expanded Image Modal ---- */
const zoomOverlay: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  backgroundColor: "rgba(0,0,0,0.95)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 100,
};
const zoomInner: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 10,
};
const zoomedImgStyle: React.CSSProperties = {
  maxWidth: "90vw",
  maxHeight: "75vh",
  objectFit: "contain",
  border: "2px solid #00ff6a",
  boxShadow: "0 0 20px rgba(0,255,110,0.4)",
  borderRadius: 8,
};
const imageTextBox: React.CSSProperties = {
  background: "rgba(0,0,0,0.6)",
  color: "#baffd6",
  padding: "10px 16px",
  borderRadius: 6,
  maxWidth: "85vw",
  fontSize: 14,
  whiteSpace: "pre-wrap",
};
const closeZoomBtn: React.CSSProperties = {
  marginTop: 8,
  background: "transparent",
  color: "#00ff6a",
  border: "1px solid #00ff6a",
  borderRadius: 4,
  padding: "4px 12px",
  cursor: "pointer",
  textTransform: "uppercase",
  letterSpacing: 1,
  fontFamily: mono,
};
