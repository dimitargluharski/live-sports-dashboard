"use client";

import React, { useMemo, useEffect, useState } from "react";
import { FiInfo, FiTv } from "react-icons/fi";
// import { StreamPlayerModal } from "../../components/StreamPlayerModal";

type Channel = {
  label: string;
  matchId: string;
  channelNum: string;
  streamPageUrl: string;
  iframeLevel1?: string | null;
  iframeLevel2?: string | null;
  status?: string;
};

type Match = {
  articleId: string;
  matchId: string;
  matchUrl: string;
  isLive?: boolean;
  date: string;
  time: string;
  dataStart: string;
  homeTeam: string;
  awayTeam: string;
  teams: string;
  scoreOrSeparator: string;
  league: string;
  country: string;
  channels: Channel[];
};

type ResolvedStream = {
  embedUrl: string;
  playerUrl: string;
  mediaUrl: string | null;
  streamUnavailable?: boolean;
  streamUnavailableReason?: string | null;
};

const COUNTRY_ALIASES: Record<string, string | null> = {
  Saudi: "Saudi Arabia",
  South: "South Korea",
  Czech: "Czech Republic",
  England: "United Kingdom",
  Scotland: "United Kingdom",
  fifa: null,
  International: null,
  "Champions League": null,
};

const THEME = {
  pageBg: "#0b1220",
  panelBg: "#111a2b",
  panelBorder: "#1f2a44",
  softBorder: "#2a3553",
  textPrimary: "#e5ecff",
  textMuted: "#94a3b8",
  inputBg: "#0f172a",
  inputBorder: "#2a3553",
  badgeBg: "#17233a",
  scoreBg: "#0f172a",
  scoreBorder: "#334155",
  channelBtnBg: "#162033",
  channelBtnBorder: "#334155",
  naText: "#8fa0b8",
};

function normalizeCountryLookup(country: string): string | null {
  const raw = (country || "").trim();
  if (!raw) return null;
  if (Object.prototype.hasOwnProperty.call(COUNTRY_ALIASES, raw)) {
    return COUNTRY_ALIASES[raw];
  }
  return raw;
}

function formatChannelLabel(channel: Channel, index: number): string {
  const raw = (channel.label || "").trim();
  if (!raw) return `Канал ${index + 1}`;

  // Most source labels are ids like #323662; hide those and use readable labels.
  if (/^#?\d+$/.test(raw.replace(/^#/, ""))) {
    return `Канал ${index + 1}`;
  }

  return raw;
}

function parseScore(scoreOrSeparator: string): { home: string; away: string } {
  const value = (scoreOrSeparator || "").trim();
  const match = value.match(/^(\d+)\s*-\s*(\d+)$/);
  if (match) {
    return { home: match[1], away: match[2] };
  }

  return { home: "-", away: "-" };
}

function getMatchOutcome(scoreOrSeparator: string): "home" | "away" | "draw" | "none" {
  const parsed = parseScore(scoreOrSeparator);
  const home = Number(parsed.home);
  const away = Number(parsed.away);

  if (!Number.isFinite(home) || !Number.isFinite(away)) {
    return "none";
  }

  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

function LiveBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 10,
        height: 10,
        borderRadius: 999,
        background: "#ef4444",
        boxShadow: "0 0 0 0 rgba(239, 68, 68, 0.75)",
        animation: "livePulseDot 1.2s ease-out infinite",
      }}
    />
  );
}

const MATCHES_DATA_PATH = process.env.NEXT_PUBLIC_MATCHES_DATA_PATH || "/matches.json";
const DEFAULT_STREAM_TITLE = process.env.NEXT_PUBLIC_STREAM_TITLE || "Live Stream";

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flagsByCountry, setFlagsByCountry] = useState<Record<string, string | null>>({});
  const [searchInput, setSearchInput] = useState("");
  const [onlyWithChannels, setOnlyWithChannels] = useState(false);
  const [expandedChannelsByMatch, setExpandedChannelsByMatch] = useState<Record<string, boolean>>({});
  const [showLiveMatches, setShowLiveMatches] = useState(true);
  const [showNonLiveMatches, setShowNonLiveMatches] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const [activeStream, setActiveStream] = useState<{
    name: string;
    url: string;
    matchTitle: string;
  } | null>(null);
  const [resolvedStream, setResolvedStream] = useState<ResolvedStream | null>(null);
  const [resolving, setResolving] = useState(false);
  const [forceIframe, setForceIframe] = useState(false);

  useEffect(() => {
    fetch(MATCHES_DATA_PATH, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`Неуспешно зареждане: ${res.status}`);
        return res.json();
      })
      .then((data: Match[]) => setMatches(Array.isArray(data) ? data : []))
      .catch((err) => setError(err instanceof Error ? err.message : "Unknown error"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const uniqueCountries = Array.from(new Set(matches.map((m) => m.country).filter(Boolean)));
    const toResolve = uniqueCountries.filter((country) => !(country in flagsByCountry));

    if (toResolve.length === 0) return;

    let cancelled = false;

    async function resolveFlags() {
      const resolvedEntries = await Promise.all(
        toResolve.map(async (country) => {
          const lookup = normalizeCountryLookup(country);
          if (!lookup) {
            return [country, null] as const;
          }

          try {
            const res = await fetch(
              `https://restcountries.com/v3.1/name/${encodeURIComponent(lookup)}?fields=flags,name`,
              { cache: "force-cache" },
            );

            if (!res.ok) {
              return [country, null] as const;
            }

            const payload = (await res.json()) as Array<{
              flags?: { png?: string; svg?: string };
              name?: { common?: string };
            }>;

            const exact = payload.find(
              (row) => row.name?.common?.toLowerCase() === lookup.toLowerCase(),
            );
            const selected = exact ?? payload[0];
            const flag = selected?.flags?.png ?? selected?.flags?.svg ?? null;

            return [country, flag] as const;
          } catch {
            return [country, null] as const;
          }
        }),
      );

      if (cancelled) return;

      setFlagsByCountry((prev) => {
        const next = { ...prev };
        for (const [country, url] of resolvedEntries) {
          next[country] = url;
        }
        return next;
      });
    }

    resolveFlags();

    return () => {
      cancelled = true;
    };
  }, [matches, flagsByCountry]);

  useEffect(() => {
    if (!activeStream) {
      setResolvedStream(null);
      setResolving(false);
      return;
    }

    const streamToResolve = activeStream;
    const controller = new AbortController();

    async function resolveStream() {
      try {
        setResolving(true);
        setForceIframe(false);

        const url = `/api/resolve-stream?url=${encodeURIComponent(streamToResolve.url)}`;
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Resolve failed with status ${response.status}`);
        }

        const payload = (await response.json()) as ResolvedStream;
        setResolvedStream(payload);
      } catch {
        setResolvedStream(null);
      } finally {
        setResolving(false);
      }
    }

    resolveStream();

    return () => {
      controller.abort();
    };
  }, [activeStream]);

  useEffect(() => {
    if (!activeStream) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveStream(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeStream]);

  const summary = useMemo(() => {
    let withChannels = 0;
    let totalChannels = 0;

    for (const match of matches) {
      if (match.channels?.length) {
        withChannels += 1;
        totalChannels += match.channels.length;
      }
    }

    return {
      totalMatches: matches.length,
      withChannels,
      totalChannels,
    };
  }, [matches]);

  const filteredMatches = useMemo(() => {
    const query = searchInput.trim().toLowerCase();

    return matches.filter((match) => {
      if (onlyWithChannels && (!match.channels || match.channels.length === 0)) {
        return false;
      }

      if (!query) return true;

      return (
        match.homeTeam.toLowerCase().includes(query) ||
        match.awayTeam.toLowerCase().includes(query) ||
        match.league.toLowerCase().includes(query) ||
        match.country.toLowerCase().includes(query)
      );
    });
  }, [matches, onlyWithChannels, searchInput]);

  const sortedMatches = useMemo(() => {
    return [...filteredMatches].sort((a, b) => {
      const byCountry = a.country.localeCompare(b.country, "bg", { sensitivity: "base" });
      if (byCountry !== 0) return byCountry;

      const byHome = a.homeTeam.localeCompare(b.homeTeam, "bg", { sensitivity: "base" });
      if (byHome !== 0) return byHome;

      return a.awayTeam.localeCompare(b.awayTeam, "bg", { sensitivity: "base" });
    });
  }, [filteredMatches]);

  const liveMatches = useMemo(() => sortedMatches.filter((m) => Boolean(m.isLive)), [sortedMatches]);
  const nonLiveMatches = useMemo(() => sortedMatches.filter((m) => !m.isLive), [sortedMatches]);

  function renderMatchCard(m: Match) {
    const score = parseScore(m.scoreOrSeparator);
    const outcome = getMatchOutcome(m.scoreOrSeparator);
    const showAll = expandedChannelsByMatch[m.articleId] ?? false;
    const visibleChannels = showAll ? m.channels : m.channels.slice(0, 3);

    return (
      <article
        key={m.articleId}
        style={{
          border: `1px solid ${THEME.panelBorder}`,
          borderRadius: 14,
          padding: 14,
          background: THEME.panelBg,
          boxShadow: "0 10px 28px rgba(0, 0, 0, 0.28)",
          marginBottom: 14,
          breakInside: "avoid",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
            {flagsByCountry[m.country] ? (
              <img
                src={flagsByCountry[m.country] ?? ""}
                alt={m.country}
                width={18}
                height={14}
                style={{ borderRadius: 2, objectFit: "cover" }}
              />
            ) : flagsByCountry[m.country] === null ? (
              <span style={{ fontSize: 16 }}>⚽</span>
            ) : null}
            <span style={{ color: THEME.textMuted, fontWeight: 600 }}>{m.country || "-"}</span>
            <span
              style={{
                fontSize: 12,
                border: `1px solid ${THEME.softBorder}`,
                borderRadius: 999,
                padding: "2px 8px",
                color: THEME.textMuted,
                background: THEME.badgeBg,
              }}
            >
              {m.league || "Без лига"}
            </span>
          </div>

          <div style={{ fontSize: 12, color: THEME.textMuted, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <span>
              {m.date || "-"} • {m.time || "-"}
            </span>
            {m.isLive ? <LiveBadge /> : null}
          </div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                textAlign: "center",
                borderRadius: 8,
                padding: "4px 0",
                background: THEME.scoreBg,
                border: `1px solid ${THEME.scoreBorder}`,
                color: THEME.textPrimary,
              }}
            >
              {score.home}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1.2,
                color:
                  outcome === "home"
                    ? "#34d399"
                    : outcome === "draw"
                      ? "#cbd5e1"
                      : THEME.textMuted,
              }}
            >
              {m.homeTeam}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "44px 1fr", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontWeight: 700,
                fontSize: 14,
                textAlign: "center",
                borderRadius: 8,
                padding: "4px 0",
                background: THEME.scoreBg,
                border: `1px solid ${THEME.scoreBorder}`,
                color: THEME.textPrimary,
              }}
            >
              {score.away}
            </span>
            <span
              style={{
                fontWeight: 700,
                fontSize: 18,
                lineHeight: 1.2,
                color:
                  outcome === "away"
                    ? "#34d399"
                    : outcome === "draw"
                      ? "#cbd5e1"
                      : THEME.textMuted,
              }}
            >
              {m.awayTeam}
            </span>
          </div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
          {m.isLive && m.channels?.length ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {visibleChannels.map((channel, idx) => {
                  const displayLabel = formatChannelLabel(channel, idx);

                  return (
                    <button
                      key={`${m.articleId}_${channel.channelNum}_${idx}`}
                      type="button"
                      onClick={() =>
                        setActiveStream({
                          name: displayLabel,
                          url: channel.streamPageUrl,
                          matchTitle: `${m.homeTeam} - ${m.awayTeam}`,
                        })
                      }
                      style={{
                        border: `1px solid ${THEME.channelBtnBorder}`,
                        borderRadius: 9,
                        padding: "6px 9px",
                        fontSize: 12,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        background: THEME.channelBtnBg,
                        color: THEME.textPrimary,
                      }}
                    >
                      <FiTv /> {displayLabel}
                    </button>
                  );
                })}
              </div>

              {m.channels.length > 3 ? (
                <button
                  type="button"
                  onClick={() =>
                    setExpandedChannelsByMatch((prev) => ({
                      ...prev,
                      [m.articleId]: !showAll,
                    }))
                  }
                  style={{
                    border: `1px dashed ${THEME.softBorder}`,
                    borderRadius: 9,
                    padding: "6px 9px",
                    fontSize: 12,
                    cursor: "pointer",
                    background: THEME.panelBg,
                    color: THEME.textMuted,
                    fontWeight: 600,
                  }}
                >
                  {showAll ? "Скрий" : `+${m.channels.length - 3} още`}
                </button>
              ) : null}
            </>
          ) : (
            <span
              style={{
                color: THEME.naText,
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <FiTv /> TV N/A
            </span>
          )}
        </div>
      </article>
    );
  }

  if (loading) return <div style={{ padding: 20, color: THEME.textPrimary }}>Зареждане на данни...</div>;
  if (error) return <div style={{ color: "#fca5a5", padding: 20 }}>Грешка: {error}</div>;

  return (
    <div style={{ background: THEME.pageBg, minHeight: "100vh", width: "100%" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
        <style>
          {`@keyframes livePulseDot {
            0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.75); }
            70% { transform: scale(1); box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
            100% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }`}
        </style>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <p style={{ marginTop: 0, marginBottom: 0, fontSize: 20, fontWeight: 800, color: THEME.textPrimary }}>
            Срещи: {filteredMatches.length}
          </p>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onMouseEnter={() => setShowInfoTooltip(true)}
              onMouseLeave={() => setShowInfoTooltip(false)}
              onFocus={() => setShowInfoTooltip(true)}
              onBlur={() => setShowInfoTooltip(false)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 28,
                height: 28,
                borderRadius: 999,
                border: `1px solid ${THEME.softBorder}`,
                color: THEME.textMuted,
                background: THEME.panelBg,
                cursor: "help",
              }}
              aria-label="Информация"
            >
              <FiInfo />
            </button>
            {showInfoTooltip ? (
              <div
                role="tooltip"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 300,
                  maxWidth: "min(300px, 75vw)",
                  border: `1px solid ${THEME.softBorder}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 12,
                  lineHeight: 1.45,
                  color: THEME.textPrimary,
                  background: "#0f172a",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
                  zIndex: 20,
                }}
              >
                Моята платформа не носи отговорност за съдържанието на каналите и не хоства нищо от това, което се стриймва.
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, marginBottom: 16 }}>
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Търси отбор, лига, държава..."
            style={{
              flex: "1 1 280px",
              border: `1px solid ${THEME.inputBorder}`,
              borderRadius: 10,
              padding: "10px 12px",
              minWidth: 240,
              background: THEME.inputBg,
              color: THEME.textPrimary,
            }}
          />
        </div>

        {filteredMatches.length === 0 ? <div style={{ color: THEME.textMuted }}>Няма намерени мачове.</div> : null}

        {liveMatches.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowLiveMatches((prev) => !prev)}
              style={{
                border: `1px solid ${THEME.softBorder}`,
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                background: showLiveMatches ? "#1f2937" : THEME.channelBtnBg,
                color: showLiveMatches ? "#fca5a5" : THEME.textMuted,
                fontWeight: 800,
              }}
            >
              {showLiveMatches
                ? `Скрий LIVE (${liveMatches.length})`
                : `Покажи LIVE (${liveMatches.length})`}
            </button>

            {showLiveMatches ? (
              <div
                style={{
                  marginTop: 10,
                  columnWidth: "320px",
                  columnGap: 14,
                }}
              >
                {liveMatches.map((m) => renderMatchCard(m))}
              </div>
            ) : null}
          </div>
        ) : null}

        {nonLiveMatches.length > 0 ? (
          <div style={{ marginTop: 12 }}>
            <button
              type="button"
              onClick={() => setShowNonLiveMatches((prev) => !prev)}
              style={{
                border: `1px solid ${THEME.softBorder}`,
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                background: showNonLiveMatches ? "#1f2937" : THEME.channelBtnBg,
                color: showNonLiveMatches ? THEME.textPrimary : THEME.textMuted,
                fontWeight: 700,
              }}
            >
              {showNonLiveMatches
                ? "Скрий останалите"
                : `Покажи останалите (${nonLiveMatches.length})`}
            </button>

            {showNonLiveMatches ? (
              <div
                style={{
                  marginTop: 12,
                  columnWidth: "320px",
                  columnGap: 14,
                }}
              >
                {nonLiveMatches.map((m) => renderMatchCard(m))}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* <StreamPlayerModal
          isOpen={Boolean(activeStream)}
          title={activeStream?.name ?? DEFAULT_STREAM_TITLE}
          subtitle={activeStream?.matchTitle}
          iframeUrl={resolvedStream?.playerUrl ?? activeStream?.url ?? ""}
          mediaUrl={resolvedStream?.mediaUrl}
          streamUnavailable={Boolean(resolvedStream?.streamUnavailable)}
          streamUnavailableReason={resolvedStream?.streamUnavailableReason ?? null}
          resolving={resolving}
          forceIframe={forceIframe}
          onForceIframe={() => setForceIframe(true)}
          onClose={() => setActiveStream(null)}
        /> */}
      </div>
    </div>
  );
}
