export const config = { runtime: 'edge' };

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Mirror (Edge) is running.', { status: 200 });
  }

  // 移除 token 参数，拼接真实 Pixiv URL
  // 我们不希望把 token 透传给 Pixiv 的 URL，只是为了本地鉴权
  const token = url.searchParams.get('token'); 
  url.searchParams.delete('token'); // 清理掉，避免污染上游请求
  
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0',
  };

  // Cookie 优先级逻辑 (URL 参数优先)
  if (token) {
    // URL 中的 token 是经过 encodeURIComponent 的，需要解码
    // 并且我们假设前端传过来的是完整的 Cookie 字符串
    try {
        headers['Cookie'] = decodeURIComponent(token);
    } catch(e) {}
  } else if (process.env.PIXIV_COOKIE) {
    headers['Cookie'] = process.env.PIXIV_COOKIE;
  } else if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    const response = await fetch(targetUrl, { headers, redirect: 'manual' });

    if (!response.ok) {
       if (response.status === 302 || response.status === 301) {
          return new Response('Pixiv Redirected. Cookie might be invalid.', { status: 403 });
       }
       return new Response(`Pixiv Error: ${response.status}`, { status: response.status });
    }

    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    // ⚡ Bolt Optimization: Enable Edge Caching with s-maxage and stale-while-revalidate
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400');
    newHeaders.delete('content-encoding'); 
    newHeaders.delete('content-security-policy');
    newHeaders.delete('set-cookie');

    return new Response(response.body, { status: response.status, headers: newHeaders });

  } catch (err) {
    return new Response(`Mirror Error: ${err.message}`, { status: 500 });
  }
}
