"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { FiClock, FiInfo, FiSearch, FiTv, FiX } from "react-icons/fi";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
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
  eventUrl?: string | null;
  isLive?: boolean;
  isTopMatch?: boolean;
  stats?: {
    h2hRecord?: string | null;
    h2hContext?: string | null;
  };
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
  isUpdating?: boolean;
  updateState?: {
    main: boolean;
    top: boolean;
    days: boolean;
    topPreparing: boolean;
    daysPreparing: boolean;
  };
  agendaDate: string | null;
  count: number;
  matches: Match[];
};

type ResolvedStream = {
  embedUrl: string;
  playerUrl: string;
  mediaUrl: string | null;
};

type DaySection = {
  key: "today";
  label: string;
  matches: Match[];
};

type TooltipIconProps = {
  label: string;
  message: string;
  align?: "left" | "center" | "right";
  sizeClassName?: string;
};

const INITIAL_SECTION_RENDER_COUNT = 20;
const SECTION_RENDER_STEP = 20;
const MIN_PLAYER_LOADER_MS = 900;

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

function splitMatchTeams(title: string): [string, string] {
  const separators = [" - ", " – ", " vs ", " VS ", " v ", " V "];

  for (const separator of separators) {
    if (title.includes(separator)) {
      const [home, away] = title.split(separator, 2).map((item) => item.trim());
      if (home && away) {
        return [home, away];
      }
    }
  }

  return [title.trim(), ""];
}

function parseTimeToMinutes(value: string | null): number | null {
  if (!value) return null;

  const cleaned = value.trim().replace(".", ":");
  const match = cleaned.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

function applyMinuteOffset(minutes: number, offsetMinutes: number): number {
  const dayMinutes = 24 * 60;
  return ((minutes + offsetMinutes) % dayMinutes + dayMinutes) % dayMinutes;
}

function displayTime(value: string | null, offsetMinutes: number): string {
  const parsed = parseTimeToMinutes(value);
  if (parsed === null) {
    return value || "--:--";
  }

  const shifted = applyMinuteOffset(parsed, offsetMinutes);
  const hours = Math.floor(shifted / 60);
  const minutes = shifted % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function displayCompactTime(value: string | null, offsetMinutes: number): string {
  const parsed = parseTimeToMinutes(value);
  if (parsed === null) {
    return value || "--:--";
  }

  const shifted = applyMinuteOffset(parsed, offsetMinutes);
  const hours = Math.floor(shifted / 60);
  const minutes = shifted % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}`;
}

function formatStreamsMeta(streamsCount: number): string {
  if (streamsCount <= 1) {
    return "Watch now";
  }

  return `${streamsCount} streams`;
}

function compareByTime(a: string | null, b: string | null, offsetMinutes: number): number {
  const left = parseTimeToMinutes(a);
  const right = parseTimeToMinutes(b);

  if (left === null && right === null) return (a || "").localeCompare(b || "");
  if (left === null) return 1;
  if (right === null) return -1;

  return applyMinuteOffset(left, offsetMinutes) - applyMinuteOffset(right, offsetMinutes);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function normalizeDate(value: string | null): string {
  return (value || "").trim().toLowerCase();
}

function normalizeDateWithoutYear(value: string | null): string {
  return normalizeDate(value).replace(/\s+\d{4}$/, "").trim();
}

function TooltipIcon({
  label,
  message,
  align = "center",
  sizeClassName = "h-8 w-8",
}: TooltipIconProps) {
  const positionClassName =
    align === "left"
      ? "left-0"
      : align === "right"
        ? "right-0"
        : "left-1/2 -translate-x-1/2";

  return (
    <div className="group relative flex shrink-0 items-center justify-center">
      <button
        type="button"
        aria-label={label}
        className={`inline-flex ${sizeClassName} cursor-help items-center justify-center rounded-full text-slate-400 transition-colors hover:text-cyan-200 focus:outline-none focus-visible:text-cyan-200`}
      >
        <FiInfo className="h-4 w-4" />
      </button>
      <div
        className={`pointer-events-none absolute top-full z-50 mt-2 w-52 ${positionClassName} rounded-xl border border-slate-700/70 bg-slate-950/95 p-2.5 text-[11px] leading-4.5 text-slate-200 opacity-0 shadow-[0_18px_40px_rgba(2,6,23,0.55)] transition-all duration-150 translate-y-1 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100`}
      >
        {message}
      </div>
    </div>
  );
}

export default function Home() {
  const theme = useSystemTheme();

  const [topData, setTopData] = useState<EventsResponse | null>(null);
  const [scheduleData, setScheduleData] = useState<EventsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [activeStream, setActiveStream] = useState<{
    name: string;
    url: string;
    matchTitle: string;
    eventUrl?: string | null;
    stats?: Match["stats"];
  } | null>(null);
  const [modalChannels, setModalChannels] = useState<Array<{ name: string; url: string }>>([]);
  const [selectedModalChannelIndex, setSelectedModalChannelIndex] = useState(0);
  const [resolvedStream, setResolvedStream] = useState<ResolvedStream | null>(null);
  const [resolving, setResolving] = useState(false);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [modalTab, setModalTab] = useState<"player" | "stats">("player");
  const [forceIframe, setForceIframe] = useState(false);
  const [expandedChannelsByMatch, setExpandedChannelsByMatch] = useState<Record<number, boolean>>({});
  const [dayView, setDayView] = useState<"today">("today");
  // Removed grid/list view mode
  const [onlyLiveInSchedule, setOnlyLiveInSchedule] = useState(false);
  const [renderLimitByDay, setRenderLimitByDay] = useState<Record<"today", number>>({
    today: INITIAL_SECTION_RENDER_COUNT,
  });
  const [isTopSwiperDragging, setIsTopSwiperDragging] = useState(false);
  const [isAppendingMatches, setIsAppendingMatches] = useState(false);

  const deferredSearchInput = useDeferredValue(searchInput);
  const playerLoadTokenRef = useRef(0);
  const playerLoadTimerRef = useRef<number | null>(null);
  const appendMatchesTimerRef = useRef<number | null>(null);
  const scheduleScrollRef = useRef<HTMLDivElement | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  const startPlayerLoading = useCallback(() => {
    playerLoadTokenRef.current += 1;
    if (playerLoadTimerRef.current !== null) {
      window.clearTimeout(playerLoadTimerRef.current);
      playerLoadTimerRef.current = null;
    }
    setPlayerLoading(true);
  }, []);

  const completePlayerLoading = useCallback(() => {
    const tokenAtCompletion = playerLoadTokenRef.current;

    if (playerLoadTimerRef.current !== null) {
      window.clearTimeout(playerLoadTimerRef.current);
    }

    playerLoadTimerRef.current = window.setTimeout(() => {
      if (playerLoadTokenRef.current === tokenAtCompletion) {
        setPlayerLoading(false);
      }
      playerLoadTimerRef.current = null;
    }, MIN_PLAYER_LOADER_MS);
  }, []);

  const timeShiftMinutes = useMemo(() => {
    const sourceOffset = Number(process.env.NEXT_PUBLIC_SOURCE_TZ_OFFSET_MINUTES ?? 60);
    const userOffset = -new Date().getTimezoneOffset();

    if (!Number.isFinite(sourceOffset)) {
      return 0;
    }

    return userOffset - sourceOffset;
  }, []);

  const today = useMemo(() => formatDateLabel(new Date()), []);


  const topMatches = useMemo(() => {
    if (!topData?.matches?.length) {
      return [] as Match[];
    }

    return [...topData.matches]
      .sort((a, b) => {
        const byLive = Number(Boolean(b.isLive)) - Number(Boolean(a.isLive));
        if (byLive !== 0) return byLive;

        return b.streams.length - a.streams.length;
      })
      .slice(0, 10);
  }, [topData?.matches]);

  const remainingMatches = useMemo(() => {
    if (!scheduleData?.matches?.length) {
      return [] as Match[];
    }

    return scheduleData.matches;
  }, [scheduleData?.matches]);

  const isFeedUpdating = useMemo(() => {
    return Boolean(topData?.isUpdating || scheduleData?.isUpdating);
  }, [topData?.isUpdating, scheduleData?.isUpdating]);

  const isFeedPreparing = useMemo(() => {
    return Boolean(
      topData?.updateState?.topPreparing ||
      scheduleData?.updateState?.topPreparing ||
      scheduleData?.updateState?.daysPreparing,
    );
  }, [topData?.updateState?.topPreparing, scheduleData?.updateState?.topPreparing, scheduleData?.updateState?.daysPreparing]);

  const isFeedActivelyRunning = useMemo(() => {
    return Boolean(
      topData?.updateState?.top ||
      scheduleData?.updateState?.top ||
      scheduleData?.updateState?.days ||
      topData?.updateState?.main ||
      scheduleData?.updateState?.main,
    );
  }, [topData?.updateState, scheduleData?.updateState]);

  const daySections = useMemo(() => {
    const todayKey = normalizeDate(today);
    const todayKeyNoYear = normalizeDateWithoutYear(today);

    const todayMatches = remainingMatches.filter((match) => {
      const value = normalizeDate(match.date);
      const valueNoYear = normalizeDateWithoutYear(match.date);
      return value === "today" || value === todayKey || valueNoYear === todayKeyNoYear;
    });

    const sections: DaySection[] = [];

    if (todayMatches.length) {
      sections.push({
        key: "today",
        label: today,
        matches: [...todayMatches].sort((a, b) => compareByTime(a.time, b.time, timeShiftMinutes)),
      });
    }

    return sections;
  }, [remainingMatches, timeShiftMinutes, today]);

  const filteredSections = useMemo(() => {
    const query = deferredSearchInput.trim().toLowerCase();
    if (!query) {
      return daySections;
    }

    return daySections
      .map((section) => ({
        key: section.key,
        label: section.label,
        matches: section.matches.filter((match) => {
          const league = getLeagueName(match.title).toLowerCase();
          return match.title.toLowerCase().includes(query) || league.includes(query);
        }),
      }))
      .filter((section) => section.matches.length > 0);
  }, [daySections, deferredSearchInput]);

  useEffect(() => {
    setRenderLimitByDay({
      today: INITIAL_SECTION_RENDER_COUNT,
    });
  }, [deferredSearchInput, onlyLiveInSchedule]);

  const visibleSections = useMemo(() => {
    const selectedSections = filteredSections.filter((section) => section.key === dayView);

    if (!onlyLiveInSchedule) {
      return selectedSections;
    }

    return selectedSections
      .map((section) => ({
        ...section,
        matches: section.matches.filter((match) => Boolean(match.isLive)),
      }))
      .filter((section) => section.matches.length > 0);
  }, [filteredSections, dayView, onlyLiveInSchedule]);

  const hasMoreVisibleMatches = useMemo(() => {
    return visibleSections.some(
      (section) => (renderLimitByDay[section.key] ?? INITIAL_SECTION_RENDER_COUNT) < section.matches.length,
    );
  }, [renderLimitByDay, visibleSections]);

  const loadMoreVisibleMatches = useCallback(() => {
    if (isAppendingMatches) {
      return;
    }

    let shouldAppend = false;

    for (const section of visibleSections) {
      const currentLimit = renderLimitByDay[section.key] ?? INITIAL_SECTION_RENDER_COUNT;
      if (currentLimit < section.matches.length) {
        shouldAppend = true;
        break;
      }
    }

    if (!shouldAppend) {
      return;
    }

    setIsAppendingMatches(true);

    if (appendMatchesTimerRef.current !== null) {
      window.clearTimeout(appendMatchesTimerRef.current);
    }

    appendMatchesTimerRef.current = window.setTimeout(() => {
      setRenderLimitByDay((prev) => {
        let changed = false;
        const next = { ...prev };

        for (const section of visibleSections) {
          const currentLimit = prev[section.key] ?? INITIAL_SECTION_RENDER_COUNT;
          if (currentLimit >= section.matches.length) continue;

          next[section.key] = Math.min(section.matches.length, currentLimit + SECTION_RENDER_STEP);
          changed = true;
        }

        return changed ? next : prev;
      });

      setIsAppendingMatches(false);
      appendMatchesTimerRef.current = null;
    }, 400);
  }, [isAppendingMatches, renderLimitByDay, visibleSections]);

  const todayMatchesCount = useMemo(() => {
    const section = filteredSections.find((item) => item.key === "today");
    return section?.matches.length ?? 0;
  }, [filteredSections]);

  const selectedDayStats = useMemo(() => {
    const section = filteredSections.find((item) => item.key === dayView);
    const total = section?.matches.length ?? 0;
    const live = section?.matches.filter((match) => Boolean(match.isLive)).length ?? 0;
    return { total, live };
  }, [filteredSections, dayView]);

  const openStreamModal = useCallback(
    (options: {
      matchTitle: string;
      streams: Array<{ name: string; url: string }>;
      selectedIndex?: number;
      eventUrl?: string | null;
      stats?: Match["stats"];
    }) => {
      const available = options.streams.filter((stream) => /^https?:\/\//i.test(stream.url));
      if (!available.length) return;

      const index = Math.min(Math.max(options.selectedIndex ?? 0, 0), available.length - 1);
      setModalChannels(available.length > 1 ? available : []);
      setSelectedModalChannelIndex(index);
      setModalTab("player");
      startPlayerLoading();
      setActiveStream({
        name: available[index].name,
        url: available[index].url,
        matchTitle: options.matchTitle,
        eventUrl: options.eventUrl ?? null,
        stats: options.stats,
      });
    },
    [startPlayerLoading],
  );

  const closeStreamModal = useCallback(() => {
    setActiveStream(null);
    setModalChannels([]);
    setSelectedModalChannelIndex(0);
    setModalTab("player");
    if (playerLoadTimerRef.current !== null) {
      window.clearTimeout(playerLoadTimerRef.current);
      playerLoadTimerRef.current = null;
    }
    setPlayerLoading(false);
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [topRes, allRes] = await Promise.all([
        fetch("/api/events?source=feed-top", { cache: "no-store" }),
        fetch("/api/events?source=feed-days", { cache: "no-store" }),
      ]);

      if (!topRes.ok) {
        throw new Error(`Top matches request failed with status ${topRes.status}`);
      }

      if (!allRes.ok) {
        throw new Error(`Matches request failed with status ${allRes.status}`);
      }

      const topPayload = (await topRes.json()) as EventsResponse;
      const allPayload = (await allRes.json()) as EventsResponse;

      setTopData(topPayload);
      setScheduleData(allPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadData();
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadData]);

  useEffect(() => {
    const root = scheduleScrollRef.current;
    const target = loadMoreSentinelRef.current;

    if (!root || !target || loading || !hasMoreVisibleMatches) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          loadMoreVisibleMatches();
        }
      },
      {
        root,
        rootMargin: "0px 0px 260px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreVisibleMatches, loadMoreVisibleMatches, loading, visibleSections]);

  useEffect(() => {
    if (!scheduleScrollRef.current) return;
    scheduleScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
  }, [dayView, deferredSearchInput, onlyLiveInSchedule]);

  useEffect(() => {
    return () => {
      if (appendMatchesTimerRef.current !== null) {
        window.clearTimeout(appendMatchesTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeStream) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeStreamModal();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeStream, closeStreamModal]);

  useEffect(() => {
    if (!activeStream) {
      setResolvedStream(null);
      setResolving(false);
      setPlayerLoading(false);
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
    return () => {
      if (playerLoadTimerRef.current !== null) {
        window.clearTimeout(playerLoadTimerRef.current);
      }
    };
  }, []);

  const modalTeams = useMemo(() => {
    if (!activeStream?.matchTitle) {
      return ["Team A", "Team B"] as [string, string];
    }

    return splitMatchTeams(activeStream.matchTitle);
  }, [activeStream?.matchTitle]);

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_20%_10%,#1e293b_0%,#0b1220_35%,#05070e_100%)] text-(--fg)">
      <section className="w-full border-b border-white/10 bg-black/35 px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-350">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Top Matches Today · {today}</h2>
              <TooltipIcon
                label="Top matches refresh info"
                message="Top matches data updates automatically every 10 minutes."
                align="left"
                sizeClassName="h-7 w-7"
              />
            </div>
          </div>

          {topMatches.length ? (
            <Swiper
              modules={[Autoplay]}
              className={isTopSwiperDragging ? "cursor-grabbing select-none" : "cursor-grab"}
              autoplay={{ delay: 4200, disableOnInteraction: false }}
              onTouchStart={() => setIsTopSwiperDragging(true)}
              onSliderFirstMove={() => setIsTopSwiperDragging(true)}
              onTouchEnd={() => setIsTopSwiperDragging(false)}
              onTransitionEnd={() => setIsTopSwiperDragging(false)}
              spaceBetween={14}
              breakpoints={{
                320: { slidesPerView: 1.15 },
                640: { slidesPerView: 2.1 },
                960: { slidesPerView: 3.1 },
                1280: { slidesPerView: 4.1 },
              }}
            >
              {topMatches.map((match) => {
                const league = getLeagueName(match.title);
                const cleanTitle = stripLeaguePrefix(match.title, league);
                const [homeTeam, awayTeam] = splitMatchTeams(cleanTitle);
                const primaryStream = match.streams[0] || null;

                return (
                  <SwiperSlide key={`hero-${match.id}`}>
                    <article className="h-full rounded-xl border border-slate-600/40 bg-linear-to-br from-slate-800/85 to-slate-900/90 p-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">{league}</p>
                      </div>
                      <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 text-sm font-semibold">
                        <div className="row-span-2 inline-flex shrink-0 items-center self-center whitespace-nowrap text-slate-300">
                          {match.isLive ? (
                            <span className="inline-flex items-center rounded-full border border-red-400/50 bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200 animate-pulse">
                              Live
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-base leading-none">
                              <FiClock className="h-3.5 w-3.5" />
                              {displayCompactTime(match.time, timeShiftMinutes)}
                            </span>
                          )}
                        </div>

                        <p className="min-w-0 truncate leading-5 text-slate-100">{homeTeam}</p>
                        <p className="min-w-0 truncate leading-5 text-slate-100">{awayTeam || ""}</p>
                      </div>

                      {match.isLive && primaryStream ? (
                        <button
                          type="button"
                          onClick={() =>
                            openStreamModal({
                              matchTitle: cleanTitle,
                              streams: match.streams.map((stream) => ({ name: stream.name, url: stream.url })),
                              eventUrl: match.eventUrl,
                              stats: match.stats,
                            })
                          }
                          className="mt-2 inline-flex cursor-pointer items-center gap-1 rounded-md border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20"
                        >
                          <FiTv />
                          Watch now
                        </button>
                      ) : match.isLive ? (
                        <span className="mt-3 inline-flex rounded-md border border-slate-500/40 px-2 py-1 text-xs text-slate-400">No stream</span>
                      ) : null}
                    </article>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-600/40 bg-slate-900/45 p-6 text-center text-sm text-slate-300">
              Top matches are not available yet.
            </div>
          )}
        </div>
      </section>

      <section className="w-full px-4 py-4 sm:px-6">
        <div className="mx-auto w-full max-w-350">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-600/50 bg-slate-900/70 px-3 text-slate-300 focus-within:border-cyan-300/70">
            <FiSearch aria-hidden="true" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by league or match..."
              className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
            />
          </label>
        </div>
      </section>

      <section className="min-h-0 flex-1 overflow-hidden px-4 pb-4 sm:px-6">
        <div className="mx-auto flex h-full w-full max-w-350 min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-950/40 shadow-[0_18px_50px_rgba(2,6,23,0.38)]">
          <div
            ref={scheduleScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 pt-0 sm:px-3 [scrollbar-color:rgba(34,211,238,0.5)_rgba(15,23,42,0.7)] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-900/70 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-cyan-300/45 [&::-webkit-scrollbar-thumb]:bg-clip-padding hover:[&::-webkit-scrollbar-thumb]:bg-cyan-300/65"
          >
            {isFeedUpdating && !loading ? (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
                <FiInfo className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {isFeedActivelyRunning
                    ? "Updating match feeds right now. Live list may shift for a moment until refresh completes."
                    : isFeedPreparing
                      ? "Match feeds will refresh in less than a minute. Live list may update shortly."
                      : "Feed refresh status changed. Live list may update shortly."}
                </span>
              </div>
            ) : null}

            {loading ? (
              <div className="rounded-2xl border border-slate-700/40 bg-slate-900/40 p-6 text-center text-sm text-slate-300">Loading matches...</div>
            ) : null}

            {error ? (
              <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">Error: {error}</p>
            ) : null}

            {!loading && !error ? (
              visibleSections.length ? (
                <div className="space-y-4">
                  <div className="sticky top-0 z-30 -mx-2 isolate px-2 pb-3 pt-0 sm:-mx-3 sm:px-3">
                    <div className="absolute inset-0 -z-10 bg-[#020611]" />
                    <div className="absolute inset-x-0 -bottom-3 h-6 -z-10 bg-linear-to-b from-[#020611] to-transparent" />
                    <div className="rounded-xl bg-[#040a16] px-3 pt-7 pb-2 shadow-[0_14px_32px_rgba(2,6,23,0.55)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="inline-flex rounded-lg  bg-slate-900/70 p-1 gap-2 shadow-inner">
                            <button
                              type="button"
                              onClick={() => setOnlyLiveInSchedule(false)}
                              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md transition-all duration-200 focus:outline-none ${!onlyLiveInSchedule
                                ? "border border-cyan-300/75 bg-cyan-400/25 text-cyan-100 shadow-[0_8px_20px_rgba(34,211,238,0.22)]"
                                : "border border-transparent text-slate-300 hover:border-cyan-300/70 hover:text-cyan-100"
                                }`}
                            >
                              Today ({todayMatchesCount})
                            </button>
                            <button
                              type="button"
                              onClick={() => setOnlyLiveInSchedule(true)}
                              className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-wide rounded-md transition-all duration-200 focus:outline-none ml-1 flex items-center gap-1.5 ${onlyLiveInSchedule
                                ? "border border-red-300/70 bg-red-500/25 text-red-100 shadow-[0_8px_22px_rgba(239,68,68,0.28)]"
                                : "border border-transparent text-red-200 hover:border-red-300/70 hover:text-red-100"
                                }`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                              Live {selectedDayStats.live > 0 ? `(${selectedDayStats.live})` : ""}
                            </button>
                          </div>
                          <TooltipIcon
                            label="Days feed refresh info"
                            message="Days data updates automatically every 15 minutes."
                            align="center"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <TooltipIcon
                            label="Content disclaimer"
                            message="I do not own, host, or control any third-party channels or stream content shown here, and I assume no responsibility for what those sources display."
                            align="right"
                          />

                          {/* Grid/List view removed */}
                        </div>
                      </div>
                    </div>
                  </div>

                  {visibleSections.map((section) => (
                    <section key={section.label} className="space-y-2">
                      <div className="grid gap-2 sm:grid-cols-2">
                        {section.matches.slice(0, renderLimitByDay[section.key] ?? INITIAL_SECTION_RENDER_COUNT).map((match) => {
                          const league = getLeagueName(match.title);
                          const cleanTitle = stripLeaguePrefix(match.title, league);
                          const [homeTeam, awayTeam] = splitMatchTeams(cleanTitle);
                          const primaryStream = match.streams[0] || null;

                          return (
                            <article
                              key={`${section.label}-${match.id}`}
                              className="rounded-xl border border-slate-700/50 bg-linear-to-br from-slate-900/70 to-slate-800/40 p-2.5"
                            >
                              <div className="flex items-start justify-between gap-3">
                                      {/* Footer removed as requested */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-cyan-300">{league}</p>
                                  </div>

                                  <div className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-0.5 text-sm font-semibold">
                                    <div className="row-span-2 inline-flex shrink-0 items-center self-center whitespace-nowrap text-slate-300">
                                      {match.isLive ? (
                                        <span className="inline-flex items-center rounded-full border border-red-400/50 bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-200 animate-pulse">
                                          Live
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-base leading-none">
                                          <FiClock className="h-3.5 w-3.5" />
                                          {displayCompactTime(match.time, timeShiftMinutes)}
                                        </span>
                                      )}
                                    </div>

                                    <p className="min-w-0 truncate leading-5 text-slate-100">{homeTeam}</p>
                                    <p className="min-w-0 truncate leading-5 text-slate-100">{awayTeam || ""}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {match.isLive && primaryStream ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openStreamModal({
                                        matchTitle: cleanTitle,
                                        streams: match.streams.map((stream) => ({ name: stream.name, url: stream.url })),
                                        eventUrl: match.eventUrl,
                                        stats: match.stats,
                                      })
                                    }
                                    className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20"
                                  >
                                    <FiTv />
                                    Watch now
                                  </button>
                                ) : match.isLive ? (
                                  <span className="inline-flex rounded-md border border-slate-500/40 px-2 py-1 text-xs text-slate-400">No stream</span>
                                ) : null}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </section>
                  ))}

                  {isAppendingMatches ? (
                    <div className="flex justify-center py-7">
                      <div className="inline-flex items-center justify-center gap-2 text-xs text-slate-500">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-300" />
                        <span>Loading more matches...</span>
                      </div>
                    </div>
                  ) : null}

                  {hasMoreVisibleMatches ? <div ref={loadMoreSentinelRef} className="h-12 w-full" aria-hidden="true" /> : null}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-700/40 bg-slate-900/40 p-6 text-center text-sm text-slate-300">
                  {onlyLiveInSchedule
                    ? `No live matches for today.`
                    : "No matches for today."}
                </div>
              )
            ) : null}
          </div>
        </div>
      </section>

      {activeStream ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black p-2 sm:p-4"
          onClick={closeStreamModal}
          role="presentation"
        >
          <div
            className="relative flex h-[calc(100dvh-1rem)] w-[min(98vw,1700px)] max-w-none flex-col overflow-hidden rounded-xl bg-black shadow-2xl sm:h-[calc(100dvh-2rem)] sm:w-[min(96vw,1700px)]"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label={`Player for ${activeStream.name}`}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-black/70 px-3 py-2">
              <div className="flex min-w-0 items-center gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">{activeStream.matchTitle}</p>
                  <p className="truncate text-[11px] text-slate-300">
                    {activeStream.name}
                    {resolvedStream?.mediaUrl && !forceIframe ? " • video" : null}
                  </p>
                </div>

                <div className="inline-flex shrink-0 rounded-md border border-slate-700/80 bg-slate-900/70 p-0.5">
                  <button
                    type="button"
                    onClick={() => setModalTab("player")}
                    className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-semibold ${modalTab === "player" ? "bg-cyan-400/25 text-cyan-100" : "text-slate-300 hover:text-cyan-100"
                      }`}
                  >
                    Player
                  </button>
                  {/* <button
                    type="button"
                    onClick={() => setModalTab("stats")}
                    className={`cursor-pointer rounded px-2 py-0.5 text-[11px] font-semibold ${modalTab === "stats" ? "bg-cyan-400/25 text-cyan-100" : "text-slate-300 hover:text-cyan-100"
                      }`}
                  >
                    Stats
                  </button> */}
                </div>
              </div>

              <button
                type="button"
                onClick={closeStreamModal}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-red-300/80 bg-red-500/30 px-2 py-1 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(239,68,68,0.3)] hover:border-red-200 hover:bg-red-500/45"
              >
                <FiX />
                Close
              </button>
            </div>

            {modalChannels.length > 1 ? (
              <div className="min-h-0 flex-1 overflow-hidden">
                <div className="grid h-full grid-cols-1 md:grid-cols-[280px_minmax(0,1fr)]">
                  <aside className="border-b border-white/10 bg-slate-950/80 md:border-r md:border-b-0">
                    <div className="border-b border-white/10 px-3 py-2 text-[11px] uppercase tracking-wide text-slate-400">
                      Channels ({modalChannels.length})
                    </div>
                    <div className="max-h-[32vh] overflow-y-auto p-2 md:h-full md:max-h-none">
                      <div className="space-y-2">
                        {modalChannels.map((channel, index) => (
                          <button
                            key={`${channel.url}-${index}`}
                            type="button"
                            onClick={() => {
                              setSelectedModalChannelIndex(index);
                              startPlayerLoading();
                              setActiveStream({
                                name: channel.name,
                                url: channel.url,
                                matchTitle: activeStream.matchTitle,
                                eventUrl: activeStream.eventUrl,
                                stats: activeStream.stats,
                              });
                            }}
                            className={`w-full cursor-pointer rounded-md border px-3 py-2 text-left text-xs transition ${index === selectedModalChannelIndex
                              ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                              : "border-slate-700/70 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60"
                              }`}
                          >
                            {channel.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </aside>

                  <div className="relative min-h-0 bg-black">
                    {modalTab === "player" ? (
                      resolvedStream?.mediaUrl && !forceIframe ? (
                        <video
                          src={resolvedStream.mediaUrl}
                          className="h-full w-full bg-black"
                          controls
                          autoPlay
                          playsInline
                          onLoadedData={completePlayerLoading}
                          onCanPlay={completePlayerLoading}
                          onError={() => setForceIframe(true)}
                        />
                      ) : (
                        <iframe
                          key={resolvedStream?.playerUrl ?? activeStream.url}
                          src={resolvedStream?.playerUrl ?? activeStream.url}
                          title={activeStream.name}
                          className="h-full w-full bg-black"
                          onLoad={completePlayerLoading}
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          allowFullScreen
                        />
                      )
                    ) : (
                      <div className="h-full overflow-y-auto bg-slate-950/95 p-4 text-slate-100">
                        <p className="text-sm font-bold uppercase tracking-wide text-cyan-200">Match Stats</p>
                        <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/70 p-3">
                          <p className="truncate text-sm font-semibold">{modalTeams[0]}</p>
                          <p className="mt-1 truncate text-sm font-semibold">{modalTeams[1] || "-"}</p>
                        </div>
                        <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/60 p-3 text-sm">
                          <p className="text-xs uppercase tracking-wide text-slate-400">Head to Head</p>
                          <p className="mt-1 font-semibold text-cyan-200">{activeStream.stats?.h2hRecord || "N/A"}</p>
                          <p className="mt-1 text-xs text-slate-300">{activeStream.stats?.h2hContext || "No additional context"}</p>
                        </div>
                        {activeStream.eventUrl ? (
                          <a
                            href={activeStream.eventUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center rounded-md border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20"
                          >
                            Open match page
                          </a>
                        ) : null}
                      </div>
                    )}

                    {modalTab === "player" && (resolving || playerLoading) ? (
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
                        <div className="flex flex-col items-center gap-3">
                          <span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                          <p className="text-xs text-slate-200">Loading stream...</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative min-h-0 flex-1 bg-black">
                {modalTab === "player" ? (
                  resolvedStream?.mediaUrl && !forceIframe ? (
                    <video
                      src={resolvedStream.mediaUrl}
                      className="h-full w-full bg-black"
                      controls
                      autoPlay
                      playsInline
                      onLoadedData={completePlayerLoading}
                      onCanPlay={completePlayerLoading}
                      onError={() => setForceIframe(true)}
                    />
                  ) : (
                    <iframe
                      key={resolvedStream?.playerUrl ?? activeStream.url}
                      src={resolvedStream?.playerUrl ?? activeStream.url}
                      title={activeStream.name}
                      className="h-full w-full bg-black"
                      onLoad={completePlayerLoading}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  )
                ) : (
                  <div className="h-full overflow-y-auto bg-slate-950/95 p-4 text-slate-100">
                    <p className="text-sm font-bold uppercase tracking-wide text-cyan-200">Match Stats</p>
                    <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/70 p-3">
                      <p className="truncate text-sm font-semibold">{modalTeams[0]}</p>
                      <p className="mt-1 truncate text-sm font-semibold">{modalTeams[1] || "-"}</p>
                    </div>
                    <div className="mt-3 rounded-lg border border-slate-700/70 bg-slate-900/60 p-3 text-sm">
                      <p className="text-xs uppercase tracking-wide text-slate-400">Head to Head</p>
                      <p className="mt-1 font-semibold text-cyan-200">{activeStream.stats?.h2hRecord || "N/A"}</p>
                      <p className="mt-1 text-xs text-slate-300">{activeStream.stats?.h2hContext || "No additional context"}</p>
                    </div>
                    {activeStream.eventUrl ? (
                      <a
                        href={activeStream.eventUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center rounded-md border border-cyan-300/40 bg-cyan-400/10 px-2 py-1 text-xs font-semibold text-cyan-200 hover:bg-cyan-300/20"
                      >
                        Open match page
                      </a>
                    ) : null}
                  </div>
                )}

                {modalTab === "player" && (resolving || playerLoading) ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black">
                    <div className="flex flex-col items-center gap-3">
                      <span className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-300/30 border-t-cyan-300" />
                      <p className="text-xs text-slate-200">Loading stream...</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

          </div>
        </div>
      ) : null}
    </main>
  );
}
