# api/models.py
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, model_validator

Provider = Literal["NONE", "MANUAL", "LOB", "POSTGRID"]

class SendMailRequest(BaseModel):
    fromUsername: str = Field(..., min_length=2, description="Senders's Username")
    toUsername: str = Field(..., min_length=2, description="Recipient username")
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    provider: Optional[Provider] = "NONE"
    images: list

class MailDoc(BaseModel):
    id: str

    fromUsername: str
    fromUsernameLower: Optional[str] = None
    fromName: Optional[str] = None

    toUsername: str
    toUsernameLower: Optional[str] = None
    toName: Optional[str] = None

    subject: Optional[str] = None
    body: str
    images: list

    status: Literal["STORED", "SENT", "FAILED"] = "STORED"
    createdAt: Optional[Any] = None

