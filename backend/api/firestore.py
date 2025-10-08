# api/firestore.py
from typing import Any, Dict, Optional, List
from google.cloud import firestore

_db = firestore.Client()  # single source of truth for this module


# -------- users --------

def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
    """
    Fetch a user profile by UID (used only for auth -> username mapping).
    """
    doc = _db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None


def get_user_address(uid: str) -> Optional[Dict[str, Any]]:
    """
    Legacy helper. Kept for compatibility; safe to remove if unused.
    """
    prof = get_user_profile(uid)
    return prof.get("address") if prof else None


def set_user_username(uid: str, username: str, username_lower: str) -> None:
    """
    Upsert username + usernameLower for a user doc.
    """
    _db.collection("users").document(uid).set(
        {"username": username, "usernameLower": username_lower},
        merge=True,
    )


# -------- mail --------

def create_mail_doc(data: Dict[str, Any]) -> str:
    """
    Insert a mail doc. Expects username fields:
      fromUsername, fromUsernameLower, toUsername, toUsernameLower, ...
    No UUID fields should be present.
    """
    ref = _db.collection("mail").document()
    data.setdefault("createdAt", firestore.SERVER_TIMESTAMP)
    ref.set(data)
    return ref.id


def update_mail_doc(mail_id: str, patch: Dict[str, Any]) -> None:
    _db.collection("mail").document(mail_id).update(patch)


def list_inbox(username_lower: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Return mails addressed to `username_lower` (case-insensitive index).
    """
    q = (
        _db.collection("mail")
           .where("toUsernameLower", "==", username_lower)
           .order_by("createdAt", direction=firestore.Query.DESCENDING)
           .limit(limit)
    )
    return [{"id": d.id, **(d.to_dict() or {})} for d in q.stream()]


def list_outbox(username_lower: str, limit: int = 20) -> List[Dict[str, Any]]:
    """
    Return mails sent by `username_lower` (case-insensitive index).
    """
    q = (
        _db.collection("mail")
           .where("fromUsernameLower", "==", username_lower)
           .order_by("createdAt", direction=firestore.Query.DESCENDING)
           .limit(limit)
    )
    return [{"id": d.id, **(d.to_dict() or {})} for d in q.stream()]
