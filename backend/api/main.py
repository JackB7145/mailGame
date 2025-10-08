# api/main.py
import os
import re
from typing import Optional, List, Tuple, Dict, Any

from fastapi import FastAPI, Depends, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from api.auth import verify_bearer
from api.models import SendMailRequest
from api.firestore import (
    get_user_profile,
    create_mail_doc,
)
from google.cloud import firestore as gcf
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

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

def _normalize_username(raw: str) -> str:
    return (raw or "").strip().lstrip("@")

def _display_name(profile: Optional[dict]) -> str:
    if not profile:
        return "Unknown"
    return profile.get("displayName") or profile.get("name") or profile.get("username") or "Unknown"

def _slugify(s: str) -> str:
    s = re.sub(r"[^a-zA-Z0-9_]+", "", s or "")
    return s[:32] or "user"

def _provision_username_for(uid: str, prof: dict) -> tuple[str, str]:
    """
    Create a username for the caller if missing, ensure case-insensitive uniqueness,
    write it to users/{uid}, and return (username, usernameLower).
    """
    db = gcf.Client()

    # derive candidate
    email = (prof.get("email") or "").strip()
    if email and "@" in email:
        candidate = _slugify(email.split("@", 1)[0].lower())
    else:
        dn = (prof.get("displayName") or prof.get("name") or "").strip()
        candidate = _slugify(dn.replace(" ", "").lower()) if dn else f"user_{uid[:6].lower()}"

    lower = candidate.lower()

    # ensure uniqueness
    taken = next((d for d in db.collection("users")
                  .where("usernameLower", "==", lower).limit(1).stream()), None)
    if taken and taken.id != uid:
        for suffix in [uid[:4].lower(), uid[4:8].lower(), "1", "2", "3"]:
            lower_try = f"{lower}_{suffix}"
            t2 = next((d for d in db.collection("users")
                       .where("usernameLower", "==", lower_try).limit(1).stream()), None)
            if not t2 or t2.id == uid:
                lower = lower_try
                candidate = lower
                break

    db.collection("users").document(uid).set(
        {"username": candidate, "usernameLower": lower},
        merge=True,
    )
    return candidate, lower

def _get_or_provision_caller_username(uid: str) -> Tuple[str, str]:
    """
    Return (username, usernameLower) for the caller.
    If missing, auto-provision and persist, then return it.
    """
    prof = get_user_profile(uid) or {}
    uname = _normalize_username(prof.get("username") or "")
    if uname:
        return uname, uname.lower()
    return _provision_username_for(uid, prof)

def _find_user_doc_by_username(username: str) -> Tuple[Any, Dict[str, Any]]:
    """
    Find a user doc by username (case-insensitive).
    Returns (doc_ref, data) or raises 404 if not found.
    """
    if not username:
        raise HTTPException(status_code=400, detail="username required")

    uname_raw = _normalize_username(username)
    uname_lower = uname_raw.lower()

    db = gcf.Client()

    # Prefer normalized lower field
    try:
        stream = db.collection("users").where("usernameLower", "==", uname_lower).limit(1).stream()
        for d in stream:
            return (db.collection("users").document(d.id), d.to_dict() or {})
    except Exception:
        pass

    # Fallback exact (case-sensitive) match
    try:
        stream2 = db.collection("users").where("username", "==", uname_raw).limit(1).stream()
        for d in stream2:
            return (db.collection("users").document(d.id), d.to_dict() or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"username lookup failed: {e}")

    raise HTTPException(status_code=404, detail=f"user not found for username: {uname_raw}")

def _serialize_mail(doc_snap) -> dict:
    d = doc_snap.to_dict() or {}
    return {
        "id": doc_snap.id,
        "fromUsername": d.get("fromUsername"),
        "fromName": d.get("fromName"),
        "toUsername": d.get("toUsername"),
        "toName": d.get("toName"),
        "subject": d.get("subject"),
        "body": d.get("body"),
        "status": d.get("status"),
        "createdAt": d.get("createdAt"),
    }

# -------- pydantic models --------

class CustomizationByUsernameIn(BaseModel):
    playerColor: Optional[str] = None   # e.g., "red" or "#ff0000"
    playerHat: Optional[str] = None     # e.g., "None" | "cap" | "visor"
    position: Optional[List[float]] = None  # [x, y]

class SetUsernameIn(BaseModel):
    username: str = Field(..., min_length=2, max_length=32, description="Desired username (no @)")

# -------- routes --------

@app.get("/v1/health")
async def health():
    return {"ok": True}

# Claim/update the caller's username (optional; auto-provisioning also happens)
@app.post("/v1/users/me/username")
async def set_my_username(body: SetUsernameIn, uid: str = Depends(verify_bearer)):
    """
    Claim or update the caller's username. Ensures uniqueness (case-insensitive).
    Writes both `username` and `usernameLower`.
    """
    desired = _normalize_username(body.username)
    if not desired:
        raise HTTPException(status_code=400, detail="username required")

    db = gcf.Client()
    lower = desired.lower()

    # uniqueness check (case-insensitive)
    existing = next(
        (doc for doc in db.collection("users").where("usernameLower", "==", lower).limit(1).stream()),
        None
    )
    # If name exists but belongs to same uid → allow idempotent set
    if existing and existing.id != uid:
        raise HTTPException(status_code=409, detail="username already taken")

    db.collection("users").document(uid).set(
        {"username": desired, "usernameLower": lower},
        merge=True,
    )
    return {"ok": True, "username": desired}

# Inbox indexed by username (NOT uid)
@app.get("/v1/mail/inbox")
async def api_inbox(
    uid: str = Depends(verify_bearer),
    limit: int = Query(20, ge=1, le=100),
):
    print(f'Obtained: {uid}')
    _, caller_lower = _get_or_provision_caller_username(uid)
    db = gcf.Client()
    print(f'Caller lower: {caller_lower}')
    q = (
        db.collection("mail")
        .where("toUsernameLower", "==", caller_lower)
        .order_by("createdAt", direction=gcf.Query.DESCENDING)
        .limit(limit)
    )
    snaps = list(q.stream())
    return {"ok": True, "items": [_serialize_mail(s) for s in snaps]}

# Outbox indexed by username (NOT uid)
@app.get("/v1/mail/outbox")
async def api_outbox(
    uid: str = Depends(verify_bearer),
    limit: int = Query(20, ge=1, le=100),
):
    print(f'Obtained: {uid}')
    _, caller_lower = _get_or_provision_caller_username(uid)
    print(f'Caller lower: {caller_lower}')

    db = gcf.Client()
    q = (
        db.collection("mail")
        .where("fromUsernameLower", "==", caller_lower)
        .order_by("createdAt", direction=gcf.Query.DESCENDING)
        .limit(limit)
    )
    snaps = list(q.stream())
    return {"ok": True, "items": [_serialize_mail(s) for s in snaps]}

# Minimal 'send': username-only indexing, no provider/render/drafts, no response body
@app.post("/v1/mail/send", status_code=204)
async def api_send(req: SendMailRequest, uid: str = Depends(verify_bearer)):
    """
    Required on req: toHandle (recipient username), body (non-empty). subject optional.
    Stores ONLY username-indexed fields (no uids).
    """
    to_handle = _normalize_username(getattr(req, "toHandle", None) or getattr(req, "username", "") or "")
    if not to_handle:
        raise HTTPException(status_code=400, detail="toHandle (recipient username) is required")

    # Resolve recipient (to capture displayName + canonical username)
    _ref_to, to_data = _find_user_doc_by_username(to_handle)
    to_username = _normalize_username(to_data.get("username") or to_handle)
    to_username_lower = to_username.lower()

    # Caller username (for indexing and snapshots) — auto-provision if missing
    from_username, from_username_lower = _get_or_provision_caller_username(uid)
    from_name = _display_name(get_user_profile(uid) or {})

    # Body sanity
    if not getattr(req, "body", None) or not str(req.body).strip():
        raise HTTPException(status_code=400, detail="body is required")

    # Persist one doc — no UUID fields stored
    mail_doc = {
        "fromUsername": from_username,
        "fromUsernameLower": from_username_lower,
        "fromName": from_name,              # snapshot

        "toUsername": to_username,
        "toUsernameLower": to_username_lower,
        "toName": _display_name(to_data),   # snapshot

        "subject": (getattr(req, "subject", None) or None),
        "body": str(req.body),
        "status": "STORED",
        "provider": "NONE",

        "createdAt": SERVER_TIMESTAMP,
    }

    create_mail_doc(mail_doc)
    return Response(status_code=204)

# Delete authorized by recipient username (NOT uid)
@app.delete("/v1/mail/{mail_id}")
async def delete_mail(mail_id: str, uid: str = Depends(verify_bearer)):
    _, caller_lower = _get_or_provision_caller_username(uid)

    db = gcf.Client()
    doc_ref = db.collection("mail").document(mail_id)
    snap = doc_ref.get()

    if not snap.exists:
        raise HTTPException(status_code=404, detail="Mail not found")
    data = snap.to_dict() or {}

    # recipient-only delete; if you also want sender to retract, include:
    # or data.get("fromUsernameLower") == caller_lower
    if data.get("toUsernameLower") != caller_lower:
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
    uname_lower = _normalize_username(username).lower()
    stream = db.collection("users").where("usernameLower", "==", uname_lower).limit(1).stream()
    uid = next((doc.id for doc in stream), None)
    if uid:
        return {"ok": True, "username": uname_lower, "exists": True}

    stream2 = db.collection("users").where("username", "==", _normalize_username(username)).limit(1).stream()
    uid2 = next((doc.id for doc in stream2), None)
    return {"ok": True, "username": uname_lower, "exists": uid2 is not None}

# -------- customization by USERNAME (GET/POST) --------

@app.get("/v1/users/{username}/customization")
async def get_customization_by_username(username: str, _uid: str = Depends(verify_bearer)):
    ref, data = _find_user_doc_by_username(username)
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

    ref.set(patch, merge=True)
    return {"ok": True}
