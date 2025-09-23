import { useEffect, useState } from "react";
import { fetchOutbox } from "../lib/api";

type Props = { open: boolean; meUid: string; onClose: () => void };

export default function OutboxModal({ open, meUid, onClose }: Props) {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!open) return;
    (async () => {
      const data = await fetchOutbox();
      setRows(data);
    })();
  }, [open]);

  if (!open) return null;

  return (
    <div style={backdrop}>
      <div style={modal}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <h3>Outbox</h3>
          <button onClick={onClose}>Close</button>
        </div>
        {!rows.length ? <i>No sent mail yet.</i> :
          <div style={{display:"grid", gap:8, maxHeight: 420, overflow:"auto"}}>
            {rows.map(m => (
              <div key={m.id} style={{border:"1px solid #ddd", borderRadius:6, padding:8}}>
                <div style={{fontSize:12, opacity:.7}}>
                  {m.createdAt?._seconds
                    ? new Date(m.createdAt._seconds * 1000).toLocaleString()
                    : "just now"}
                </div>
                {m.subject && <div><b>{m.subject}</b></div>}
                <div><b>To:</b> {m.toUid}</div>
                <div dangerouslySetInnerHTML={{__html: m.bodyHtml}} />
                <div><b>Status:</b> {m.status}</div>
              </div>
            ))}
          </div>}
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
