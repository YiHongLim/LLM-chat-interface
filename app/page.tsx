"use client";

import { useState } from "react";

type Message = {
  id: number;
  text: string;
  role: "user" | "assistant";
};

export default function HomePage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMessage: Message = {
      id: messages.length + 1,
      text: trimmed,
      role: "user",
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
    const res = await fetch("http://127.0.0.1:8000/echo", {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: trimmed}),
    });

    if (!res.ok) {
      throw new Error(`HTTP error ${res.status}`);
    }

    const data: { you_sent: string} = await res.json();

    const assistantMessage: Message = {
      id: userMessage.id + 1,
      text: `Echo from API: ${data.you_sent}`,
      role: "assistant",
    };
    setMessages((prev) => [...prev, assistantMessage])
  } catch(err) {
    console.error(err);
    const errorMessage: Message = {
      id: messages.length + 2,
      text: "Error calling API.",
      role: "assistant",
    };
    setMessages((prev) => [...prev, errorMessage]);
  } finally {
    setLoading(false);
  }
  };

  

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "1.5rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>
        Chat UI {'>'} FastAPI /echo
      </h1>

      <div
        style={{
          border: "1px solid #ddd",
          borderRadius: "8px",
          padding: "1rem",
          height: "400px",
          overflowY: "auto",
          marginBottom: "1rem",
          background: "#fafafa",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {messages.length === 0 && (
          <p style={{ color: "#888" }}>Type a message and it will be echoed by FastAPI</p>
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
            }}
          >
            {m.text}
          </div>
        ))}
      </div>

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
          {loading ? "Sending..." : "Send"}
        </button>
      </form>
    </main>
  );
}
