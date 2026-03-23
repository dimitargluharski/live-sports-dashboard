
"use client";
import React, { useEffect, useState } from "react";

interface Stream {
  label: string;
  url: string;
  iframe?: string | null;
  status?: string;
}

interface Match {
  league: string;
  tournament: string;
  date: string;
  time: string;
  teams: string;
  streams: Stream[];
}

const VipMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/matches-vip.json", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Неуспешно зареждане на данни");
        return res.json();
      })
      .then((data) => setMatches(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Зареждане...</div>;
  if (error) return <div style={{ color: "red" }}>Грешка: {error}</div>;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>VIPLeague Мачове</h1>
      {matches.length === 0 && <div>Няма намерени мачове.</div>}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 16 }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            <th>Дата</th>
            <th>Час</th>
            <th>Държава/Лига</th>
            <th>Отбори</th>
            <th>Стриймове</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #eee" }}>
              <td>{m.date}</td>
              <td>{m.time}</td>
              <td>{m.league}</td>
              <td>{m.teams}</td>
              <td>
                {m.streams && m.streams.length > 0 ? (
                  m.streams.map((s, si) => (
                    <a
                      key={si}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ marginRight: 8 }}
                    >
                      {s.label}
                    </a>
                  ))
                ) : (
                  <span style={{ color: "#888" }}>Няма</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default VipMatchesPage;
