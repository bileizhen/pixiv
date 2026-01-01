// api/index.js

// 🔥 核心关键：启用 Edge Runtime 以突破 4.5MB 限制
export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Proxy (Edge) is running.', { status: 200 });
  }

  // 拼接 Pixiv 图片服务器地址
  // Edge Runtime 中 request.url 包含完整路径，我们需要提取并拼接
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'Referer': 'https://www.pixiv.net/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      return new Response(`Pixiv Error: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 重构响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');

    // 🔥 核心关键：直接透传 Body 流，不进行 buffer 缓冲
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
