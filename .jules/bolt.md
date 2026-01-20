## 2026-01-17 - [Ugoira Performance: Blob vs Base64]
**Learning:** For high-frequency image sequences like Pixiv Ugoira, using Base64 strings for each frame is extremely inefficient. Base64 increases memory footprint by ~33% and adds CPU overhead for decoding. Using `URL.createObjectURL` with `Blob` is significantly faster and more memory-efficient. Additionally, parallelizing the decoding of these frames with `Promise.all` instead of a sequential loop dramatically reduces the "perceived" load time.
**Action:** Always prefer `Blob` and `ObjectURL` over Base64 for large media assets in the browser, and ensure `URL.revokeObjectURL` is called to prevent memory leaks.

## 2026-01-20 - [Edge Caching: Query Params vs. Vary Headers]
**Learning:** For Vercel Edge Network, partitioning cache by query parameters (`?token=...`) is significantly more robust and easier to manage than using custom headers and `Vary` headers. Edge networks automatically include query params in the cache key, ensuring that authenticated and unauthenticated responses are never mixed. This also avoids issues with browsers not sending custom headers on native resource requests (like `<img>` or `<video>`).
**Action:** Prefer URL-based cache partitioning for cross-platform/cross-origin resources to maximize Edge Cache efficiency.
