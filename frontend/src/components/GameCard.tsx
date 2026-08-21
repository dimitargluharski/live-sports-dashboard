import React, { useState } from "react";
import { StreamModal } from "./StreamModal";
import { MatchChatDock } from "./MatchChatDock";

interface Stream {
  id: number;
  label: string;
  url: string;
  language?: string | null;
  bitrate?: string | null;
}

interface GameCardProps {
  id: number;
  title: string;
  countryOrLeagueLabel?: string;
  flagUrl?: string | null;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
  dateLabel?: string;
  timeLabel?: string;
  leagueLabel?: string;
  streamCount: number;
  isLive: boolean;
  streams?: Stream[];
  isDarkTheme?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  id,
  title,
  flagUrl,
  homeLogoUrl,
  awayLogoUrl,
  timeLabel,
  streamCount,
  isLive,
  streams = [],
  isDarkTheme = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [showChatDock, setShowChatDock] = useState(false);
  const [activeRoomId, setActiveRoomId] = useState(() => String(id));
  const hasStreams = streamCount > 0;
  const [homeTeamName, awayTeamName] = title
    .split(/\s+[–-]\s+/)
    .map((item) => item.trim());

  const resolvedHome = homeTeamName || title;
  const resolvedAway = awayTeamName || null;

  const resolveInviteRoomForMatch = () => {
    if (typeof window === "undefined") return null;

    const params = new URLSearchParams(window.location.search);
    const inviteMatch = params.get("inviteMatch");
    const inviteRoom = params.get("inviteRoom");

    if (inviteMatch === String(id) && inviteRoom && inviteRoom.trim()) {
      return inviteRoom.trim();
    }

    return null;
  };

  const createRoomId = () => {
    return `${id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  };

  const joinExistingRoomSession = (room: string) => {
    const normalized = room.trim();
    if (!normalized) return;
    setActiveRoomId(normalized);
    setShowChatDock(true);
  };

  const startWatchSession = () => {
    const inviteRoom = resolveInviteRoomForMatch();
    setActiveRoomId(inviteRoom || createRoomId());
    setShowStreamModal(true);
    setShowChatDock(true);
  };

  const toggleExpanded = () => {
    if (hasStreams) setIsExpanded((expanded) => !expanded);
  };

  const renderTeamVisual = (
    logo: string | null | undefined,
    teamName: string,
  ) => {
    const visualUrl = logo || flagUrl || null;

    if (visualUrl) {
      return (
        <img
          src={visualUrl}
          alt={`${teamName} emblem`}
          className="h-8 w-8 rounded-full border border-slate-200 bg-white p-1 object-contain"
        />
      );
    }

    return (
      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-600">
        {teamName.slice(0, 2).toUpperCase()}
      </span>
    );
  };

  return (
    <article
      className={`group rounded-lg border border-black/10 border-l-4 px-3 py-3 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-4 ${
        isDarkTheme ? "border-white/10 bg-[#1b1b1b]" : "bg-white"} ${
        isLive ? "border-l-rose-500" : "border-l-black"
      }`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        disabled={!hasStreams}
        className="flex w-full flex-col gap-3 text-left lg:flex-row lg:items-center lg:justify-between disabled:cursor-default"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {timeLabel && (
            <span className={`inline-flex w-[4.5rem] shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-sm font-black tabular-nums ${isDarkTheme ? "border-white/10 bg-[#252525] text-white" : "border-black/10 bg-[#f2f1ed] text-slate-950"}`}>
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <path strokeLinecap="round" d="M12 7v5l3 2" />
              </svg>
              {timeLabel}
            </span>
          )}
          <div className={`h-10 w-px shrink-0 ${isDarkTheme ? "bg-white/10" : "bg-black/10"}`} />
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              {renderTeamVisual(homeLogoUrl, resolvedHome)}
              <h3 className={`truncate text-sm font-extrabold sm:text-base ${isDarkTheme ? "text-white" : "text-slate-950"}`}>
                {resolvedHome}
              </h3>
            </div>
            {resolvedAway && (
              <div className="flex min-w-0 items-center gap-2">
                {renderTeamVisual(awayLogoUrl, resolvedAway)}
                <h3 className={`truncate text-sm font-extrabold sm:text-base ${isDarkTheme ? "text-white" : "text-slate-950"}`}>
                  {resolvedAway}
                </h3>
              </div>
            )}
          </div>
          {isLive && (
            <span className="ml-1 inline-flex items-center gap-1 bg-rose-500 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
              <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
              Live
            </span>
          )}
        </div>

        <div className={`flex flex-wrap items-center gap-2 border-t pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0 ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
          <span className={`text-xs font-bold ${hasStreams ? "text-emerald-700" : "text-slate-400"}`}>
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path strokeLinecap="round" d="M8 21h8M12 19v2M8 9h.01M12 9h.01M16 9h.01" />
              </svg>
              {hasStreams ? `${streamCount} stream${streamCount !== 1 ? "s" : ""}` : "No stream"}
            </span>
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center text-slate-600" aria-hidden="true">
            <svg className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""} ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
      </button>

      {isExpanded && hasStreams && (
        <div className={`mt-3 border-t pt-3 ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
          <p className={`mb-2 text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
            Available streams
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {streams.map((stream) => (
              <button
                key={stream.id}
                type="button"
                onClick={startWatchSession}
                className={`flex items-center justify-between border px-3 py-2 text-left transition-colors ${isDarkTheme ? "border-white/10 bg-[#252525] hover:border-white/40 hover:bg-[#303030]" : "border-black/10 bg-[#f2f1ed] hover:border-black hover:bg-white"}`}
              >
                <span className={`truncate text-sm font-bold ${isDarkTheme ? "text-white" : "text-slate-800"}`}>{stream.label}</span>
                <span className={`ml-3 shrink-0 text-xs font-bold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Watch →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <StreamModal
        isOpen={showStreamModal}
        gameTitle={title}
        homeTeamName={resolvedHome}
        awayTeamName={resolvedAway}
        homeTeamVisual={homeLogoUrl || flagUrl || null}
        awayTeamVisual={awayLogoUrl || flagUrl || null}
        streams={streams}
        onClose={() => {
          setShowStreamModal(false);
          setShowChatDock(false);
        }}
      />

      <MatchChatDock
        isOpen={showChatDock}
        roomId={activeRoomId}
        matchId={String(id)}
        title={title}
        onJoinRoom={joinExistingRoomSession}
      />
    </article>
  );
};
