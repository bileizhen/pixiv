# Bolt's Journal - Critical Learnings

## 2025-05-14 - [Edge Cache vs. Token Leakage]
**Learning:** Attempting to partition Edge Cache by moving authentication tokens from the `Cookie` header to a URL query parameter (`?token=...`) is a security anti-pattern. While it enables automatic caching on Vercel Edge without complex `Vary` headers, it exposes sensitive user cookies in browser history, server logs, and Referer headers. Furthermore, if the upstream API does not provide cache-control headers, the Edge Network will not cache the response anyway, negating the performance benefit.
**Action:** Prioritize frontend-side optimizations (caching lookups, non-blocking script loading) when backend caching requires compromising security or lacks infrastructure support.

## 2025-05-14 - [Frontend Hot Path Optimization]
**Learning:** In a single-page application with heavy image processing (like Ugoira GIF generation), utility functions like `getMirrorUrl` are called in tight loops (e.g., 50+ times per second during frame rendering). Even "fast" browser APIs like `localStorage.getItem` or `window.location.origin` introduce measurable overhead when multiplied by high call counts.
**Action:** Always cache stable environment values (origin, user settings) in local variables outside of high-frequency functions.

## 2025-05-15 - [Early Return for API Parallelism]
**Learning:** In a serverless environment fetching multiple dependent or independent resources, using `Promise.all` can bottleneck the response by the slowest resource even if it's not needed for the final output. Separating promises and awaiting the "critical path" first allows for early returns, significantly reducing latency for the most common use cases (e.g., single-page vs. multi-page results).
**Action:** Always evaluate if all resources in a `Promise.all` block are strictly necessary for every response path; implement early return patterns to skip waiting for optional or backgrounded resources.
