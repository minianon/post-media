// Takes screenshots of Tushar's live products for social posts.
// Usage: node capture/capture.mjs requests/2026-10-10.json
// Request file: { "shots": [ { "url": "https://shortlistme.site", "out": "2026/10-10/x-1500.png", "mobile": false } ] }
// Only URLs whose host is in products.json are allowed.

import { chromium } from "playwright";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { dirname } from "node:path";

const req = JSON.parse(readFileSync(process.argv[2], "utf8"));
const products = JSON.parse(readFileSync("products.json", "utf8")).products;
const allowedHosts = new Set(products.map((p) => new URL(p.url).host));

const browser = await chromium.launch();
let ok = 0;
let bad = 0;

for (const shot of req.shots || []) {
  let url;
  try {
    url = new URL(shot.url);
  } catch {
    console.log(`::warning::Bad URL ${shot.url}`);
    bad++;
    continue;
  }
  if (url.protocol !== "https:" || !allowedHosts.has(url.host)) {
    console.log(`::warning::Not an allowed product URL: ${shot.url}`);
    bad++;
    continue;
  }
  if (!/^\d{4}\/\d{2}-\d{2}\/[\w-]+\.png$/.test(shot.out || "")) {
    console.log(`::warning::Bad output path: ${shot.out}`);
    bad++;
    continue;
  }
  if (existsSync(shot.out)) {
    console.log(`Already exists, skipping: ${shot.out}`);
    continue;
  }
  const mobile = !!shot.mobile;
  const ctx = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: mobile,
    colorScheme: shot.dark ? "dark" : "light",
  });
  const page = await ctx.newPage();
  try {
    const res = await page.goto(url.href, { waitUntil: "networkidle", timeout: 45000 });
    if (!res || res.status() >= 400) throw new Error(`HTTP ${res ? res.status() : "no response"}`);
    await page.waitForTimeout(2500); // let animations / fonts settle
    mkdirSync(dirname(`raw/${shot.out}`), { recursive: true });
    await page.screenshot({ path: `raw/${shot.out}` });
    console.log(`✅ ${url.href} -> raw/${shot.out}`);
    ok++;
  } catch (e) {
    console.log(`::warning::❌ ${url.href}: ${e.message}`);
    bad++;
  }
  await ctx.close();
}

await browser.close();
console.log(`Done: ${ok} captured, ${bad} failed.`);
if (!ok && bad) process.exit(1);
