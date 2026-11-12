// Runs test/styles.test.html in a headless Chromium browser (Chrome or Edge)
// and reports the checks it writes into #results.
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const candidates = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].filter(Boolean);
const browser = candidates.find((p) => existsSync(p));
if (!browser) {
  console.error("No Chromium browser found. Set CHROME_PATH.");
  process.exit(1);
}

const page = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), "styles.test.html")).href;
const dom = execFileSync(
  browser,
  [
    "--headless=new",
    "--disable-gpu",
    "--allow-file-access-from-files",
    `--user-data-dir=${mkdtempSync(join(tmpdir(), "cursor-block-test-"))}`,
    "--dump-dom",
    page,
  ],
  { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }
);

const match = dom.match(/<pre id="results">([\s\S]*?)<\/pre>/);
if (!match || !match[1].trim()) {
  console.error("The test page produced no results.");
  process.exit(1);
}
const results = JSON.parse(match[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&"));

let failed = 0;
for (const r of results) {
  if (r.pass) {
    console.log(`  ok    ${r.name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${r.name} (expected ${JSON.stringify(r.expected)}, got ${JSON.stringify(r.actual)})`);
  }
}
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
