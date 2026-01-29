import os
import json
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session as OrmSession, sessionmaker
from typing import List
from openai import OpenAI

from . import schemas, models
from .database import Base, engine, SessionLocal
from dotenv import load_dotenv
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError("OPENAI_API_KEY is not set. Check your .env or env vars.")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
Base.metadata.create_all(bind=engine)

app = FastAPI()

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# configured to allow requests from localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

class EchoRequest(BaseModel):
    message: str

@app.get("/")
def read_root():
    return {"message": "Hello from FastAPI with SQLite"}

# Creates a new Session
@app.post("/sessions", response_model=schemas.SessionOut)
def create_session(
    _: schemas.SessionCreate,
    db: OrmSession = Depends(get_db),
):
    db_session = models.Session()
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

# Fetch session's messages 
@app.get(
        "/sessions/{session_id}/messages",
        response_model=List[schemas.MessageOut],
)
def get_messages(
    session_id: int, 
    db: OrmSession = Depends(get_db),
):
    db_session = db.query(models.Session).filter(models.Session.id == session_id).first()
    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    return db_session.messages

@app.post("/chat")
def chat(
    payload: schemas.MessageCreate,
    db: OrmSession = Depends(get_db),
):
    
    db_session = (
        db.query(models.Session)
        .filter(models.Session.id == payload.session_id)
        .first()
    )

    if not db_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Load history
    history = (db.query(models.Message)
               .filter(models.Message.session_id == payload.session_id)
               .order_by(models.Message.created_at.asc())
               .all()
               )
    
    chat_history = [
        {"role": msg.role, "content": msg.content} for msg in history
    ]
    current_user_msg = {"role": "user", "content": payload.message}
    chat_history.append(current_user_msg)
    
    # Save current user message
    user_msg = models.Message(
        session_id=payload.session_id,
        role="user",
        content=payload.message,
    )
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)

    def generate():
        assistant_content = ""

        try:
            stream = client.chat.completions.create(
                model="gpt-5-nano",
                messages=chat_history,
                stream=True,
            )
    
            for chunk in stream:
                delta = chunk.choices[0].delta
                if delta.content:
                    token = delta.content
                    assistant_content += token
                    yield f"data: {json.dumps({'token': token})}\n\n"

        except Exception as e:
            error_payload = {"error" :f"OpenAI error: {str(e)}"}
            yield f"data: {json.dumps(error_payload)}\n\n"
            return
        # Save full assistant message in DB
        try:
            assistant_msg = models.Message(
                session_id = payload.session_id,
                role="assistant",
                content=assistant_content,
            )
            db.add(assistant_msg)
            db.commit()
                
        except Exception as e:
            db.rollback()

        yield "data: [DONE]\n\n"
    return StreamingResponse(generate(), media_type="text/event-stream")

def echo(req: EchoRequest):
    return {"you sent": req.message}