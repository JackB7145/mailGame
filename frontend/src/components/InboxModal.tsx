import { useEffect, useState } from "react";
import { fetchInbox, deleteMail } from "../lib/api";

type Props = { open: boolean; meUid: string; onClose: () => void };

export default function InboxModal({ open, meUid, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const data = await fetchInbox();
        setRows(data);
      } catch (e) {
        console.error("Failed to fetch inbox", e);
      }
    })();
  }, [open]);

  if (!open) return null;

  async function handleDelete(id: string) {
    setBusyId(id);
    try {
      await deleteMail(id);
      setRows(rows.filter(r => r.id !== id));
    } catch (e) {
      console.error("Failed to delete mail", e);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={backdrop}>
      <div style={modal}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h3>Inbox</h3>
          <button onClick={onClose}>Close</button>
        </div>

        {!rows.length ? (
          <i>No mail yet.</i>
        ) : (
          <div style={{display:"grid", gap:8, maxHeight: 420, overflow:"auto"}}>
            {rows.map(m => (
              <div key={m.id} style={{border:"1px solid #ddd", borderRadius:6, padding:8}}>
                <div style={{fontSize:12, opacity:.7}}>
                  {m.createdAt?._seconds
                    ? new Date(m.createdAt._seconds * 1000).toLocaleString()
                    : "just now"}
                </div>
                {m.subject && <div><b>{m.subject}</b></div>}
                <div><b>From:</b> {m.fromUid === meUid ? "me" : m.fromUid}</div>
                <div dangerouslySetInnerHTML={{__html: m.bodyHtml}} />
                <div style={{display:"flex", justifyContent:"space-between", marginTop:6}}>
                  <span><b>Status:</b> {m.status}</span>
                  <button
                    disabled={busyId === m.id}
                    onClick={() => handleDelete(m.id)}
                  >
                    {busyId === m.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
  display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40
};
const modal: React.CSSProperties = {
  width: 560, background: "#fff", border: "1px solid #ddd", borderRadius: 6,
  padding: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.35)"
};
