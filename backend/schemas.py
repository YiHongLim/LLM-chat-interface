from pydantic import BaseModel
from datetime import datetime

class SessionCreate(BaseModel):
    pass

class SessionOut(BaseModel):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    session_id: int
    message: str

class MessageOut(BaseModel):
    id: int
    session_id: int
    role: str
    content: str
    created_at: datetime

    class Config: 
        from_attributes = True