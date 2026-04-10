"use client";

import { useCallback, useEffect, useState } from "react";
import { FiActivity, FiAlertCircle, FiCheckCircle, FiClock, FiDatabase, FiRefreshCw, FiXCircle } from "react-icons/fi";

type RunEntry = {
  at: string;
  count: number;
  durationMs: number | null;
  outputBytes: number | null;
};

type JobStatus = {
  preparing: boolean;
  running: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastCount: number | null;
  lastDurationMs: number | null;
  lastOutputBytes: number | null;
  totalRuns: number;
  recentRuns: RunEntry[];
};

type FeedFile = {
  key: string;
  label: string;
  file: string;
  bytes: number | null;
  modifiedAt: string | null;
  count: number | null;
};

type AdminStats = {
  serverTime: string;
  summary: {
    totalMatches: number;
    totalBytes: number;
    totalRuns: number;
  };
  jobs: Record<string, JobStatus>;
  feedFiles: FeedFile[];
};

const JOB_LABELS: Record<string, string> = {
  top: "Top Matches",
  days: "Day Sections",
  main: "Main Feed",
};

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${ms}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return `${m}m ${rem}s`;
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const diffMs = Date.now() - new Date(iso).getTime();
  const s = Math.round(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function StatusBadge({ job }: { job: JobStatus }) {
  if (job.running) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/50 bg-cyan-500/15 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
        Running
      </span>
    );
  }
  if (job.lastError) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-rose-400/50 bg-rose-500/15 px-2 py-0.5 text-[11px] font-semibold text-rose-200">
        <FiXCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  if (job.lastSuccessAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-200">
        <FiCheckCircle className="h-3 w-3" />
        OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-600/50 bg-slate-800/50 px-2 py-0.5 text-[11px] font-semibold text-slate-400">
      Idle
    </span>
  );
}

export default function AdminPanel() {
  const [data, setData] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null);
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/stats", { cache: "no-store" });
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      const json = (await res.json()) as AdminStats;
      setData(json);
      setLastRefreshed(new Date().toLocaleTimeString("en-GB"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 30_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  const toggleHistory = (key: string) =>
    setExpandedHistory((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#1e293b_0%,#0b1220_35%,#05070e_100%)] px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto w-full max-w-350">

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Scraper Admin Panel</h1>
            {lastRefreshed ? (
              <p className="mt-0.5 text-xs text-slate-500">Last refreshed: {lastRefreshed}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-300/50 hover:text-cyan-100 disabled:opacity-40"
          >
            <FiRefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-8 text-center text-sm text-slate-400">
            Loading stats...
          </div>
        ) : null}

        {data ? (
          <>
            {/* Summary row */}
            <div className="mb-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <FiActivity className="h-3.5 w-3.5" />
                  Total Matches
                </div>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  {data.summary.totalMatches.toLocaleString()}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">across all active feeds</p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <FiDatabase className="h-3.5 w-3.5" />
                  Output Size
                </div>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  {formatBytes(data.summary.totalBytes)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">total feed file size on disk</p>
              </div>

              <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                  <FiClock className="h-3.5 w-3.5" />
                  Total Runs
                </div>
                <p className="mt-1.5 text-2xl font-bold text-white">
                  {data.summary.totalRuns.toLocaleString()}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">successful scrape runs</p>
              </div>
            </div>

            {/* Feed files */}
            <div className="mb-6">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Feed Files</h2>
              <div className="overflow-hidden rounded-xl border border-slate-800/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800/60 bg-slate-950/60">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">File</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Matches</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Size</th>
                      <th className="hidden px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.feedFiles.map((f, i) => (
                      <tr
                        key={f.key}
                        className={`border-b border-slate-800/40 ${i % 2 === 0 ? "bg-slate-900/30" : "bg-slate-950/30"}`}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-200">{f.label}</td>
                        <td className="px-4 py-2.5 text-right text-slate-300">
                          {f.count !== null ? f.count.toLocaleString() : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                          {formatBytes(f.bytes)}
                        </td>
                        <td className="hidden px-4 py-2.5 text-right text-slate-500 sm:table-cell">
                          {f.modifiedAt ? formatRelative(f.modifiedAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Job cards */}
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-500">Scrape Jobs</h2>
            <div className="space-y-4">
              {(["top", "days", "main"] as const).map((key) => {
                const job: JobStatus | undefined = data.jobs[key];
                if (!job) return null;
                const recentRuns = Array.isArray(job.recentRuns) ? job.recentRuns : [];
                const isExpanded = expandedHistory[key];

                return (
                  <div key={key} className="rounded-2xl border border-slate-800/60 bg-slate-900/50">
                    {/* Job header */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-white">{JOB_LABELS[key] ?? key}</p>
                        <StatusBadge job={job} />
                      </div>
                      {recentRuns.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => toggleHistory(key)}
                          className="cursor-pointer text-[11px] text-slate-500 transition hover:text-cyan-300"
                        >
                          {isExpanded ? "Hide history" : `Show history (${recentRuns.length})`}
                        </button>
                      ) : null}
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-px bg-slate-800/30 sm:grid-cols-4">
                      {[
                        { label: "Last matches", value: job.lastCount?.toLocaleString() ?? "—" },
                        { label: "Last duration", value: formatDuration(job.lastDurationMs) },
                        { label: "Output size", value: formatBytes(job.lastOutputBytes) },
                        { label: "Total runs", value: job.totalRuns?.toLocaleString() ?? "0" },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-slate-900/50 px-4 py-3">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-0.5 font-bold text-slate-100">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Timestamps */}
                    <div className="grid grid-cols-2 gap-px bg-slate-800/20 sm:grid-cols-3">
                      {[
                        { label: "Last started", value: formatTimestamp(job.startedAt), relative: formatRelative(job.startedAt) },
                        { label: "Last success", value: formatTimestamp(job.lastSuccessAt), relative: formatRelative(job.lastSuccessAt) },
                        { label: "Last finished", value: formatTimestamp(job.finishedAt), relative: formatRelative(job.finishedAt) },
                      ].map(({ label, value, relative }) => (
                        <div key={label} className="bg-slate-900/30 px-4 py-2.5">
                          <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
                          <p className="mt-0.5 text-xs text-slate-300">{value}</p>
                          <p className="text-[11px] text-slate-500">{relative}</p>
                        </div>
                      ))}
                    </div>

                    {/* Error */}
                    {job.lastError ? (
                      <div className="flex items-start gap-2 border-t border-slate-800/60 bg-rose-950/20 px-4 py-3 text-xs text-rose-300">
                        <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                        <span className="break-all font-mono">{job.lastError}</span>
                      </div>
                    ) : null}

                    {/* Recent runs history */}
                    {isExpanded && recentRuns.length > 0 ? (
                      <div className="border-t border-slate-800/60">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-slate-950/60">
                              <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">#</th>
                              <th className="px-4 py-2 text-left font-semibold uppercase tracking-wide text-slate-500">Time</th>
                              <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Matches</th>
                              <th className="px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-500">Duration</th>
                              <th className="hidden px-4 py-2 text-right font-semibold uppercase tracking-wide text-slate-500 sm:table-cell">Output</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recentRuns.map((run, i) => (
                              <tr
                                key={run.at}
                                className={`border-t border-slate-800/30 ${i % 2 === 0 ? "bg-slate-900/25" : "bg-slate-950/25"}`}
                              >
                                <td className="px-4 py-1.5 text-slate-600">{i + 1}</td>
                                <td className="px-4 py-1.5 text-slate-400">
                                  {formatTimestamp(run.at)}
                                  <span className="ml-2 text-slate-600">{formatRelative(run.at)}</span>
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-slate-300">
                                  {run.count.toLocaleString()}
                                </td>
                                <td className="px-4 py-1.5 text-right font-mono text-slate-300">
                                  {formatDuration(run.durationMs)}
                                </td>
                                <td className="hidden px-4 py-1.5 text-right font-mono text-slate-500 sm:table-cell">
                                  {formatBytes(run.outputBytes)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-center text-[11px] text-slate-600">
              Auto-refreshes every 30s · Server time: {new Date(data.serverTime).toLocaleTimeString("en-GB")}
            </p>
          </>
        ) : null}
      </div>
    </main>
  );
}
