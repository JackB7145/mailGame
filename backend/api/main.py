# api/main.py
import os
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from api.auth import verify_bearer
from api.models import SendMailRequest, MailDoc
from api.firestore import (
    get_user_profile,
    get_user_address,   # used for existing reads
    create_mail_doc,
    update_mail_doc,
    list_inbox,
    list_outbox,
)
from api.providers import render_html, send_letter
from google.cloud import firestore as gcf

app = FastAPI(title="MailGame Backend")

origins = "*"
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,   # don’t ship '*' to prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -------- helpers --------

def _display_name(profile: Optional[dict]) -> str:
    if not profile:
        return "Unknown"
    return profile.get("displayName") or profile.get("name") or "Unknown"

def _resolve_recipient_uid(req: SendMailRequest) -> str:
    if req.toUid:
        return req.toUid
    handle = req.toHandle.strip().lower()
    db = gcf.Client()
    snap = db.collection("usernames").document(handle).get()
    if not snap.exists:
        raise HTTPException(status_code=404, detail=f"Handle not found: {handle}")
    uid = snap.to_dict().get("uid")
    if not uid:
        raise HTTPException(status_code=500, detail="Username mapping missing uid")
    return uid

def _require_provider_keys(provider: str):
    p = (provider or "").upper()
    if p == "LOB" and not os.getenv("LOB_KEY"):
        raise HTTPException(400, detail="LOB_KEY not configured")
    if p == "POSTGRID" and not os.getenv("POSTGRID_KEY"):
        raise HTTPException(400, detail="POSTGRID_KEY not configured")

# -------- routes --------

@app.get("/v1/health")
async def health():
    return {"ok": True}

@app.get("/v1/mail/inbox")
async def api_inbox(uid: str = Depends(verify_bearer)):
    return list_inbox(uid, limit=20)

@app.get("/v1/mail/outbox")
async def api_outbox(uid: str = Depends(verify_bearer)):
    return list_outbox(uid, limit=20)

@app.post("/v1/mail/send", response_model=MailDoc)
async def api_send(req: SendMailRequest, uid: str = Depends(verify_bearer)):
    # 1) resolve recipient (uid or handle)
    to_uid = _resolve_recipient_uid(req)

    # 2) profiles/addresses
    to_profile = get_user_profile(to_uid)
    if not to_profile or not to_profile.get("address"):
        raise HTTPException(status_code=400, detail="Recipient address missing")
    to_addr = to_profile["address"]

    from_profile = get_user_profile(uid) or {}
    from_addr = from_profile.get("address") or to_addr

    # 3) denormalized names
    from_name = _display_name(from_profile)
    to_name = _display_name(to_profile)

    # 4) render + sanity for real providers
    body_html = render_html(req.subject, req.body)
    if req.provider in ("LOB", "POSTGRID"):
        _require_provider_keys(req.provider)

    # 5) create draft
    mail_id = create_mail_doc({
        "fromUid": uid,
        "toUid": to_uid,
        "fromName": from_name,   # ← snapshot
        "toName": to_name,       # ← snapshot
        "subject": req.subject or None,
        "bodyHtml": body_html,
        "status": "DRAFT",
        "provider": req.provider,
    })

    # 6) send (MANUAL simulates)
    status, provider_ref = await send_letter(req.provider, to_addr, from_addr, body_html)

    # 7) update and surface failure as non-200
    patch = {"status": status}
    if provider_ref:
        patch["providerRef"] = provider_ref
    update_mail_doc(mail_id, patch)

    if status != "SENT":
        raise HTTPException(status_code=502, detail=f"Provider {req.provider} failed: {provider_ref}")

    return MailDoc(
        id=mail_id,
        fromUid=uid,
        toUid=to_uid,
        subject=req.subject,
        bodyHtml=body_html,
        status=status,
        provider=req.provider,
        providerRef=provider_ref,
        fromName=from_name,
        toName=to_name,
    )

@app.delete("/v1/mail/{mail_id}")
async def delete_mail(mail_id: str, uid: str = Depends(verify_bearer)):
    db = gcf.Client()
    doc_ref = db.collection("mail").document(mail_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Mail not found")
    data = snap.to_dict()

    # recipient-only delete; add `or data.get("fromUid")==uid` if you want sender retract
    if data.get("toUid") != uid:
        raise HTTPException(status_code=403, detail="Not authorized to delete this mail")

    doc_ref.delete()
    return {"ok": True, "id": mail_id}
