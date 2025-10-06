# api/main.py
import os
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

origins = ["*"]  # or ["http://localhost:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  
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
    """
    Resolve recipient by USERNAME first (req.toHandle), not by UUID.
    """
    db = gcf.Client()

    # Prefer provided username
    if getattr(req, "toHandle", None):
        handle_raw = (req.toHandle or "").strip()
        if not handle_raw:
            raise HTTPException(status_code=400, detail="Recipient username (toHandle) is empty")
        handle_lower = handle_raw.lstrip("@").lower()

        # Try normalized field first
        try:
            stream = db.collection("users").where("usernameLower", "==", handle_lower).limit(1).stream()
            for doc in stream:
                return doc.id
        except Exception:
            pass  # ignore and try exact username field next

        # Fallback: exact match on `username`
        try:
            stream2 = db.collection("users").where("username", "==", handle_raw).limit(1).stream()
            for doc in stream2:
                return doc.id
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"username lookup failed: {e}")

        raise HTTPException(status_code=404, detail=f"Username not found: {handle_raw}")

    # Fallback to legacy uid if explicitly provided
    if getattr(req, "toUid", None):
        return req.toUid

    raise HTTPException(status_code=400, detail="Recipient username (toHandle) or uid (toUid) required")

def _require_provider_keys(provider: str):
    p = (provider or "").upper()
    if p == "LOB" and not os.getenv("LOB_KEY"):
        raise HTTPException(400, detail="LOB_KEY not configured")
    if p == "POSTGRID" and not os.getenv("POSTGRID_KEY"):
        raise HTTPException(400, detail="POSTGRID_KEY not configured")

def _find_user_doc_by_username(username: str):
    """
    Find a user doc by username (case-insensitive).
    Returns (doc_ref, data) or raises 404 if not found.
    """
    if not username:
        raise HTTPException(400, detail="username required")

    uname_raw = username.strip()
    uname_lower = uname_raw.lstrip("@").lower()

    db = gcf.Client()

    # Try normalized field first
    try:
        stream = db.collection("users").where("usernameLower", "==", uname_lower).limit(1).stream()
        for d in stream:
            return (db.collection("users").document(d.id), d.to_dict() or {})
    except Exception:
        pass

    # Fallback: exact match on 'username'
    try:
        stream2 = db.collection("users").where("username", "==", uname_raw).limit(1).stream()
        for d in stream2:
            return (db.collection("users").document(d.id), d.to_dict() or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"username lookup failed: {e}")

    raise HTTPException(status_code=404, detail=f"user not found for username: {uname_raw}")

# -------- pydantic models --------

class CustomizationByUsernameIn(BaseModel):
    playerColor: Optional[str] = None   # e.g., "red" or "#ff0000"
    playerHat: Optional[str] = None     # e.g., "None" | "cap" | "visor"
    position: Optional[List[float]] = None  # [x, y]

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
    # 1) resolve recipient (USERNAME preferred; uid fallback)
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
        "fromName": from_name,   # snapshot
        "toName": to_name,       # snapshot
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

# -------- username existence (no uniqueness semantics) --------

@app.get("/v1/users/exists")
async def username_exists(username: str):
    """
    Returns whether a user record exists for the given username (case-insensitive).
    """
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    db = gcf.Client()
    try:
        uname_lower = username.strip().lstrip("@").lower()
        stream = db.collection("users").where("usernameLower", "==", uname_lower).limit(1).stream()
        uid = next((doc.id for doc in stream), None)
        if uid:
            return {"ok": True, "username": uname_lower, "exists": True, "uid": uid}

        stream2 = db.collection("users").where("username", "==", username.strip()).limit(1).stream()
        uid2 = next((doc.id for doc in stream2), None)
        return {"ok": True, "username": uname_lower, "exists": uid2 is not None, "uid": uid2}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"lookup failed: {e}")

# -------- customization by USERNAME (GET/POST) --------
# Uses username in the URL. We still require auth via verify_bearer.

@app.get("/v1/users/{username}/customization")
async def get_customization_by_username(username: str, _uid: str = Depends(verify_bearer)):
    """
    Returns the target user's customization by username.
    Response mirrors your 'users' doc: playerColor, playerHat, position, username.
    """
    ref, data = _find_user_doc_by_username(username)
    # Build a consistent payload
    return {
        "ok": True,
        "username": data.get("username"),
        "customization": {
            "playerColor": data.get("playerColor"),
            "playerHat": data.get("playerHat"),
            "position": data.get("position"),
        }
    }

@app.post("/v1/users/{username}/customization")
async def set_customization_by_username(
    username: str,
    c: CustomizationByUsernameIn,
    _uid: str = Depends(verify_bearer),
):
    """
    Updates the target user's customization by username.
    Body supports any subset: { playerColor?: str, playerHat?: str, position?: [x,y] }
    Writes only provided fields under the user's doc.
    """
    ref, _ = _find_user_doc_by_username(username)

    patch: dict = {}
    if c.playerColor is not None:
        patch["playerColor"] = c.playerColor
    if c.playerHat is not None:
        patch["playerHat"] = c.playerHat
    if c.position is not None:
        patch["position"] = c.position

    if not patch:
        raise HTTPException(status_code=400, detail="no fields to update")

    try:
        ref.set(patch, merge=True)
        return {"ok": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"persist failed: {e}")
