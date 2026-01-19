## 2026-01-17 - [Ugoira Performance: Blob vs Base64]
**Learning:** For high-frequency image sequences like Pixiv Ugoira, using Base64 strings for each frame is extremely inefficient. Base64 increases memory footprint by ~33% and adds CPU overhead for decoding. Using `URL.createObjectURL` with `Blob` is significantly faster and more memory-efficient. Additionally, parallelizing the decoding of these frames with `Promise.all` instead of a sequential loop dramatically reduces the "perceived" load time.
**Action:** Always prefer `Blob` and `ObjectURL` over Base64 for large media assets in the browser, and ensure `URL.revokeObjectURL` is called to prevent memory leaks.

## 2026-01-18 - [Edge Runtime & Caching Strategy]
**Learning:** Migrating metadata analysis functions from Node.js to Edge Runtime on Vercel reduces cold start latency from ~300ms to ~30ms. Furthermore, when using custom authentication headers (like `x-user-cookie`) for API requests, the `Vary` header is essential for safe CDN caching. Adding `max-age` alongside `s-maxage` enables browser-side caching, eliminating redundant network round-trips for repeated ID lookups.
**Action:** Always prefer Edge Runtime for simple proxy/metadata tasks and ensure proper `Vary` headers when caching authenticated responses.
