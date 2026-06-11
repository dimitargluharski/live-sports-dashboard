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
  viewMode?: "grid" | "list";
}

export const GameCard: React.FC<GameCardProps> = ({
  id,
  title,
  countryOrLeagueLabel,
  flagUrl,
  homeLogoUrl,
  awayLogoUrl,
  timeLabel,
  streamCount,
  isLive,
  streams = [],
  viewMode = "grid",
}) => {
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
      className={`group rounded-2xl border border-slate-200 border-l-[7px] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
        isLive ? "border-l-rose-500" : "border-l-slate-300"
      } ${viewMode === "list" ? "p-3" : "p-4"}`}
    >
      {viewMode === "list" ? (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              {flagUrl && (
                <img
                  src={flagUrl}
                  alt={countryOrLeagueLabel || "country flag"}
                  className="h-5 w-5 rounded-full border border-slate-200 bg-slate-100 p-0.5 object-contain flex-shrink-0"
                />
              )}
              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500 truncate">
                {countryOrLeagueLabel || "League"}
              </p>
            </div>
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                {timeLabel && (
                  <span className="text-slate-600 font-semibold text-xs flex-shrink-0">
                    {timeLabel}
                  </span>
                )}
                {renderTeamVisual(homeLogoUrl, resolvedHome)}
                <h3 className="line-clamp-1 text-base font-extrabold text-slate-900 truncate">
                  {resolvedHome}
                </h3>
              </div>
              <span className="text-slate-400 text-xs flex-shrink-0">vs</span>
              {resolvedAway && (
                <div className="flex items-center gap-1.5 min-w-0">
                  {renderTeamVisual(awayLogoUrl, resolvedAway)}
                  <h3 className="line-clamp-1 text-base font-extrabold text-slate-900 truncate">
                    {resolvedAway}
                  </h3>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm">
                <span className="h-1 w-1 animate-pulse rounded-full bg-white" />
                Live
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {hasStreams ? (
              <button
                onClick={startWatchSession}
                className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Watch
              </button>
            ) : (
              <span className="text-[11px] font-semibold text-slate-400">
                No stream
              </span>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  {flagUrl && (
                    <img
                      src={flagUrl}
                      alt={countryOrLeagueLabel || "country flag"}
                      className="h-7 w-7 rounded-full border border-slate-200 bg-slate-100 p-0.5 object-contain shadow-sm"
                    />
                  )}
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {countryOrLeagueLabel || "League TBD"}
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 px-1 py-1">
                    {renderTeamVisual(homeLogoUrl, resolvedHome)}
                    <h3 className="line-clamp-1 text-lg font-extrabold leading-tight text-slate-900">
                      {resolvedHome}
                    </h3>
                  </div>

                  {resolvedAway && (
                    <div className="flex items-center gap-2 px-1 py-1">
                      {renderTeamVisual(awayLogoUrl, resolvedAway)}
                      <h3 className="line-clamp-1 text-lg font-extrabold leading-tight text-slate-900">
                        {resolvedAway}
                      </h3>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  Live
                </span>
              )}
            </div>
          </div>

          <div className="mb-3 flex text-xs">
            {timeLabel && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700">
                🕐 {timeLabel}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                hasStreams
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {hasStreams
                ? `${streamCount} stream${streamCount !== 1 ? "s" : ""}`
                : "No streams"}
            </span>

            {hasStreams ? (
              <button
                onClick={startWatchSession}
                className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
              >
                Watch
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                disabled
                className="inline-flex cursor-not-allowed items-center rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-400"
              >
                Unavailable
              </button>
            )}
          </div>
        </>
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
