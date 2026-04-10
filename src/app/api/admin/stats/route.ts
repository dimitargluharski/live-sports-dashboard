import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const FEED_FILES = [
  { key: "top", label: "Top Feed", file: "matches-feed-top.json" },
  { key: "days", label: "Days Feed", file: "matches-feed-days.json" },
  { key: "main", label: "Main Feed", file: "matches-feed-main.json" },
];

function readJsonFile(filePath: string) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function getFileStat(filePath: string) {
  try {
    const stat = fs.statSync(filePath);
    return { bytes: stat.size, modifiedAt: stat.mtime.toISOString() };
  } catch {
    return { bytes: null, modifiedAt: null };
  }
}

export async function GET() {
  const publicDir = path.join(process.cwd(), "public");

  const statusPath = path.join(publicDir, "scrape-status.json");
  const status = readJsonFile(statusPath) ?? { jobs: {} };

  const feedFiles = FEED_FILES.map(({ key, label, file }) => {
    const filePath = path.join(publicDir, file);
    const stat = getFileStat(filePath);
    const content = readJsonFile(filePath);
    const count: number = content?.count ?? content?.matches?.length ?? null;
    return { key, label, file, ...stat, count };
  });

  const totalMatches = feedFiles.reduce(
    (sum, f) => sum + (typeof f.count === "number" ? f.count : 0),
    0,
  );

  const totalBytes = feedFiles.reduce(
    (sum, f) => sum + (typeof f.bytes === "number" ? f.bytes : 0),
    0,
  );

  const jobs = status.jobs ?? {};
  const totalRuns = Object.values(jobs).reduce(
    (sum, job: any) => sum + (job?.totalRuns ?? 0),
    0,
  );

  return NextResponse.json({
    serverTime: new Date().toISOString(),
    summary: { totalMatches, totalBytes, totalRuns },
    jobs,
    feedFiles,
  });
}
