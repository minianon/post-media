---
title: How ShortlistMe Turns a PDF Resume Into a Live Portfolio (Test Layout)
subtitle: A layout test for the article pipeline — not a real post.
cover: https://raw.githubusercontent.com/minianon/post-media/main/2026/10-09/test-shortlistme.png
tags: [career, webdev, ai, programming]
crosspost: false
---

This page only exists to check how articles render before Medium import.

## The architecture

![ShortlistMe high-level design](https://raw.githubusercontent.com/minianon/post-media/main/2026/10-09/test-hld.png)
*High-level design, generated from the repo.*

Try it here: [shortlistme.site](https://shortlistme.site) · Code: [github.com/minianon/ShortlistMe](https://github.com/minianon/ShortlistMe)

## A code snippet

```python
def publish(version_id: str) -> None:
    portfolio.live_version = version_id  # publishing = moving one pointer
```

---

> Small steps, every day.
