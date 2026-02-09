from pydantic import BaseModel, ConfigDict
from datetime import datetime

class SessionCreate(BaseModel):
    pass

class SessionOut(BaseModel):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class MessageCreate(BaseModel):
    session_id: int
    message: str

class MessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)