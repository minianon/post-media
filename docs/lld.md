# post-media: Low-Level Design

For the big picture see the [High-Level Design](hld.md).

## 1. Screenshot request

```json
{ "shots": [ { "url": "https://mock.minianon.in", "out": "2026/11-13/x-1500-2.png", "mobile": false } ] }
```

## 2. Capture pipeline (`.github/workflows/capture.yml`)

```mermaid
sequenceDiagram
  participant Dev as Push to requests/*.json
  participant WF as Capture workflow
  participant PW as capture.mjs (Playwright)
  participant FR as frame.py (Pillow)
  participant Git as Repo
  Dev->>WF: trigger (or manual with a file path)
  WF->>WF: find the request file changed in the last commit
  WF->>PW: node capture/capture.mjs <request>
  loop each shot
    PW->>PW: reject non-https or host not in products.json
    PW->>PW: open page, wait for network idle + 2.5 s
    PW->>PW: screenshot to raw/<out>
  end
  WF->>FR: python3 capture/frame.py <request>
  FR->>FR: add browser bar with the URL, rounded corners → <out>
  WF->>Git: commit framed images (rebase, push)
```

| Setting | Desktop | Mobile |
|---|---|---|
| Viewport | 1440 × 900 | 390 × 844 |
| Scale | 2× | 2× |
| Frame corner radius | 14 px × scale | 36 px × scale |
| Browser bar height | 52 px × scale | 52 px × scale |

## 3. Cross-posting (`.github/scripts/crosspost.mjs`)

```mermaid
flowchart TB
  A[Every hour] --> B[For each articles/slug/index.md]
  B --> C{front matter has title and crosspost_at?}
  C -->|no| B
  C -->|yes| D{crosspost is false?}
  D -->|yes| B
  D -->|no| E{crosspost_at in the past?}
  E -->|no| B
  E -->|yes| F{already in posted.json?}
  F -->|yes| B
  F -->|no| G[POST dev.to/api/articles<br/>canonical = GitHub Pages URL]
  G --> H[record URL in posted.json, commit]
```

| Input | Use |
|---|---|
| Front matter | `title`, `subtitle`, `cover`, `tags` (first 4, lowercased), `crosspost_at`, `crosspost` |
| `DEVTO_API_KEY` secret | Dev.to API (skipped if missing) |
| `DRY_RUN=1` | Log what would be posted without posting |

Hashnode support is in the script but disabled.

## 4. Workflows

| Workflow | Trigger | Job |
|---|---|---|
| `capture.yml` | Push to `requests/**.json`, manual | Screenshot, frame, commit |
| `crosspost.yml` | Hourly cron (`17 * * * *`), manual | Cross-post due articles |
| `pagecheck.yml` | Manual | Fetch a published article page and report status, title and image count |
