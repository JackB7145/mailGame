import os
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from .auth import verify_bearer
from .models import SendMailRequest, MailDoc
from .firestore import get_user_address, create_mail_doc, update_mail_doc, list_inbox, list_outbox
from .providers import render_html, send_letter

from fastapi import HTTPException
from google.cloud import firestore

import os

from firebase_admin import auth as fb_auth, credentials, firestore
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="MailGame Backend")

origins = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health():
    return {"ok": True}

@app.get("/api/mail/inbox")
async def api_inbox(uid: str = Depends(verify_bearer)):
    return list_inbox(uid, limit=20)

@app.get("/api/mail/outbox")
async def api_outbox(uid: str = Depends(verify_bearer)):
    return list_outbox(uid, limit=20)

@app.post("/api/mail/send", response_model=MailDoc)
async def api_send(req: SendMailRequest, uid: str = Depends(verify_bearer)):
    to_addr = get_user_address(req.toUid)
    if not to_addr:
        raise HTTPException(status_code=400, detail="Recipient address missing")

    from_addr = get_user_address(uid) or to_addr

    body_html = render_html(req.subject, req.body)

    mail_id = create_mail_doc({
        "fromUid": uid,
        "toUid": req.toUid,
        "subject": req.subject or None,
        "bodyHtml": body_html,
        "status": "DRAFT",
        "provider": req.provider,
    })

    status, provider_ref = await send_letter(req.provider, to_addr, from_addr, body_html)

    patch = {"status": status}
    if provider_ref:
        patch["providerRef"] = provider_ref
    update_mail_doc(mail_id, patch)

    return MailDoc(
        id=mail_id,
        fromUid=uid,
        toUid=req.toUid,
        subject=req.subject,
        bodyHtml=body_html,
        status=status,
        provider=req.provider,
        providerRef=provider_ref,
    )

@app.delete("/api/mail/{mail_id}")
async def delete_mail(mail_id: str, uid: str = Depends(verify_bearer)):
    
    db = firestore.client()
    doc_ref = db.collection("mail").document(mail_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Mail not found")
    data = snap.to_dict()

    if data.get("toUid") != uid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this mail")

    doc_ref.delete()
    return {"ok": True, "id": mail_id}

@app.get("/api/mail/outbox")
async def api_outbox(uid: str = Depends(verify_bearer)):
    return list_outbox(uid, limit=20)
