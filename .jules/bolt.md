# Bolt's Journal - Critical Learnings

## 2025-05-14 - [Edge Cache vs. Token Leakage]
**Learning:** Attempting to partition Edge Cache by moving authentication tokens from the `Cookie` header to a URL query parameter (`?token=...`) is a security anti-pattern. While it enables automatic caching on Vercel Edge without complex `Vary` headers, it exposes sensitive user cookies in browser history, server logs, and Referer headers. Furthermore, if the upstream API does not provide cache-control headers, the Edge Network will not cache the response anyway, negating the performance benefit.
**Action:** Prioritize frontend-side optimizations (caching lookups, non-blocking script loading) when backend caching requires compromising security or lacks infrastructure support.

## 2025-05-14 - [Frontend Hot Path Optimization]
**Learning:** In a single-page application with heavy image processing (like Ugoira GIF generation), utility functions like `getProxyUrl` are called in tight loops (e.g., 50+ times per second during frame rendering). Even "fast" browser APIs like `localStorage.getItem` or `window.location.origin` introduce measurable overhead when multiplied by high call counts.
**Action:** Always cache stable environment values (origin, user settings) in local variables outside of high-frequency functions.

## 2026-01-24 - [Speculative Fetching & Upstream Efficiency]
**Learning:** Parallelizing multiple API requests ("fetch everything") to reduce TTFB for a specific content type (Ugoira) is only beneficial if it doesn't significantly degrade overall system efficiency. Speculatively fetching metadata that is only relevant for a subset of requests results in wasted network resources and increased risk of being rate-limited by upstream providers (Pixiv).
**Action:** Use parallelization only for resources that are guaranteed or highly likely to be needed, or implement a multi-stage parallel strategy that respects upstream resource limits.
