
import { onDocumentUpdated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import axios from "axios";

initializeApp();
const db = getFirestore();

export const onMailQueued = onDocumentWritten(
  { document: "mail/{mailId}", region: "us-central1" },
  async (event) => {
    const before = event.data?.before.exists ? event.data!.before.data() : null;
    const after  = event.data?.after.exists  ? event.data!.after.data()  : null;
    if (!after) return;


    const prevStatus = before?.status;
    const currStatus = after.status;
    if (currStatus !== "QUEUED" || prevStatus === currStatus) return;

    try {
      const toUid: string = after.toUid;
      const userSnap = await db.doc(`users/${toUid}`).get();
      const toAddress = userSnap.get("address");
      if (!toAddress) throw new Error("Recipient address missing");

      const provider: string = after.provider;

      if (provider === "lob") {
        const key = process.env.LOB_KEY;            
        if (!key) throw new Error("LOB_KEY missing");
        const resp = await axios.post(
          "https://api.lob.com/v1/letters",
          {
            to: toAddress,
            from: toAddress, 
            file: `<html><body>${after.bodyHtml}</body></html>`,
            color: false,
          },
          { auth: { username: key, password: "" } }
        );
        await event.data!.after.ref.update({ status: "SENT", providerRef: resp.data.id });
      } else if (provider === "postgrid") {
        const key = process.env.POSTGRID_KEY;
        if (!key) throw new Error("POSTGRID_KEY missing");
        const resp = await axios.post(
          "https://api.postgrid.com/print-mail/v1/letters",
          { to: toAddress, from: toAddress, html: after.bodyHtml },
          { headers: { "x-api-key": key } }
        );
        await event.data!.after.ref.update({ status: "SENT", providerRef: resp.data.id });
      } else {
        await event.data!.after.ref.update({ status: "FAILED", error: "Unsupported provider" });
      }
    } catch (e: any) {
      await event.data!.after.ref.update({ status: "FAILED", error: String(e?.message || e) });
    }
  }
);
