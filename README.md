# post-media

Public images for Tushar's X and LinkedIn posts (Buffer needs public image URLs).

| Folder | What |
| --- | --- |
| `YYYY/MM-DD/` | Images used in that day's posts: code snippets, diagrams, product screenshots |
| `photos/` | Tushar's own photos + `captions.json` describing each one |
| `requests/` | Screenshot requests — pushing one triggers the "Capture product screenshots" Action |
| `products.json` | The live projects that may be screenshotted (edit to add/remove) |

Screenshots are taken by a GitHub Action (Playwright, 1440×900 @2x) and framed in a browser window
showing the real URL. Only domains listed in `products.json` can be captured.
