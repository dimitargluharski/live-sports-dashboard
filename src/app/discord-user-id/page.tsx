"use client";
import { useDiscordUserId } from "../../hooks/useDiscordUserId";
import { useState } from "react";

export default function DiscordUserIdPage() {
  const { userId, saveUserId } = useDiscordUserId();
  const [input, setInput] = useState(userId);
  const [saved, setSaved] = useState(false);

  function handleSave() {
    saveUserId(input.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: "0 auto" }}>
      <h2>Discord User ID</h2>
      <p style={{ fontSize: 14, color: "#666" }}>
        Въведи своя Discord User ID, за да получаваш персонализирани известия с mention (@).
      </p>
      <input
        type="text"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Пример: 123456789012345678"
        style={{ width: "100%", margin: "12px 0", padding: 8, fontSize: 16 }}
      />
      <button onClick={handleSave} style={{ padding: "8px 16px", fontSize: 16 }}>
        Запази
      </button>
      {saved && <div style={{ color: "green", marginTop: 8 }}>Запазено!</div>}
    </div>
  );
}
