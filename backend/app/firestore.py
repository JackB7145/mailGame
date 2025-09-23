from google.cloud import firestore
from typing import Any, Dict, Optional
from .auth import db   


_db = firestore.Client()

def get_user_address(uid: str) -> Optional[Dict[str, Any]]:
    doc = _db.collection("users").document(uid).get()
    if not doc.exists:
        return None
    return doc.to_dict().get("address")

def create_mail_doc(data: Dict[str, Any]) -> str:
    ref = _db.collection("mail").document()
    data.setdefault("createdAt", firestore.SERVER_TIMESTAMP)
    ref.set(data)
    return ref.id

def update_mail_doc(mail_id: str, patch: Dict[str, Any]) -> None:
    _db.collection("mail").document(mail_id).update(patch)

def list_inbox(uid: str, limit: int = 20):
    q = _db.collection("mail").where("toUid", "==", uid).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
    return [ { "id": d.id, **d.to_dict() } for d in q.stream() ]

def list_outbox(uid: str, limit: int = 20):
    q = _db.collection("mail").where("fromUid", "==", uid).order_by("createdAt", direction=firestore.Query.DESCENDING).limit(limit)
    return [ { "id": d.id, **d.to_dict() } for d in q.stream() ]

def list_outbox(uid: str, limit=20):
    q = db.collection("mail") \
          .where("fromUid", "==", uid) \
          .order_by("createdAt", direction="DESCENDING") \
          .limit(limit)
    return [ {"id": d.id, **d.to_dict()} for d in q.stream() ]
