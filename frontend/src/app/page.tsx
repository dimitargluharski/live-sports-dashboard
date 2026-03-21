"use client";

import { useMemo, useState } from "react";
import { FiActivity, FiRefreshCcw, FiSearch, FiServer } from "react-icons/fi";

const SPORT_FILTERS = ["All", "NBA", "Tennis", "Rugby"] as const;

type SportFilter = (typeof SPORT_FILTERS)[number];

type ScrapeItem = {
  id: string;
  title: string;
  subtitle: string;
  details: string;
  sport?: string;
};

type ScrapeResponse = {
  sourceUrl: string;
  fetchedAt: string;
  count: number;
  items: ScrapeItem[];
  clickSelectorUsed: string | null;
};

const detectSport = (item: ScrapeItem): Exclude<SportFilter, "All"> | null => {
  const value = `${item.sport ?? ""} ${item.title} ${item.subtitle} ${item.details}`.toLowerCase();

  if (value.includes("nba") || value.includes("basketball")) {
    return "NBA";
  }

  if (value.includes("tennis") || value.includes("atp") || value.includes("wta")) {
    return "Tennis";
  }

  if (value.includes("rugby") || value.includes("super rugby") || value.includes("six nations")) {
    return "Rugby";
  }

  return null;
};

const getDisplayTitle = (title: string): string => {
  const value = title.trim();
  const separatorIndex = value.indexOf(":");

  if (separatorIndex <= 0) {
    return value || "Untitled";
  }

  return value.slice(separatorIndex + 1).trim() || value;
};

export default function Home() {
  const [targetUrl, setTargetUrl] = useState("https://example.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScrapeResponse | null>(null);
  const [activeSportFilter, setActiveSportFilter] = useState<SportFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchedAt = useMemo(() => {
    if (!data?.fetchedAt) {
      return "-";
    }

    return new Date(data.fetchedAt).toLocaleString();
  }, [data?.fetchedAt]);

  const itemsBySport = useMemo(
    () =>
      (data?.items ?? []).map((item) => ({
        item,
        sport: detectSport(item),
      })),
    [data?.items],
  );

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return itemsBySport
      .filter(({ sport, item }) => {
        const bySport = activeSportFilter === "All" || sport === activeSportFilter;
        if (!bySport) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const searchable = `${item.title} ${item.subtitle} ${item.details}`.toLowerCase();
        return searchable.includes(normalizedQuery);
      })
      .map(({ item }) => item);
  }, [activeSportFilter, itemsBySport, searchQuery]);

  const runScrape = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/scrape?url=${encodeURIComponent(targetUrl)}`);
      const payload = (await response.json()) as ScrapeResponse | { error?: string };

      if (!response.ok) {
        const errorMessage =
          typeof payload === "object" && payload !== null && "error" in payload
            ? payload.error
            : undefined;
        throw new Error(errorMessage ?? "Scrape request failed");
      }

      setData(payload as ScrapeResponse);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unexpected error";
      setError(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-4 py-8 sm:p-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm backdrop-blur-md">
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-semibold tracking-[0.18em] text-slate-600 uppercase">
          <FiServer />
          Next.js Full-Stack Scraper
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Live Sports Dashboard (Learning Edition)
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-slate-600 sm:text-base">
          Enter a page URL and fetch structured data from the server-side scraper route.
          The API uses Playwright for dynamic page loading/clicking and Cheerio for parsing.
        </p>
      </section>

      <section className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-[1fr_auto] sm:p-6">
        <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
          Source URL
          <input
            value={targetUrl}
            onChange={(event) => setTargetUrl(event.target.value)}
            placeholder="https://example.com"
            className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-500/20"
          />
        </label>

        <button
          type="button"
          onClick={runScrape}
          disabled={loading}
          className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <FiRefreshCcw className={loading ? "animate-spin" : ""} />
          {loading ? "Fetching..." : "Run Scrape"}
        </button>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      <section className="rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1">
            <FiActivity />
            Items: {visibleItems.length}
          </span>
          <span>Fetched at: {fetchedAt}</span>
          {data?.clickSelectorUsed ? <span>Click selector: {data.clickSelectorUsed}</span> : null}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_20rem] sm:items-center">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="mr-1 font-medium text-slate-600">Filters:</span>
            {SPORT_FILTERS.map((filter) => {
              const isActive = filter === activeSportFilter;

              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveSportFilter(filter)}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase transition ${isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                    }`}
                >
                  {filter}
                </button>
              );
            })}
          </div>

          <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 text-slate-500 focus-within:border-slate-500">
            <FiSearch className="shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search by name..."
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>
        </div>

        <div className="grid gap-3">
          {visibleItems.length ? (
            visibleItems.map((item) => {
              const sportLabel = detectSport(item) ?? "Other";
              const displayTitle = getDisplayTitle(item.title || "Untitled");

              return (
                <article
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-slate-300" aria-hidden="true" />

                  <div className="mb-2 flex items-start justify-between gap-3 pl-2">
                    <h2 className="text-base font-semibold text-slate-900">{displayTitle}</h2>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
                      {sportLabel}
                    </span>
                  </div>

                  <p className="pl-2 text-sm font-medium text-slate-700">{item.subtitle || "-"}</p>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                    <p className="font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-600">
                      {item.details || "-"}
                    </p>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              {data?.items?.length
                ? `No ${activeSportFilter} matches in the current results.`
                : 'No scraped data yet. Use a target URL and click "Run Scrape".'}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
