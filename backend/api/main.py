# api/main.py
import os
import re
from typing import Optional, List, Tuple, Dict, Any

from fastapi import Body, FastAPI, Depends, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

import firebase_admin
from firebase_admin import credentials, auth as fbauth

# Initialize Firebase with ADC or credentials
if not firebase_admin._apps:
    try:
        cred = credentials.ApplicationDefault()
    except Exception:
        cred = credentials.Certificate(os.environ["GOOGLE_APPLICATION_CREDENTIALS"])
    firebase_admin.initialize_app(cred)

from api.auth import verify_bearer
from api.models import SendMailRequest
from api.firestore import get_user_profile, create_mail_doc
from google.cloud import firestore as gcf
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

app = FastAPI(title="MailGame Backend")

origins = ["http://localhost:5173", "https://mailmeio.vercel.app"]
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
    db = gcf.Client()
    email = (prof.get("email") or "").strip()
    if email and "@" in email:
        candidate = _slugify(email.split("@", 1)[0].lower())
    else:
        dn = (prof.get("displayName") or prof.get("name") or "").strip()
        candidate = _slugify(dn.replace(" ", "").lower()) if dn else f"user_{uid[:6].lower()}"
    lower = candidate.lower()

    # Ensure uniqueness
    taken = next((d for d in db.collection("users")
                 .where("usernameLower", "==", lower)
                 .limit(1).stream()), None)
    if taken and taken.id != uid:
        for suffix in [uid[:4].lower(), uid[4:8].lower(), "1", "2", "3"]:
            lower_try = f"{lower}_{suffix}"
            t2 = next((d for d in db.collection("users")
                      .where("usernameLower", "==", lower_try)
                      .limit(1).stream()), None)
            if not t2 or t2.id == uid:
                lower = lower_try
                candidate = lower
                break

    db.collection("users").document(uid).set(
        {"username": candidate, "usernameLower": lower}, merge=True
    )
    return candidate, lower

def _get_or_provision_caller_username(uid: str) -> Tuple[str, str]:
    prof = get_user_profile(uid) or {}
    uname = _normalize_username(prof.get("username") or "")
    if uname:
        return uname, uname.lower()
    return _provision_username_for(uid, prof)

def _find_user_doc_by_username(username: str) -> Tuple[Any, Dict[str, Any]]:
    if not username:
        raise HTTPException(status_code=400, detail="username required")

    uname_raw = _normalize_username(username)
    uname_lower = uname_raw.lower()
    db = gcf.Client()

    # case-insensitive lookup
    try:
        stream = db.collection("users").where("usernameLower", "==", uname_lower).limit(1).stream()
        for d in stream:
            return (db.collection("users").document(d.id), d.to_dict() or {})
    except Exception:
        pass

    # fallback case-sensitive
    try:
        stream2 = db.collection("users").where("username", "==", uname_raw).limit(1).stream()
        for d in stream2:
            return (db.collection("users").document(d.id), d.to_dict() or {})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"username lookup failed: {e}")

    raise HTTPException(status_code=404, detail=f"user not found for username: {uname_raw}")

# ✅ unified mail serializer with images
def _serialize_mail(doc_snap) -> dict:
    d = doc_snap.to_dict() or {}
    return {
        "id": doc_snap.id,
        "fromUsername": d.get("fromUsername"),
        "toUsername": d.get("toUsername"),
        "subject": d.get("subject"),
        "body": d.get("body"),
        "status": d.get("status"),
        "provider": d.get("provider"),
        "images": d.get("images", []),  # ✅ ensures images always included
        "createdAt": d.get("createdAt"),
    }

# -------- models --------

class CustomizationByUsernameIn(BaseModel):
    playerColor: Optional[str] = None
    playerHat: Optional[str] = None
    position: Optional[List[float]] = None

class SetUsernameIn(BaseModel):
    username: str = Field(..., min_length=2, max_length=32, description="Desired username (no @)")

# -------- routes --------

@app.get("/v1/health")
async def health():
    return {"ok": True}

@app.post("/v1/users/me/username")
async def set_my_username(body: SetUsernameIn, uid: str = Depends(verify_bearer)):
    desired = _normalize_username(body.username)
    if not desired:
        raise HTTPException(status_code=400, detail="username required")

    db = gcf.Client()
    lower = desired.lower()

    existing = next(
        (doc for doc in db.collection("users").where("usernameLower", "==", lower).limit(1).stream()),
        None
    )
    if existing and existing.id != uid:
        raise HTTPException(status_code=409, detail="username already taken")

    db.collection("users").document(uid).set(
        {"username": desired, "usernameLower": lower}, merge=True
    )
    return {"ok": True, "username": desired}

# ✅ Inbox route returns full mails with images
@app.post("/v1/mail/inbox")
async def api_inbox(
    body: dict = Body(...),
    uid: str = Depends(verify_bearer),
    limit: int = Query(20, ge=1, le=100)
):
    username = body.get("username")
    if not username:
        return {"ok": False, "error": "Missing username in request body"}

    db = gcf.Client()
    q = (
        db.collection("mail")
        .where("toUsernameLower", "==", username.lower())
        .order_by("createdAt", direction=gcf.Query.DESCENDING)
        .limit(limit)
    )
    snaps = list(q.stream())
    return {"ok": True, "items": [_serialize_mail(s) for s in snaps]}

# ✅ Outbox route returns full mails with images
@app.post("/v1/mail/outbox")
async def api_outbox(
    body: dict = Body(...),
    uid: str = Depends(verify_bearer),
    limit: int = Query(20, ge=1, le=100)
):
    username = body.get("username")
    if not username:
        return {"ok": False, "error": "Missing username in request body"}

    db = gcf.Client()
    q = (
        db.collection("mail")
        .where("fromUsernameLower", "==", username.lower())
        .order_by("createdAt", direction=gcf.Query.DESCENDING)
        .limit(limit)
    )
    snaps = list(q.stream())
    return {"ok": True, "items": [_serialize_mail(s) for s in snaps]}


# ✅ Mail send includes images and full username fields
@app.post("/v1/mail/send", status_code=204)
async def api_send(req: SendMailRequest):
    from_username = req.fromUsername
    to_username = req.toUsername
    images = req.images or []

    mail_doc = {
        "fromName": from_username,
        "fromUsername": from_username,
        "fromUsernameLower": from_username.lower(),
        "toUsername": to_username,
        "toUsernameLower": to_username.lower(),
        "subject": getattr(req, "subject", None),
        "body": str(req.body),
        "status": "STORED",
        "provider": "NONE",
        "images": images,
        "createdAt": SERVER_TIMESTAMP,
    }

    create_mail_doc(mail_doc)
    return Response(status_code=204)

@app.delete("/v1/mail/{mail_id}")
async def delete_mail(
    mail_id: str,
    body: Dict = Body(...),
    uid: str = Depends(verify_bearer),
):
    try:
        # username is provided by client body (not derived from token)
        username_lower = body.get("username", "").lower()

        db = gcf.Client()
        doc_ref = db.collection("mail").document(mail_id)
        snap = doc_ref.get()

        if not snap.exists:
            raise HTTPException(status_code=404, detail="Mail not found")

        data = snap.to_dict() or {}

        # confirm ownership using provided username
        if data.get("toUsernameLower") != username_lower:
            raise HTTPException(status_code=403, detail="Not authorized to delete this mail")

        doc_ref.delete()
        return {"ok": True, "id": mail_id}
    except Exception as e:
        print(f'Error: {e} Received Body: {body}')

@app.get("/v1/users/exists")
async def username_exists(username: str):
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
        },
    }

@app.post("/v1/users/{username}/customization")
async def set_customization_by_username(
    username: str, c: CustomizationByUsernameIn, _uid: str = Depends(verify_bearer)
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

# -------- DEV ONLY --------

class DevLoginIn(BaseModel):
    username: str

@app.post("/v1/auth/dev-login")
async def dev_login(body: DevLoginIn):
    username = _normalize_username(body.username)
    if not username:
        raise HTTPException(status_code=400, detail="username required")

    uname_lower = username.lower()
    db = gcf.Client()
    snap = next(
        (d for d in db.collection("users")
         .where("usernameLower", "==", uname_lower).limit(1).stream()),
        None
    )

    if snap:
        uid = snap.id
    else:
        snap2 = next(
            (d for d in db.collection("users")
             .where("username", "==", username).limit(1).stream()),
            None
        )
        if snap2:
            uid = snap2.id
        else:
            user_record = fbauth.create_user()
            uid = user_record.uid
            db.collection("users").document(uid).set(
                {"username": username, "usernameLower": uname_lower}, merge=True
            )

    token_bytes = fbauth.create_custom_token(uid, {"username": username})
    token = token_bytes.decode("utf-8") if isinstance(token_bytes, (bytes, bytearray)) else token_bytes

    return {"ok": True, "uid": uid, "token": token}

@app.post("/v1/dev/recreate-me")
async def recreate_me():
    db = gcf.Client()
    uid = "hXqmH512Hvbe20gsnJCJ6odYSsz1"

    doc = {
        "username": "Jack",
        "usernameLower": "jack",
        "playerColor": "#00ff6a",
        "playerHat": "none",
        "position": [1200, 800],
        "playerOutfit": "default",
        "playerAccessory": "none",
        "spriteKey": "player_default",
        "lastScene": "TownSquare",
        "mailCount": 0,
        "outboxCount": 0,
        "customizationSynced": True,
        "createdAt": SERVER_TIMESTAMP,
        "updatedAt": SERVER_TIMESTAMP,
    }

    db.collection("users").document(uid).set(doc, merge=True)
    return {"ok": True, "uid": uid, "message": "User record recreated successfully"}
