import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PharmacovigilanceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    report_reference: str
    received_at: datetime
    status: str
    restricted_payload: str
    access_classification: str


class PharmacovigilancePatch(BaseModel):
    status: str = Field(pattern="^(received|in_review|follow_up|closed)$")


class PharmacovigilanceCreate(BaseModel):
    report_reference: str = Field(min_length=1, max_length=120)
    restricted_payload: str = Field(min_length=1, max_length=100_000)
