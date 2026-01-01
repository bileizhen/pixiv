// api/index.js

// 🟢 1. 开启 Edge Runtime (突破 4.5MB 大小限制)
export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Proxy (Edge) is running.', { status: 200 });
  }

  // 拼接目标地址
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  // 🟢 2. 准备请求头
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  };

  // 🟢 3. (可选保底) 如果环境变量里有 Cookie，在下载图片/ZIP时也带上
  // 这能解决极少数 R18 资源在下载时也需要验证的问题
  if (process.env.PIXIV_PHPSESSID) {
    headers['Cookie'] = `PHPSESSID=${process.env.PIXIV_PHPSESSID}`;
  }

  try {
    const response = await fetch(targetUrl, { headers });

    // 检查上游是否报错 (比如 403 Forbidden 或 404)
    if (!response.ok) {
      return new Response(`Pixiv Error: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 重构响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    newHeaders.delete('content-encoding'); // 防止压缩导致乱码

    // 🟢 4. 流式转发 (Streaming)
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}
