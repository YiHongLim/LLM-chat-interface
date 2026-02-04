import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from main import app
client = TestClient(app)

def test_health_check():
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_echo():
    resp = client.get("/echo")
    assert resp.status_code == 200
    assert resp.json() == {"message": "Hello from Backend"}

def test_create_session():
    resp = client.post("/sessions", json={})
    assert resp.status_code == 200
    assert "id" in resp.json()

def test_get_messages_empty():
    s = client.post("/sessions", json={}).json()
    resp = client.get(f"/sessions/{s['id']}/messages")
    assert resp.status_code == 200
    assert resp.json() == []

def test_get_messages_invalid_session():
    resp = client.get("/sessions/999999/messages")
    assert resp.status_code == 404

def test_chat_invalid_session():
    resp = client.post("/chat", json={"session_id": 999999, "message": "Hi"})
    assert resp.status_code == 404

def test_chat_missing_message():
    s = client.post("/sessions", json={}).json()
    resp = client.post("/chat", json={"session_id": s["id"]})
    assert resp.status_code == 422

def test_chat_stream_happy_path(monkeypatch):
    class FakeDelta:
        def __init__(self, content):
            self.content = content
    
    class FakeChoice:
        def __init__(self, content):
            self.delta = FakeDelta(content)

    class FakeChunk:
        def __init__(self, content):
            self.choices = [FakeChoice(content)]

    def fake_create(*args, **kwargs):
        yield FakeChunk("Hello ")
        yield FakeChunk("World")

    monkeypatch.setattr(
        "main.client.chat.completions.create",
        fake_create
    )

    s = client.post("/sessions", json={}).json()
    session_id = s["id"]

    resp = client.post("/chat", json={"session_id": session_id, "message": "Hi"})
    assert resp.status_code == 200

    text = resp.text
    assert "Hello " in text
    assert "World" in text
    assert "[DONE]" in text

def test_message_persistence(monkeypatch):
    class FakeDelta:
        def __init__(self, content):
            self.content = content
    
    class FakeChoice:
        def __init__(self, content):
            self.delta = FakeDelta(content)

    class FakeChunk:
        def __init__(self, content):
            self.choices = [FakeChoice(content)]

    def fake_create(*args, **kwargs):
        yield FakeChunk("Response")

    monkeypatch.setattr(
        "main.client.chat.completions.create",
        fake_create
    )

    s = client.post("/sessions", json={}).json()
    session_id = s["id"]

    resp = client.post(
        "/chat",
        json={"session_id": session_id, "message": "Test message"},
    )
    assert resp.status_code == 200

    msgs = client.get(f"/sessions/{session_id}/messages").json()
    assert len(msgs) == 2
    assert msgs[0]["role"] == "user"
    assert msgs[0]["content"] == "Test message"
    assert msgs[1]["role"] == "assistant"
    assert msgs[1]["content"] == "Response"

def test_llm_error_handling(monkeypatch):
    def fake_error(*args, **kwargs):
        raise RuntimeError("Fake LLM failure")
    
    monkeypatch.setattr(
        "main.client.chat.completions.create",
        fake_error,
    )

    s = client.post("/sessions", json={}).json()
    session_id = s["id"]

    resp = client.post(
        "/chat",
        json={"session_id": session_id, "message": "Hi"},
    )

    assert resp.status_code == 200
    text = resp.text

    assert "OpenAI error" in text
    assert "Fake LLM failure" in text