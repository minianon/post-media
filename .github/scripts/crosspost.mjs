// Cross-posts articles/<slug>/index.md to Dev.to and Hashnode once their crosspost_at time has passed.
// Canonical URL always points to the GitHub Pages copy. Results are recorded in articles/<slug>/posted.json.
// Env: DEVTO_API_KEY, HASHNODE_TOKEN, HASHNODE_PUBLICATION_ID (each platform is skipped if its secret is missing), DRY_RUN=1
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";

const SITE = "https://minianon.github.io/post-media";
const DRY = process.env.DRY_RUN === "1";
const note = (m) => console.log(`::notice::${m}`);

function parse(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    let v = kv[2].trim();
    if (v.startsWith("[")) v = v.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
    else v = v.replace(/^["']|["']$/g, "");
    fm[kv[1]] = v;
  }
  return { fm, body: m[2].trim() };
}

async function devto(a) {
  const res = await fetch("https://dev.to/api/articles", {
    method: "POST",
    headers: { "api-key": process.env.DEVTO_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      article: {
        title: a.fm.title,
        body_markdown: a.body,
        published: true,
        tags: (a.fm.tags || []).map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, "")).slice(0, 4),
        canonical_url: a.canonical,
        main_image: a.fm.cover || undefined,
        description: a.fm.subtitle || undefined,
      },
    }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`dev.to ${res.status}: ${JSON.stringify(j).slice(0, 300)}`);
  return j.url;
}

async function hashnode(a) {
  const tags = (a.fm.tags || []).slice(0, 5).map((t) => ({ slug: t.toLowerCase().replace(/[^a-z0-9]+/g, "-"), name: t }));
  const query = `mutation P($input: PublishPostInput!) { publishPost(input: $input) { post { url } } }`;
  const input = {
    title: a.fm.title,
    subtitle: a.fm.subtitle || undefined,
    contentMarkdown: a.body,
    publicationId: process.env.HASHNODE_PUBLICATION_ID,
    tags,
    originalArticleURL: a.canonical,
    coverImageOptions: a.fm.cover ? { coverImageURL: a.fm.cover } : undefined,
  };
  const res = await fetch("https://gql.hashnode.com", {
    method: "POST",
    headers: { Authorization: process.env.HASHNODE_TOKEN, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { input } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.errors) throw new Error(`hashnode ${res.status}: ${JSON.stringify(j.errors || j).slice(0, 300)}`);
  return j.data.publishPost.post.url;
}

const platforms = [
  ["devto", devto, () => process.env.DEVTO_API_KEY],
  ["hashnode", hashnode, () => process.env.HASHNODE_TOKEN && process.env.HASHNODE_PUBLICATION_ID],
];

let changed = false, failed = 0;
for (const slug of existsSync("articles") ? readdirSync("articles") : []) {
  const file = `articles/${slug}/index.md`;
  if (!existsSync(file)) continue;
  const a = parse(readFileSync(file, "utf8"));
  if (!a || !a.fm.title || !a.fm.crosspost_at) continue;
  if (String(a.fm.crosspost).toLowerCase() === "false") continue;
  const due = new Date(a.fm.crosspost_at);
  if (isNaN(due) || due > new Date()) continue;
  a.canonical = `${SITE}/articles/${slug}/`;
  const logFile = `articles/${slug}/posted.json`;
  const log = existsSync(logFile) ? JSON.parse(readFileSync(logFile, "utf8")) : {};
  for (const [name, fn, enabled] of platforms) {
    if (log[name]?.url) continue;
    if (!enabled()) { note(`${slug}: ${name} skipped (no API key secret)`); continue; }
    if (DRY) { note(`DRY RUN: would post ${slug} to ${name}`); continue; }
    try {
      const url = await fn(a);
      log[name] = { url, at: new Date().toISOString() };
      changed = true;
      note(`${slug}: posted to ${name} → ${url}`);
    } catch (e) {
      failed++;
      log[name] = { error: e.message, at: new Date().toISOString() };
      changed = true;
      console.log(`::error::${slug}: ${name} failed — ${e.message}`);
    }
  }
  if (changed) writeFileSync(logFile, JSON.stringify(log, null, 2) + "\n");
}
if (!changed) console.log("Nothing due.");
if (failed) process.exitCode = 1;
