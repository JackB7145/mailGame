import os
from fastapi import HTTPException, status, Header
import firebase_admin
from firebase_admin import auth as fb_auth, credentials, firestore
from dotenv import load_dotenv

load_dotenv()

if not firebase_admin._apps:
    cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
    if not cred_path:
        raise RuntimeError("GOOGLE_APPLICATION_CREDENTIALS .env is required")
    firebase_admin.initialize_app(credentials.Certificate(cred_path))

db = firestore.client()

async def verify_bearer(authorization: str | None = Header(default=None)) -> str:
    """
    Reads Firebase ID token from Authorization: Bearer <token> and returns uid.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token"
        )
    token = authorization.split(" ", 1)[1].strip()
    try:
        decoded = fb_auth.verify_id_token(token)
        return decoded["uid"]
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
