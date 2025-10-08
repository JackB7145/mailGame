# api/models.py
from typing import Optional, Literal, Any
from pydantic import BaseModel, Field, model_validator

Provider = Literal["NONE", "MANUAL", "LOB", "POSTGRID"]

class SendMailRequest(BaseModel):
    # Accept either `toHandle` or legacy `username`
    toHandle: str = Field(..., min_length=2, description="Recipient username (no '@')")
    subject: Optional[str] = None
    body: str = Field(..., min_length=1)
    provider: Optional[Provider] = "NONE"

    @model_validator(mode="before")
    @classmethod
    def _aliases(cls, data: Any) -> Any:
        # allow frontend that still sends { username: "...", body: ... }
        if isinstance(data, dict):
            if not data.get("toHandle") and data.get("username"):
                data["toHandle"] = data["username"]
        return data

    @model_validator(mode="after")
    def _normalize(self) -> "SendMailRequest":
        self.toHandle = (self.toHandle or "").strip().lstrip("@")
        if not self.toHandle:
            raise ValueError("toHandle (recipient username) is required")
        self.body = (self.body or "").strip()
        if not self.body:
            raise ValueError("body is required")
        self.provider = (self.provider or "NONE")  # keep permissive
        return self


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

    status: Literal["STORED", "SENT", "FAILED"] = "STORED"
    createdAt: Optional[Any] = None
