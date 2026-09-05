import React, { useState } from "react";
import { StreamModal } from "./StreamModal";

interface Stream {
  id: number;
  label: string;
  url: string;
  language?: string | null;
  bitrate?: string | null;
  healthStatus?: "healthy" | "failed" | "unknown";
  healthCheckedAt?: string;
  healthHttpStatus?: number;
  healthError?: string;
}

interface HeadToHead {
  homeTeam?: string;
  awayTeam?: string;
  matches?: Array<{
    date: string;
    competition: string;
    homeTeam: string;
    awayTeam: string;
    score: string;
    result: "W" | "D" | "L";
    winner: "home" | "away" | "draw";
  }>;
  form?: {
    home?: TeamForm;
    away?: TeamForm;
  } | null;
}

interface TeamForm {
  matches?: Array<{
    date: string;
    competition: string;
    opponent: string;
    score: string;
    result: "W" | "D" | "L";
  }>;
  summary?: { W: number; D: number; L: number };
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
  isEnded?: boolean;
  streams?: Stream[];
  headToHead?: HeadToHead | null;
  isDarkTheme?: boolean;
}

export const GameCard: React.FC<GameCardProps> = ({
  title,
  flagUrl,
  homeLogoUrl,
  awayLogoUrl,
  timeLabel,
  streamCount,
  isLive,
  isEnded = false,
  streams = [],
  headToHead = null,
  isDarkTheme = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<"streams" | "h2h" | "form">("streams");
  const [showStreamModal, setShowStreamModal] = useState(false);
  const [initialStream, setInitialStream] = useState<Stream | null>(null);
  const hasStreams = streamCount > 0;
  const canWatchStreams = hasStreams && !isEnded;
  const h2hMatches = headToHead?.matches || [];
  const hasForm = Boolean(headToHead?.form?.home?.matches?.length || headToHead?.form?.away?.matches?.length);
  const canExpand = canWatchStreams || h2hMatches.length > 0 || hasForm;
  const visibleTab = activeTab === "streams" && !canWatchStreams
    ? h2hMatches.length > 0 ? "h2h" : "form"
    : activeTab;
  const [homeTeamName, awayTeamName] = title
    .split(/\s+[–-]\s+/)
    .map((item) => item.trim());

  const resolvedHome = homeTeamName || title;
  const resolvedAway = awayTeamName || null;

  const formSummary = h2hMatches.reduce(
    (summary, meeting) => ({ ...summary, [meeting.result]: summary[meeting.result] + 1 }),
    { W: 0, D: 0, L: 0 },
  );

  const getFormInsight = (team: string, teamForm?: TeamForm) => {
    const matches = (teamForm?.matches || []).slice(0, 5);
    const results = matches.map((match) => match.result);
    if (matches.length === 0) return null;

    const wins = results.filter((result) => result === "W").length;
    const draws = results.filter((result) => result === "D").length;
    const losses = results.filter((result) => result === "L").length;
    const goalsFor = matches.reduce((total, match) => total + Number(match.score.split(":")[0] || 0), 0);
    const goalsAgainst = matches.reduce((total, match) => total + Number(match.score.split(":")[1] || 0), 0);
    const latest = matches[0];
    const [latestFor, latestAgainst] = latest.score.split(":").map(Number);
    const latestOpponent = latest.opponent;
    const scoredMatches = matches.map((match) => {
      const [scored, conceded] = match.score.split(":").map(Number);
      return { ...match, scored, conceded, difference: scored - conceded };
    });
    const biggestWin = scoredMatches
      .filter((match) => match.result === "W")
      .sort((left, right) => right.difference - left.difference || right.scored - left.scored)[0];
    const biggestLoss = scoredMatches
      .filter((match) => match.result === "L")
      .sort((left, right) => left.difference - right.difference || right.conceded - left.conceded)[0];
    const cleanSheets = scoredMatches.filter((match) => match.conceded === 0).slice(0, 3);
    const highConcedingMatches = scoredMatches.filter((match) => match.conceded >= 3).slice(0, 3);

    let streak = 1;
    while (streak < results.length && results[streak] === results[0]) streak += 1;
    const unbeaten = results.findIndex((result) => result === "L");
    const unbeatenCount = unbeaten === -1 ? results.length : unbeaten;
    const sentences = [`${team} has recorded ${wins} wins, ${draws} draws and ${losses} losses in the last ${matches.length} matches, scoring ${goalsFor} and conceding ${goalsAgainst}.`];

    if (results[0] === "W" && streak >= 2) sentences.push(`${team} is currently on a ${streak}-match winning run.`);
    if (results[0] === "L" && streak >= 2) sentences.push(`${team} has lost the last ${streak} matches and will be looking to stop that run.`);
    if (unbeatenCount >= 3 && results[0] !== "W") sentences.push(`${team} is unbeaten in ${unbeatenCount} consecutive matches.`);

    sentences.push(`The latest result was a ${latestFor}:${latestAgainst} ${latest.result === "W" ? "win" : latest.result === "D" ? "draw" : "loss"} against ${latestOpponent}.`);

    if (biggestWin) {
      sentences.push(`The biggest win in this run was ${biggestWin.scored}:${biggestWin.conceded} against ${biggestWin.opponent}.`);
    }
    if (cleanSheets.length > 0) {
      sentences.push(`Clean sheets came against ${cleanSheets.map((match) => `${match.opponent} (${match.scored}:${match.conceded})`).join(", ")}.`);
    }
    if (highConcedingMatches.length > 0) {
      sentences.push(`The team conceded 3 or more goals against ${highConcedingMatches.map((match) => `${match.opponent} (${match.scored}:${match.conceded})`).join(", ")}.`);
    } else if (biggestLoss) {
      sentences.push(`The heaviest defeat was ${biggestLoss.scored}:${biggestLoss.conceded} against ${biggestLoss.opponent}.`);
    }

    return sentences.join(" ");
  };

  const renderFormInsight = (insight: string) => {
    const teamNames = [resolvedHome, resolvedAway].filter(Boolean) as string[];
    if (teamNames.length === 0) return insight;

    const teamPattern = new RegExp(`(${teamNames.map((team) => team.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g");
    return insight.split(teamPattern).map((part, index) =>
      teamNames.includes(part)
        ? <strong key={`${part}-${index}`} className="font-extrabold">{part}</strong>
        : part,
    );
  };

  const startWatchSession = (stream: Stream) => {
    setInitialStream(stream);
    setShowStreamModal(true);
  };

  const toggleExpanded = () => {
    if (canExpand) setIsExpanded((expanded) => !expanded);
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

  const renderHealthDot = (stream: Stream) => {
    const isHealthy = stream.healthStatus === "healthy";
    const label = isHealthy ? "Available stream" : "Unavailable stream";

    return <span
      title={label}
      aria-label={label}
      className={`inline-flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full ${isHealthy ? "bg-emerald-500" : "bg-rose-500"}`}
    />;
  };

  return (
    <article
      className={`group rounded-lg border border-l-4 px-2.5 py-2 shadow-sm transition-shadow duration-200 hover:shadow-md sm:px-3 ${
        isDarkTheme
          ? isEnded ? "border-white/10 bg-[#171717]" : "border-white/10 bg-[#1b1b1b]"
          : isEnded ? "border-slate-300 bg-slate-100" : "border-black/10 bg-white"} ${
        isEnded ? (isDarkTheme ? "border-l-slate-700" : "border-l-slate-400") : isLive ? "border-l-rose-500" : isDarkTheme ? "border-l-slate-500" : "border-l-black"
      }`}
    >
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded={isExpanded}
        disabled={!canExpand}
        className={`flex w-full flex-col gap-2 text-left lg:flex-row lg:items-center lg:justify-between ${canExpand ? "cursor-pointer" : "cursor-default"}`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {(isLive || isEnded || timeLabel) && (
            <span className={`inline-flex h-10 w-20 shrink-0 items-center justify-center gap-1.5 rounded-md border px-2 text-sm font-black tabular-nums ${isLive ? "border-rose-500/30 bg-rose-500 text-white" : isDarkTheme ? "border-white/10 bg-[#252525] text-white" : "border-black/10 bg-[#f2f1ed] text-slate-950"}`}>
              {isEnded ? (
                <span className="text-xs font-black tracking-wide">ENDED</span>
              ) : isLive ? (
                <span className="flex flex-col items-center gap-0.5 leading-none">
                  <span className="inline-flex items-center gap-1 text-sm font-black tracking-wide">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" aria-hidden="true" />
                    LIVE
                  </span>
                </span>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 7v5l3 2" /></svg>
                  {timeLabel}
                </>
              )}
            </span>
          )}
          <div className={`h-10 w-px shrink-0 ${isDarkTheme ? "bg-white/10" : "bg-black/10"}`} />
          <div className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-center gap-2">
              {renderTeamVisual(homeLogoUrl, resolvedHome)}
              <div className="min-w-0">
                <span className={`block text-[8px] font-bold uppercase tracking-[0.1em] ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Home</span>
                <h3 className={`truncate text-sm font-extrabold sm:text-base ${isDarkTheme ? "text-white" : "text-slate-950"}`}>{resolvedHome}</h3>
              </div>
            </div>
            {resolvedAway && <div className="flex min-w-0 items-center gap-2">
              {renderTeamVisual(awayLogoUrl, resolvedAway)}
              <div className="min-w-0">
                <span className={`block text-[8px] font-bold uppercase tracking-[0.1em] ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>Away</span>
                <h3 className={`truncate text-sm font-extrabold sm:text-base ${isDarkTheme ? "text-white" : "text-slate-950"}`}>{resolvedAway}</h3>
              </div>
            </div>}
          </div>
        </div>
        <div className={`flex flex-wrap items-center gap-2 border-t pt-2 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0 ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
          <span className={`text-xs font-bold ${canWatchStreams ? "text-emerald-700" : isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
            <span className="inline-flex items-center gap-1.5"><svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path strokeLinecap="round" d="M8 21h8M12 19v2M8 9h.01M12 9h.01M16 9h.01" /></svg>{isEnded ? "Stream over" : hasStreams ? `${streamCount} stream${streamCount !== 1 ? "s" : ""}` : "No stream"}</span>
          </span>
          <span className="inline-flex h-8 w-8 items-center justify-center text-slate-600" aria-hidden="true">
            <svg className={`h-5 w-5 transition-transform ${isExpanded ? "rotate-180" : ""} ${isDarkTheme ? "text-slate-300" : "text-slate-600"}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </span>
        </div>
      </button>

      {isExpanded && canExpand && (
        <div className="mt-2 pt-1">
          <div className={`mb-2 flex gap-1 border-b ${isDarkTheme ? "border-white/10" : "border-black/10"}`}>
            {canWatchStreams && <button type="button" onClick={() => setActiveTab("streams")} className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-black ${visibleTab === "streams" ? "border-emerald-500 text-emerald-600" : "border-transparent text-slate-400"}`}>Streams ({streams.length})</button>}
            {h2hMatches.length > 0 && <button type="button" onClick={() => setActiveTab("h2h")} className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-black ${visibleTab === "h2h" ? "border-blue-500 text-blue-600" : "border-transparent text-slate-400"}`}>H2H ({h2hMatches.length})</button>}
            {hasForm && <button type="button" onClick={() => setActiveTab("form")} className={`cursor-pointer border-b-2 px-3 py-2 text-xs font-black ${visibleTab === "form" ? "border-amber-500 text-amber-600" : "border-transparent text-slate-400"}`}>Form</button>}
          </div>
          {visibleTab === "streams" && canWatchStreams && <div className={`mb-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-semibold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`} aria-label="Stream status legend">
            <span className="font-black uppercase tracking-[0.08em]">Stream status</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />Available</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-rose-500" aria-hidden="true" />Unavailable</span>
          </div>}
          {visibleTab === "streams" && canWatchStreams && <div className="grid gap-2 sm:grid-cols-2">
            {streams.map((stream) => <button key={stream.id} type="button" onClick={() => startWatchSession(stream)} className={`flex cursor-pointer items-center justify-between rounded-md border px-3 py-2 text-left transition-colors ${isDarkTheme ? "border-white/10 bg-[#252525] hover:border-white/40 hover:bg-[#303030]" : "border-black/10 bg-[#f2f1ed] hover:border-black hover:bg-white"}`}>
              <span className="flex min-w-0 items-center gap-2 leading-none">{renderHealthDot(stream)}<span className={`truncate text-sm font-bold ${isDarkTheme ? "text-white" : "text-slate-800"}`}>{stream.label}</span></span>
              <span className={`ml-3 shrink-0 text-xs font-bold ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Watch →</span>
            </button>)}
          </div>}
          {visibleTab === "h2h" && h2hMatches.length > 0 && <div>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center justify-center bg-emerald-100 px-2 py-1 text-[10px] font-black text-emerald-700">{resolvedHome} wins {formSummary.W}</span>
              <span className="inline-flex items-center justify-center bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">Draws {formSummary.D}</span>
              <span className="inline-flex items-center justify-center bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-700">{resolvedHome} losses {formSummary.L}</span>
            </div>
            <p className={`mb-2 text-[10px] font-medium ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>
              H = home · A = away · Green = winner
            </p>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {h2hMatches.slice(0, 5).map((meeting) => <div key={`${meeting.date}-${meeting.score}-${meeting.homeTeam}`} className={`grid grid-cols-[3.5rem_1fr_auto] items-center gap-2 px-2 py-1.5 text-xs ${isDarkTheme ? "bg-[#252525] text-slate-200" : "bg-[#f2f1ed] text-slate-700"}`}>
                <span className="text-slate-400">{meeting.date}</span><span className="flex min-w-0 items-center gap-1.5 truncate font-bold"><span title="Historical home team" className={`shrink-0 text-[9px] font-black uppercase ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>H</span><span className={`truncate ${meeting.winner === "home" ? "font-bold text-emerald-600" : isDarkTheme ? "font-bold text-slate-400" : "font-bold text-slate-500"}`}>{meeting.homeTeam}</span><span className={isDarkTheme ? "text-slate-500" : "text-slate-400"}>-</span><span title="Historical away team" className={`shrink-0 text-[9px] font-black uppercase ${isDarkTheme ? "text-slate-500" : "text-slate-400"}`}>A</span><span className={`truncate ${meeting.winner === "away" ? "font-bold text-emerald-600" : isDarkTheme ? "font-bold text-slate-400" : "font-bold text-slate-500"}`}>{meeting.awayTeam}</span></span><span className={`font-black ${meeting.winner === "draw" ? "text-slate-500" : "text-emerald-600"}`}>{meeting.score} {meeting.winner === "draw" ? "X" : "✓"}</span>
              </div>)}
            </div>
          </div>}
          {visibleTab === "form" && hasForm && headToHead?.form && <div>
            <div className={`mb-4 grid gap-2 rounded-md border-l-2 px-3 py-2 ${isDarkTheme ? "border-amber-400 bg-amber-400/10" : "border-amber-500 bg-amber-50"}`}>
              {[getFormInsight(resolvedHome, headToHead.form.home), getFormInsight(resolvedAway || "Away team", headToHead.form.away)].filter(Boolean).map((insight) => <p key={insight} className={`text-xs leading-relaxed ${isDarkTheme ? "text-slate-200" : "text-slate-700"}`}>{renderFormInsight(insight as string)}</p>)}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {([[resolvedHome, headToHead.form.home], [resolvedAway, headToHead.form.away]] as Array<[string | null, TeamForm | undefined]>).map(([team, teamForm]) => team && teamForm ? (
                <div key={team} className={`rounded-md border p-3 shadow-sm ${isDarkTheme ? "border-white/10 bg-[#252525]" : "border-black/10 bg-white"}`}>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {renderTeamVisual(team === resolvedHome ? homeLogoUrl : awayLogoUrl, team)}
                      <h4 className={`truncate text-base font-extrabold ${isDarkTheme ? "text-white" : "text-slate-950"}`}>{team}</h4>
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] ${isDarkTheme ? "text-slate-400" : "text-slate-500"}`}>Last 5</span>
                  </div>
                  <div className="mb-3 flex gap-1.5">
                    {(["W", "D", "L"] as const).map((result) => <span key={result} className={`rounded-sm px-2 py-1 text-[10px] font-black ${result === "W" ? "bg-emerald-100 text-emerald-700" : result === "L" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>{result} {teamForm.summary?.[result] || 0}</span>)}
                  </div>
                  <div className="flex items-center gap-1.5">{teamForm.matches?.slice(0, 5).map((formMatch) => <span key={`${formMatch.date}-${formMatch.opponent}`} title={`${formMatch.date}: ${formMatch.opponent} ${formMatch.score}`} className={`inline-flex h-6 w-6 items-center justify-center rounded-sm text-[10px] font-black ${formMatch.result === "W" ? "bg-emerald-500 text-white" : formMatch.result === "L" ? "bg-rose-500 text-white" : "bg-slate-300 text-slate-700"}`}>{formMatch.result}</span>)}</div>
                </div>
              ) : null)}
            </div>
          </div>}
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
        initialStream={initialStream}
        isDarkTheme={isDarkTheme}
        onClose={() => {
          setShowStreamModal(false);
          setInitialStream(null);
        }}
      />
    </article>
  );
};
