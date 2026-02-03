"use client";

import { useEffect, useState, useRef, ComponentPropsWithoutRef } from "react";
import ReactMarkdown, {
  type Components,
} from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: number;
  text: string;
  role: "user" | "assistant";
};



export default function HomePage() {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  
  useEffect(() => {
    async function initSession() {
      // Load existing session_id from localStorage
      const stored = window.localStorage.getItem("session_id");
      
      if (stored) {
        const id = Number(stored);

        try {
          const res = await fetch(`http://127.0.0.1:8000/sessions/${id}/messages`);
          if (!res.ok) {
            console.error("Session not found, creating new one", res.status);
            window.localStorage.removeItem("session_id");
            throw new Error("Session not found");
          }
          const data: 
          {
            id: number,
            role: string;
            content: string
          }[] = await res.json();

          setSessionId(id);
          setMessages(
            data.map((m, idx) => ({
              id: idx + 1,
              role: m.role as "user" | "assistant",
              text: m.content,
            }))
          );
          return;
        }
        catch(err) {
          console.error("Error loading session:", err)
          setError("Could not load previous session. Starting a new chat.")
        }
      }

      try {
      // If not found or error, create a new session on the backend
      const res = await fetch("http://127.0.0.1:8000/sessions", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({})
      });

        if (!res.ok) {
          console.error("Failed to create session", res.status);
          setError("Chat service is unavailable. Please try again later.");
          return;
        }

        const data: {id:number} = await res.json()

        // Save to state + localStorage
        setSessionId(data.id)
        window.localStorage.setItem("session_id", String(data.id));
      } catch (err) {
        console.error("Network error creating session:", err);
        setError("Chat service is unavilable. Please try again later.");
        return;
      }
      

      
    }

    initSession();
  }, []);

  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth"});
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionId) return;

    setError("");

    const trimmed = input.trim();
    if (!trimmed) return;
    
    const userMessage: Message = {
      id: messages.length + 1,
      text: trimmed,
      role: "user",
    };

    const assistantMessage: Message = {
    id: messages.length + 2,
    text: "",
    role: "assistant",
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setLoading(true);

    const assistantIndex = messages.length + 1;

    try {
      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          session_id: sessionId,
          message: trimmed
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }

      if (!res.body) {
        throw new Error("ReadableStream not supported or no body on response");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, {stream: true});
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const rawLine of lines) {
          const line = rawLine.trim();
          if (!line.startsWith("data:")) continue;

          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;

          if (dataStr === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.error) {
              throw new Error(parsed.Error);
            }
            
            if (parsed.token) {
              fullText += parsed.token;

              setMessages(prev => {
                const copy = [...prev];
                copy[assistantIndex] = {
                  ...copy[assistantIndex],
                  text: fullText
                };
                return copy;
              });
            }
          }
          catch (err) {
            console.error("Failed to parse SSE chunk:", dataStr, err)
          }
        }
      } 
  } catch(err) {
    console.error(err);
    setMessages((prev) => {
      const copy = [...prev];
      copy[assistantIndex] = {
        ...copy[assistantIndex],
        text: "Error calling API.",
      };
      return copy;
    });
    setError("Chat service is temporarily unavailable. Please try again later.")
  } finally {
    setLoading(false);
  }
  };

  

  return (
    <main
      style={{
        width: "80vw",
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
        height: "100vh",
        display: "flex",
        flexDirection: "column"
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        LLM Chat 
      </h1>

      <div
        style={{
          border: "1px solid #000",
          borderRadius: "8px",
          padding: "1rem",
          flex: 1,
          height: "400px",
          overflowY: "auto",
          marginBottom: "1rem",
          background: "#000",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#888" }}>Type a message to chat with LLM</p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              background: m.role == "user" ? "#2563eb": "#e5e7eb",
              color: m.role === "user" ? "#fff" : "#000",
              marginBottom: "0.5rem",
              padding: "0.5rem 0.75rem",
              borderRadius: "6px",
              maxWidth: "100%",
            }}
          >
            {m.role === "assistant" ? (
              <div className="markdown">  
                <ReactMarkdown>
                  {m.text}
                </ReactMarkdown>
              </div>
            ) : (
              m.text
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
        {error && (
          <div style={{color: "red", marginBottom: "0.5rem"}}>
            {error}
          </div>
        )}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            borderRadius: "6px",
            border: "1px solid #ccc",
          }}
        />
        
        <button
          type="submit"
          style={{
            padding: "0.5rem 0.9rem",
            borderRadius: "6px",
            border: "none",
            background: loading ? "#9ca3af" : "#2563eb",
            color: "white",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Generating..." : "Send"}
        </button>
      </form>
    </main>
  );
}
