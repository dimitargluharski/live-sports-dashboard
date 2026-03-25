"use client";

import { useEffect, useMemo, useState } from "react";
import { FiClock, FiSearch, FiTv, FiX } from "react-icons/fi";
import { useSystemTheme } from "../hooks/useSystemTheme";

type Stream = {
  id: number;
  name: string;
  url: string;
};

type Match = {
  id: number;
  date: string | null;
  time: string | null;
  title: string;
  country: {
    name: string | null;
    flagUrl?: string | null;
    imageUrl: string | null;
  };
  streams: Stream[];
};

type EventsResponse = {
  source: string;
  diariesUrl: string;
  scrapedAt: string;
  agendaDate: string | null;
  count: number;
  matches: Match[];
};

type ResolvedStream = {
  embedUrl: string;
  playerUrl: string;
  mediaUrl: string | null;
};

type LeagueGroup = {
  league: string;
  matches: Match[];
};

const SPORT_FILTERS = ["All", "Football", "NBA", "Tennis", "Rugby", "NHL"] as const;

type SportFilter = (typeof SPORT_FILTERS)[number];

function detectSportFromTitle(title: string): Exclude<SportFilter, "All"> {
  const value = title.toLowerCase();

  if (value.includes("nhl") || value.includes("hockey")) {
    return "NHL";
  }

  if (value.includes("nba") || value.includes("basketball") || value.includes("euroleague")) {
    return "NBA";
  }

  // Tennis detection: more robust, includes 'tenis'
  if (
    value.includes("tennis") ||
    value.includes("tenis") ||
    value.includes("atp") ||
    value.includes("wta") ||
    value.includes("itf") ||
    value.includes("challenger") ||
    value.includes("davis cup") ||
    value.includes("futures")
  ) {
    return "Tennis";
  }

  if (value.includes("rugby") || value.includes("six nations") || value.includes("super rugby")) {
    return "Rugby";
  }

  return "Football";
}

function getLeagueName(title: string): string {
  const [league] = title.split(":");
  const value = league?.trim();
  return value && value.length > 0 ? value : "Other";
}

function stripLeaguePrefix(title: string, league: string): string {
  const normalizedTitle = title.trim();
  const prefix = `${league}:`;

  if (normalizedTitle.toLowerCase().startsWith(prefix.toLowerCase())) {
    return normalizedTitle.slice(prefix.length).trim();
  }

  return normalizedTitle;
}

function groupMatchesByLeague(matches: Match[]): LeagueGroup[] {
  const groups = new Map<string, Match[]>();

  for (const match of matches) {
    const league = getLeagueName(match.title);
    const existing = groups.get(league) ?? [];
    existing.push(match);
    groups.set(league, existing);
  }

  return Array.from(groups.entries())
    .map(([league, groupedMatches]) => ({ league, matches: groupedMatches }))
    .sort((a, b) => a.league.localeCompare(b.league));
}


function convertLimaToLocal(limaHour: string | null): string {
  if (!limaHour) return "--:--";
  const [hour, minute] = limaHour.split(":").map(Number);
  const now = new Date();

  const utcDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), hour + 5, minute));

  return utcDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
}

export default function Home() {
  const theme = useSystemTheme();
  const [data, setData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSportFilter, setActiveSportFilter] = useState<SportFilter>("All");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStream, setActiveStream] = useState<{
    name: string;
    url: string;
    matchTitle: string;
  } | null>(null);
  const [resolvedStream, setResolvedStream] = useState<ResolvedStream | null>(null);
  const [resolving, setResolving] = useState(false);
  const [forceIframe, setForceIframe] = useState(false);
  const [expandedChannelsByMatch, setExpandedChannelsByMatch] = useState<Record<number, boolean>>({});

  const updatedAtTime = useMemo(() => {
    if (!data?.scrapedAt) {
      return "--:--";
    }

    return new Date(data.scrapedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [data?.scrapedAt]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    const debounceId = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);

    return () => {
      window.clearTimeout(debounceId);
    };
  }, [searchInput]);

  const availableSportFilters = useMemo<SportFilter[]>(() => {
    const values = new Set<SportFilter>(["All"]);

    for (const match of data?.matches ?? []) {
      values.add(detectSportFromTitle(match.title));
    }

    return SPORT_FILTERS.filter((filter) => values.has(filter));
  }, [data?.matches]);

  const groupedByLeague = useMemo(() => {
    if (!data?.matches?.length) {
      return [] as LeagueGroup[];
    }

    const normalizedSearch = searchQuery.trim().toLowerCase();

    const matchesToRender =
      activeSportFilter === "All"
        ? data.matches
        : data.matches.filter((match) => detectSportFromTitle(match.title) === activeSportFilter);

    const searchedMatches = normalizedSearch
      ? matchesToRender.filter((match) => {
        const league = getLeagueName(match.title).toLowerCase();
        return match.title.toLowerCase().includes(normalizedSearch) || league.includes(normalizedSearch);
      })
      : matchesToRender;

    return groupMatchesByLeague(searchedMatches);
  }, [activeSportFilter, data, searchQuery]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/events", { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const payload = (await res.json()) as EventsResponse;
        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 relative">
      <h1 className="mb-6 text-2xl font-bold tracking-tight text-(--fg) sm:text-3xl">LiveSports Pulse</h1>
      {/* Spinner overlay */}
      {loading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 dark:bg-black/60">
          <svg className="h-10 w-10 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
      )}
      <section className="rounded-xl border border-(--line) bg-(--panel) p-4 sm:p-5">
        <div className="mb-4 flex items-end justify-end gap-3 border-b border-(--line-soft) pb-3">
          <p className="text-xs text-(--muted)">
            {loading ? "Loading..." : `Updated at ${updatedAtTime} • ${data?.count ?? 0} matches`}
          </p>
        </div>

        {error ? (
          <p className="mb-3 rounded-xl border border-(--danger-line) bg-(--danger-bg) p-3 text-sm text-(--danger-fg)">
            Error: {error}
          </p>
        ) : null}

        <label className="mb-3 flex h-10 items-center gap-2 rounded-xl border border-(--line) bg-(--input-bg) px-3 text-(--muted) focus-within:border-(--accent)">
          <FiSearch aria-hidden="true" />
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search..."
            className="w-full bg-transparent text-sm text-(--fg) outline-none placeholder:text-(--muted)"
          />
        </label>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          {availableSportFilters.map((filter) => {
            const isActive = filter === activeSportFilter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => setActiveSportFilter(filter)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide transition ${isActive
                  ? "border-(--accent) bg-(--accent) text-(--accent-contrast)"
                  : "border-(--line) bg-(--panel-soft) text-(--fg) hover:border-(--accent)"
                  }`}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {!loading && (
          <div className="space-y-3">
            {groupedByLeague.length ? (
              groupedByLeague.map((group) => (
                <section key={group.league} className="rounded-lg border border-(--line) bg-(--panel)">
                  <div className="rounded-t-lg border-b border-slate-200/70 bg-slate-50/70 px-3 py-2 dark:border-slate-700/60 dark:bg-slate-800/35">
                    <h2 className="inline-flex items-center gap-2 text-sm text-(--fg)">
                      {group.matches[0]?.country.flagUrl ?? group.matches[0]?.country.imageUrl ? (
                        <img
                          src={group.matches[0]?.country.flagUrl ?? group.matches[0]?.country.imageUrl ?? ""}
                          alt={group.matches[0]?.country.name ?? "league flag"}
                          className="h-5 w-5 rounded-full object-cover"
                          loading="lazy"
                        />
                      ) : null}
                      <span className="font-semibold">{group.league}</span>
                    </h2>
                  </div>

                  <ul className="divide-y divide-(--line-soft)">
                    {group.matches.map((match) => {
                      const cleanTitle = stripLeaguePrefix(match.title, group.league);
                      const teamMatch = cleanTitle.match(/^(.*?)\s+vs\.?\s+(.*)$/i);
                      const homeTeam = teamMatch?.[1]?.trim();
                      const awayTeam = teamMatch?.[2]?.trim();
                      const hasManyStreams = match.streams.length > 5;
                      const showAllStreams = expandedChannelsByMatch[match.id] ?? false;
                      const streamsToShow = showAllStreams ? match.streams : match.streams.slice(0, 5);

                      return (
                        <li key={match.id} className="px-3 py-3">
                          <div className="flex items-center gap-3">
                            <p className="inline-flex min-w-16 items-center justify-center gap-1.5 self-center text-sm font-semibold text-(--muted)">
                              <FiClock className="h-4 w-4" />
                              {convertLimaToLocal(match.time)}
                            </p>

                            <div className="flex-1 text-sm text-(--fg)">
                              {homeTeam && awayTeam ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-(--fg)">{homeTeam}</span>
                                  <span className="font-semibold text-(--fg)">{awayTeam}</span>
                                </div>
                              ) : (
                                cleanTitle
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex flex-wrap gap-2">
                            {streamsToShow.map((stream) => (
                              <button
                                key={stream.id}
                                type="button"
                                onClick={() =>
                                  setActiveStream({
                                    name: stream.name,
                                    url: stream.url,
                                    matchTitle: cleanTitle,
                                  })
                                }
                                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-(--line) bg-(--panel-soft) px-2 py-1 text-xs text-(--fg) hover:border-(--accent)"
                              >
                                <FiTv />
                                {stream.name}
                              </button>
                            ))}
                            {hasManyStreams ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedChannelsByMatch((previous) => ({
                                    ...previous,
                                    [match.id]: !showAllStreams,
                                  }))
                                }
                                className="inline-flex cursor-pointer items-center rounded-md border border-(--line) bg-(--panel-soft) px-2 py-1 text-xs font-semibold text-(--muted) hover:border-(--accent)"
                              >
                                {showAllStreams ? "Show less" : `Show all (${match.streams.length})`}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-(--line) bg-(--panel) p-6 text-center text-sm text-(--muted)">
                No results for this filter/search.
              </div>
            )}
          </div>
        )}
      </section>

      {activeStream ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-(--overlay) p-4 backdrop-blur-md overflow-hidden"
          onClick={() => setActiveStream(null)}
          role="presentation"
        >
          <div
            className="relative h-[86vh] w-full max-w-6xl overflow-auto rounded-xl bg-black shadow-2xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Player for ${activeStream.name}`}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-black/70 px-3 py-2">
              <div>
                <p className="text-sm font-semibold text-white">{activeStream.matchTitle}</p>
                <p className="text-[11px] text-slate-300">
                  {activeStream.name}
                  {resolvedStream?.mediaUrl && !forceIframe ? " • video" : null}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveStream(null)}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-white/25 px-2 py-1 text-xs text-white hover:bg-white/10"
              >
                <FiX />
                Close
              </button>
            </div>

            {resolvedStream?.mediaUrl && !forceIframe ? (
              <video
                src={resolvedStream.mediaUrl}
                className="h-[calc(80vh-58px)] w-full bg-black"
                controls
                autoPlay
                playsInline
                onError={() => setForceIframe(true)}
              />
            ) : (
              <iframe
                src={resolvedStream?.playerUrl ?? activeStream.url}
                title={activeStream.name}
                className="h-[calc(80vh-58px)] w-full bg-black"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            )}

            {resolving ? (
              <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
                Resolving direct video link...
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </main>
  );
}
