from pydantic import BaseModel, Field, model_validator
from typing import Optional, Literal

Provider = Literal["LOB", "POSTGRID", "MANUAL"]

class SendMailRequest(BaseModel):
    toUid: Optional[str] = Field(None, min_length=6)
    toHandle: Optional[str] = Field(None, min_length=2)  # e.g., "cole" (no '@')
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    provider: Provider = "MANUAL"

    @model_validator(mode="after")
    def _require_recipient(self):
        if not (self.toUid or self.toHandle):
            raise ValueError("Provide either toUid or toHandle")
        return self

class MailDoc(BaseModel):
    id: str
    fromUid: str
    toUid: str
    subject: Optional[str]
    bodyHtml: str
    status: str
    provider: Provider
    providerRef: Optional[str] = None
    error: Optional[str] = None
    # Denormalized snapshots for fast UI
    fromName: Optional[str] = None
    toName: Optional[str] = None
