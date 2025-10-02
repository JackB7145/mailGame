# api/firestore.py
from typing import Any, Dict, Optional, List
from google.cloud import firestore

_db = firestore.Client()  # single source of truth for this module

def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
    doc = _db.collection("users").document(uid).get()
    return doc.to_dict() if doc.exists else None

def get_user_address(uid: str) -> Optional[Dict[str, Any]]:
    prof = get_user_profile(uid)
    return prof.get("address") if prof else None

def create_mail_doc(data: Dict[str, Any]) -> str:
    ref = _db.collection("mail").document()
    data.setdefault("createdAt", firestore.SERVER_TIMESTAMP)
    ref.set(data)
    return ref.id

def update_mail_doc(mail_id: str, patch: Dict[str, Any]) -> None:
    _db.collection("mail").document(mail_id).update(patch)

def list_inbox(uid: str, limit: int = 20) -> List[Dict[str, Any]]:
    q = (
        _db.collection("mail")
           .where("toUid", "==", uid)
           .order_by("createdAt", direction=firestore.Query.DESCENDING)
           .limit(limit)
    )
    return [{"id": d.id, **d.to_dict()} for d in q.stream()]

def list_outbox(uid: str, limit: int = 20) -> List[Dict[str, Any]]:
    q = (
        _db.collection("mail")
           .where("fromUid", "==", uid)
           .order_by("createdAt", direction=firestore.Query.DESCENDING)
           .limit(limit)
    )
    return [{"id": d.id, **d.to_dict()} for d in q.stream()]
