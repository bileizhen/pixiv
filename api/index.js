// api/index.js

// 🟢 1. 保持 Edge Runtime (为了下载大文件)
export const config = {
  runtime: 'edge', 
};

export default async function handler(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === '/' || path === '/favicon.ico') {
    return new Response('Pixiv Proxy (Edge) is running.', { status: 200 });
  }

  // 拼接 Pixiv 真实地址
  const targetUrl = `https://i.pximg.net${path}${url.search}`;

  // 🟢 2. 准备请求头
  const headers = {
    'Referer': 'https://www.pixiv.net/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
    // 🔥【关键】在这里直接填入你的 Cookie，不要用 process.env
    // 格式必须是: PHPSESSID=你的ID
    'Cookie': 'PHPSESSID="89665003_TcEEugHTdp444gcCrryrFldbhWsc96n8"' 
  };

  try {
    const response = await fetch(targetUrl, { headers });

    // 🔴 3. 增加错误调试：如果 Pixiv 拒绝，返回具体的错误码
    if (!response.ok) {
      // 这里的 statusText 能告诉我们是 403 Forbidden 还是 404 Not Found
      return new Response(`Pixiv Error: ${response.status} ${response.statusText}`, { status: response.status });
    }

    // 重构响应头
    const newHeaders = new Headers(response.headers);
    newHeaders.set('Access-Control-Allow-Origin', '*');
    newHeaders.set('Cache-Control', 'public, max-age=604800, s-maxage=604800');
    newHeaders.delete('content-encoding');

    // 流式转发
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });

  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
}

