"use client";
import { useState } from "react";

export default function NotifyDiscordTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function sendTest(type: "reminder" | "start") {
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/notify-discord", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        match: {
          name: "Барселона - Реал",
          link: "https://example.com/stream"
        },
        type
      })
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) setResult("Известие изпратено!");
    else setResult(data.error || "Грешка!");
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Тест на Discord известие</h2>
      <button onClick={() => sendTest("reminder")}
        disabled={loading} style={{ marginRight: 10 }}>Изпрати reminder</button>
      <button onClick={() => sendTest("start")}
        disabled={loading}>Изпрати start</button>
      {loading && <div>Изпраща...</div>}
      {result && <div style={{ marginTop: 10 }}>{result}</div>}
    </div>
  );
}
