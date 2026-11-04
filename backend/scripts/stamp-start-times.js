// Adds an absolute `startsAt` (ISO UTC) to every match of a feed file, in place. Safe to re-run.
// Usage: node scripts/stamp-start-times.js public/basketball/allBasketballGamesToday.json

const fs = require("fs");
const path = require("path");
const { stampStartsAt } = require("./lib/start-times");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/stamp-start-times.js <feed.json>");
  process.exit(1);
}

const target = path.resolve(file);
const payload = JSON.parse(fs.readFileSync(target, "utf-8"));
if (!Array.isArray(payload.matches)) {
  console.error(`No matches array in ${target}`);
  process.exit(1);
}

payload.matches = stampStartsAt(payload.matches, payload.scrapedAt);
fs.writeFileSync(target, JSON.stringify(payload, null, 2), "utf-8");
console.log(`Stamped startsAt on ${payload.matches.filter((match) => match.startsAt).length}/${payload.matches.length} matches -> ${path.basename(target)}`);
