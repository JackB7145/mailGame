from pydantic import BaseModel, Field
from typing import Optional, Literal

Provider = Literal["LOB", "POSTGRID", "MANUAL"]

class SendMailRequest(BaseModel):
    toUid: str = Field(..., min_length=6)
    subject: Optional[str] = None
    body: str = Field(..., min_length=1) 
    provider: Provider = "MANUAL"

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
